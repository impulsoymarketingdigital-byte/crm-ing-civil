import { ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { AiAutomationService } from '../application/ai-automation.service';

// ── Mock @anthropic-ai/sdk ────────────────────────────────────────────────────
// We mock the entire module so no real HTTP calls happen during tests.
const mockMessagesCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = jest.fn().mockImplementation(() => ({
    messages: { create: mockMessagesCreate },
  }));
  // Preserve Anthropic.APIError so the service can use it for error handling
  (MockAnthropic as any).APIError = class APIError extends Error {
    constructor(public status: number, message: string) {
      super(message);
    }
  };
  // __esModule: true tells ts-jest this is an ES module with a default export,
  // which is required for `import Anthropic from '@anthropic-ai/sdk'` to work
  // when the module system is commonjs.
  return { __esModule: true, default: MockAnthropic };
});

// ── Constants ─────────────────────────────────────────────────────────────────
const TENANT  = 'tenant-aa-0000-0000-0000-000000000001';
const EXP_ACC = 'acc-exp-0-0000-0000-0000-000000000001';
const PAY_ACC = 'acc-pay-0-0000-0000-0000-000000000002';
const TAX_ACC = 'acc-tax-0-0000-0000-0000-000000000003';

const VALID_OCR = `
  ACME Supplies S.A.
  Invoice No: INV-2024-0042
  Date: 2024-03-15
  Services: IT Consulting Q1
  Subtotal: $1,000.00
  Tax (19%): $190.00
  TOTAL: $1,190.00
`;

// ── Helpers ───────────────────────────────────────────────────────────────────
const D = (n: number | string) => new Prisma.Decimal(n.toString());

function makeClaudeResponse(jsonPayload: object) {
  return {
    content: [{ type: 'text', text: JSON.stringify(jsonPayload) }],
    usage: {
      input_tokens: 350,
      output_tokens: 80,
      cache_read_input_tokens: 300,
      cache_creation_input_tokens: 0,
    },
  };
}

function makePrisma() {
  return {
    account: { findMany: jest.fn() },
    journalEntry: { create: jest.fn() },
  };
}

function makeConfigService(overrides: Record<string, string> = {}) {
  return {
    getOrThrow: jest.fn().mockReturnValue('sk-ant-test-key'),
    get: jest.fn().mockImplementation((key: string, def?: string) =>
      overrides[key] ?? def ?? ''),
  };
}

