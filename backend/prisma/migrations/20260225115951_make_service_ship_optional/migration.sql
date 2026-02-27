-- DropForeignKey
ALTER TABLE "services" DROP CONSTRAINT "services_shipId_fkey";

-- AlterTable
ALTER TABLE "services" ALTER COLUMN "shipId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "ships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
