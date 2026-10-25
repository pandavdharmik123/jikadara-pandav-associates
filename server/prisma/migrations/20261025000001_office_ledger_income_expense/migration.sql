-- Convert the office expense table into a two-sided office ledger.
-- Existing rows are preserved as EXPENSE entries. The old title/description
-- values are combined into the new single "details" field.

CREATE TYPE "OfficeEntryType" AS ENUM ('INCOME', 'EXPENSE');

ALTER TABLE "OfficeExpense"
    ADD COLUMN "entryType" "OfficeEntryType" NOT NULL DEFAULT 'EXPENSE';

UPDATE "OfficeExpense"
SET "title" = "title" || CASE
    WHEN "description" <> '' THEN ' - ' || "description"
    ELSE ''
END
WHERE "description" <> '';

ALTER TABLE "OfficeExpense" DROP COLUMN "description";

DROP INDEX "OfficeExpense_category_idx";
ALTER TABLE "OfficeExpense" DROP COLUMN "category";

ALTER TABLE "OfficeExpense" RENAME COLUMN "expenseDate" TO "entryDate";
ALTER TABLE "OfficeExpense" RENAME COLUMN "title" TO "details";
ALTER TABLE "OfficeExpense" RENAME TO "OfficeLedgerEntry";

ALTER TABLE "OfficeLedgerEntry" ALTER COLUMN "entryType" DROP DEFAULT;

ALTER INDEX "OfficeExpense_userId_idx" RENAME TO "OfficeLedgerEntry_userId_idx";
ALTER INDEX "OfficeExpense_expenseDate_idx" RENAME TO "OfficeLedgerEntry_entryDate_idx";
ALTER INDEX "OfficeExpense_isDeleted_idx" RENAME TO "OfficeLedgerEntry_isDeleted_idx";
ALTER INDEX "OfficeExpense_deletedAt_idx" RENAME TO "OfficeLedgerEntry_deletedAt_idx";
ALTER INDEX "OfficeExpense_userId_expenseDate_idx" RENAME TO "OfficeLedgerEntry_userId_entryDate_idx";

ALTER TABLE "OfficeLedgerEntry" RENAME CONSTRAINT "OfficeExpense_pkey" TO "OfficeLedgerEntry_pkey";
ALTER TABLE "OfficeLedgerEntry" RENAME CONSTRAINT "OfficeExpense_userId_fkey" TO "OfficeLedgerEntry_userId_fkey";

CREATE INDEX "OfficeLedgerEntry_entryType_idx" ON "OfficeLedgerEntry"("entryType");
