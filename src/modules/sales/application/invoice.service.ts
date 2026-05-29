import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { InventoryService } from '../../inventory/application/inventory.service';
import { CreateInvoiceDto } from '../domain/dto/create-invoice.dto';
import { IssueInvoiceDto } from '../domain/dto/issue-invoice.dto';

// ── Decimal helper ──────────────────────────────────────────────────────────
const D = (n: number | string | Prisma.Decimal): Prisma.Decimal =>
  n instanceof Prisma.Decimal ? n : new Prisma.Decimal(n.toString());

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  // ══════════════════════════════════════════════════════════════════════════
  // CRUD
  // ══════════════════════════════════════════════════════════════════════════

  findAll(tenantId: string, status?: InvoiceStatus) {
    return this.prisma.invoice.findMany({
      where: { tenantId, ...(status && { status }) },
      include: { customer: { select: { id: true, code: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        lines: {
          include: { inventoryItem: { select: { id: true, sku: true, name: true } } },
        },
        journalEntry: { include: { lines: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  /**
   * Creates an invoice in DRAFT status.
   * Totals (subtotal, taxAmount, total) are computed and persisted
   * from the provided lines so reports never need to re-aggregate.
   */
  async create(tenantId: string, dto: CreateInvoiceDto) {
    // number uniqueness
    const exists = await this.prisma.invoice.findFirst({
      where: { number: dto.number, tenantId },
    });
    if (exists) throw new ConflictException(`Invoice number "${dto.number}" already exists`);

    // customer belongs to tenant
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId, isActive: true },
    });
    if (!customer) throw new BadRequestException('Customer not found or inactive');

    // compute totals with Decimal precision
    const subtotal = D(
      dto.lines
        .reduce((s, l) => s.add(D(l.quantity).mul(D(l.unitPrice))), D(0))
        .toFixed(4),
    );
    const taxRate   = D(dto.taxRate ?? 0);
    const taxAmount = subtotal.mul(taxRate).toDecimalPlaces(4);
    const total     = subtotal.add(taxAmount);

    return this.prisma.invoice.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        number:    dto.number,
        dueDate:   dto.dueDate ? new Date(dto.dueDate) : undefined,
        taxRate,
        subtotal,
        taxAmount,
        total,
        notes:     dto.notes,
        lines: {
          create: dto.lines.map((l) => ({
            inventoryItemId: l.inventoryItemId,
            description:     l.description,
            quantity:        D(l.quantity),
            unitPrice:       D(l.unitPrice),
            subtotal:        D(l.quantity).mul(D(l.unitPrice)).toDecimalPlaces(4),
          })),
        },
      },
      include: { lines: true, customer: { select: { id: true, name: true } } },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ISSUE  —  the three-way atomic transaction
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Issues a DRAFT invoice in a single database transaction:
   *
   *   1. Reduces stock for every inventory-linked line (EXIT transaction + WAC snapshot).
   *   2. Generates a balanced, auto-POSTED journal entry:
   *        Dr  Accounts Receivable  =  invoice.total
   *        Cr  Revenue              =  invoice.subtotal
   *        Cr  Tax Payable (opt.)   =  invoice.taxAmount   [when taxAmount > 0]
   *   3. Updates the invoice to status = ISSUED and links the journal entry.
   *
   * If ANY step fails (e.g. insufficient stock, duplicate journal reference),
   * the entire transaction rolls back — no partial state is persisted.
   */
  async issueInvoice(id: string, tenantId: string, dto: IssueInvoiceDto) {
    // ── Pre-flight checks (outside transaction — fast-fail before locking rows) ──

    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { id: true, name: true } },
        lines: true,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException(
        `Invoice "${invoice.number}" is already ${invoice.status} and cannot be re-issued`,
      );
    }

    // Validate accounting accounts belong to this tenant
    await this.assertAccountsBelongToTenant(
      tenantId,
      [dto.arAccountId, dto.revenueAccountId, dto.taxAccountId].filter(Boolean) as string[],
    );

    // Tax guard: if invoice has tax but no taxAccountId is supplied, error early
    if (invoice.taxAmount.greaterThan(0) && !dto.taxAccountId) {
      throw new BadRequestException(
        'Invoice has a tax amount but no taxAccountId was provided — cannot generate a balanced journal entry',
      );
    }

    // Pre-load inventory items & verify stock (outside transaction for speed)
    const physicalLines = invoice.lines.filter((l) => l.inventoryItemId !== null);
    const preCheckedItems = await this.preCheckStock(physicalLines, tenantId);

    // ── Atomic transaction ────────────────────────────────────────────────────
    return this.prisma.$transaction(async (tx) => {
      // ── Step 1: Reduce stock for each physical line ───────────────────────
      for (const { line, item } of preCheckedItems) {
        // Re-fetch inside transaction (authoritative read)
        const freshItem = await tx.inventoryItem.findFirst({
          where: { id: item.id, tenantId },
        });
        if (!freshItem) throw new BadRequestException(`Item ${item.id} no longer exists`);

        const exitQty = line.quantity; // already a Prisma.Decimal from DB
        if (freshItem.quantityOnHand.lessThan(exitQty)) {
          throw new UnprocessableEntityException(
            `Insufficient stock for "${freshItem.sku}": ` +
              `available=${freshItem.quantityOnHand.toFixed(4)}, ` +
              `needed=${exitQty.toFixed(4)}`,
          );
        }

        const newQty    = freshItem.quantityOnHand.minus(exitQty);
        const totalCost = exitQty.mul(freshItem.costPrice);

        await tx.inventoryItem.update({
          where: { id: freshItem.id },
          data: { quantityOnHand: newQty, updatedAt: new Date() },
        });

        await tx.stockTransaction.create({
          data: {
            tenantId,
            inventoryItemId: freshItem.id,
            type:            'EXIT',
            quantity:        exitQty,
            unitCost:        freshItem.costPrice,
            totalCost,
            quantityBefore:  freshItem.quantityOnHand,
            wacBefore:       freshItem.costPrice,
            quantityAfter:   newQty,
            wacAfter:        freshItem.costPrice,
            reference:       `INV-${invoice.number}`,
            notes:           `Auto stock exit — invoice ${invoice.number}`,
          },
        });
      }

      // ── Step 2: Generate balanced journal entry ───────────────────────────
      // The entry is auto-POSTED (no manual approval needed for sales invoices)
      const journalRef = `JE-INV-${invoice.number}`;

      const journalLines = InvoiceService.buildJournalLines(invoice, dto);

      const journalEntry = await tx.journalEntry.create({
        data: {
          tenantId,
          reference:   journalRef,
          description: `Invoice ${invoice.number} — ${invoice.customer?.name ?? ''}`,
          date:        new Date(),
          status:      'POSTED',
          postedAt:    new Date(),
          lines:       { create: journalLines },
        },
        include: { lines: true },
      });

      // ── Step 3: Issue the invoice ─────────────────────────────────────────
      const issuedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          status:          'ISSUED',
          issueDate:       new Date(),
          journalEntryId:  journalEntry.id,
          arAccountId:     dto.arAccountId,
          revenueAccountId: dto.revenueAccountId,
          taxAccountId:    dto.taxAccountId,
        },
        include: {
          customer: true,
          lines: {
            include: { inventoryItem: { select: { id: true, sku: true, name: true } } },
          },
        },
      });

      return {
        invoice:        issuedInvoice,
        journalEntry,
        stockMovements: physicalLines.length,
      };
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Domain helpers (static = testable without DI)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Builds the journal lines for the invoice issue entry.
   *
   * Guaranteed balanced:
   *   DR Accounts Receivable = invoice.total   (subtotal + taxAmount)
   *   CR Revenue             = invoice.subtotal
   *   CR Tax Payable         = invoice.taxAmount  [only when > 0 and taxAccountId supplied]
   *
   * Both sides always sum to invoice.total.
   */
  static buildJournalLines(
    invoice: { total: Prisma.Decimal; subtotal: Prisma.Decimal; taxAmount: Prisma.Decimal; number: string },
    dto: IssueInvoiceDto,
  ) {
    const ZERO = new Prisma.Decimal(0);

    const lines: { accountId: string; description: string; debit: Prisma.Decimal; credit: Prisma.Decimal; order: number }[] = [
      // DR — Accounts Receivable
      {
        accountId:   dto.arAccountId,
        description: `AR — Invoice ${invoice.number}`,
        debit:       invoice.total,
        credit:      ZERO,
        order:       0,
      },
      // CR — Revenue
      {
        accountId:   dto.revenueAccountId,
        description: `Revenue — Invoice ${invoice.number}`,
        debit:       ZERO,
        credit:      invoice.subtotal,
        order:       1,
      },
    ];

    // CR — Tax Payable (only when applicable)
    if (invoice.taxAmount.greaterThan(0) && dto.taxAccountId) {
      lines.push({
        accountId:   dto.taxAccountId,
        description: `Tax Payable — Invoice ${invoice.number}`,
        debit:       ZERO,
        credit:      invoice.taxAmount,
        order:       2,
      });
    } else if (invoice.taxAmount.isZero()) {
      // No tax — Revenue credit already equals AR debit (balanced)
    }

    return lines;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async assertAccountsBelongToTenant(
    tenantId: string,
    accountIds: string[],
  ): Promise<void> {
    if (accountIds.length === 0) return;
    const found = await this.prisma.account.findMany({
      where: { id: { in: accountIds }, tenantId, isActive: true },
      select: { id: true },
    });
    if (found.length !== accountIds.length) {
      const foundIds = new Set(found.map((a) => a.id));
      const missing  = accountIds.filter((a) => !foundIds.has(a));
      throw new BadRequestException(
        `Accounts not found or inactive in this tenant: ${missing.join(', ')}`,
      );
    }
  }

  private async preCheckStock(
    physicalLines: { inventoryItemId: string | null; quantity: Prisma.Decimal }[],
    tenantId: string,
  ) {
    return Promise.all(
      physicalLines.map(async (line) => {
        const item = await this.prisma.inventoryItem.findFirst({
          where: { id: line.inventoryItemId!, tenantId, isActive: true },
        });
        if (!item) {
          throw new BadRequestException(
            `Inventory item ${line.inventoryItemId} not found or inactive`,
          );
        }
        if (item.quantityOnHand.lessThan(line.quantity)) {
          throw new UnprocessableEntityException(
            `Insufficient stock for "${item.sku}": ` +
              `available=${item.quantityOnHand.toFixed(4)}, ` +
              `needed=${line.quantity.toFixed(4)}`,
          );
        }
        return { line, item };
      }),
    );
  }
}
