-- Make offerId optional in ConsentRecord
ALTER TABLE "ConsentRecord" ALTER COLUMN "offerId" DROP NOT NULL;
