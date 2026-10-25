-- Expense type for office ledger expenses.
-- Income entries leave this column NULL. Expenses store either one of the
-- predefined Gujarati types or a custom type entered through "Other".

ALTER TABLE "OfficeLedgerEntry"
    ADD COLUMN "expenseType" TEXT;
