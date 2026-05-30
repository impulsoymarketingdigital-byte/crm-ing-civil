-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('INDEFINIDO', 'FIJO', 'OBRA_LABOR', 'APRENDIZAJE');

-- CreateEnum
CREATE TYPE "ArlRiskLevel" AS ENUM ('I', 'II', 'III', 'IV', 'V');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID');

-- CreateEnum
CREATE TYPE "ApuInputType" AS ENUM ('MATERIAL', 'LABOR', 'EQUIPMENT');

-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'APPROVED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'VOIDED');

-- CreateEnum
CREATE TYPE "LiquidationStatus" AS ENUM ('DRAFT', 'FINAL');

-- CreateEnum
CREATE TYPE "DeductionType" AS ENUM ('RETENCION_GARANTIA', 'ANTICIPO', 'MULTA', 'RETENCION_FUENTE', 'RETEICA', 'DESCUENTO_PRESTAMO', 'OTHER');

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "department" TEXT,
    "contractType" "ContractType" NOT NULL DEFAULT 'INDEFINIDO',
    "baseSalary" DECIMAL(18,2) NOT NULL,
    "transportAllowance" BOOLEAN NOT NULL DEFAULT false,
    "riskLevel" "ArlRiskLevel" NOT NULL DEFAULT 'I',
    "eps" TEXT,
    "pensionFund" TEXT,
    "compensationBox" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_periods" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "fortnight" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "baseSalary" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "transportAllowance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "overtimeDayPct25" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "overtimeNightPct75" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "overtimeHolidayPct75" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "overtimeHolidayPct100" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "bonuses" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalEarned" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "healthEmployee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "pensionEmployee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "incomeTax" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "prima" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cesantias" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "interesesCesantias" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vacaciones" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "healthEmployer" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "pensionEmployer" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "arl" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sena" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "icbf" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "compensationBox" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalEmployerContrib" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalLaborCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apu_chapters" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "apu_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apu_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'GL',
    "laborFactor" DECIMAL(5,4) NOT NULL DEFAULT 1.6,
    "materialCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "laborCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "equipmentCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalUnitCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apu_inputs" (
    "id" TEXT NOT NULL,
    "apuItemId" TEXT NOT NULL,
    "type" "ApuInputType" NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'UN',
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,4) NOT NULL,
    "total" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "apu_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "official_budgets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "BudgetStatus" NOT NULL DEFAULT 'DRAFT',
    "adminPct" DECIMAL(7,6) NOT NULL DEFAULT 0,
    "riskPct" DECIMAL(7,6) NOT NULL DEFAULT 0,
    "profitPct" DECIMAL(7,6) NOT NULL DEFAULT 0,
    "directCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "adminAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "riskAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "profitAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "aiuAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalBudget" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "official_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_chapters" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "budget_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_lines" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "apuItemId" TEXT,
    "code" TEXT,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'GL',
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,4) NOT NULL,
    "totalCost" DECIMAL(18,4) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "budget_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_certificates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT,
    "certDate" TIMESTAMP(3) NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'DRAFT',
    "retentionPct" DECIMAL(7,6) NOT NULL DEFAULT 0.05,
    "grossAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "retentionAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cumulativeAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cumulativePct" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_lines" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "budgetLineId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'GL',
    "totalQuantityBudgeted" DECIMAL(18,4) NOT NULL,
    "previousQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "currentQuantity" DECIMAL(18,4) NOT NULL,
    "cumulativeQuantity" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,4) NOT NULL,
    "currentAmount" DECIMAL(18,2) NOT NULL,
    "cumulativeAmount" DECIMAL(18,2) NOT NULL,
    "executedPct" DECIMAL(7,4) NOT NULL DEFAULT 0,

    CONSTRAINT "certificate_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_liquidations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "status" "LiquidationStatus" NOT NULL DEFAULT 'DRAFT',
    "liquidationDate" TIMESTAMP(3) NOT NULL,
    "contractValue" DECIMAL(18,2) NOT NULL,
    "additionsValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalContractValue" DECIMAL(18,2) NOT NULL,
    "totalExecuted" DECIMAL(18,2) NOT NULL,
    "totalRetained" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netBalance" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_liquidations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidation_deductions" (
    "id" TEXT NOT NULL,
    "liquidationId" TEXT NOT NULL,
    "type" "DeductionType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "liquidation_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employees_tenantId_idx" ON "employees"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_tenantId_code_key" ON "employees"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "employees_tenantId_document_key" ON "employees"("tenantId", "document");

-- CreateIndex
CREATE INDEX "payroll_periods_tenantId_idx" ON "payroll_periods"("tenantId");

-- CreateIndex
CREATE INDEX "payroll_periods_tenantId_employeeId_idx" ON "payroll_periods"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "payroll_periods_tenantId_year_month_idx" ON "payroll_periods"("tenantId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_periods_tenantId_employeeId_year_month_fortnight_key" ON "payroll_periods"("tenantId", "employeeId", "year", "month", "fortnight");

-- CreateIndex
CREATE INDEX "apu_chapters_tenantId_idx" ON "apu_chapters"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "apu_chapters_tenantId_code_key" ON "apu_chapters"("tenantId", "code");

-- CreateIndex
CREATE INDEX "apu_items_tenantId_idx" ON "apu_items"("tenantId");

-- CreateIndex
CREATE INDEX "apu_items_chapterId_idx" ON "apu_items"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "apu_items_tenantId_code_key" ON "apu_items"("tenantId", "code");

-- CreateIndex
CREATE INDEX "apu_inputs_apuItemId_idx" ON "apu_inputs"("apuItemId");

-- CreateIndex
CREATE INDEX "official_budgets_tenantId_idx" ON "official_budgets"("tenantId");

-- CreateIndex
CREATE INDEX "official_budgets_projectId_idx" ON "official_budgets"("projectId");

-- CreateIndex
CREATE INDEX "budget_chapters_budgetId_idx" ON "budget_chapters"("budgetId");

-- CreateIndex
CREATE INDEX "budget_lines_budgetId_idx" ON "budget_lines"("budgetId");

-- CreateIndex
CREATE INDEX "budget_lines_chapterId_idx" ON "budget_lines"("chapterId");

-- CreateIndex
CREATE INDEX "project_certificates_tenantId_idx" ON "project_certificates"("tenantId");

-- CreateIndex
CREATE INDEX "project_certificates_projectId_idx" ON "project_certificates"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "project_certificates_projectId_number_key" ON "project_certificates"("projectId", "number");

-- CreateIndex
CREATE INDEX "certificate_lines_certificateId_idx" ON "certificate_lines"("certificateId");

-- CreateIndex
CREATE INDEX "certificate_lines_budgetLineId_idx" ON "certificate_lines"("budgetLineId");

-- CreateIndex
CREATE INDEX "project_liquidations_tenantId_idx" ON "project_liquidations"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "project_liquidations_projectId_key" ON "project_liquidations"("projectId");

-- CreateIndex
CREATE INDEX "liquidation_deductions_liquidationId_idx" ON "liquidation_deductions"("liquidationId");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apu_chapters" ADD CONSTRAINT "apu_chapters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apu_items" ADD CONSTRAINT "apu_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apu_items" ADD CONSTRAINT "apu_items_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "apu_chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apu_inputs" ADD CONSTRAINT "apu_inputs_apuItemId_fkey" FOREIGN KEY ("apuItemId") REFERENCES "apu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_budgets" ADD CONSTRAINT "official_budgets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_budgets" ADD CONSTRAINT "official_budgets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_chapters" ADD CONSTRAINT "budget_chapters_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "official_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "official_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "budget_chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_apuItemId_fkey" FOREIGN KEY ("apuItemId") REFERENCES "apu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_certificates" ADD CONSTRAINT "project_certificates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_certificates" ADD CONSTRAINT "project_certificates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_certificates" ADD CONSTRAINT "project_certificates_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "official_budgets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_lines" ADD CONSTRAINT "certificate_lines_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "project_certificates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_lines" ADD CONSTRAINT "certificate_lines_budgetLineId_fkey" FOREIGN KEY ("budgetLineId") REFERENCES "budget_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_liquidations" ADD CONSTRAINT "project_liquidations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_liquidations" ADD CONSTRAINT "project_liquidations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_liquidations" ADD CONSTRAINT "project_liquidations_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "official_budgets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidation_deductions" ADD CONSTRAINT "liquidation_deductions_liquidationId_fkey" FOREIGN KEY ("liquidationId") REFERENCES "project_liquidations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
