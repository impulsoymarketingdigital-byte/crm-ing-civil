-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'VOID');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "billingStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "nextBillingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "billing_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "BillingStatus" NOT NULL DEFAULT 'PENDING',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "activeUsers" INTEGER NOT NULL,
    "units" INTEGER NOT NULL,
    "unitPriceUsd" DECIMAL(10,2) NOT NULL DEFAULT 59,
    "totalUsd" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_invoices_tenantId_idx" ON "billing_invoices"("tenantId");

-- CreateIndex
CREATE INDEX "billing_invoices_tenantId_status_idx" ON "billing_invoices"("tenantId", "status");

-- CreateIndex
CREATE INDEX "billing_invoices_status_dueDate_idx" ON "billing_invoices"("status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "billing_invoices_tenantId_number_key" ON "billing_invoices"("tenantId", "number");

-- AddForeignKey
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
