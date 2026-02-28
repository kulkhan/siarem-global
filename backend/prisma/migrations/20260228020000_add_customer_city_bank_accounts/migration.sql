-- Add city field to customers
ALTER TABLE "customers" ADD COLUMN "city" VARCHAR(100);

-- Create customer_bank_accounts table
CREATE TABLE "customer_bank_accounts" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "bank_name" TEXT NOT NULL,
  "iban" TEXT,
  "account_no" TEXT,
  "currency" TEXT,
  "notes" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys
ALTER TABLE "customer_bank_accounts" ADD CONSTRAINT "customer_bank_accounts_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_bank_accounts" ADD CONSTRAINT "customer_bank_accounts_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Index
CREATE INDEX "customer_bank_accounts_customer_id_idx" ON "customer_bank_accounts"("customer_id");
