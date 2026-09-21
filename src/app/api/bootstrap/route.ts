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

    // 1. مسح أي حظر مؤقت ناتج عن محاولات تسجيل الدخول الخاطئة
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "LoginThrottle";`).catch(() => {});

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
