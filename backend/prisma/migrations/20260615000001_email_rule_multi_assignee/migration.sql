-- Add array column for multiple assignees
ALTER TABLE "email_rules" ADD COLUMN "assigned_user_ids" TEXT[] NOT NULL DEFAULT '{}';

-- Migrate existing single assignee to array
UPDATE "email_rules" SET "assigned_user_ids" = ARRAY["assigned_user_id"] WHERE "assigned_user_id" IS NOT NULL;

-- Drop FK constraint and old column
ALTER TABLE "email_rules" DROP CONSTRAINT IF EXISTS "email_rules_assigned_user_id_fkey";
ALTER TABLE "email_rules" DROP COLUMN "assigned_user_id";
