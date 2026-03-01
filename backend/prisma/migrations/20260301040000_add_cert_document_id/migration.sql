-- Add ship_certificate_id column to documents
ALTER TABLE documents ADD COLUMN ship_certificate_id TEXT;

-- Add foreign key constraint
ALTER TABLE documents
  ADD CONSTRAINT documents_ship_certificate_id_fkey
  FOREIGN KEY (ship_certificate_id)
  REFERENCES ship_certificates(id)
  ON DELETE CASCADE;

-- Add SHIP_CERTIFICATE value to EntityType enum
ALTER TYPE "EntityType" ADD VALUE IF NOT EXISTS 'SHIP_CERTIFICATE';
