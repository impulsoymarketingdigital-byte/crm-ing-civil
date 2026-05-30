-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BudgetCategory" AS ENUM ('MATERIALS', 'LABOR', 'EQUIPMENT', 'SUBCONTRACT', 'OTHER');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "clientName" TEXT,
    "location" TEXT,
    "contractValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "adminPct" DECIMAL(7,6) NOT NULL DEFAULT 0,
    "riskPct" DECIMAL(7,6) NOT NULL DEFAULT 0,
    "profitPct" DECIMAL(7,6) NOT NULL DEFAULT 0,
    "adminAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "riskAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "profitAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "aiuAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_phases" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "plannedPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "actualPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_budgets" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "BudgetCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'GL',
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL,
    "totalCost" DECIMAL(18,2) NOT NULL,
    "actualCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aiu_breakdowns" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "contractValue" DECIMAL(18,2) NOT NULL,
    "adminPct" DECIMAL(7,6) NOT NULL,
    "riskPct" DECIMAL(7,6) NOT NULL,
    "profitPct" DECIMAL(7,6) NOT NULL,
    "adminAmount" DECIMAL(18,2) NOT NULL,
    "riskAmount" DECIMAL(18,2) NOT NULL,
    "profitAmount" DECIMAL(18,2) NOT NULL,
    "aiuAmount" DECIMAL(18,2) NOT NULL,
    "totalValue" DECIMAL(18,2) NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aiu_breakdowns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_tenantId_idx" ON "projects"("tenantId");

-- CreateIndex
CREATE INDEX "projects_tenantId_status_idx" ON "projects"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "projects_tenantId_code_key" ON "projects"("tenantId", "code");

-- CreateIndex
CREATE INDEX "project_phases_projectId_idx" ON "project_phases"("projectId");

-- CreateIndex
CREATE INDEX "project_budgets_projectId_idx" ON "project_budgets"("projectId");

-- CreateIndex
CREATE INDEX "project_budgets_projectId_category_idx" ON "project_budgets"("projectId", "category");

-- CreateIndex
CREATE INDEX "aiu_breakdowns_projectId_idx" ON "aiu_breakdowns"("projectId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_budgets" ADD CONSTRAINT "project_budgets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aiu_breakdowns" ADD CONSTRAINT "aiu_breakdowns_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
