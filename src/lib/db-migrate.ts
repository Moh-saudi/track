import { prisma } from "@/lib/prisma";

let migrationDone = false;

export async function ensureSchemaMigrated(): Promise<void> {
  if (migrationDone) return;

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "complainants" JSONB;`).catch(() => {});
    await prisma.$executeRawUnsafe(`ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "respondents" JSONB;`).catch(() => {});
    await prisma.$executeRawUnsafe(`ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "sessionAttendees" JSONB;`).catch(() => {});
    await prisma.$executeRawUnsafe(`ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "complainantPhone" TEXT;`).catch(() => {});
    await prisma.$executeRawUnsafe(`ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "respondentPhone" TEXT;`).catch(() => {});
    await prisma.$executeRawUnsafe(`ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "partialProsecution" TEXT;`).catch(() => {});
    await prisma.$executeRawUnsafe(`ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "partialProsecutionId" TEXT;`).catch(() => {});
    await prisma.$executeRawUnsafe(`ALTER TABLE "Prosecution" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'PLENARY';`).catch(() => {});
    await prisma.$executeRawUnsafe(`ALTER TABLE "Prosecution" ADD COLUMN IF NOT EXISTS "parentId" TEXT;`).catch(() => {});
    await prisma.$executeRawUnsafe(`UPDATE "Prosecution" SET "active" = true WHERE "active" IS NULL OR "active" = false;`).catch(() => {});

    migrationDone = true;
  } catch (err) {
    console.warn("ensureSchemaMigrated warning:", err);
  }
}
