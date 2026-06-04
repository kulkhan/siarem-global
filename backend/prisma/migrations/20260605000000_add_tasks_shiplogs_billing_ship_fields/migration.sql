-- Migration: add_tasks_shiplogs_billing_ship_fields
-- Adds: Task, ShipLog, ShipBillingEntity models; ship extended fields;
--       ship compliance fields; quote acceptance fields; customer parent relation.

-- Customer: parent customer self-reference
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "parent_customer_id" TEXT;
ALTER TABLE "customers" ADD CONSTRAINT "customers_parent_customer_id_fkey"
  FOREIGN KEY ("parent_customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Ship: extended identification fields
ALTER TABLE "ships" ADD COLUMN IF NOT EXISTS "call_sign" TEXT;
ALTER TABLE "ships" ADD COLUMN IF NOT EXISTS "home_port" TEXT;
ALTER TABLE "ships" ADD COLUMN IF NOT EXISTS "ice_class" TEXT;
ALTER TABLE "ships" ADD COLUMN IF NOT EXISTS "eexi" DOUBLE PRECISION;
ALTER TABLE "ships" ADD COLUMN IF NOT EXISTS "owner" TEXT;
ALTER TABLE "ships" ADD COLUMN IF NOT EXISTS "technical_manager" TEXT;
ALTER TABLE "ships" ADD COLUMN IF NOT EXISTS "customer_relation_type" TEXT;
ALTER TABLE "ships" ADD COLUMN IF NOT EXISTS "customer_since" TIMESTAMP(3);

-- Ship: compliance status fields
ALTER TABLE "ships" ADD COLUMN IF NOT EXISTS "eu_mrv_mp_status" TEXT;
ALTER TABLE "ships" ADD COLUMN IF NOT EXISTS "uk_mrv_mp_status" TEXT;
ALTER TABLE "ships" ADD COLUMN IF NOT EXISTS "fuel_eu_mp_status" TEXT;
ALTER TABLE "ships" ADD COLUMN IF NOT EXISTS "imo_dcs_status" TEXT;
ALTER TABLE "ships" ADD COLUMN IF NOT EXISTS "eu_ets_status" TEXT;
ALTER TABLE "ships" ADD COLUMN IF NOT EXISTS "seemp_part2" TEXT;
ALTER TABLE "ships" ADD COLUMN IF NOT EXISTS "seemp_part3" TEXT;

-- Quote: acceptance fields
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "accepted_at" TIMESTAMP(3);
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "acceptance_method" TEXT;

-- ShipLog: change history table
CREATE TABLE IF NOT EXISTS "ship_logs" (
    "id" TEXT NOT NULL,
    "ship_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "old_value" TEXT,
    "new_value" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ship_logs_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ship_logs" ADD CONSTRAINT "ship_logs_ship_id_fkey"
  FOREIGN KEY ("ship_id") REFERENCES "ships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ship_logs" ADD CONSTRAINT "ship_logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ShipBillingEntity: per-ship invoice address
CREATE TABLE IF NOT EXISTS "ship_billing_entities" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "ship_id" TEXT NOT NULL,
    "entity_name" TEXT NOT NULL,
    "entity_address" TEXT,
    "entity_tax_no" TEXT,
    "entity_country" TEXT,
    "entity_email" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ship_billing_entities_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ship_billing_entities" ADD CONSTRAINT "ship_billing_entities_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ship_billing_entities" ADD CONSTRAINT "ship_billing_entities_ship_id_fkey"
  FOREIGN KEY ("ship_id") REFERENCES "ships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Task: team task manager
CREATE TABLE IF NOT EXISTS "tasks" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigned_user_id" TEXT,
    "meeting_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_user_id_fkey"
  FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_meeting_id_fkey"
  FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
