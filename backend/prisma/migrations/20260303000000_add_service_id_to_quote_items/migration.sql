-- AlterTable: QuoteItem'a service_id alanı ekleniyor
ALTER TABLE "quote_items" ADD COLUMN "service_id" TEXT;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
