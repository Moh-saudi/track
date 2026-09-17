import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import { getUploadRoot } from "../src/lib/storage";
import { isEncryptedField } from "../src/lib/crypto";

const prisma = new PrismaClient();

type Check = { name: string; count: number; severity: "BLOCKER" | "WARNING" };

async function main() {
  const checks: Check[] = [];

  const duplicateCases = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM (
      SELECT "caseNumber", "caseYear"
      FROM "Case"
      GROUP BY "caseNumber", "caseYear"
      HAVING COUNT(*) > 1
    ) d
  `;
  checks.push({ name: "Duplicate caseNumber/caseYear groups", count: Number(duplicateCases[0]?.count || 0), severity: "BLOCKER" });

  const duplicateDoctorReviewers = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM (
      SELECT "caseId", "doctorId"
      FROM "CaseReviewer"
      WHERE "doctorId" IS NOT NULL
      GROUP BY "caseId", "doctorId"
      HAVING COUNT(*) > 1
    ) d
  `;
  checks.push({ name: "Duplicate doctor reviewer assignments", count: Number(duplicateDoctorReviewers[0]?.count || 0), severity: "BLOCKER" });

  const duplicateUserReviewers = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM (
      SELECT "caseId", "userId"
      FROM "CaseReviewer"
      WHERE "userId" IS NOT NULL
      GROUP BY "caseId", "userId"
      HAVING COUNT(*) > 1
    ) d
  `;
  checks.push({ name: "Duplicate user reviewer assignments", count: Number(duplicateUserReviewers[0]?.count || 0), severity: "BLOCKER" });

  const invalidRecipients = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "Payment"
    WHERE (
      (CASE WHEN "memberId" IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN "doctorId" IS NOT NULL THEN 1 ELSE 0 END)
    ) <> 1
  `;
  checks.push({ name: "Payments with invalid recipient cardinality", count: Number(invalidRecipients[0]?.count || 0), severity: "BLOCKER" });

  const duplicatePayments = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM (
      SELECT "caseId", COALESCE("doctorId", ''), COALESCE("memberId", ''), COALESCE("recipientRole", '')
      FROM "Payment"
      GROUP BY "caseId", COALESCE("doctorId", ''), COALESCE("memberId", ''), COALESCE("recipientRole", '')
      HAVING COUNT(*) > 1
    ) d
  `;
  checks.push({ name: "Duplicate payment entitlement groups", count: Number(duplicatePayments[0]?.count || 0), severity: "BLOCKER" });

  const invalidAmounts = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "Payment"
    WHERE "amount" IS NOT NULL AND ("amount" < 0 OR "amount" > 1000000)
  `;
  checks.push({ name: "Payments outside allowed amount range", count: Number(invalidAmounts[0]?.count || 0), severity: "BLOCKER" });

  const doctors = await prisma.subCommitteeDoctor.findMany({
    select: { nationalId: true, accountNumber: true, iban: true, cardNumber: true },
  });
  const plaintextSensitive = doctors.reduce((count, doctor) => {
    return count + [doctor.nationalId, doctor.accountNumber, doctor.iban, doctor.cardNumber]
      .filter((value) => value && !isEncryptedField(value)).length;
  }, 0);
  checks.push({
    name: "Legacy plaintext sensitive fields",
    count: plaintextSensitive,
    severity: process.env.REQUIRE_ENCRYPTED_SENSITIVE_FIELDS === "true" ? "BLOCKER" : "WARNING",
  });

  const uploadRoot = getUploadRoot();
  let writable = false;
  try {
    fs.mkdirSync(uploadRoot, { recursive: true });
    fs.accessSync(uploadRoot, fs.constants.R_OK | fs.constants.W_OK);
    writable = true;
  } catch {
    writable = false;
  }
  checks.push({ name: `Upload root not writable (${uploadRoot})`, count: writable ? 0 : 1, severity: "BLOCKER" });

  const blockers = checks.filter((check) => check.severity === "BLOCKER" && check.count > 0);
  console.table(checks);

  if (blockers.length > 0) {
    throw new Error(`Production preflight failed with ${blockers.length} blocker(s)`);
  }

  console.log("Production preflight: PASS");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
