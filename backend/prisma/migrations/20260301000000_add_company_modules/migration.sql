-- Add company type and modules to companies table
ALTER TABLE companies ADD COLUMN company_type TEXT NOT NULL DEFAULT 'MARITIME';
ALTER TABLE companies ADD COLUMN modules TEXT[] NOT NULL DEFAULT ARRAY['SHIPS','SERVICE_REPORT']::TEXT[];
