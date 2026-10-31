-- Saved Form Builder applications.
-- Only the typed form fields are stored here. Uploaded photographs,
-- signatures and document scans deliberately stay on the user's device.

CREATE TYPE "FormBuilderFormKey" AS ENUM (
    'PAN_NEW_APPLICATION',
    'PAN_CORRECTION',
    'MARRIAGE_REGISTRATION',
    'PROPERTY_TAX_NAME_TRANSFER'
);

CREATE TYPE "FormBuilderStatus" AS ENUM ('DRAFT', 'COMPLETED', 'ARCHIVED');

CREATE TABLE "FormBuilderRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "formKey" "FormBuilderFormKey" NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "clientName" TEXT NOT NULL DEFAULT '',
    "status" "FormBuilderStatus" NOT NULL DEFAULT 'DRAFT',
    "data" JSONB NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormBuilderRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FormBuilderRecord_userId_formKey_isDeleted_updatedAt_idx"
    ON "FormBuilderRecord"("userId", "formKey", "isDeleted", "updatedAt");

CREATE INDEX "FormBuilderRecord_userId_updatedAt_idx"
    ON "FormBuilderRecord"("userId", "updatedAt");

ALTER TABLE "FormBuilderRecord"
    ADD CONSTRAINT "FormBuilderRecord_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
