import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LedgerService } from '../application/ledger.service';
import { DecimalMoney } from '../domain/value-objects/decimal-money.value-object';

// ── Constants ────────────────────────────────────────────────────────────────
const TENANT_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const TENANT_B = 'bbbbbbbb-0000-0000-0000-000000000002';
const ACC_CASH    = 'acc-cash-0000-0000-0000-000000000001';
const ACC_REVENUE = 'acc-rev-00000-0000-0000-000000000002';
const ACC_EXPENSE = 'acc-exp-00000-0000-0000-000000000003';

// ── Helpers ──────────────────────────────────────────────────────────────────
const D = (n: number | string) => new Prisma.Decimal(n.toString());

function makeEntry(overrides: Partial<{ id: string; status: string }> = {}) {
  return {
    id: 'entry-001',
    tenantId: TENANT_A,
    reference: 'JE-2024-001',
    description: 'Test entry',
    date: new Date('2024-03-01'),
    status: 'DRAFT',
    postedAt: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lines: [],
    ...overrides,
  };
}

// ── Prisma mock ───────────────────────────────────────────────────────────────
function makePrismaMock() {
  return {
    journalEntry: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create:   jest.fn(),
      update:   jest.fn(),
    },
    account: {
      findMany: jest.fn(),
    },
    journalLine: {
      findMany: jest.fn(),
    },
  };
}

