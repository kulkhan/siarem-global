-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "meetingType" TEXT NOT NULL DEFAULT 'MEETING';