// ── Suite ─────────────────────────────────────────────────────────────────────
describe('AiAutomationService', () => {
  let service: AiAutomationService;
  let mockPrisma: ReturnType<typeof makePrisma>;

  const defaultExtracted = {
    supplier: 'ACME Supplies S.A.',
    invoiceNumber: 'INV-2024-0042',
    date: '2024-03-15',
    subtotal: 1000,
    taxAmount: 190,
    total: 1190,
    taxRate: 0.19,
    currency: 'USD',
    description: 'IT Consulting Q1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = makePrisma();
    service = new AiAutomationService(mockPrisma as any, makeConfigService() as any);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // parseExtractedJson  (static pure function — no SDK calls)
  // ══════════════════════════════════════════════════════════════════════════
  describe('parseExtractedJson (static)', () => {
    it('parses a clean JSON string', () => {
      const result = AiAutomationService.parseExtractedJson(
        JSON.stringify(defaultExtracted),
      );
      expect(result.supplier).toBe('ACME Supplies S.A.');
      expect(result.total).toBe(1190);
      expect(result.taxAmount).toBe(190);
    });

    it('strips ```json markdown fences when Claude wraps the output', () => {
      const wrapped = '```json\n' + JSON.stringify(defaultExtracted) + '\n```';
      const result = AiAutomationService.parseExtractedJson(wrapped);
      expect(result.total).toBe(1190);
    });

    it('strips ``` fences without language specifier', () => {
      const wrapped = '```\n' + JSON.stringify(defaultExtracted) + '\n```';
      const result = AiAutomationService.parseExtractedJson(wrapped);
      expect(result.supplier).toBe('ACME Supplies S.A.');
    });

    it('applies safe defaults for optional fields', () => {
      const minimal = { total: 500 };
      const result = AiAutomationService.parseExtractedJson(JSON.stringify(minimal));
      expect(result.currency).toBe('USD');
      expect(result.taxAmount).toBe(0);
      expect(result.description).toBe('Goods/Services');
      expect(result.supplier).toBe('Unknown Supplier');
    });

    it('throws UnprocessableEntityException for non-JSON text', () => {
      expect(() =>
        AiAutomationService.parseExtractedJson('This is not JSON at all'),
      ).toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException when total is missing or zero', () => {
      const noTotal = { supplier: 'XYZ', taxAmount: 0 };
      expect(() =>
        AiAutomationService.parseExtractedJson(JSON.stringify(noTotal)),
      ).toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException when total is negative', () => {
      const negative = { ...defaultExtracted, total: -100 };
      expect(() =>
        AiAutomationService.parseExtractedJson(JSON.stringify(negative)),
      ).toThrow(UnprocessableEntityException);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // buildJournalLines  (static pure function)
  // ══════════════════════════════════════════════════════════════════════════
  describe('buildJournalLines (static)', () => {
    const dto = { expenseAccountId: EXP_ACC, payableAccountId: PAY_ACC };

    describe('mode (a): no taxAccountId — tax absorbed into expense', () => {
      it('produces two balanced lines', () => {
        const lines = AiAutomationService.buildJournalLines(defaultExtracted, dto);
        expect(lines).toHaveLength(2);
        const totalDR = lines.reduce((s, l) => s.add(l.debit),  new Prisma.Decimal(0));
        const totalCR = lines.reduce((s, l) => s.add(l.credit), new Prisma.Decimal(0));
        expect(totalDR.equals(totalCR)).toBe(true);
      });

      it('Dr Expense = invoice.total (absorbs tax)', () => {
        const lines = AiAutomationService.buildJournalLines(defaultExtracted, dto);
        const expLine = lines.find((l) => l.accountId === EXP_ACC)!;
        expect(expLine.debit.equals(D(1190))).toBe(true);
      });

      it('Cr Payable = invoice.total', () => {
        const lines = AiAutomationService.buildJournalLines(defaultExtracted, dto);
        const payLine = lines.find((l) => l.accountId === PAY_ACC)!;
        expect(payLine.credit.equals(D(1190))).toBe(true);
      });

      it('Payable debit is zero', () => {
        const lines = AiAutomationService.buildJournalLines(defaultExtracted, dto);
        const payLine = lines.find((l) => l.accountId === PAY_ACC)!;
        expect(payLine.debit.isZero()).toBe(true);
      });
    });

    describe('mode (b): taxAccountId provided AND taxAmount > 0 — split debit', () => {
      const dtoWithTax = { ...dto, taxAccountId: TAX_ACC };

      it('produces three balanced lines', () => {
        const lines = AiAutomationService.buildJournalLines(defaultExtracted, dtoWithTax);
        expect(lines).toHaveLength(3);
        const totalDR = lines.reduce((s, l) => s.add(l.debit),  new Prisma.Decimal(0));
        const totalCR = lines.reduce((s, l) => s.add(l.credit), new Prisma.Decimal(0));
        expect(totalDR.equals(totalCR)).toBe(true);
      });

      it('Dr Expense = subtotal only', () => {
        const lines = AiAutomationService.buildJournalLines(defaultExtracted, dtoWithTax);
        const expLine = lines.find((l) => l.accountId === EXP_ACC)!;
        expect(expLine.debit.equals(D(1000))).toBe(true);
      });

      it('Dr Tax Recoverable = taxAmount', () => {
        const lines = AiAutomationService.buildJournalLines(defaultExtracted, dtoWithTax);
        const taxLine = lines.find((l) => l.accountId === TAX_ACC)!;
        expect(taxLine.debit.equals(D(190))).toBe(true);
      });

      it('Cr Payable = total (subtotal + tax)', () => {
        const lines = AiAutomationService.buildJournalLines(defaultExtracted, dtoWithTax);
        const payLine = lines.find((l) => l.accountId === PAY_ACC)!;
        expect(payLine.credit.equals(D(1190))).toBe(true);
      });
    });

    describe('zero-tax invoice', () => {
      const noTaxData = { ...defaultExtracted, taxAmount: 0, total: 1000 };

      it('always produces two lines when taxAmount is 0 (even with taxAccountId)', () => {
        const lines = AiAutomationService.buildJournalLines(noTaxData, {
          ...dto, taxAccountId: TAX_ACC,
        });
        expect(lines).toHaveLength(2);
      });

      it('is balanced for zero-tax invoice', () => {
        const lines = AiAutomationService.buildJournalLines(noTaxData, dto);
        const totalDR = lines.reduce((s, l) => s.add(l.debit),  new Prisma.Decimal(0));
        const totalCR = lines.reduce((s, l) => s.add(l.credit), new Prisma.Decimal(0));
        expect(totalDR.equals(totalCR)).toBe(true);
        expect(totalDR.equals(D(1000))).toBe(true);
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // processSupplierInvoiceOcr  (integration: Claude → journal entry)
  // ══════════════════════════════════════════════════════════════════════════
  describe('processSupplierInvoiceOcr', () => {
    const dto = {
      ocrText:           VALID_OCR,
      expenseAccountId:  EXP_ACC,
      payableAccountId:  PAY_ACC,
    };

    function setupHappyPath() {
      mockMessagesCreate.mockResolvedValue(makeClaudeResponse(defaultExtracted));
      mockPrisma.account.findMany.mockResolvedValue([
        { id: EXP_ACC },
        { id: PAY_ACC },
      ]);
      mockPrisma.journalEntry.create.mockResolvedValue({
        id: 'je-001',
        reference: 'AI-INV-2024-0042',
        description: 'AI — ACME Supplies S.A. — 2024-03-15',
        date: new Date('2024-03-15'),
        status: 'DRAFT',
        lines: [
          { accountId: EXP_ACC, description: 'IT Consulting', debit: D(1190), credit: D(0) },
          { accountId: PAY_ACC, description: 'AP — ACME',     debit: D(0),    credit: D(1190) },
        ],
      });
    }

    it('returns extractedData, journalEntryDraft, and aiUsage on success', async () => {
      setupHappyPath();
      const result = await service.processSupplierInvoiceOcr(TENANT, dto);

      expect(result.extractedData.supplier).toBe('ACME Supplies S.A.');
      expect(result.journalEntryDraft.status).toBe('DRAFT');
      expect(result.aiUsage.inputTokens).toBe(350);
    });

    // ── Prompt caching fields ─────────────────────────────────────────────
    it('reports cache_read_input_tokens in aiUsage (caching is active)', async () => {
      setupHappyPath();
      const result = await service.processSupplierInvoiceOcr(TENANT, dto);

      expect(result.aiUsage.cacheReadTokens).toBe(300);
      expect(result.aiUsage.cacheCreationTokens).toBe(0);
    });

    it('calls messages.create with cache_control on the system prompt', async () => {
      setupHappyPath();
      await service.processSupplierInvoiceOcr(TENANT, dto);

      const callArgs = mockMessagesCreate.mock.calls[0][0];
      const systemBlocks = callArgs.system as any[];
      expect(systemBlocks[0].cache_control).toEqual({ type: 'ephemeral' });
    });

    it('sends the OCR text in the user message (NOT the system prompt)', async () => {
      setupHappyPath();
      await service.processSupplierInvoiceOcr(TENANT, dto);

      const callArgs = mockMessagesCreate.mock.calls[0][0];
      const userMsg = callArgs.messages[0];
      expect(userMsg.role).toBe('user');
      expect(userMsg.content).toContain(VALID_OCR);
    });

    it('journal entry is created in DRAFT status', async () => {
      setupHappyPath();
      await service.processSupplierInvoiceOcr(TENANT, dto);

      const createArgs = mockPrisma.journalEntry.create.mock.calls[0][0];
      expect(createArgs.data.status).toBe('DRAFT');
    });

    it('journal entry description contains supplier name', async () => {
      setupHappyPath();
      await service.processSupplierInvoiceOcr(TENANT, dto);

      const createArgs = mockPrisma.journalEntry.create.mock.calls[0][0];
      expect(createArgs.data.description).toContain('ACME Supplies S.A.');
    });

    it('journal entry tenantId matches authenticated tenant (not from user input)', async () => {
      setupHappyPath();
      await service.processSupplierInvoiceOcr(TENANT, dto);

      const createArgs = mockPrisma.journalEntry.create.mock.calls[0][0];
      expect(createArgs.data.tenantId).toBe(TENANT);
    });

    // ── Claude returns JSON with markdown wrapper ─────────────────────────
    it('handles response wrapped in ```json fences without error', async () => {
      const wrapped = '```json\n' + JSON.stringify(defaultExtracted) + '\n```';
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: wrapped }],
        usage: { input_tokens: 350, output_tokens: 80 },
      });
      mockPrisma.account.findMany.mockResolvedValue([{ id: EXP_ACC }, { id: PAY_ACC }]);
      mockPrisma.journalEntry.create.mockResolvedValue({ id: 'je-001', status: 'DRAFT', lines: [] });

      const result = await service.processSupplierInvoiceOcr(TENANT, dto);
      expect(result.extractedData.total).toBe(1190);
    });

    // ── Error: Claude returns unparseable text ────────────────────────────
    it('throws UnprocessableEntityException when Claude returns invalid JSON', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Sorry, I cannot process this document.' }],
        usage: { input_tokens: 100, output_tokens: 20 },
      });
      mockPrisma.account.findMany.mockResolvedValue([{ id: EXP_ACC }, { id: PAY_ACC }]);

      await expect(
        service.processSupplierInvoiceOcr(TENANT, dto),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    // ── Error: Anthropic API failure ──────────────────────────────────────
    it('throws ServiceUnavailableException on Anthropic API error', async () => {
      const apiError = new (Anthropic as any).APIError(429, 'Rate limit exceeded');
      mockMessagesCreate.mockRejectedValue(apiError);

      await expect(
        service.processSupplierInvoiceOcr(TENANT, dto),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('includes the HTTP status in the ServiceUnavailableException message', async () => {
      const apiError = new (Anthropic as any).APIError(503, 'Service unavailable');
      mockMessagesCreate.mockRejectedValue(apiError);

      try {
        await service.processSupplierInvoiceOcr(TENANT, dto);
        fail('Should have thrown');
      } catch (e: any) {
        expect(e).toBeInstanceOf(ServiceUnavailableException);
        expect(e.message).toContain('503');
      }
    });

    // ── Account validation ────────────────────────────────────────────────
    it('throws UnprocessableEntityException when an account does not belong to tenant', async () => {
      mockMessagesCreate.mockResolvedValue(makeClaudeResponse(defaultExtracted));
      // Only one account found, but two were requested
      mockPrisma.account.findMany.mockResolvedValue([{ id: EXP_ACC }]);

      await expect(
        service.processSupplierInvoiceOcr(TENANT, dto),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(mockPrisma.journalEntry.create).not.toHaveBeenCalled();
    });

    it('account lookup is scoped to the authenticated tenantId', async () => {
      mockMessagesCreate.mockResolvedValue(makeClaudeResponse(defaultExtracted));
      mockPrisma.account.findMany.mockResolvedValue([{ id: EXP_ACC }, { id: PAY_ACC }]);
      mockPrisma.journalEntry.create.mockResolvedValue({ id: 'je-001', status: 'DRAFT', lines: [] });

      await service.processSupplierInvoiceOcr(TENANT, dto);

      const accountQuery = mockPrisma.account.findMany.mock.calls[0][0];
      expect(accountQuery.where.tenantId).toBe(TENANT);
    });

    // ── Reference generation ──────────────────────────────────────────────
    it('uses invoiceNumber for reference when available', async () => {
      setupHappyPath();
      await service.processSupplierInvoiceOcr(TENANT, dto);

      const createArgs = mockPrisma.journalEntry.create.mock.calls[0][0];
      expect(createArgs.data.reference).toBe('AI-INV-2024-0042');
    });

    it('accepts a manual reference override from the DTO', async () => {
      mockMessagesCreate.mockResolvedValue(makeClaudeResponse(defaultExtracted));
      mockPrisma.account.findMany.mockResolvedValue([{ id: EXP_ACC }, { id: PAY_ACC }]);
      mockPrisma.journalEntry.create.mockResolvedValue({ id: 'je-001', status: 'DRAFT', lines: [] });

      await service.processSupplierInvoiceOcr(TENANT, {
        ...dto,
        reference: 'MY-MANUAL-REF-001',
      });

      const createArgs = mockPrisma.journalEntry.create.mock.calls[0][0];
      expect(createArgs.data.reference).toBe('MY-MANUAL-REF-001');
    });
  });
});
