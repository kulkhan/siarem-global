-- Create ship_certificates table
CREATE TABLE ship_certificates (
  id TEXT PRIMARY KEY,
  ship_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  cert_type TEXT NOT NULL,
  cert_no TEXT,
  issue_date TIMESTAMP(3),
  expiry_date TIMESTAMP(3) NOT NULL,
  issued_by TEXT,
  notes TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ship_certificates_ship_id_fkey FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT ship_certificates_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX ship_certificates_ship_id_idx ON ship_certificates(ship_id);
CREATE INDEX ship_certificates_company_id_idx ON ship_certificates(company_id);
CREATE INDEX ship_certificates_expiry_date_idx ON ship_certificates(expiry_date);
