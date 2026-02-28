-- Fix: Create missing PostgreSQL enum types for Complaint model
-- Uses DO blocks to safely skip if types already exist (idempotent).

DO $$ BEGIN
  CREATE TYPE "ComplaintType" AS ENUM ('COMPLAINT', 'FEEDBACK', 'SUGGESTION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Drop existing TEXT defaults before type change
ALTER TABLE complaints ALTER COLUMN type   DROP DEFAULT;
ALTER TABLE complaints ALTER COLUMN status DROP DEFAULT;

-- Cast TEXT columns to enum types
ALTER TABLE complaints ALTER COLUMN type   TYPE "ComplaintType"   USING type::"ComplaintType";
ALTER TABLE complaints ALTER COLUMN status TYPE "ComplaintStatus" USING status::"ComplaintStatus";

-- Restore defaults with proper enum casts
ALTER TABLE complaints ALTER COLUMN type   SET DEFAULT 'COMPLAINT'::"ComplaintType";
ALTER TABLE complaints ALTER COLUMN status SET DEFAULT 'OPEN'::"ComplaintStatus";
