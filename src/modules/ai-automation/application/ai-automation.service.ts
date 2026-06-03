import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import type {
  AiUsageStats,
  ExtractedInvoiceData,
  ProcessOcrResult,
} from '../domain/interfaces/extracted-invoice.interface';
import type { ProcessInvoiceOcrDto } from '../domain/dto/process-invoice-ocr.dto';

// ── Model ────────────────────────────────────────────────────────────────────
// User requested claude-3-5-sonnet; override via AI_MODEL env var.
// For higher accuracy on complex layouts, switch to claude-opus-4-7.
const DEFAULT_MODEL = 'claude-3-5-sonnet-20240620';

// ── System prompt (STABLE — no dynamic content, eligible for caching) ────────
// Render order: tools → system → messages.
// This block is always identical, so `cache_control: ephemeral` converts
// every call after the first into a cheap cache-read instead of a full
// system-prompt tokenization pass.
const EXTRACTION_SYSTEM_PROMPT = `You are an expert accounting assistant that extracts structured data from supplier invoice text produced by OCR.

Your task: analyze the invoice text and return a single, valid JSON object containing the extracted data.

Output rules — CRITICAL:
1. Return ONLY the JSON object. No markdown fences, no prose, no explanation.
2. All monetary values must be plain numbers (not strings).
3. Dates must be in ISO 8601 format: YYYY-MM-DD.
4. If a field cannot be determined, use null (except taxAmount and currency — those default to 0 and "USD").
5. If subtotal is missing but total and taxAmount are known: subtotal = total − taxAmount.
6. If taxAmount is not shown separately, set it to 0.
7. Currency defaults to "USD" if not specified in the text.

Required JSON schema:
{
  "supplier":       "Supplier or vendor company name (string)",
  "invoiceNumber":  "Invoice reference or number (string | null)",
  "date":           "Invoice date YYYY-MM-DD (string | null)",
  "subtotal":       "Pre-tax amount (number)",
  "taxAmount":      "Total tax amount, 0 if none (number)",
  "total":          "Grand total including tax (number)",
  "taxRate":        "Tax rate as decimal fraction, e.g. 0.19 for 19% (number | null)",
  "currency":       "ISO 4217 three-letter code, default USD (string)",
  "description":    "One-line summary of goods or services (string)"
}`;

