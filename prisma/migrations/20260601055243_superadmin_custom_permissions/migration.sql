-- AlterTable
ALTER TABLE "users" ADD COLUMN     "customPermissions" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
