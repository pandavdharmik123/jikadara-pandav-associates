-- People who share the office expense shortfall.
-- These rows are owned by one application user and are isolated like the
-- office ledger itself.

CREATE TABLE "OfficeSplitUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficeSplitUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OfficeSplitUser_userId_name_key" ON "OfficeSplitUser"("userId", "name");
CREATE INDEX "OfficeSplitUser_userId_idx" ON "OfficeSplitUser"("userId");

ALTER TABLE "OfficeSplitUser"
    ADD CONSTRAINT "OfficeSplitUser_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
