import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    tenantId: string,
    projectId?: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const filters: any = {};
    if (dateFrom || dateTo) {
      filters.dateRange = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    }

    const [
      projects,
      accounting,
      payroll,
      liquidations,
      vendors,
      inventory,
      invoices,
      taxes,
      balances,
    ] = await Promise.all([
      this.getProjectsReport(tenantId, projectId, filters.dateRange),
      this.getAccountingReport(tenantId, filters.dateRange),
      this.getPayrollReport(tenantId, filters.dateRange),
      this.getLiquidationReport(tenantId, projectId, filters.dateRange),
      this.getVendorsReport(tenantId, filters.dateRange),
      this.getInventoryReport(tenantId, filters.dateRange),
      this.getInvoicesReport(tenantId, filters.dateRange),
      this.getTaxesReport(tenantId, filters.dateRange),
      this.getBalancesReport(tenantId, filters.dateRange),
    ]);

    return {
      projects,
      accounting,
      payroll,
      liquidations,
      vendors,
      inventory,
      invoices,
      taxes,
      balances,
    };
  }

  private async getProjectsReport(tenantId: string, projectId?: string, dateRange?: any) {
    const whereClause: any = { tenantId };
    if (projectId) {
      whereClause.id = projectId;
    }
    if (dateRange) {
      whereClause.createdAt = dateRange;
    }

    const projectsList = await this.prisma.project.findMany({
      where: whereClause,
      include: {
        phases: true,
        budgets: true,
        certificates: {
          where: { status: 'APPROVED' },
        },
        disbursements: true,
        pettyCashFunds: {
          include: { transactions: true },
        },
      },
    });

    const report = projectsList.map((p) => {
      // Planned budget vs actual spent (from budget actualCosts)
      const budgetPlanned = p.budgets.reduce((s, b) => s + Number(b.totalCost), 0);
      const budgetActual = p.budgets.reduce((s, b) => s + Number(b.actualCost), 0);

      // Certified amount (Actas)
      const certifiedGross = p.certificates.reduce((s, c) => s + Number(c.grossAmount), 0);
      const certifiedNet = p.certificates.reduce((s, c) => s + Number(c.netAmount), 0);
      const certifiedRetention = p.certificates.reduce((s, c) => s + Number(c.retentionAmount), 0);

      // Direct spent from cash disbursements and petty cash transactions
      const directSpentDisbursements = p.disbursements.reduce((s, d) => s + Number(d.amount), 0);
      const directSpentPetty = p.pettyCashFunds.reduce(
        (s, f) => s + f.transactions.reduce((st, t) => st + Number(t.amount), 0),
        0,
      );
      const totalDirectSpent = directSpentDisbursements + directSpentPetty;

      // Completion progress percentage
      const totalPhases = p.phases.length;
      const avgActualProgress = totalPhases > 0 
        ? p.phases.reduce((s, ph) => s + Number(ph.actualPct), 0) / totalPhases 
        : 0;
      const avgPlannedProgress = totalPhases > 0 
        ? p.phases.reduce((s, ph) => s + Number(ph.plannedPct), 0) / totalPhases 
        : 0;

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        status: p.status,
        contractValue: Number(p.contractValue),
        adminAmount: Number(p.adminAmount),
        riskAmount: Number(p.riskAmount),
        profitAmount: Number(p.profitAmount),
        aiuAmount: Number(p.aiuAmount),
        totalValue: Number(p.totalValue),
        budgetPlanned,
        budgetActual,
        certifiedGross,
        certifiedNet,
        certifiedRetention,
        totalDirectSpent,
        progress: {
          actual: avgActualProgress,
          planned: avgPlannedProgress,
        },
      };
    });

    const totals = report.reduce(
      (acc, r) => ({
        contractValue: acc.contractValue + r.contractValue,
        totalValue: acc.totalValue + r.totalValue,
        budgetPlanned: acc.budgetPlanned + r.budgetPlanned,
        budgetActual: acc.budgetActual + r.budgetActual,
        certifiedGross: acc.certifiedGross + r.certifiedGross,
        certifiedNet: acc.certifiedNet + r.certifiedNet,
        certifiedRetention: acc.certifiedRetention + r.certifiedRetention,
        totalDirectSpent: acc.totalDirectSpent + r.totalDirectSpent,
      }),
      {
        contractValue: 0,
        totalValue: 0,
        budgetPlanned: 0,
        budgetActual: 0,
        certifiedGross: 0,
        certifiedNet: 0,
        certifiedRetention: 0,
        totalDirectSpent: 0,
      },
    );

    return { list: report, totals };
  }

  private async getAccountingReport(tenantId: string, dateRange?: any) {
    const whereClause: any = { tenantId };
    if (dateRange) {
      whereClause.date = dateRange;
    }

    const journalEntries = await this.prisma.journalEntry.findMany({
      where: whereClause,
      include: { lines: true },
    });

    const entriesCount = journalEntries.length;
    const statusCounts = journalEntries.reduce(
      (acc, j) => {
        acc[j.status] = (acc[j.status] || 0) + 1;
        return acc;
      },
      { DRAFT: 0, POSTED: 0, VOIDED: 0 } as Record<string, number>,
    );

    // Sum of all debits and credits from POSTED entries
    let totalDebit = 0;
    let totalCredit = 0;
    for (const j of journalEntries) {
      if (j.status === 'POSTED') {
        for (const l of j.lines) {
          totalDebit += Number(l.debit);
          totalCredit += Number(l.credit);
        }
      }
    }

    // Receipts and disbursements
    const receiptWhere: any = { tenantId };
    const disbWhere: any = { tenantId };
    if (dateRange) {
      receiptWhere.receiptDate = dateRange;
      disbWhere.disbursementDate = dateRange;
    }

    const [receipts, disbursements] = await Promise.all([
      this.prisma.cashReceipt.findMany({ where: receiptWhere }),
      this.prisma.cashDisbursement.findMany({ where: disbWhere }),
    ]);

    const totalReceiptsAmount = receipts.reduce((s, r) => s + (r.status === 'POSTED' ? Number(r.amount) : 0), 0);
    const totalDisbursementsAmount = disbursements.reduce((s, d) => s + (d.status === 'POSTED' ? Number(d.amount) : 0), 0);

    return {
      entries: {
        total: entriesCount,
        status: statusCounts,
        debitSum: totalDebit,
        creditSum: totalCredit,
      },
      cashFlow: {
        receiptsCount: receipts.length,
        receiptsAmount: totalReceiptsAmount,
        disbursementsCount: disbursements.length,
        disbursementsAmount: totalDisbursementsAmount,
        netCashFlow: totalReceiptsAmount - totalDisbursementsAmount,
      },
    };
  }

  private async getPayrollReport(tenantId: string, dateRange?: any) {
    const whereClause: any = { tenantId };
    if (dateRange) {
      whereClause.startDate = dateRange;
    }

    const periods = await this.prisma.payrollPeriod.findMany({
      where: whereClause,
      include: { employee: true },
    });

    const sumField = (fieldName: string) =>
      periods.reduce((s, p) => s + Number((p as any)[fieldName] || 0), 0);

    const totals = {
      baseSalary: sumField('baseSalary'),
      transportAllowance: sumField('transportAllowance'),
      overtime: sumField('overtimeDayPct25') + sumField('overtimeNightPct75') + sumField('overtimeHolidayPct75') + sumField('overtimeHolidayPct100'),
      bonuses: sumField('bonuses'),
      totalEarned: sumField('totalEarned'),
      healthEmployee: sumField('healthEmployee'),
      pensionEmployee: sumField('pensionEmployee'),
      totalDeductions: sumField('totalDeductions'),
      netPay: sumField('netPay'),
      prestations: {
        prima: sumField('prima'),
        cesantias: sumField('cesantias'),
        interesesCesantias: sumField('interesesCesantias'),
        vacaciones: sumField('vacaciones'),
        total: sumField('prima') + sumField('cesantias') + sumField('interesesCesantias') + sumField('vacaciones'),
      },
      employerContrib: {
        healthEmployer: sumField('healthEmployer'),
        pensionEmployer: sumField('pensionEmployer'),
        arl: sumField('arl'),
        sena: sumField('sena'),
        icbf: sumField('icbf'),
        compensationBox: sumField('compensationBox'),
        total: sumField('totalEmployerContrib'),
      },
      totalLaborCost: sumField('totalLaborCost'),
    };

    return {
      periodsCount: periods.length,
      totals,
    };
  }

  private async getLiquidationReport(tenantId: string, projectId?: string, dateRange?: any) {
    const whereClause: any = { tenantId };
    if (projectId) {
      whereClause.projectId = projectId;
    }
    if (dateRange) {
      whereClause.liquidationDate = dateRange;
    }

    const liquidations = await this.prisma.projectLiquidation.findMany({
      where: whereClause,
      include: { project: true },
    });

    const sumField = (fieldName: string) =>
      liquidations.reduce((s, l) => s + Number((l as any)[fieldName] || 0), 0);

    return {
      count: liquidations.length,
      totals: {
        contractValue: sumField('contractValue'),
        additionsValue: sumField('additionsValue'),
        totalContractValue: sumField('totalContractValue'),
        totalExecuted: sumField('totalExecuted'),
        totalRetained: sumField('totalRetained'),
        totalDeductions: sumField('totalDeductions'),
        netBalance: sumField('netBalance'),
      },
      list: liquidations.map((l) => ({
        id: l.id,
        projectCode: l.project.code,
        projectName: l.project.name,
        liquidationDate: l.liquidationDate,
        status: l.status,
        netBalance: Number(l.netBalance),
      })),
    };
  }

  private async getVendorsReport(tenantId: string, dateRange?: any) {
    const invoiceWhere: any = { tenantId };
    const paymentWhere: any = { tenantId };
    if (dateRange) {
      invoiceWhere.issueDate = dateRange;
      paymentWhere.paymentDate = dateRange;
    }

    const [invoices, payments, vendors] = await Promise.all([
      this.prisma.purchaseInvoice.findMany({ where: invoiceWhere }),
      this.prisma.vendorPayment.findMany({ where: paymentWhere }),
      this.prisma.vendor.findMany({ where: { tenantId } }),
    ]);

    const invoiceTotals = invoices.reduce(
      (acc, inv) => {
        acc.total += Number(inv.total);
        acc.paidAmount += Number(inv.paidAmount);
        acc.balance += Number(inv.balance);
        acc.status[inv.status] = (acc.status[inv.status] || 0) + 1;
        return acc;
      },
      {
        total: 0,
        paidAmount: 0,
        balance: 0,
        status: { PENDING: 0, PARTIAL: 0, PAID: 0, VOID: 0 } as Record<string, number>,
      },
    );

    const totalPaidAmount = payments.reduce((s, p) => s + Number(p.amount), 0);

    return {
      vendorsCount: vendors.length,
      invoices: {
        count: invoices.length,
        ...invoiceTotals,
      },
      payments: {
        count: payments.length,
        totalAmount: totalPaidAmount,
      },
    };
  }

  private async getInventoryReport(tenantId: string, dateRange?: any) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { tenantId, isActive: true },
    });

    const totalItems = items.length;
    const totalValue = items.reduce((s, item) => s + Number(item.quantityOnHand) * Number(item.costPrice), 0);
    const lowStockItems = items.filter((item) => Number(item.quantityOnHand) <= Number(item.reorderPoint));

    const transWhere: any = { tenantId };
    if (dateRange) {
      transWhere.createdAt = dateRange;
    }
    const transactions = await this.prisma.stockTransaction.findMany({
      where: transWhere,
    });

    const transactionTypes = transactions.reduce(
      (acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + 1;
        return acc;
      },
      { ENTRY: 0, EXIT: 0 } as Record<string, number>,
    );

    return {
      totalItems,
      totalValue,
      lowStockCount: lowStockItems.length,
      lowStockList: lowStockItems.map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        quantity: Number(item.quantityOnHand),
        reorderPoint: Number(item.reorderPoint),
      })),
      transactions: {
        total: transactions.length,
        types: transactionTypes,
      },
    };
  }

  private async getInvoicesReport(tenantId: string, dateRange?: any) {
    const whereClause: any = { tenantId };
    if (dateRange) {
      whereClause.issueDate = dateRange;
    }

    const invoices = await this.prisma.invoice.findMany({
      where: whereClause,
    });

    const totals = invoices.reduce(
      (acc, inv) => {
        acc.subtotal += Number(inv.subtotal);
        acc.taxAmount += Number(inv.taxAmount);
        acc.total += Number(inv.total);
        acc.status[inv.status] = (acc.status[inv.status] || 0) + 1;
        return acc;
      },
      {
        subtotal: 0,
        taxAmount: 0,
        total: 0,
        status: { DRAFT: 0, ISSUED: 0, PAID: 0, VOIDED: 0 } as Record<string, number>,
      },
    );

    return {
      count: invoices.length,
      totals,
    };
  }

  private async getTaxesReport(tenantId: string, dateRange?: any) {
    const whereClause: any = { tenantId };
    if (dateRange) {
      whereClause.dueDate = dateRange;
    }

    const obligations = await this.prisma.taxObligation.findMany({
      where: whereClause,
    });

    const statusCounts = obligations.reduce(
      (acc, ob) => {
        acc[ob.status] = (acc[ob.status] || 0) + 1;
        return acc;
      },
      { PENDING: 0, PAID: 0, OVERDUE: 0 } as Record<string, number>,
    );

    const sumField = (status: string) =>
      obligations.filter((o) => o.status === status).reduce((s, o) => s + Number(o.amount), 0);

    const typeBreakdown = obligations.reduce((acc, o) => {
      acc[o.type] ??= { amount: 0, paid: 0 };
      acc[o.type].amount += Number(o.amount);
      if (o.status === 'PAID') {
        acc[o.type].paid += Number(o.paidAmount || o.amount);
      }
      return acc;
    }, {} as Record<string, { amount: number; paid: number }>);

    return {
      count: obligations.length,
      status: statusCounts,
      totals: {
        pendingAmount: sumField('PENDING') + sumField('OVERDUE'),
        paidAmount: sumField('PAID'),
        totalAmount: obligations.reduce((s, o) => s + Number(o.amount), 0),
      },
      breakdown: typeBreakdown,
    };
  }

  private async getBalancesReport(tenantId: string, dateRange?: any) {
    // Generate simple trial balance totals by account type
    const journalLines = await this.prisma.journalLine.findMany({
      where: {
        journalEntry: {
          tenantId,
          status: 'POSTED',
          ...(dateRange && { date: dateRange }),
        },
      },
      include: { account: true },
    });

    const totalsByType = journalLines.reduce(
      (acc, l) => {
        const type = l.account.type;
        acc[type] ??= { debit: 0, credit: 0 };
        acc[type].debit += Number(l.debit);
        acc[type].credit += Number(l.credit);
        return acc;
      },
      {
        ASSET: { debit: 0, credit: 0 },
        LIABILITY: { debit: 0, credit: 0 },
        EQUITY: { debit: 0, credit: 0 },
        REVENUE: { debit: 0, credit: 0 },
        EXPENSE: { debit: 0, credit: 0 },
      } as Record<string, { debit: number; credit: number }>,
    );

    return {
      totalsByType,
      totalDebit: journalLines.reduce((s, l) => s + Number(l.debit), 0),
      totalCredit: journalLines.reduce((s, l) => s + Number(l.credit), 0),
    };
  }
}
