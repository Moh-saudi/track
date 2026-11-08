import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

// قواعد الاستنتاج الذكي للمحافظات بناءً على أسماء المستشفيات والجهات المصرية
const GOVERNORATE_RULES: { keywords: string[]; governorate: string }[] = [
  { keywords: ["قصر العيني", "عين شمس", "الدمرداش", "الحسين", "أحمد ماهر", "المنيرة", "سيد جلال", "باب الشعرية", "مدينة نصر", "المعادي", "حلوان", "روض الفرج", "شبرا مصر", "معهد ناصر", "الهلال", "دار السلام", "الساحل التعليمي", "جراحة اليوم الواحد بالمرج", "الزهراء الجامعي"], governorate: "القاهرة" },
  { keywords: ["الهرم", "الدقي", "العجوزة", "إمبابة", "بولاق الدكرور", "أكتوبر", "الشيخ زايد", "جامعة 6 أكتوبر", "مستشفى الجيزة", "أم المصريين"], governorate: "الجيزة" },
  { keywords: ["الشاطبي", "الميري", "سموحة", "رأس التين", "برج العرب", "الإسكندرية", "مستشفى كوم الشقافة", "ناريمان"], governorate: "الإسكندرية" },
  { keywords: ["بني سويف", "الفشن", "الواسطى", "إهناسيا", "ببا"], governorate: "بني سويف" },
  { keywords: ["المنيا", "ملوي", "مغاغة", "بني مزار", "سمالوط", "أبو قرقاص"], governorate: "المنيا" },
  { keywords: ["أسيوط", "ديروط", "منفلوط", "القوصية", "أبنوب", "صدفا", "الغانم"], governorate: "أسيوط" },
  { keywords: ["سوهاج", "طهطا", "جرجا", "أخميم", "المراغة", "البلينا"], governorate: "سوهاج" },
  { keywords: ["قنا", "نجع حمادي", "دشنا", "قوص", "فرشوط", "أبو تشت"], governorate: "قنا" },
  { keywords: ["الأقصر", "إسنا", "أرمنت", "القرنة"], governorate: "الأقصر" },
  { keywords: ["أسوان", "كوم أمبو", "إدفو", "نصر النوبة", "دراو"], governorate: "أسوان" },
  { keywords: ["الفيوم", "إطسا", "طامية", "سنورس", "أبشواي", "يوسف الصديق"], governorate: "الفيوم" },
  { keywords: ["طنطا", "المحلة", "الغربية", "كفر الزيات", "زفتى", "السنطة", "بسيون", "سمنود"], governorate: "الغربية" },
  { keywords: ["المنصورة", "الدقهلية", "ميت غمر", "السنبلاوين", "دكرنس", "بلقاس", "شربين", "أجا", "منية النصر", "ميت سلسيل"], governorate: "الدقهلية" },
  { keywords: ["الشرقية", "الزقازيق", "العاشر من رمضان", "بلبيس", "فاقوس", "أبو حماد", "أبو كبير", "ههيا", "منيا القمح", "ديرب نجم"], governorate: "الشرقية" },
  { keywords: ["القليوبية", "بنها", "شبرا الخيمة", "قليوب", "طوخ", "القناطر الخيرية", "كفر شكر", "الخانكة", "العبور"], governorate: "القليوبية" },
  { keywords: ["المنوفية", "شبين الكوم", "منوف", "أشمون", "قويسنا", "تلا", "الشهداء", "بركة السبع", "سرس الليان"], governorate: "المنوفية" },
  { keywords: ["الإسماعيلية", "فايد", "القنطرة", "التل الكبير", "أبو صوير"], governorate: "الإسماعيلية" },
  { keywords: ["السويس", "الأربعين", "عتاقة"], governorate: "السويس" },
  { keywords: ["بورسعيد", "بورفؤاد", "الزهور"], governorate: "بورسعيد" },
  { keywords: ["دمياط", "رأس البر", "فارسكور", "الزرقا", "كفر سعد"], governorate: "دمياط" },
  { keywords: ["كفر الشيخ", "دسوق", "فوه", "مطوبس", "بيلا", "قلين", "سيدي سالم", "الحامول", "بلطيم"], governorate: "كفر الشيخ" },
  { keywords: ["البحيرة", "دمنهور", "كفر الدوار", "إيتاي البارود", "أبو حمص", "حوش عيسى", "رشيد", "كوم حمادة", "الدلنجات"], governorate: "البحيرة" },
  { keywords: ["مطروح", "العلمين", "سيوة", "الضبعة", "الحمام", "السلوم", "النجيلة"], governorate: "مطروح" },
  { keywords: ["شمال سيناء", "العريش", "بئر العبد", "الشيخ زويد", "رفح"], governorate: "شمال سيناء" },
  { keywords: ["جنوب سيناء", "شرم الشيخ", "الطور", "دهب", "نويبع", "رأس سدر", "طابا"], governorate: "جنوب سيناء" },
  { keywords: ["البحر الأحمر", "الغردقة", "سفاجا", "القصير", "مرسى علم", "رأس غارب"], governorate: "البحر الأحمر" },
  { keywords: ["الوادي الجديد", "الخارجة", "الداخلة", "الفرافرة", "باريس"], governorate: "الوادي الجديد" },
];

