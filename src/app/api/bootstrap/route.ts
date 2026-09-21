import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 0. ترقية جدول المستخدمين وضمان وجود الأعمدة والجداول الأمنية الجديدة
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 1;
    `).catch((e) => console.error("Alter User error:", e));

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "LoginThrottle" (
        "identifierHash" TEXT NOT NULL,
        "failureCount" INTEGER NOT NULL DEFAULT 0,
        "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "blockedUntil" TIMESTAMP(3),
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("identifierHash")
      );
    `).catch((e) => console.error("Create LoginThrottle error:", e));

    // ترقية جدول القضايا لدعم تعدد الشاكين والمشكو في حقهم وأرقام الهواتف والنيابة الجزئية
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "complainants" JSONB;
      ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "respondents" JSONB;
      ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "sessionAttendees" JSONB;
      ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "complainantPhone" TEXT;
      ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "respondentPhone" TEXT;
      ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "partialProsecution" TEXT;
      ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "partialProsecutionId" TEXT;
    `).catch((e) => console.error("Alter Case error:", e));

    // ترقية جدول النيابات لدعم النوع (كلية / جزئية) والتبعية الهرمية
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Prosecution" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'PLENARY';
      ALTER TABLE "Prosecution" ADD COLUMN IF NOT EXISTS "parentId" TEXT;
    `).catch((e) => console.error("Alter Prosecution error:", e));

    // 1. تصنيف النيابات إلى كلية وجزئية وربط الجزئية بالكلية
    await prisma.$executeRawUnsafe(`
      UPDATE "Prosecution" SET "type" = 'DISTRICT' WHERE "name" LIKE '%الجزئية%' OR "name" LIKE '%جزئية%';
      UPDATE "Prosecution" SET "type" = 'PLENARY' WHERE "type" IS NULL OR "name" LIKE '%الكلية%' OR "name" LIKE '%كلية%';
    `).catch(() => {});

    // ربط النيابات الجزئية بالنيابة الكلية لنفس المحافظة تلقائياً
    await prisma.$executeRawUnsafe(`
      UPDATE "Prosecution" d
      SET "parentId" = (
        SELECT p.id FROM "Prosecution" p
        WHERE p."type" = 'PLENARY'
          AND p.governorate = d.governorate
          AND p.id <> d.id
        ORDER BY p."createdAt" ASC
        LIMIT 1
      )
      WHERE d."type" = 'DISTRICT' AND d."parentId" IS NULL AND d.governorate IS NOT NULL;
    `).catch(() => {});

    // مسح أي حظر مؤقت ناتج عن محاولات تسجيل الدخول الخاطئة
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "LoginThrottle";`).catch(() => {});

    // تفعيل كافة النيابات وضمان وجود القائمة المعتمدة
    await prisma.$executeRawUnsafe(`UPDATE "Prosecution" SET "active" = true WHERE "active" IS NULL OR "active" = false;`).catch(() => {});
    const procsCount = await prisma.prosecution.count();
    if (procsCount < 20) {
      const { OFFICIAL_PROSECUTIONS_LIST } = await import("@/lib/constants/prosecutions");
      for (const p of OFFICIAL_PROSECUTIONS_LIST.filter((x) => x.type === "PLENARY")) {
        await prisma.prosecution.upsert({
          where: { name: p.name },
          update: { governorate: p.governorate, type: "PLENARY", active: true },
          create: { name: p.name, governorate: p.governorate, type: "PLENARY", active: true },
        });
      }
      for (const p of OFFICIAL_PROSECUTIONS_LIST.filter((x) => x.type === "DISTRICT")) {
        const parent = p.parentName ? await prisma.prosecution.findFirst({ where: { name: p.parentName } }) : null;
        await prisma.prosecution.upsert({
          where: { name: p.name },
          update: { governorate: p.governorate, type: "DISTRICT", parentId: parent?.id || null, active: true },
          create: { name: p.name, governorate: p.governorate, type: "DISTRICT", parentId: parent?.id || null, active: true },
        });
      }
    }

    // 2. كلمة المرور الموحدة المعتمدة
    const defaultPassword = "ChangeMe123!";
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    // 3. ربط لجنة قصر العيني لعضو اللجنة إن وجدت
    const qasrElAiny = await prisma.subCommittee.findFirst({ where: { code: "SC-03" } });

    // 4. الحسابات المعتمدة لجميع الأدوار
    const accounts = [
      {
        email: "admin@example.local",
        fullName: "أحمد عبد الله — مدير المنظومة",
        role: UserRole.ADMIN,
        employer: "رئاسة مجلس الوزراء",
        subCommitteeId: null,
      },
      {
        email: "clerk@example.local",
        fullName: "سارة إبراهيم — موظفة قيد السجلات",
        role: UserRole.REGISTRATION_CLERK,
        employer: "أمانة اللجنة العليا",
        subCommitteeId: null,
      },
      {
        email: "followup@example.local",
        fullName: "محمود شاكر — موظف المتابعة والتوجيه",
        role: UserRole.FOLLOW_UP_OFFICER,
        employer: "إدارة المتابعة وتقييم الأداء",
        subCommitteeId: null,
      },
      {
        email: "dr.ahmed@example.local",
        fullName: "أ.د. أحمد فؤاد — مقرر لجنة قصر العيني",
        role: UserRole.SUBCOMMITTEE_MEMBER,
        employer: "كلية طب قصر العيني",
        subCommitteeId: qasrElAiny?.id || null,
      },
      {
        email: "supreme@example.local",
        fullName: "المستشار / رئيس الدائرة العليا",
        role: UserRole.SUPREME_COMMITTEE,
        employer: "اللجنة العليا للمسؤولية الطبية",
        subCommitteeId: null,
      },
      {
        email: "finance@example.local",
        fullName: "عصام الدسوقي — مسؤول الشؤون المالية",
        role: UserRole.FINANCE,
        employer: "صندوق التأمين الحكومي",
        subCommitteeId: null,
      },
    ];

    const results = [];
    for (const acc of accounts) {
      const user = await prisma.user.upsert({
        where: { email: acc.email },
        update: {
          fullName: acc.fullName,
          passwordHash,
          role: acc.role,
          employer: acc.employer,
          subCommitteeId: acc.subCommitteeId,
          active: true,
          sessionVersion: 1,
        },
        create: {
          email: acc.email,
          fullName: acc.fullName,
          passwordHash,
          role: acc.role,
          employer: acc.employer,
          subCommitteeId: acc.subCommitteeId,
          active: true,
          sessionVersion: 1,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          active: true,
        },
      });
      results.push({
        email: user.email,
        name: user.fullName,
        role: user.role,
        status: user.active ? "نشط" : "معطل",
      });
    }

    return NextResponse.json({
      success: true,
      message: "تم تجهيز وتهيئة الحسابات بنجاح ومسح أي حظر مؤقت!",
      defaultPassword,
      accounts: results,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
