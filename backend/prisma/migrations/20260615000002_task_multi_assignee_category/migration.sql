-- Task: add multi-assignee, close fields, and category
ALTER TABLE "tasks" ADD COLUMN "assigned_user_ids" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "tasks" ADD COLUMN "category" TEXT;
ALTER TABLE "tasks" ADD COLUMN "closed_note" TEXT;
ALTER TABLE "tasks" ADD COLUMN "closed_by_id" TEXT;

-- Migrate existing single assignee into the array
UPDATE "tasks" SET "assigned_user_ids" = ARRAY["assigned_user_id"]::TEXT[] WHERE "assigned_user_id" IS NOT NULL;

-- EmailRule: add category
ALTER TABLE "email_rules" ADD COLUMN "category" TEXT;
