import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptOptionalField } from "@/lib/crypto";
import cleanDoctors from "@/lib/data/clean_doctors.json";

export const dynamic = "force-dynamic";

function normalizeArabic(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآء]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\w\s\u0600-\u06FF]/gi, " ")
    .replace(/\s+/g, " ");
}

export async function GET() {
  try {
    // 1. استرجاع اللجان الفرعية والتخصصات
    const [allCommittees, allSpecialties] = await Promise.all([
      prisma.subCommittee.findMany({ select: { id: true, name: true, code: true } }),
      prisma.specialty.findMany({ select: { id: true, name: true } }),
    ]);

    function findSubCommittee(nameOrCode: string) {
      const clean = nameOrCode.trim();
      const norm = normalizeArabic(clean);

      let found = allCommittees.find((c) => c.code.toLowerCase() === clean.toLowerCase());
      if (found) return found;

      found = allCommittees.find((c) => c.name.trim() === clean);
      if (found) return found;

      found = allCommittees.find((c) => {
        const cNorm = normalizeArabic(c.name);
        return cNorm === norm || cNorm.includes(norm) || norm.includes(cNorm);
      });

      return found || null;
    }

    const specialtyCache = new Map<string, string>();
    allSpecialties.forEach((s) => {
      specialtyCache.set(normalizeArabic(s.name), s.id);
    });

    async function getOrCreateSpecialty(specialtyName: string): Promise<string | null> {
      if (!specialtyName || !specialtyName.trim()) return null;
      const clean = specialtyName.trim();
      const norm = normalizeArabic(clean);

      for (const [k, id] of specialtyCache.entries()) {
        if (k === norm || k.includes(norm) || norm.includes(k)) {
          return id;
        }
      }

      // إذا لم يكن موجوداً ننشئه
      try {
        const created = await prisma.specialty.create({
          data: { name: clean },
        });
        specialtyCache.set(norm, created.id);
        return created.id;
      } catch {
        const existing = await prisma.specialty.findFirst({ where: { name: clean } });
        return existing?.id || null;
      }
    }

    let createdCount = 0;
    let existingCount = 0;
    let skippedCount = 0;
    const committeeBreakdown: Record<string, number> = {};

    for (const doc of cleanDoctors as any[]) {
      const committee = findSubCommittee(doc.committee);
      if (!committee) {
        skippedCount++;
        continue;
      }

      const specialtyId = await getOrCreateSpecialty(doc.specialty);

      // فحص وجود الطبيب مسبقاً بنفس الاسم واللجنة لمنع التكرار
      const existing = await prisma.subCommitteeDoctor.findFirst({
        where: {
          name: doc.name.trim(),
          subCommitteeId: committee.id,
        },
      });

      if (existing) {
        existingCount++;
        // تحديث الحقول الناقصة إن وجدت
        if (!existing.specialtyId && specialtyId) {
          await prisma.subCommitteeDoctor.update({
            where: { id: existing.id },
            data: { specialtyId },
          });
        }
      } else {
        await prisma.subCommitteeDoctor.create({
          data: {
            subCommitteeId: committee.id,
            name: doc.name.trim(),
            title: doc.title?.trim() || "أستاذ دكتور",
            employer: doc.employer?.trim() || doc.committee.trim(),
            specialtyId: specialtyId,
            phone: doc.phone?.trim() || null,
            nationalId: doc.nationalId ? encryptOptionalField(doc.nationalId.replace(/\D/g, "")) : null,
            bankName: doc.bankName?.trim() || null,
            accountNumber: doc.accountNumber ? encryptOptionalField(doc.accountNumber.trim()) : null,
            cardNumber: doc.cardNumber ? encryptOptionalField(doc.cardNumber.trim()) : null,
            financialType: doc.financialType?.trim() || (doc.accountNumber ? "BANK_ACCOUNT" : null),
            active: true,
          },
        });
        createdCount++;
        committeeBreakdown[committee.name] = (committeeBreakdown[committee.name] || 0) + 1;
      }
    }

    const totalInDb = await prisma.subCommitteeDoctor.count();

    return NextResponse.json({
      success: true,
      message: `تمت معالجة (${cleanDoctors.length}) طبيباً سليماً بدون أي تكرارات بنجاح.`,
      stats: {
        totalCleanProcessed: cleanDoctors.length,
        newlyCreated: createdCount,
        alreadyExisting: existingCount,
        skipped: skippedCount,
        totalDoctorsInDatabaseNow: totalInDb,
        breakdownByCommittee: committeeBreakdown,
      },
    });
  } catch (err: any) {
    console.error("import-clean-doctors error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
