export enum Permission {
  // Wildcard — grants all routes within the tenant
  ADMIN_ALL = 'admin:*',

  // Users
  USER_READ  = 'user:read',
  USER_WRITE = 'user:write',

  // Chart of Accounts
  ACCOUNT_READ  = 'account:read',
  ACCOUNT_WRITE = 'account:write',

  // Journal Entries
  JOURNAL_READ  = 'journal:read',
  JOURNAL_WRITE = 'journal:write',
  JOURNAL_POST  = 'journal:post',
  JOURNAL_VOID  = 'journal:void',

  // Inventory
  INVENTORY_READ  = 'inventory:read',
  INVENTORY_WRITE = 'inventory:write',

  // Customers
  CUSTOMER_READ  = 'customer:read',
  CUSTOMER_WRITE = 'customer:write',

  // Invoices / Sales
  INVOICE_READ  = 'invoice:read',
  INVOICE_WRITE = 'invoice:write',
  INVOICE_ISSUE = 'invoice:issue',

  // AI Automation
  AI_USE = 'ai:use',

  // ── Ingeniería Civil ─────────────────────────────────────────────────────

  // Projects
  PROJECT_READ   = 'project:read',
  PROJECT_WRITE  = 'project:write',
  PROJECT_DELETE = 'project:delete',

  // APU (Análisis de Precios Unitarios)
  APU_READ  = 'apu:read',
  APU_WRITE = 'apu:write',

  // Official Budgets
  BUDGET_READ    = 'budget:read',
  BUDGET_WRITE   = 'budget:write',
  BUDGET_APPROVE = 'budget:approve',

  // Certificates (Actas de Avance)
  CERTIFICATE_READ    = 'certificate:read',
  CERTIFICATE_WRITE   = 'certificate:write',
  CERTIFICATE_APPROVE = 'certificate:approve',
  CERTIFICATE_PAY     = 'certificate:pay',

  // Liquidation
  LIQUIDATION_READ     = 'liquidation:read',
  LIQUIDATION_WRITE    = 'liquidation:write',
  LIQUIDATION_FINALIZE = 'liquidation:finalize',

  // Payroll / HR
  PAYROLL_READ    = 'payroll:read',
  PAYROLL_WRITE   = 'payroll:write',
  PAYROLL_APPROVE = 'payroll:approve',
  PAYROLL_PAY     = 'payroll:pay',

  // SECOP (public data — read-only by nature)
  SECOP_SEARCH = 'secop:search',

  // PDF generation
  PDF_GENERATE = 'pdf:generate',

  // Reports
  REPORTS_READ = 'reports:read',
}

// ── Predefined role sets ──────────────────────────────────────────────────────
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [Permission.ADMIN_ALL],

  // Contador: finance + all civil engineering modules (read+approve)
  ACCOUNTANT: [
    Permission.USER_READ,
    Permission.ACCOUNT_READ,
    Permission.ACCOUNT_WRITE,
    Permission.JOURNAL_READ,
    Permission.JOURNAL_WRITE,
    Permission.JOURNAL_POST,
    Permission.JOURNAL_VOID,
    Permission.INVENTORY_READ,
    Permission.CUSTOMER_READ,
    Permission.INVOICE_READ,
    Permission.INVOICE_ISSUE,
    Permission.AI_USE,
    Permission.PROJECT_READ,
    Permission.BUDGET_READ,
    Permission.BUDGET_APPROVE,
    Permission.CERTIFICATE_READ,
    Permission.CERTIFICATE_APPROVE,
    Permission.CERTIFICATE_PAY,
    Permission.LIQUIDATION_READ,
    Permission.LIQUIDATION_FINALIZE,
    Permission.PAYROLL_READ,
    Permission.PAYROLL_APPROVE,
    Permission.PAYROLL_PAY,
    Permission.PDF_GENERATE,
    Permission.REPORTS_READ,
  ],

  // Director de obra / Residente
  PROJECT_MANAGER: [
    Permission.PROJECT_READ,
    Permission.PROJECT_WRITE,
    Permission.APU_READ,
    Permission.APU_WRITE,
    Permission.BUDGET_READ,
    Permission.BUDGET_WRITE,
    Permission.BUDGET_APPROVE,
    Permission.CERTIFICATE_READ,
    Permission.CERTIFICATE_WRITE,
    Permission.CERTIFICATE_APPROVE,
    Permission.LIQUIDATION_READ,
    Permission.LIQUIDATION_WRITE,
    Permission.SECOP_SEARCH,
    Permission.PDF_GENERATE,
    Permission.INVENTORY_READ,
    Permission.CUSTOMER_READ,
  ],

  // Auxiliar de nómina / RRHH
  PAYROLL_MANAGER: [
    Permission.PAYROLL_READ,
    Permission.PAYROLL_WRITE,
    Permission.PAYROLL_APPROVE,
    Permission.PAYROLL_PAY,
    Permission.PDF_GENERATE,
    Permission.USER_READ,
  ],

  // Presupuestador
  ESTIMATOR: [
    Permission.APU_READ,
    Permission.APU_WRITE,
    Permission.BUDGET_READ,
    Permission.BUDGET_WRITE,
    Permission.PROJECT_READ,
    Permission.SECOP_SEARCH,
    Permission.PDF_GENERATE,
  ],

  INVENTORY_MANAGER: [
    Permission.INVENTORY_READ,
    Permission.INVENTORY_WRITE,
    Permission.ACCOUNT_READ,
  ],

  SALES_REP: [
    Permission.CUSTOMER_READ,
    Permission.CUSTOMER_WRITE,
    Permission.INVOICE_READ,
    Permission.INVOICE_WRITE,
    Permission.INVOICE_ISSUE,
    Permission.INVENTORY_READ,
  ],

  // Solo lectura de todo
  VIEWER: [
    Permission.ACCOUNT_READ,
    Permission.JOURNAL_READ,
    Permission.INVENTORY_READ,
    Permission.CUSTOMER_READ,
    Permission.INVOICE_READ,
    Permission.PROJECT_READ,
    Permission.APU_READ,
    Permission.BUDGET_READ,
    Permission.CERTIFICATE_READ,
    Permission.LIQUIDATION_READ,
    Permission.PAYROLL_READ,
    Permission.SECOP_SEARCH,
    Permission.REPORTS_READ,
  ],
};
