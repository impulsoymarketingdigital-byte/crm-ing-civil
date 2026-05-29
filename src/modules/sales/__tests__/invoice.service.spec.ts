import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InvoiceService } from '../application/invoice.service';

// ── Helpers ───────────────────────────────────────────────────────────────────
const D = (n: number | string) => new Prisma.Decimal(n.toString());

const TENANT_A   = 'tenant-aa-0000-0000-0000-000000000001';
const TENANT_B   = 'tenant-bb-0000-0000-0000-000000000002';
const INVOICE_ID = 'inv-00000-0000-0000-0000-000000000001';
const ITEM_ID    = 'item-0000-0000-0000-0000-000000000001';
const AR_ACC     = 'acc-ar-00-0000-0000-0000-000000000001';
const REV_ACC    = 'acc-rev-0-0000-0000-0000-000000000002';
const TAX_ACC    = 'acc-tax-0-0000-0000-0000-000000000003';
const CUST_ID    = 'cust-000-0000-0000-0000-000000000001';

function makeInvoice(overrides: Partial<{
  status: string;
  subtotal: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  total: Prisma.Decimal;
  taxRate: Prisma.Decimal;
  lines: any[];
}> = {}) {
  const subtotal  = overrides.subtotal  ?? D('1000.00');
  const taxAmount = overrides.taxAmount ?? D(0);
  const total     = overrides.total     ?? subtotal.add(taxAmount);
  return {
    id:         INVOICE_ID,
    tenantId:   TENANT_A,
    customerId: CUST_ID,
    number:     'FAC-2024-001',
    status:     overrides.status   ?? 'DRAFT',
    issueDate:  null,
    dueDate:    null,
    subtotal,
    taxRate:    overrides.taxRate  ?? D(0),
    taxAmount,
    total,
    notes:      null,
    journalEntryId: null,
    arAccountId:    null,
    revenueAccountId: null,
    taxAccountId:   null,
    createdAt:  new Date(),
    updatedAt:  new Date(),
    customer:   { id: CUST_ID, name: 'ACME Corp' },
    lines:      overrides.lines ?? [
      {
        id:              'line-001',
        invoiceId:       INVOICE_ID,
        inventoryItemId: ITEM_ID,
        description:     'Widget A',
        quantity:        D(10),
        unitPrice:       D('100.00'),
        subtotal:        D('1000.00'),
      },
    ],
  };
}

function makeInventoryItem(qty = 50, wac = '10.00') {
  return {
    id:              ITEM_ID,
    tenantId:        TENANT_A,
    sku:             'SKU-001',
    name:            'Widget A',
    type:            'PRODUCT',
    costPrice:       D(wac),
    quantityOnHand:  D(qty),
    sellingPrice:    D('15.00'),
    reorderPoint:    D(5),
    isActive:        true,
    updatedAt:       new Date(),
  };
}

