-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "bankAccountType" TEXT DEFAULT 'Savings',
ADD COLUMN     "bankName" TEXT DEFAULT 'Bancolombia';

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "bankAccountType" TEXT DEFAULT 'Savings',
ADD COLUMN     "taxId" TEXT;
