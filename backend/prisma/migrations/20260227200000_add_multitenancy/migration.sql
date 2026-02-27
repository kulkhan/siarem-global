-- ============================================================
-- Multi-Tenant Migration: Add Company model + companyId fields
-- Strategy: 3-phase (nullable → backfill → NOT NULL)
-- ============================================================

-- Phase 1: Create companies table
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "plan" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "companies_domain_key" ON "companies"("domain");
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- Phase 2: Update Role enum to add SUPER_ADMIN
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- Phase 3: Add companyId columns as NULLABLE first (to handle existing data)

-- Users
ALTER TABLE "users" ADD COLUMN "company_id" TEXT;

-- Customers
ALTER TABLE "customers" ADD COLUMN "company_id" TEXT;

-- Contacts
ALTER TABLE "contacts" ADD COLUMN "company_id" TEXT;

-- Ships
ALTER TABLE "ships" ADD COLUMN "company_id" TEXT;

-- Ship Types
ALTER TABLE "ship_types" ADD COLUMN "company_id" TEXT;

-- Service Types
ALTER TABLE "service_types" ADD COLUMN "company_id" TEXT;

-- Services
ALTER TABLE "services" ADD COLUMN "company_id" TEXT;

-- Quotes
ALTER TABLE "quotes" ADD COLUMN "company_id" TEXT;

-- Invoices
ALTER TABLE "invoices" ADD COLUMN "company_id" TEXT;

-- Meetings
ALTER TABLE "meetings" ADD COLUMN "company_id" TEXT;

-- Documents
ALTER TABLE "documents" ADD COLUMN "company_id" TEXT;

-- Expenses
ALTER TABLE "expenses" ADD COLUMN "company_id" TEXT;

-- Audit Logs
ALTER TABLE "audit_logs" ADD COLUMN "company_id" TEXT;

-- Phase 4: Insert default company (Siarem Global)
INSERT INTO "companies" ("id", "name", "domain", "slug", "isActive", "updatedAt")
VALUES ('default-siarem-company', 'Siarem Global', 'siarem.siarem.local', 'siarem', true, CURRENT_TIMESTAMP);

-- Phase 5: Backfill all existing records with default company
UPDATE "users"     SET "company_id" = 'default-siarem-company' WHERE "company_id" IS NULL;
UPDATE "customers" SET "company_id" = 'default-siarem-company' WHERE "company_id" IS NULL;
UPDATE "contacts"  SET "company_id" = 'default-siarem-company' WHERE "company_id" IS NULL;
UPDATE "ships"     SET "company_id" = 'default-siarem-company' WHERE "company_id" IS NULL;
UPDATE "services"  SET "company_id" = 'default-siarem-company' WHERE "company_id" IS NULL;
UPDATE "quotes"    SET "company_id" = 'default-siarem-company' WHERE "company_id" IS NULL;
UPDATE "invoices"  SET "company_id" = 'default-siarem-company' WHERE "company_id" IS NULL;
UPDATE "meetings"  SET "company_id" = 'default-siarem-company' WHERE "company_id" IS NULL;
UPDATE "documents" SET "company_id" = 'default-siarem-company' WHERE "company_id" IS NULL;
UPDATE "expenses"  SET "company_id" = 'default-siarem-company' WHERE "company_id" IS NULL;
-- ship_types and service_types: leave NULL = global (no backfill needed)
-- audit_logs: leave NULL = system-level (no backfill needed)

-- Phase 6: Make required columns NOT NULL
ALTER TABLE "users"     ALTER COLUMN "company_id" DROP NOT NULL;  -- users: nullable (SUPER_ADMIN has null)
ALTER TABLE "customers" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "contacts"  ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "ships"     ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "services"  ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "quotes"    ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "invoices"  ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "meetings"  ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "documents" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "expenses"  ALTER COLUMN "company_id" SET NOT NULL;

-- Phase 7: Remove old UNIQUE constraints and add tenant-scoped ones
ALTER TABLE "customers" DROP CONSTRAINT IF EXISTS "customers_shortCode_key";
ALTER TABLE "ships"     DROP CONSTRAINT IF EXISTS "ships_imoNumber_key";
ALTER TABLE "quotes"    DROP CONSTRAINT IF EXISTS "quotes_quoteNumber_key";
ALTER TABLE "invoices"  DROP CONSTRAINT IF EXISTS "invoices_refNo_key";
ALTER TABLE "users"     DROP CONSTRAINT IF EXISTS "users_email_key";

-- New composite unique constraints (tenant-scoped)
CREATE UNIQUE INDEX "customers_companyId_shortCode_key" ON "customers"("company_id", "shortCode");
CREATE UNIQUE INDEX "ships_companyId_imoNumber_key"     ON "ships"("company_id", "imoNumber") WHERE "imoNumber" IS NOT NULL;
CREATE UNIQUE INDEX "quotes_companyId_quoteNumber_key"  ON "quotes"("company_id", "quoteNumber");
CREATE UNIQUE INDEX "invoices_companyId_refNo_key"      ON "invoices"("company_id", "refNo") WHERE "refNo" IS NOT NULL;
CREATE UNIQUE INDEX "users_companyId_email_key"         ON "users"("company_id", "email");

-- Phase 8: Add Foreign Key constraints
ALTER TABLE "users"     ADD CONSTRAINT "users_company_id_fkey"     FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contacts"  ADD CONSTRAINT "contacts_company_id_fkey"  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ships"     ADD CONSTRAINT "ships_company_id_fkey"     FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ship_types"     ADD CONSTRAINT "ship_types_company_id_fkey"     FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_types"  ADD CONSTRAINT "service_types_company_id_fkey"  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "services"  ADD CONSTRAINT "services_company_id_fkey"  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotes"    ADD CONSTRAINT "quotes_company_id_fkey"    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices"  ADD CONSTRAINT "invoices_company_id_fkey"  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meetings"  ADD CONSTRAINT "meetings_company_id_fkey"  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expenses"  ADD CONSTRAINT "expenses_company_id_fkey"  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
