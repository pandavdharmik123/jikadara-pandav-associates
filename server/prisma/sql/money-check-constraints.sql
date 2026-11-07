-- ─────────────────────────────────────────────────────────────────────────────
-- QA-19 · Database-level defence-in-depth for money columns
--
-- Prisma types alone do not stop a direct SQL client / buggy script from
-- inserting zero or negative amounts. These CHECK constraints mirror the API
-- validation added in server/routes/transactions.js and the ledger routes.
--
-- IMPORTANT
--   * Run this against a staging database first.
--   * The script is idempotent: existing constraints are skipped.
--   * It is intentionally NOT run automatically by `prisma migrate deploy`.
--   * Verify there are no invalid rows before applying:
--       SELECT COUNT(*) FROM "TaskTransaction" WHERE "amount" <= 0;
--       SELECT COUNT(*) FROM "GeneralExpense"  WHERE "amount" <= 0;
--       SELECT COUNT(*) FROM "OfficeLedgerEntry" WHERE "amount" <= 0;
--       SELECT COUNT(*) FROM "Upad" WHERE "amount" <= 0;
--       SELECT COUNT(*) FROM "VerabillFee" WHERE "amount" <= 0;
--       SELECT COUNT(*) FROM "VerabillExpense" WHERE "amount" <= 0;
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  target RECORD;
BEGIN
  FOR target IN
    SELECT * FROM (VALUES
      ('TaskTransaction',   'amount'),
      ('GeneralExpense',    'amount'),
      ('OfficeLedgerEntry', 'amount'),
      ('Upad',              'amount'),
      ('VerabillFee',       'amount'),
      ('VerabillExpense',   'amount')
    ) AS t(table_name, column_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class rel ON rel.oid = c.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE c.conname = target.table_name || '_' || target.column_name || '_positive'
        AND rel.relname = target.table_name
        AND nsp.nspname = current_schema()
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I CHECK (%I > 0) NOT VALID',
        target.table_name,
        target.table_name || '_' || target.column_name || '_positive',
        target.column_name
      );
      EXECUTE format(
        'ALTER TABLE %I VALIDATE CONSTRAINT %I',
        target.table_name,
        target.table_name || '_' || target.column_name || '_positive'
      );
    END IF;
  END LOOP;
END
$$;
