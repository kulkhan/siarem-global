-- QuoteItem: service_id kaldırılıyor, service_type_id ekleniyor
ALTER TABLE "quote_items" DROP CONSTRAINT IF EXISTS "quote_items_service_id_fkey";
ALTER TABLE "quote_items" DROP COLUMN IF EXISTS "service_id";

ALTER TABLE "quote_items" ADD COLUMN "service_type_id" INTEGER;
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_service_type_id_fkey"
  FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