// ── Prisma mock ───────────────────────────────────────────────────────────────
function makePrisma() {
  const mock = {
    invoice: {
      findFirst: jest.fn(),
      findMany:  jest.fn(),
      create:    jest.fn(),
      update:    jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
      findMany:  jest.fn(),
      create:    jest.fn(),
      update:    jest.fn(),
    },
    account: {
      findMany: jest.fn(),
    },
    inventoryItem: {
      findFirst: jest.fn(),
      update:    jest.fn(),
    },
    stockTransaction: {
      create: jest.fn(),
    },
    journalEntry: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  mock.$transaction.mockImplementation(async (cb: (tx: typeof mock) => any) => cb(mock));
  return mock;
}

// ══════════════════════════════════════════════════════════════════════════════
describe('InvoiceService', () => {
  let service: InvoiceService;
  let mockPrisma: ReturnType<typeof makePrisma>;

  const issueDto = { arAccountId: AR_ACC, revenueAccountId: REV_ACC };

  beforeEach(() => {
    mockPrisma = makePrisma();
    service = new InvoiceService(mockPrisma as any);
    // Rewire after clearAllMocks
    mockPrisma.$transaction.mockImplementation(
      async (cb: (tx: typeof mockPrisma) => any) => cb(mockPrisma),
    );
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      async (cb: (tx: typeof mockPrisma) => any) => cb(mockPrisma),
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  // buildJournalLines  (static pure function)
  // ══════════════════════════════════════════════════════════════════════════
  describe('buildJournalLines (static)', () => {
    const inv = { total: D('1000.00'), subtotal: D('1000.00'), taxAmount: D(0), number: 'FAC-001' };

    it('produces a two-line balanced entry (DR AR = CR Revenue) when no tax', () => {
      const lines = InvoiceService.buildJournalLines(inv, { arAccountId: AR_ACC, revenueAccountId: REV_ACC });

      expect(lines).toHaveLength(2);
      const totalDR = lines.reduce((s, l) => s.add(l.debit),  new Prisma.Decimal(0));
      const totalCR = lines.reduce((s, l) => s.add(l.credit), new Prisma.Decimal(0));
      expect(totalDR.equals(totalCR)).toBe(true);
    });

    it('DR Accounts Receivable equals invoice.total', () => {
      const lines = InvoiceService.buildJournalLines(inv, { arAccountId: AR_ACC, revenueAccountId: REV_ACC });
      const arLine = lines.find((l) => l.accountId === AR_ACC)!;
      expect(arLine.debit.equals(inv.total)).toBe(true);
      expect(arLine.credit.equals(new Prisma.Decimal(0))).toBe(true);
    });

    it('CR Revenue equals invoice.subtotal', () => {
      const lines = InvoiceService.buildJournalLines(inv, { arAccountId: AR_ACC, revenueAccountId: REV_ACC });
      const revLine = lines.find((l) => l.accountId === REV_ACC)!;
      expect(revLine.credit.equals(inv.subtotal)).toBe(true);
      expect(revLine.debit.equals(new Prisma.Decimal(0))).toBe(true);
    });

    it('adds a CR Tax Payable line when taxAmount > 0 and taxAccountId is given', () => {
      const taxedInv = {
        total:     D('1190.00'),
        subtotal:  D('1000.00'),
        taxAmount: D('190.00'),
        number:    'FAC-002',
      };
      const lines = InvoiceService.buildJournalLines(taxedInv, {
        arAccountId: AR_ACC, revenueAccountId: REV_ACC, taxAccountId: TAX_ACC,
      });

      expect(lines).toHaveLength(3);
      const taxLine = lines.find((l) => l.accountId === TAX_ACC)!;
      expect(taxLine).toBeDefined();
      expect(taxLine.credit.equals(D('190.00'))).toBe(true);
    });

    it('three-line entry is balanced: DR AR = CR Revenue + CR Tax', () => {
      const taxedInv = { total: D('1190.00'), subtotal: D('1000.00'), taxAmount: D('190.00'), number: 'FAC-002' };
      const lines = InvoiceService.buildJournalLines(taxedInv, {
        arAccountId: AR_ACC, revenueAccountId: REV_ACC, taxAccountId: TAX_ACC,
      });
      const totalDR = lines.reduce((s, l) => s.add(l.debit),  new Prisma.Decimal(0));
      const totalCR = lines.reduce((s, l) => s.add(l.credit), new Prisma.Decimal(0));
      expect(totalDR.equals(totalCR)).toBe(true);
      expect(totalDR.equals(D('1190.00'))).toBe(true);
    });

    it('does NOT add Tax Payable line when taxAmount is 0', () => {
      const lines = InvoiceService.buildJournalLines(inv, {
        arAccountId: AR_ACC, revenueAccountId: REV_ACC, taxAccountId: TAX_ACC,
      });
      expect(lines).toHaveLength(2);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // create
  // ══════════════════════════════════════════════════════════════════════════
  describe('create', () => {
    const dto = {
      customerId: CUST_ID,
      number:     'FAC-2024-001',
      taxRate:    0,
      lines: [
        { inventoryItemId: ITEM_ID, description: 'Widget', quantity: 10, unitPrice: 100 },
      ],
    };

    it('creates a DRAFT invoice with computed subtotal / total', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.customer.findFirst.mockResolvedValue({ id: CUST_ID, name: 'ACME', isActive: true });
      mockPrisma.invoice.create.mockResolvedValue(makeInvoice());

      await service.create(TENANT_A, dto);

      const createArgs = mockPrisma.invoice.create.mock.calls[0][0];
      expect(createArgs.data.subtotal.equals(D('1000.0000'))).toBe(true);
      expect(createArgs.data.total.equals(D('1000.0000'))).toBe(true);
      expect(createArgs.data.status).toBeUndefined(); // defaults to DRAFT via Prisma schema
    });

    it('computes taxAmount correctly when taxRate > 0', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.customer.findFirst.mockResolvedValue({ id: CUST_ID, isActive: true });
      mockPrisma.invoice.create.mockResolvedValue(makeInvoice());

      await service.create(TENANT_A, { ...dto, taxRate: 0.19 });

      const createArgs = mockPrisma.invoice.create.mock.calls[0][0];
      expect(createArgs.data.taxAmount.toFixed(4)).toBe('190.0000');
      expect(createArgs.data.total.toFixed(4)).toBe('1190.0000');
    });

    it('throws ConflictException when invoice number already exists', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(makeInvoice());

      await expect(service.create(TENANT_A, dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when customer does not belong to tenant', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.customer.findFirst.mockResolvedValue(null); // not found

      await expect(service.create(TENANT_A, dto)).rejects.toThrow(BadRequestException);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // issueInvoice  —  the three-way atomic transaction
  // ══════════════════════════════════════════════════════════════════════════
  describe('issueInvoice', () => {
    function setupHappyPath(itemQty = 50) {
      const invoice = makeInvoice();
      const item    = makeInventoryItem(itemQty);
      const accounts = [{ id: AR_ACC }, { id: REV_ACC }];

      mockPrisma.invoice.findFirst.mockResolvedValue(invoice);
      mockPrisma.account.findMany.mockResolvedValue(accounts);
      mockPrisma.inventoryItem.findFirst.mockResolvedValue(item); // used in both preCheck + TX
      mockPrisma.inventoryItem.update.mockResolvedValue({ ...item, quantityOnHand: D(40) });
      mockPrisma.stockTransaction.create.mockResolvedValue({ id: 'st-001' });
      mockPrisma.journalEntry.create.mockResolvedValue({
        id: 'je-001', reference: 'JE-INV-FAC-2024-001', lines: [],
      });
      mockPrisma.invoice.update.mockResolvedValue({ ...invoice, status: 'ISSUED', journalEntryId: 'je-001' });

      return { invoice, item };
    }

    // ── Happy path ────────────────────────────────────────────────────────────
    it('returns { invoice, journalEntry, stockMovements } on success', async () => {
      setupHappyPath();
      const result = await service.issueInvoice(INVOICE_ID, TENANT_A, issueDto);

      expect(result.invoice.status).toBe('ISSUED');
      expect(result.journalEntry).toBeDefined();
      expect(result.stockMovements).toBe(1);
    });

    it('all three DB operations execute inside a single $transaction', async () => {
      setupHappyPath();
      await service.issueInvoice(INVOICE_ID, TENANT_A, issueDto);

      // The transaction callback must have been called
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      // All writes happen inside the transaction
      expect(mockPrisma.inventoryItem.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.stockTransaction.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.journalEntry.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.invoice.update).toHaveBeenCalledTimes(1);
    });

    // ── Journal entry correctness ─────────────────────────────────────────────
    it('generated journal entry is POSTED (not DRAFT)', async () => {
      setupHappyPath();
      await service.issueInvoice(INVOICE_ID, TENANT_A, issueDto);

      const jeArgs = mockPrisma.journalEntry.create.mock.calls[0][0];
      expect(jeArgs.data.status).toBe('POSTED');
      expect(jeArgs.data.postedAt).toBeInstanceOf(Date);
    });

    it('journal entry is balanced: DR = CR', async () => {
      setupHappyPath();
      await service.issueInvoice(INVOICE_ID, TENANT_A, issueDto);

      const lines   = mockPrisma.journalEntry.create.mock.calls[0][0].data.lines.create;
      const totalDR = lines.reduce((s: Prisma.Decimal, l: any) => s.add(l.debit),  new Prisma.Decimal(0));
      const totalCR = lines.reduce((s: Prisma.Decimal, l: any) => s.add(l.credit), new Prisma.Decimal(0));
      expect(totalDR.equals(totalCR)).toBe(true);
    });

    it('DR Accounts Receivable = invoice.total', async () => {
      const { invoice } = setupHappyPath();
      await service.issueInvoice(INVOICE_ID, TENANT_A, issueDto);

      const lines  = mockPrisma.journalEntry.create.mock.calls[0][0].data.lines.create;
      const arLine = lines.find((l: any) => l.accountId === AR_ACC);
      expect(arLine.debit.equals(invoice.total)).toBe(true);
    });

    it('CR Revenue = invoice.subtotal', async () => {
      const { invoice } = setupHappyPath();
      await service.issueInvoice(INVOICE_ID, TENANT_A, issueDto);

      const lines   = mockPrisma.journalEntry.create.mock.calls[0][0].data.lines.create;
      const revLine = lines.find((l: any) => l.accountId === REV_ACC);
      expect(revLine.credit.equals(invoice.subtotal)).toBe(true);
    });

    it('journal entry reference follows pattern JE-INV-{invoiceNumber}', async () => {
      setupHappyPath();
      await service.issueInvoice(INVOICE_ID, TENANT_A, issueDto);

      const jeArgs = mockPrisma.journalEntry.create.mock.calls[0][0];
      expect(jeArgs.data.reference).toBe('JE-INV-FAC-2024-001');
    });

    // ── Stock operations ──────────────────────────────────────────────────────
    it('reduces inventory quantityOnHand by the invoiced quantity', async () => {
      setupHappyPath(50);
      await service.issueInvoice(INVOICE_ID, TENANT_A, issueDto);

      const updateArgs = mockPrisma.inventoryItem.update.mock.calls[0][0];
      // Invoice line qty = 10, item had 50 → new qty = 40
      expect(updateArgs.data.quantityOnHand.equals(D(40))).toBe(true);
    });

    it('creates a stock EXIT transaction with correct COGS (qty × WAC)', async () => {
      setupHappyPath(50);  // item WAC = 10.00, exit qty = 10 → COGS = 100.00
      await service.issueInvoice(INVOICE_ID, TENANT_A, issueDto);

      const stArgs = mockPrisma.stockTransaction.create.mock.calls[0][0].data;
      expect(stArgs.type).toBe('EXIT');
      expect(stArgs.quantity.equals(D(10))).toBe(true);
      expect(stArgs.totalCost.equals(D('100.0000'))).toBe(true); // 10 × 10.00
    });

    it('WAC does not change on stock exit (costPrice NOT in inventoryItem.update)', async () => {
      setupHappyPath();
      await service.issueInvoice(INVOICE_ID, TENANT_A, issueDto);

      const updateArgs = mockPrisma.inventoryItem.update.mock.calls[0][0];
      expect(updateArgs.data.costPrice).toBeUndefined();
    });

    it('invoice.update sets journalEntryId from the created entry', async () => {
      setupHappyPath();
      await service.issueInvoice(INVOICE_ID, TENANT_A, issueDto);

      const invUpdate = mockPrisma.invoice.update.mock.calls[0][0];
      expect(invUpdate.data.journalEntryId).toBe('je-001');
      expect(invUpdate.data.status).toBe('ISSUED');
      expect(invUpdate.data.issueDate).toBeInstanceOf(Date);
    });

    // ── Guard: non-DRAFT invoice ──────────────────────────────────────────────
    it('throws BadRequestException when invoice is already ISSUED', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(makeInvoice({ status: 'ISSUED' }));

      await expect(service.issueInvoice(INVOICE_ID, TENANT_A, issueDto))
        .rejects.toThrow(BadRequestException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when invoice is VOIDED', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(makeInvoice({ status: 'VOIDED' }));

      await expect(service.issueInvoice(INVOICE_ID, TENANT_A, issueDto))
        .rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when invoice does not exist', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.issueInvoice(INVOICE_ID, TENANT_A, issueDto))
        .rejects.toThrow(NotFoundException);
    });

    // ── Guard: insufficient stock aborts the whole transaction ────────────────
    it('throws UnprocessableEntityException when stock is insufficient', async () => {
      const invoice = makeInvoice(); // line qty = 10
      const item    = makeInventoryItem(5); // only 5 in stock
      mockPrisma.invoice.findFirst.mockResolvedValue(invoice);
      mockPrisma.account.findMany.mockResolvedValue([{ id: AR_ACC }, { id: REV_ACC }]);
      mockPrisma.inventoryItem.findFirst.mockResolvedValue(item);

      await expect(service.issueInvoice(INVOICE_ID, TENANT_A, issueDto))
        .rejects.toThrow(UnprocessableEntityException);

      // None of the three write operations should have been called
      expect(mockPrisma.inventoryItem.update).not.toHaveBeenCalled();
      expect(mockPrisma.journalEntry.create).not.toHaveBeenCalled();
      expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    });

    it('error message contains available and needed quantities', async () => {
      const invoice = makeInvoice();
      mockPrisma.invoice.findFirst.mockResolvedValue(invoice);
      mockPrisma.account.findMany.mockResolvedValue([{ id: AR_ACC }, { id: REV_ACC }]);
      mockPrisma.inventoryItem.findFirst.mockResolvedValue(makeInventoryItem(3));

      try {
        await service.issueInvoice(INVOICE_ID, TENANT_A, issueDto);
        fail('Expected UnprocessableEntityException');
      } catch (e: any) {
        expect(e).toBeInstanceOf(UnprocessableEntityException);
        expect(e.message).toContain('3.0000');  // available
        expect(e.message).toContain('10.0000'); // needed
      }
    });

    // ── Guard: tax without taxAccountId ───────────────────────────────────────
    it('throws BadRequestException when invoice has tax but taxAccountId is missing', async () => {
      const taxedInvoice = makeInvoice({
        subtotal:  D('1000.00'),
        taxAmount: D('190.00'),
        total:     D('1190.00'),
        taxRate:   D('0.19'),
      });
      mockPrisma.invoice.findFirst.mockResolvedValue(taxedInvoice);
      mockPrisma.account.findMany.mockResolvedValue([{ id: AR_ACC }, { id: REV_ACC }]);

      // No taxAccountId in issueDto
      await expect(service.issueInvoice(INVOICE_ID, TENANT_A, issueDto))
        .rejects.toThrow(BadRequestException);
    });

    // ── Tenant isolation ──────────────────────────────────────────────────────
    it('invoice lookup is scoped to the authenticated tenantId', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      await service.issueInvoice(INVOICE_ID, TENANT_A, issueDto).catch(() => {});

      const query = mockPrisma.invoice.findFirst.mock.calls[0][0];
      expect(query.where.tenantId).toBe(TENANT_A);
      expect(query.where.tenantId).not.toBe(TENANT_B);
    });

    // ── Service lines (no inventoryItemId) ───────────────────────────────────
    it('skips stock operations for service/non-inventory lines', async () => {
      const serviceOnlyInvoice = makeInvoice({
        lines: [
          {
            id:              'line-svc',
            invoiceId:       INVOICE_ID,
            inventoryItemId: null, // ← service line, no inventory
            description:     'Consulting',
            quantity:        D(1),
            unitPrice:       D('500.00'),
            subtotal:        D('500.00'),
          },
        ],
      });

      mockPrisma.invoice.findFirst.mockResolvedValue(serviceOnlyInvoice);
      mockPrisma.account.findMany.mockResolvedValue([{ id: AR_ACC }, { id: REV_ACC }]);
      mockPrisma.journalEntry.create.mockResolvedValue({ id: 'je-001', lines: [] });
      mockPrisma.invoice.update.mockResolvedValue({ ...serviceOnlyInvoice, status: 'ISSUED' });

      const result = await service.issueInvoice(INVOICE_ID, TENANT_A, issueDto);

      expect(result.stockMovements).toBe(0);
      expect(mockPrisma.inventoryItem.update).not.toHaveBeenCalled();
      expect(mockPrisma.stockTransaction.create).not.toHaveBeenCalled();
      // Journal entry still created
      expect(mockPrisma.journalEntry.create).toHaveBeenCalledTimes(1);
    });
  });
});
