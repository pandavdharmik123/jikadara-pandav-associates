-- Isolated Office Expenses module.
-- The application normally applies schema changes with `prisma db push`;
-- this migration is provided for environments that use Prisma migrations.

CREATE TABLE "OfficeExpense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficeExpense_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OfficeExpense_userId_idx" ON "OfficeExpense"("userId");
CREATE INDEX "OfficeExpense_expenseDate_idx" ON "OfficeExpense"("expenseDate");
CREATE INDEX "OfficeExpense_category_idx" ON "OfficeExpense"("category");
CREATE INDEX "OfficeExpense_isDeleted_idx" ON "OfficeExpense"("isDeleted");
CREATE INDEX "OfficeExpense_deletedAt_idx" ON "OfficeExpense"("deletedAt");
CREATE INDEX "OfficeExpense_userId_expenseDate_idx" ON "OfficeExpense"("userId", "expenseDate");

ALTER TABLE "OfficeExpense"
    ADD CONSTRAINT "OfficeExpense_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
