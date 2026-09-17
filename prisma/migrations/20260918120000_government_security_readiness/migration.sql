-- Government security readiness: authentication throttling and data-integrity constraints

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS "LoginThrottle" (
  "identifierHash" TEXT NOT NULL,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "blockedUntil" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("identifierHash")
);

CREATE INDEX IF NOT EXISTS "LoginThrottle_blockedUntil_idx"
  ON "LoginThrottle"("blockedUntil");

-- Registry number must be unique inside a year.
CREATE UNIQUE INDEX IF NOT EXISTS "Case_caseNumber_caseYear_key"
  ON "Case"("caseNumber", "caseYear");

-- Prevent duplicated reviewer assignment for the same case.
CREATE UNIQUE INDEX IF NOT EXISTS "CaseReviewer_case_doctor_unique"
  ON "CaseReviewer"("caseId", "doctorId")
  WHERE "doctorId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "CaseReviewer_case_user_unique"
  ON "CaseReviewer"("caseId", "userId")
  WHERE "userId" IS NOT NULL;

-- A payment row must point to exactly one recipient.
ALTER TABLE "Payment"
  DROP CONSTRAINT IF EXISTS "Payment_exactly_one_recipient_check";

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_exactly_one_recipient_check"
  CHECK (
    (CASE WHEN "memberId" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "doctorId" IS NOT NULL THEN 1 ELSE 0 END) = 1
  );

-- Store money as fixed precision instead of floating point.
ALTER TABLE "Payment"
  ALTER COLUMN "amount" TYPE DECIMAL(12,2)
  USING CASE WHEN "amount" IS NULL THEN NULL ELSE ROUND("amount"::numeric, 2) END;

-- Guard against negative / unreasonable payment values at the database layer.
ALTER TABLE "Payment"
  DROP CONSTRAINT IF EXISTS "Payment_amount_range_check";

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_amount_range_check"
  CHECK ("amount" IS NULL OR ("amount" >= 0 AND "amount" <= 1000000));

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_case_doctor_role_unique"
  ON "Payment"("caseId", "doctorId", "recipientRole")
  WHERE "doctorId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_case_member_role_unique"
  ON "Payment"("caseId", "memberId", "recipientRole")
  WHERE "memberId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Payment_caseId_idx" ON "Payment"("caseId");
CREATE INDEX IF NOT EXISTS "Payment_doctorId_idx" ON "Payment"("doctorId");
CREATE INDEX IF NOT EXISTS "Payment_memberId_idx" ON "Payment"("memberId");
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");