function detectGovernorate(text: string): { governorate: string; matchedKeyword: string } | null {
  if (!text) return null;
  const clean = text.toLowerCase();
  for (const rule of GOVERNORATE_RULES) {
    for (const kw of rule.keywords) {
      if (clean.includes(kw.toLowerCase())) {
        return { governorate: rule.governorate, matchedKeyword: kw };
      }
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const unspecifiedCases = await prisma.case.findMany({
    where: {
      AND: [
        { OR: [{ governorate: null }, { governorate: "" }] },
        { OR: [{ prosecutionRel: null }, { prosecutionRel: { governorate: null } }] },
      ],
    },
    select: {
      id: true,
      caseNumber: true,
      caseYear: true,
      registrationType: true,
      hospitalName: true,
      entityName: true,
      entityType: true,
      complainantName: true,
      respondentName: true,
      description: true,
      subCommittee: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const suggestions = unspecifiedCases.map((c) => {
    const searchTarget = [
      c.hospitalName || "",
      c.entityName || "",
      c.description || "",
      c.subCommittee?.name || "",
    ].join(" ");

    const detected = detectGovernorate(searchTarget);

    return {
      id: c.id,
      caseNumber: c.caseNumber,
      caseYear: c.caseYear,
      registrationType: c.registrationType,
      hospitalName: c.hospitalName || c.entityName || "—",
      complainantName: c.complainantName || "—",
      subCommitteeName: c.subCommittee?.name || "—",
      suggestedGovernorate: detected?.governorate || null,
      matchedReason: detected ? `استنتاج من (${detected.matchedKeyword})` : null,
    };
  });

  return NextResponse.json({
    totalUnspecified: unspecifiedCases.length,
    autoDetectedCount: suggestions.filter((s) => s.suggestedGovernorate !== null).length,
    suggestions,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  const allowed = ["ADMIN", "REGISTRATION_CLERK", "SUPREME_SUPERVISOR", "FOLLOW_UP_OFFICER"];
  if (!allowed.includes(role)) {
    return NextResponse.json({ error: "غير مصرح بتعديل بيانات السجلات" }, { status: 403 });
  }

  const body = await req.json();
  const updates: { caseId: string; governorate: string }[] = body.updates || [];

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: "قائمة التحديثات فارغة" }, { status: 400 });
  }

  const results: { id: string; success: boolean; error?: string }[] = [];
  for (const item of updates) {
    if (!item.caseId || !item.governorate) continue;
    try {
      const updated = await prisma.case.update({
        where: { id: item.caseId },
        data: { governorate: item.governorate.trim() },
      });
      await writeAuditLog({
        entityType: "Case",
        entityId: item.caseId,
        action: "UPDATE",
        userId: (session.user as any).id,
        beforeData: { governorate: null },
        afterData: { governorate: item.governorate.trim() },
      });
      results.push({ id: item.caseId, success: true });
    } catch (e: any) {
      results.push({ id: item.caseId, success: false, error: e.message });
    }
  }

  return NextResponse.json({
    successCount: results.filter((r) => r.success).length,
    totalRequested: updates.length,
    results,
  });
}

