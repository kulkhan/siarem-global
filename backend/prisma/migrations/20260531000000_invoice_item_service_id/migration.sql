ALTER TABLE "invoice_items" ADD COLUMN "service_id" TEXT;
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_service_id_fkey"
  FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