// ── Suite ─────────────────────────────────────────────────────────────────────
describe('LedgerService', () => {
  let service: LedgerService;
  let mockPrisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    mockPrisma = makePrismaMock();
    service = new LedgerService(mockPrisma as any);
    jest.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // assertBalancedDecimal — static pure function
  // ══════════════════════════════════════════════════════════════════════════
  describe('assertBalancedDecimal (static balance guard)', () => {

    it('accepts a simple balanced entry (1000 DR / 1000 CR)', () => {
      expect(() =>
        LedgerService.assertBalancedDecimal([
          { debit: 1000, credit: 0 },
          { debit: 0,    credit: 1000 },
        ]),
      ).not.toThrow();
    });

    it('accepts a multi-line balanced entry', () => {
      expect(() =>
        LedgerService.assertBalancedDecimal([
          { debit: 500.25, credit: 0 },
          { debit: 499.75, credit: 0 },
          { debit: 0, credit: 1000 },
        ]),
      ).not.toThrow();
    });

    // ── THE KEY TEST: demonstrates why float arithmetic is wrong ──────────────
    it('correctly validates 0.1 + 0.2 === 0.3 (would fail with JS native floats)', () => {
      // In native JS: 0.1 + 0.2 = 0.30000000000000004
      // Math.abs(0.30000000000000004 - 0.3) = 5.55e-17  (passes a 0.0001 threshold)
      // BUT: 33.33 + 33.33 + 33.34 = 100.00000000000001 with floats
      // Decimal.js handles all of these exactly.
      expect(() =>
        LedgerService.assertBalancedDecimal([
          { debit: 0.1, credit: 0 },
          { debit: 0.2, credit: 0 },
          { debit: 0,   credit: 0.3 },
        ]),
      ).not.toThrow();
    });

    it('correctly validates repeating decimals (33.33 + 33.33 + 33.34 = 100.00)', () => {
      expect(() =>
        LedgerService.assertBalancedDecimal([
          { debit: 33.33, credit: 0 },
          { debit: 33.33, credit: 0 },
          { debit: 33.34, credit: 0 },
          { debit: 0, credit: 100 },
        ]),
      ).not.toThrow();
    });

    it('rejects an unbalanced entry and throws UnprocessableEntityException', () => {
      expect(() =>
        LedgerService.assertBalancedDecimal([
          { debit: 1000, credit: 0 },
          { debit: 0,    credit: 999 },
        ]),
      ).toThrow(UnprocessableEntityException);
    });

    it('error message includes both the actual debit and credit totals', () => {
      try {
        LedgerService.assertBalancedDecimal([
          { debit: 100, credit: 0 },
          { debit: 0,   credit: 90 },
        ]);
        fail('Expected UnprocessableEntityException');
      } catch (e: any) {
        expect(e).toBeInstanceOf(UnprocessableEntityException);
        expect(e.message).toContain('100.0000');
        expect(e.message).toContain('90.0000');
      }
    });

    it('rejects a single-sided entry (only debits, no credits)', () => {
      expect(() =>
        LedgerService.assertBalancedDecimal([
          { debit: 500, credit: 0 },
          { debit: 300, credit: 0 },
        ]),
      ).toThrow(UnprocessableEntityException);
    });

    it('accepts a zero-value entry (degenerate but mathematically balanced)', () => {
      expect(() =>
        LedgerService.assertBalancedDecimal([
          { debit: 0, credit: 0 },
          { debit: 0, credit: 0 },
        ]),
      ).not.toThrow();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DecimalMoney value object
  // ══════════════════════════════════════════════════════════════════════════
  describe('DecimalMoney value object', () => {
    it('converts a JS number to Prisma.Decimal without float artifact', () => {
      const d = DecimalMoney.from(0.1);
      expect(d.equals(new Prisma.Decimal('0.1'))).toBe(true);
    });

    it('sums an array of numbers exactly', () => {
      const result = DecimalMoney.sum([0.1, 0.2]);
      expect(result.equals(new Prisma.Decimal('0.3'))).toBe(true);
    });

    it('passes through an existing Prisma.Decimal unchanged', () => {
      const existing = new Prisma.Decimal('123.4567');
      expect(DecimalMoney.from(existing)).toBe(existing);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // createEntry
  // ══════════════════════════════════════════════════════════════════════════
  describe('createEntry', () => {
    const validDto = {
      reference: 'JE-2024-001',
      description: 'Sale of goods',
      date: '2024-03-01',
      lines: [
        { accountId: ACC_CASH,    debit: 1000, credit: 0 },
        { accountId: ACC_REVENUE, debit: 0,    credit: 1000 },
      ],
    };

    const mockAccounts = [
      { id: ACC_CASH },
      { id: ACC_REVENUE },
    ];

    it('creates a balanced entry and calls prisma.journalEntry.create', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue(null);
      mockPrisma.account.findMany.mockResolvedValue(mockAccounts);
      mockPrisma.journalEntry.create.mockResolvedValue(makeEntry());

      const result = await service.createEntry(TENANT_A, validDto);

      expect(result).toBeDefined();
      expect(mockPrisma.journalEntry.create).toHaveBeenCalledTimes(1);

      // Verify lines are created with Decimal values
      const createArgs = mockPrisma.journalEntry.create.mock.calls[0][0];
      const firstLine = createArgs.data.lines.create[0];
      expect(firstLine.debit).toBeInstanceOf(Prisma.Decimal);
      expect(firstLine.debit.equals(D(1000))).toBe(true);
    });

    it('persists the tenantId from the parameter, not from user input', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue(null);
      mockPrisma.account.findMany.mockResolvedValue(mockAccounts);
      mockPrisma.journalEntry.create.mockResolvedValue(makeEntry());

      await service.createEntry(TENANT_A, validDto);

      const createArgs = mockPrisma.journalEntry.create.mock.calls[0][0];
      expect(createArgs.data.tenantId).toBe(TENANT_A);
    });

    it('throws UnprocessableEntityException for an unbalanced entry', async () => {
      const unbalancedDto = {
        ...validDto,
        lines: [
          { accountId: ACC_CASH,    debit: 1000, credit: 0 },
          { accountId: ACC_REVENUE, debit: 0,    credit: 800 }, // ← off by 200
        ],
      };

      await expect(service.createEntry(TENANT_A, unbalancedDto))
        .rejects.toThrow(UnprocessableEntityException);

      // DB must NOT be touched when the entry is invalid
      expect(mockPrisma.journalEntry.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.journalEntry.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException for a duplicate reference in the same tenant', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue(makeEntry());

      await expect(service.createEntry(TENANT_A, validDto))
        .rejects.toThrow(ConflictException);

      expect(mockPrisma.journalEntry.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when an account does not belong to this tenant', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue(null);
      // Only 1 account found even though 2 unique accountIds were requested
      mockPrisma.account.findMany.mockResolvedValue([{ id: ACC_CASH }]);

      await expect(service.createEntry(TENANT_A, validDto))
        .rejects.toThrow(BadRequestException);

      expect(mockPrisma.journalEntry.create).not.toHaveBeenCalled();
    });

    it('queries accounts scoped to the correct tenantId', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue(null);
      mockPrisma.account.findMany.mockResolvedValue(mockAccounts);
      mockPrisma.journalEntry.create.mockResolvedValue(makeEntry());

      await service.createEntry(TENANT_A, validDto);

      const accountQuery = mockPrisma.account.findMany.mock.calls[0][0];
      expect(accountQuery.where.tenantId).toBe(TENANT_A);
      expect(accountQuery.where.tenantId).not.toBe(TENANT_B);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // postEntry
  // ══════════════════════════════════════════════════════════════════════════
  describe('postEntry', () => {
    it('posts a DRAFT entry successfully', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue(makeEntry({ status: 'DRAFT' }));
      mockPrisma.journalEntry.update.mockResolvedValue(makeEntry({ status: 'POSTED' }));

      const result = await service.postEntry('entry-001', TENANT_A);
      expect(result.status).toBe('POSTED');

      const updateCall = mockPrisma.journalEntry.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe('POSTED');
      expect(updateCall.data.postedAt).toBeInstanceOf(Date);
    });

    it('throws BadRequestException when trying to post an already POSTED entry', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue(makeEntry({ status: 'POSTED' }));

      await expect(service.postEntry('entry-001', TENANT_A))
        .rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when entry does not exist in tenant', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue(null);

      await expect(service.postEntry('ghost-id', TENANT_A))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // voidEntry
  // ══════════════════════════════════════════════════════════════════════════
  describe('voidEntry', () => {
    it('voids a POSTED entry successfully', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue(makeEntry({ status: 'POSTED' }));
      mockPrisma.journalEntry.update.mockResolvedValue(makeEntry({ status: 'VOIDED' }));

      const result = await service.voidEntry('entry-001', TENANT_A);
      expect(result.status).toBe('VOIDED');
    });

    it('throws BadRequestException when trying to void an already VOIDED entry', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue(makeEntry({ status: 'VOIDED' }));

      await expect(service.voidEntry('entry-001', TENANT_A))
        .rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when trying to void a DRAFT entry', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue(makeEntry({ status: 'DRAFT' }));

      await expect(service.voidEntry('entry-001', TENANT_A))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // getTrialBalance
  // ══════════════════════════════════════════════════════════════════════════
  describe('getTrialBalance', () => {

    function makeLine(
      accountId: string,
      code: string,
      name: string,
      type: string,
      debit: number,
      credit: number,
    ) {
      return {
        id: `line-${accountId}-${debit}-${credit}`,
        journalEntryId: 'entry-001',
        accountId,
        debit: D(debit),
        credit: D(credit),
        account: { id: accountId, code, name, type },
      };
    }

    it('returns a balanced trial balance when debits equal credits', async () => {
      mockPrisma.journalLine.findMany.mockResolvedValue([
        makeLine(ACC_CASH,    '1001', 'Cash',    'ASSET',   1000, 0),
        makeLine(ACC_REVENUE, '4001', 'Revenue', 'REVENUE', 0,    1000),
      ]);

      const report = await service.getTrialBalance(TENANT_A, {});

      expect(report.totals.isBalanced).toBe(true);
      expect(report.totals.totalDebit).toBe('1000.0000');
      expect(report.totals.totalCredit).toBe('1000.0000');
      expect(report.lines).toHaveLength(2);
    });

    it('aggregates multiple lines for the same account', async () => {
      mockPrisma.journalLine.findMany.mockResolvedValue([
        makeLine(ACC_CASH, '1001', 'Cash', 'ASSET', 500,  0),
        makeLine(ACC_CASH, '1001', 'Cash', 'ASSET', 300,  0),
        makeLine(ACC_CASH, '1001', 'Cash', 'ASSET', 0,    200),
        makeLine(ACC_REVENUE, '4001', 'Revenue', 'REVENUE', 0, 600),
      ]);

      const report = await service.getTrialBalance(TENANT_A, {});

      expect(report.lines).toHaveLength(2);
      const cashLine = report.lines.find(l => l.accountCode === '1001')!;
      expect(cashLine.totalDebit).toBe('800.0000');
      expect(cashLine.totalCredit).toBe('200.0000');
      // ASSET normal balance = DEBIT → balance = debit - credit
      expect(cashLine.balance).toBe('600.0000');
      expect(cashLine.normalBalance).toBe('DEBIT');
    });

    it('assigns normalBalance=DEBIT for ASSET and EXPENSE accounts', async () => {
      mockPrisma.journalLine.findMany.mockResolvedValue([
        makeLine(ACC_CASH,    '1001', 'Cash',         'ASSET',   1000, 0),
        makeLine(ACC_EXPENSE, '5001', 'Office Costs', 'EXPENSE', 500,  0),
        makeLine(ACC_REVENUE, '4001', 'Revenue',      'REVENUE', 0,    1500),
      ]);

      const report = await service.getTrialBalance(TENANT_A, {});

      const assetLine   = report.lines.find(l => l.accountType === 'ASSET')!;
      const expenseLine = report.lines.find(l => l.accountType === 'EXPENSE')!;
      const revLine     = report.lines.find(l => l.accountType === 'REVENUE')!;

      expect(assetLine.normalBalance).toBe('DEBIT');
      expect(expenseLine.normalBalance).toBe('DEBIT');
      expect(revLine.normalBalance).toBe('CREDIT');
    });

    it('assigns normalBalance=CREDIT for LIABILITY, EQUITY, and REVENUE accounts', async () => {
      mockPrisma.journalLine.findMany.mockResolvedValue([
        makeLine('acc-eq',  '3001', 'Equity',    'EQUITY',    0, 500),
        makeLine('acc-lib', '2001', 'Loan',      'LIABILITY', 0, 300),
        makeLine(ACC_CASH,  '1001', 'Cash',      'ASSET',     800, 0),
      ]);

      const report = await service.getTrialBalance(TENANT_A, {});

      const equityLine    = report.lines.find(l => l.accountType === 'EQUITY')!;
      const liabilityLine = report.lines.find(l => l.accountType === 'LIABILITY')!;

      expect(equityLine.normalBalance).toBe('CREDIT');
      expect(liabilityLine.normalBalance).toBe('CREDIT');
    });

    it('sorts lines by account code ascending', async () => {
      mockPrisma.journalLine.findMany.mockResolvedValue([
        makeLine(ACC_REVENUE, '4001', 'Revenue', 'REVENUE', 0,   1000),
        makeLine(ACC_CASH,    '1001', 'Cash',    'ASSET',   600, 0),
        makeLine(ACC_EXPENSE, '5001', 'Expense', 'EXPENSE', 400, 0),
      ]);

      const report = await service.getTrialBalance(TENANT_A, {});

      expect(report.lines[0].accountCode).toBe('1001');
      expect(report.lines[1].accountCode).toBe('4001');
      expect(report.lines[2].accountCode).toBe('5001');
    });

    it('returns empty lines and isBalanced=true when no posted entries exist', async () => {
      mockPrisma.journalLine.findMany.mockResolvedValue([]);

      const report = await service.getTrialBalance(TENANT_A, {});

      expect(report.lines).toHaveLength(0);
      expect(report.totals.isBalanced).toBe(true);
      expect(report.totals.totalDebit).toBe('0.0000');
      expect(report.totals.totalCredit).toBe('0.0000');
    });

    it('passes dateFrom/dateTo filters into the Prisma query', async () => {
      mockPrisma.journalLine.findMany.mockResolvedValue([]);

      await service.getTrialBalance(TENANT_A, {
        dateFrom: '2024-01-01',
        dateTo:   '2024-12-31',
      });

      const where = mockPrisma.journalLine.findMany.mock.calls[0][0].where;
      expect(where.journalEntry.date.gte).toEqual(new Date('2024-01-01'));
      expect(where.journalEntry.date.lte).toEqual(new Date('2024-12-31'));
    });

    it('always scopes the query to the authenticated tenantId', async () => {
      mockPrisma.journalLine.findMany.mockResolvedValue([]);

      await service.getTrialBalance(TENANT_A, {});

      const where = mockPrisma.journalLine.findMany.mock.calls[0][0].where;
      expect(where.journalEntry.tenantId).toBe(TENANT_A);
      expect(where.journalEntry.tenantId).not.toBe(TENANT_B);
    });

    it('always scopes the query to POSTED status only', async () => {
      mockPrisma.journalLine.findMany.mockResolvedValue([]);

      await service.getTrialBalance(TENANT_A, {});

      const where = mockPrisma.journalLine.findMany.mock.calls[0][0].where;
      expect(where.journalEntry.status).toBe('POSTED');
    });

    it('reports contain the tenantId and generatedAt timestamp', async () => {
      mockPrisma.journalLine.findMany.mockResolvedValue([]);
      const before = new Date().toISOString();

      const report = await service.getTrialBalance(TENANT_A, {});

      expect(report.tenantId).toBe(TENANT_A);
      expect(report.generatedAt >= before).toBe(true);
    });

    // ── Decimal precision in trial balance ────────────────────────────────────
    it('aggregates decimal amounts precisely (no floating-point error)', async () => {
      // 3 lines of 33.33 + 33.33 + 33.34 should sum to exactly 100.00
      mockPrisma.journalLine.findMany.mockResolvedValue([
        makeLine(ACC_CASH,    '1001', 'Cash',    'ASSET',   33.33, 0),
        makeLine(ACC_CASH,    '1001', 'Cash',    'ASSET',   33.33, 0),
        makeLine(ACC_CASH,    '1001', 'Cash',    'ASSET',   33.34, 0),
        makeLine(ACC_REVENUE, '4001', 'Revenue', 'REVENUE', 0,     100),
      ]);

      const report = await service.getTrialBalance(TENANT_A, {});

      expect(report.totals.totalDebit).toBe('100.0000');
      expect(report.totals.totalCredit).toBe('100.0000');
      expect(report.totals.isBalanced).toBe(true);
    });
  });
});