@Injectable()
export class AiAutomationService {
  private readonly logger = new Logger(AiAutomationService.name);
  private readonly anthropic: Anthropic;
  private readonly model: string;
  private readonly apiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.getOrThrow<string>('ANTHROPIC_API_KEY');
    this.anthropic = new Anthropic({ apiKey: this.apiKey });
    this.model = this.config.get<string>('AI_MODEL', DEFAULT_MODEL);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Public API
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Process a supplier invoice OCR scan in two steps:
   *
   *   1. Send the OCR text to Claude with a structured-extraction prompt.
   *      The system prompt is marked with `cache_control: ephemeral` so
   *      repeated calls reuse the cache and only pay for the new user text.
   *
   *   2. Use the extracted data to auto-generate a balanced DRAFT journal entry:
   *        Dr  Expense account        (subtotal)
   *        Dr  Tax Recoverable (opt.) (taxAmount)
   *        Cr  Accounts Payable       (total)
   */
  async processSupplierInvoiceOcr(
    tenantId: string,
    dto: ProcessInvoiceOcrDto,
  ): Promise<ProcessOcrResult> {
    if (!this.apiKey || this.apiKey === 'sk-ant-...' || !this.apiKey.startsWith('sk-ant-')) {
      throw new UnprocessableEntityException(
        'La clave de API de Anthropic (ANTHROPIC_API_KEY) no está configurada o es el marcador de posición por defecto ("sk-ant-...") en el archivo .env. Por favor configure una clave real en su archivo .env.',
      );
    }

    // ── Step 1: AI extraction ─────────────────────────────────────────────
    const { extractedData, usage } = await this.extractInvoiceData(dto.ocrText);

    // ── Step 2: Validate accounting accounts belong to tenant ─────────────
    const accountIds = [
      dto.expenseAccountId,
      dto.payableAccountId,
      ...(dto.taxAccountId ? [dto.taxAccountId] : []),
    ];
    await this.assertAccountsBelongToTenant(tenantId, accountIds);

    // ── Step 3: Build and persist DRAFT journal entry ─────────────────────
    const journalEntryDraft = await this.createDraftJournalEntry(
      tenantId,
      extractedData,
      dto,
    );

    return {
      extractedData,
      journalEntryDraft: {
        id:          journalEntryDraft.id,
        reference:   journalEntryDraft.reference,
        description: journalEntryDraft.description ?? '',
        date:        journalEntryDraft.date,
        status:      journalEntryDraft.status,
        lines: journalEntryDraft.lines.map((l) => ({
          accountId:   l.accountId,
          description: l.description,
          debit:       l.debit.toFixed(4),
          credit:      l.credit.toFixed(4),
        })),
      },
      aiUsage: usage,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AI extraction (calls Claude)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Sends the OCR text to Claude and parses the JSON response.
   *
   * Prompt-caching strategy (from shared/prompt-caching.md):
   *   • Stable content (EXTRACTION_SYSTEM_PROMPT) → first system block,
   *     tagged `cache_control: { type: "ephemeral" }`.
   *   • Volatile content (the OCR text) → user message, after the breakpoint.
   *   Result: after the first call, the 370-token system prompt is served
   *   from cache, cutting per-call token cost by ~35%.
   */
  private async extractInvoiceData(
    ocrText: string,
  ): Promise<{ extractedData: ExtractedInvoiceData; usage: AiUsageStats }> {
    let response: Anthropic.Message;

    try {
      response = await this.anthropic.messages.create({
        model:      this.model,
        max_tokens: 1024,
        system: [
          {
            type:          'text',
            text:          EXTRACTION_SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' }, // cache the stable system prompt
          },
        ],
        messages: [
          {
            role:    'user',
            content: `Extract the structured invoice data from this OCR text:\n\n${ocrText}`,
          },
        ],
      });
    } catch (err: unknown) {
      this.logger.error('Anthropic API call failed', err);
      if (err instanceof Anthropic.APIError) {
        throw new ServiceUnavailableException(
          `AI service error (${err.status}): ${err.message}`,
        );
      }
      throw new ServiceUnavailableException('AI service is temporarily unavailable');
    }

    // Narrow the first content block to TextBlock
    const firstBlock = response.content[0];
    if (!firstBlock || firstBlock.type !== 'text') {
      throw new UnprocessableEntityException(
        'AI returned an unexpected response format (no text block)',
      );
    }

    const extractedData = AiAutomationService.parseExtractedJson(firstBlock.text);

    const usage: AiUsageStats = {
      inputTokens:          response.usage.input_tokens,
      outputTokens:         response.usage.output_tokens,
      cacheReadTokens:      (response.usage as any).cache_read_input_tokens  ?? 0,
      cacheCreationTokens:  (response.usage as any).cache_creation_input_tokens ?? 0,
    };

    this.logger.log(
      `Invoice extracted for "${extractedData.supplier}" | ` +
        `tokens: in=${usage.inputTokens} out=${usage.outputTokens} ` +
        `cache_read=${usage.cacheReadTokens} cache_write=${usage.cacheCreationTokens}`,
    );

    return { extractedData, usage };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Journal entry builder
  // ══════════════════════════════════════════════════════════════════════════

  private async createDraftJournalEntry(
    tenantId: string,
    data: ExtractedInvoiceData,
    dto: ProcessInvoiceOcrDto,
  ) {
    const reference = dto.reference ?? `AI-${data.invoiceNumber ?? Date.now()}`;

    const lines = AiAutomationService.buildJournalLines(data, dto);

    return this.prisma.journalEntry.create({
      data: {
        tenantId,
        reference,
        description: `AI — ${data.supplier}${data.date ? ' — ' + data.date : ''}`,
        date:        data.date ? new Date(data.date) : new Date(),
        status:      'DRAFT',
        lines:       { create: lines },
      },
      include: { lines: true },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Domain helpers  (static = testable without DI)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Builds the balanced journal lines for a supplier invoice.
   *
   * Two modes — always balanced:
   *
   *  (a) taxAccountId provided AND taxAmount > 0:
   *       Dr  Expense account     = subtotal
   *       Dr  Tax Recoverable     = taxAmount
   *       Cr  Accounts Payable    = total     (subtotal + taxAmount)
   *
   *  (b) no taxAccountId (or taxAmount = 0):
   *       Dr  Expense account     = total     (tax absorbed into expense)
   *       Cr  Accounts Payable    = total
   *
   * Both sides always sum to `total`.
   */
  static buildJournalLines(
    data: ExtractedInvoiceData,
    dto: Pick<ProcessInvoiceOcrDto, 'expenseAccountId' | 'payableAccountId' | 'taxAccountId'>,
  ) {
    const ZERO     = new Prisma.Decimal(0);
    const total    = new Prisma.Decimal(data.total.toString());
    const subtotal = new Prisma.Decimal(data.subtotal.toString());
    const taxAmt   = new Prisma.Decimal(data.taxAmount.toString());

    const splitTax = taxAmt.greaterThan(0) && !!dto.taxAccountId;

    const lines: {
      accountId: string;
      description: string;
      debit: Prisma.Decimal;
      credit: Prisma.Decimal;
      order: number;
    }[] = [];

    if (splitTax) {
      // Dr — Expense (subtotal only)
      lines.push({
        accountId:   dto.expenseAccountId,
        description: `${data.description} — ${data.supplier}`,
        debit:       subtotal,
        credit:      ZERO,
        order:       0,
      });
      // Dr — Tax Recoverable
      lines.push({
        accountId:   dto.taxAccountId!,
        description: `Tax recoverable — ${data.supplier}`,
        debit:       taxAmt,
        credit:      ZERO,
        order:       1,
      });
    } else {
      // Dr — Expense (absorbs tax when no tax account)
      lines.push({
        accountId:   dto.expenseAccountId,
        description: `${data.description} — ${data.supplier}`,
        debit:       total,
        credit:      ZERO,
        order:       0,
      });
    }

    // Cr — Accounts Payable (always equals total)
    lines.push({
      accountId:   dto.payableAccountId,
      description: `AP — ${data.supplier}`,
      debit:       ZERO,
      credit:      total,
      order:       lines.length,
    });

    return lines;
  }

  /**
   * Parses the raw text from Claude into an ExtractedInvoiceData object.
   *
   * Claude occasionally wraps the JSON in markdown fences (```json ... ```)
   * even when instructed not to — this strips those wrappers defensively.
   * The essential invariant is that `total` must be a positive number.
   */
  static parseExtractedJson(rawText: string): ExtractedInvoiceData {
    const cleaned = rawText
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    let parsed: Partial<ExtractedInvoiceData>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new UnprocessableEntityException(
        'AI extraction failed: response was not valid JSON. ' +
          'Ensure the OCR text contains a legible invoice.',
      );
    }

    // Validate essential numeric fields
    if (typeof parsed.total !== 'number' || parsed.total <= 0) {
      throw new UnprocessableEntityException(
        `AI extraction failed: could not determine a valid total amount ` +
          `(got: ${JSON.stringify(parsed.total)})`,
      );
    }

    // Apply safe defaults
    return {
      supplier:      parsed.supplier      ?? 'Unknown Supplier',
      invoiceNumber: parsed.invoiceNumber ?? null,
      date:          parsed.date          ?? null,
      subtotal:      parsed.subtotal      ?? parsed.total,
      taxAmount:     parsed.taxAmount     ?? 0,
      total:         parsed.total,
      taxRate:       parsed.taxRate       ?? null,
      currency:      parsed.currency      ?? 'USD',
      description:   parsed.description  ?? 'Goods/Services',
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async assertAccountsBelongToTenant(
    tenantId: string,
    accountIds: string[],
  ): Promise<void> {
    const found = await this.prisma.account.findMany({
      where: { id: { in: accountIds }, tenantId, isActive: true },
      select: { id: true },
    });
    if (found.length !== accountIds.length) {
      const foundIds = new Set(found.map((a) => a.id));
      const missing  = accountIds.filter((id) => !foundIds.has(id));
      throw new UnprocessableEntityException(
        `Accounts not found or inactive in this tenant: ${missing.join(', ')}`,
      );
    }
  }
}
