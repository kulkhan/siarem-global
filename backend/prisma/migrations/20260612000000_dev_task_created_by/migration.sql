-- Add created_by_name and created_by_id to dev_tasks
ALTER TABLE "dev_tasks" ADD COLUMN "created_by_name" TEXT;
ALTER TABLE "dev_tasks" ADD COLUMN "created_by_id" TEXT;
