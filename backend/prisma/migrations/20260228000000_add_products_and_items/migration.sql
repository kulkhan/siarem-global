-- Migration: add products, quote_items, invoice_items

CREATE TABLE products (
  id             TEXT         NOT NULL PRIMARY KEY,
  company_id     TEXT         NOT NULL,
  code           TEXT         NOT NULL,
  name           TEXT         NOT NULL,
  name_en        TEXT,
  unit           TEXT         NOT NULL DEFAULT 'ADET',
  unit_price_eur NUMERIC(14,4),
  unit_price_usd NUMERIC(14,4),
  unit_price_try NUMERIC(14,4),
  description    TEXT,
  is_active      BOOLEAN      NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT products_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT products_company_id_code_key UNIQUE (company_id, code)
);

CREATE TABLE quote_items (
  id          TEXT          NOT NULL PRIMARY KEY,
  quote_id    TEXT          NOT NULL,
  product_id  TEXT,
  description TEXT          NOT NULL,
  quantity    NUMERIC(14,4) NOT NULL,
  unit_price  NUMERIC(14,4) NOT NULL,
  currency    TEXT          NOT NULL DEFAULT 'USD',
  total       NUMERIC(14,4) NOT NULL,
  sort_order  INTEGER       NOT NULL DEFAULT 0,

  CONSTRAINT quote_items_quote_id_fkey   FOREIGN KEY (quote_id)   REFERENCES quotes(id)    ON DELETE CASCADE,
  CONSTRAINT quote_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE invoice_items (
  id          TEXT          NOT NULL PRIMARY KEY,
  invoice_id  TEXT          NOT NULL,
  product_id  TEXT,
  description TEXT          NOT NULL,
  quantity    NUMERIC(14,4) NOT NULL,
  unit_price  NUMERIC(14,4) NOT NULL,
  currency    TEXT          NOT NULL DEFAULT 'USD',
  total       NUMERIC(14,4) NOT NULL,
  sort_order  INTEGER       NOT NULL DEFAULT 0,

  CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT invoice_items_product_id_fkey FOREIGN KEY (product_id)  REFERENCES products(id)
);
