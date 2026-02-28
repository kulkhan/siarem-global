-- Add company profile fields
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "tax_number" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "website" TEXT;
