CREATE TABLE complaints (
  id            TEXT          NOT NULL PRIMARY KEY,
  company_id    TEXT          NOT NULL,
  customer_id   TEXT,
  type          TEXT          NOT NULL DEFAULT 'COMPLAINT',
  status        TEXT          NOT NULL DEFAULT 'OPEN',
  subject       TEXT          NOT NULL,
  description   TEXT          NOT NULL,
  response_note TEXT,
  responded_at  TIMESTAMPTZ,
  submitted_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  contact_name  TEXT,
  contact_email TEXT,

  CONSTRAINT complaints_company_id_fkey  FOREIGN KEY (company_id)  REFERENCES companies(id),
  CONSTRAINT complaints_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id)
);
