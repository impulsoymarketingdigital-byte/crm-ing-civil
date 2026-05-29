export type NormalBalance = 'DEBIT' | 'CREDIT';

export interface TrialBalanceLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  normalBalance: NormalBalance;
  /** Formatted to 4 decimal places */
  totalDebit: string;
  totalCredit: string;
  /** |totalDebit - totalCredit| expressed on the normal-balance side */
  balance: string;
}

export interface TrialBalanceTotals {
  totalDebit: string;
  totalCredit: string;
  /** True when Σ debit === Σ credit across all accounts */
  isBalanced: boolean;
}

export interface TrialBalanceReport {
  tenantId: string;
  generatedAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  lines: TrialBalanceLine[];
  totals: TrialBalanceTotals;
}
