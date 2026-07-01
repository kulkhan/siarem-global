-- AlterTable: make quoteDate nullable to support imported quotes without a known date
ALTER TABLE "quotes" ALTER COLUMN "quoteDate" DROP NOT NULL;
