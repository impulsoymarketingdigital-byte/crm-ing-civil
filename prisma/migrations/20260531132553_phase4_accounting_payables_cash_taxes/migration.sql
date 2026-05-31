-- CreateEnum
CREATE TYPE "PurchaseInvoiceStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "CashTransactionStatus" AS ENUM ('DRAFT', 'POSTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "PettyCashStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PettyCashCategory" AS ENUM ('TRANSPORT', 'SUPPLIES', 'FOOD', 'COMMUNICATION', 'TOOLS', 'OTHER');

-- CreateEnum
CREATE TYPE "TaxType" AS ENUM ('IVA', 'RETEFUENTE', 'RETEICA', 'RENTA', 'ICA', 'CREE', 'GMF');

-- CreateEnum
CREATE TYPE "TaxObligationStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "contactName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "PurchaseInvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "retentionPct" DECIMAL(7,6) NOT NULL DEFAULT 0,
    "retentionAmt" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_invoice_lines" (
    "id" TEXT NOT NULL,
    "purchaseInvoiceId" TEXT NOT NULL,
    "accountId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,4) NOT NULL,
    "totalCost" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "purchase_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "purchaseInvoiceId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "cashAccountId" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_receipts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "CashTransactionStatus" NOT NULL DEFAULT 'DRAFT',
    "concept" TEXT NOT NULL,
    "thirdParty" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "cashAccountId" TEXT NOT NULL,
    "incomeAccountId" TEXT,
    "relatedInvoiceId" TEXT,
    "receiptDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "journalEntryId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_disbursements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "CashTransactionStatus" NOT NULL DEFAULT 'DRAFT',
    "concept" TEXT NOT NULL,
    "beneficiary" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "cashAccountId" TEXT NOT NULL,
    "expenseAccountId" TEXT NOT NULL,
    "projectId" TEXT,
    "disbursementDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "journalEntryId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_disbursements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petty_cash_funds" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "responsible" TEXT NOT NULL,
    "cashAccountId" TEXT NOT NULL,
    "initialBalance" DECIMAL(18,2) NOT NULL,
    "currentBalance" DECIMAL(18,2) NOT NULL,
    "status" "PettyCashStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "petty_cash_funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petty_cash_transactions" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "PettyCashCategory" NOT NULL DEFAULT 'OTHER',
    "amount" DECIMAL(18,2) NOT NULL,
    "receiptNumber" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "petty_cash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_obligations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "TaxType" NOT NULL,
    "period" TEXT NOT NULL,
    "base" DECIMAL(18,2) NOT NULL,
    "rate" DECIMAL(7,6) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "TaxObligationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "paidDate" TIMESTAMP(3),
    "paidAmount" DECIMAL(18,2),
    "cashAccountId" TEXT,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_obligations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vendors_tenantId_idx" ON "vendors"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_tenantId_code_key" ON "vendors"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_invoices_journalEntryId_key" ON "purchase_invoices"("journalEntryId");

-- CreateIndex
CREATE INDEX "purchase_invoices_tenantId_idx" ON "purchase_invoices"("tenantId");

-- CreateIndex
CREATE INDEX "purchase_invoices_tenantId_vendorId_idx" ON "purchase_invoices"("tenantId", "vendorId");

-- CreateIndex
CREATE INDEX "purchase_invoices_tenantId_status_idx" ON "purchase_invoices"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_invoices_tenantId_number_key" ON "purchase_invoices"("tenantId", "number");

-- CreateIndex
CREATE INDEX "purchase_invoice_lines_purchaseInvoiceId_idx" ON "purchase_invoice_lines"("purchaseInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_payments_journalEntryId_key" ON "vendor_payments"("journalEntryId");

-- CreateIndex
CREATE INDEX "vendor_payments_tenantId_idx" ON "vendor_payments"("tenantId");

-- CreateIndex
CREATE INDEX "vendor_payments_purchaseInvoiceId_idx" ON "vendor_payments"("purchaseInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "cash_receipts_journalEntryId_key" ON "cash_receipts"("journalEntryId");

-- CreateIndex
CREATE INDEX "cash_receipts_tenantId_idx" ON "cash_receipts"("tenantId");

-- CreateIndex
CREATE INDEX "cash_receipts_tenantId_status_idx" ON "cash_receipts"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "cash_receipts_tenantId_number_key" ON "cash_receipts"("tenantId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "cash_disbursements_journalEntryId_key" ON "cash_disbursements"("journalEntryId");

-- CreateIndex
CREATE INDEX "cash_disbursements_tenantId_idx" ON "cash_disbursements"("tenantId");

-- CreateIndex
CREATE INDEX "cash_disbursements_tenantId_status_idx" ON "cash_disbursements"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "cash_disbursements_tenantId_number_key" ON "cash_disbursements"("tenantId", "number");

-- CreateIndex
CREATE INDEX "petty_cash_funds_tenantId_idx" ON "petty_cash_funds"("tenantId");

-- CreateIndex
CREATE INDEX "petty_cash_funds_tenantId_projectId_idx" ON "petty_cash_funds"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "petty_cash_transactions_fundId_idx" ON "petty_cash_transactions"("fundId");

-- CreateIndex
CREATE UNIQUE INDEX "tax_obligations_journalEntryId_key" ON "tax_obligations"("journalEntryId");

-- CreateIndex
CREATE INDEX "tax_obligations_tenantId_idx" ON "tax_obligations"("tenantId");

-- CreateIndex
CREATE INDEX "tax_obligations_tenantId_type_idx" ON "tax_obligations"("tenantId", "type");

-- CreateIndex
CREATE INDEX "tax_obligations_tenantId_status_idx" ON "tax_obligations"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_purchaseInvoiceId_fkey" FOREIGN KEY ("purchaseInvoiceId") REFERENCES "purchase_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_payments" ADD CONSTRAINT "vendor_payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_payments" ADD CONSTRAINT "vendor_payments_purchaseInvoiceId_fkey" FOREIGN KEY ("purchaseInvoiceId") REFERENCES "purchase_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_payments" ADD CONSTRAINT "vendor_payments_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_receipts" ADD CONSTRAINT "cash_receipts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_receipts" ADD CONSTRAINT "cash_receipts_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_disbursements" ADD CONSTRAINT "cash_disbursements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_disbursements" ADD CONSTRAINT "cash_disbursements_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_disbursements" ADD CONSTRAINT "cash_disbursements_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_funds" ADD CONSTRAINT "petty_cash_funds_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_funds" ADD CONSTRAINT "petty_cash_funds_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_transactions" ADD CONSTRAINT "petty_cash_transactions_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "petty_cash_funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_obligations" ADD CONSTRAINT "tax_obligations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_obligations" ADD CONSTRAINT "tax_obligations_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
