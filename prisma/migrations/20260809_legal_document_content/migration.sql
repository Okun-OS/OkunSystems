-- AlterTable: add content column and make r2Key optional
ALTER TABLE "LegalDocument" ADD COLUMN "content" TEXT;
ALTER TABLE "LegalDocument" ALTER COLUMN "r2Key" DROP NOT NULL;
