import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";
import {
  assertLoginAllowed,
  clearLoginFailures,
  recordLoginFailure,
} from "../src/lib/auth-rate-limit";

const prisma = new PrismaClient();

async function expectRejected(fn: () => Promise<unknown>, label: string) {
  let rejected = false;
  try {
    await fn();
  } catch {
    rejected = true;
  }
  assert.equal(rejected, true, label);
}

async function main() {
  const suffix = Date.now().toString();
  const email = `security-test-${suffix}@gov.test`;
  const caseNumber = `SEC-${suffix}`;

  const passwordHash = await bcrypt.hash("Security-Test-2026!", 12);
  const user = await prisma.user.create({
    data: {
      email,
      fullName: "Security Test User",
      passwordHash,
      role: UserRole.ADMIN,
      employer: "CI",
      active: true,
    },
  });

  const caseRow = await prisma.case.create({
    data: {
      registrationType: "COMPLAINT",
      caseNumber,
      caseYear: 2099,
      description: "CI security constraint test",
      createdById: user.id,
    },
  });

  await expectRejected(
    () => prisma.case.create({
      data: {
        registrationType: "COMPLAINT",
        caseNumber,
        caseYear: 2099,
        description: "duplicate",
        createdById: user.id,
      },
    }),
    "Duplicate case number/year must be rejected"
  );

  await prisma.payment.create({
    data: {
      caseId: caseRow.id,
      memberId: user.id,
      recipientRole: "CI_TEST",
      amount: 100,
    },
  });

  await expectRejected(
    () => prisma.payment.create({
      data: {
        caseId: caseRow.id,
        memberId: user.id,
        recipientRole: "CI_TEST",
        amount: 100,
      },
    }),
    "Duplicate payment entitlement must be rejected"
  );

  await expectRejected(
    () => prisma.payment.create({
      data: {
        caseId: caseRow.id,
        memberId: user.id,
        recipientRole: "CI_NEGATIVE",
        amount: -1,
      },
    }),
    "Negative payment must be rejected by the database"
  );

  await expectRejected(
    () => prisma.payment.create({
      data: {
        caseId: caseRow.id,
        memberId: user.id,
        doctorId: "invalid-but-non-null",
        recipientRole: "CI_TWO_RECIPIENTS",
        amount: 1,
      },
    }),
    "Payment with two recipient types must be rejected"
  );

  const reviewerConstraint = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM pg_constraint
    WHERE conname = 'CaseReviewer_exactly_one_reviewer_check'
  `;
  assert.equal(Number(reviewerConstraint[0]?.count || 0), 1, "Reviewer identity check constraint must exist");

  const auditTrigger = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM pg_trigger
    WHERE tgname = 'AuditLog_immutable_trigger' AND NOT tgisinternal
  `;
  assert.equal(Number(auditTrigger[0]?.count || 0), 1, "Immutable AuditLog trigger must exist");

  const throttleId = `security-throttle-${suffix}@gov.test`;
  await clearLoginFailures(throttleId);
  for (let i = 0; i < 5; i++) await recordLoginFailure(throttleId);
  await expectRejected(
    () => assertLoginAllowed(throttleId),
    "Login throttle must block repeated failures"
  );
  await clearLoginFailures(throttleId);

  await prisma.payment.deleteMany({ where: { caseId: caseRow.id } });
  await prisma.case.delete({ where: { id: caseRow.id } });
  await prisma.user.delete({ where: { id: user.id } });

  console.log("Security database test: PASS");
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
