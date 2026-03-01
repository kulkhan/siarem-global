-- Create service_reports table
CREATE TABLE service_reports (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  work_done TEXT NOT NULL,
  findings TEXT,
  parts_used TEXT,
  report_date TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_by_id TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT service_reports_service_id_key UNIQUE (service_id),
  CONSTRAINT service_reports_service_id_fkey FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT service_reports_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT service_reports_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
