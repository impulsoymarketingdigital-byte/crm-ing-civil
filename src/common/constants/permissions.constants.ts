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
}

// Predefined permission sets per system role
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [Permission.ADMIN_ALL],

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

  VIEWER: [
    Permission.ACCOUNT_READ,
    Permission.JOURNAL_READ,
    Permission.INVENTORY_READ,
    Permission.CUSTOMER_READ,
    Permission.INVOICE_READ,
  ],
};
