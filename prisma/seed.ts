/**
 * prisma/seed.ts
 * جمهورية مصر العربية — رئاسة مجلس الوزراء
 * اللجنة العليا للمسؤولية الطبية وسلامة المريض
 *
 * تعبئة البيانات الأولية المعتمدة:
 *   - اللجان والجهات الفرعية الـ 16 الرسمية
 *   - التخصصات الطبية المتعددة
 *   - بيانات مرجعية فقط؛ لا يتم إنشاء أي حسابات أو بيانات شخصية تجريبية
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── 1. الجهات واللجان الفرعية الـ 16 المعتمدة بالقرار الرسمي ───────────────────
const OFFICIAL_SUBCOMMITTEES = [
  { code: "SC-01", name: "المجلس الصحي المصري", scope: "مستوى مركزي / قومي" },
  { code: "SC-02", name: "الهيئة العامة للمستشفيات والمعاهد التعليمية", scope: "مستشفيات ومعاهد تعليمية" },
  { code: "SC-03", name: "كلية طب جامعة القاهرة (قصر العيني)", scope: "إقليم القاهرة الكبرى" },
  { code: "SC-04", name: "كلية طب جامعة عين شمس", scope: "إقليم القاهرة الكبرى" },
  { code: "SC-05", name: "كلية طب جامعة الأزهر (بنين بالقاهرة)", scope: "نطاق جامعي أزهري" },
  { code: "SC-06", name: "كلية طب جامعة الإسكندرية", scope: "إقليم الإسكندرية والساحل" },
  { code: "SC-07", name: "كلية طب جامعة الفيوم", scope: "إقليم شمال الصعيد" },
  { code: "SC-08", name: "كلية طب جامعة المنيا", scope: "إقليم شمال الصعيد" },
  { code: "SC-09", name: "كلية طب جامعة أسيوط", scope: "إقليم وسط وجنوب الصعيد" },
  { code: "SC-10", name: "كلية طب جامعة سوهاج", scope: "إقليم جنوب الصعيد" },
  { code: "SC-11", name: "كلية طب جامعة أسوان", scope: "إقليم جنوب الصعيد" },
  { code: "SC-12", name: "كلية طب جامعة المنصورة", scope: "إقليم الدلتا" },
  { code: "SC-13", name: "كلية طب جامعة المنوفية", scope: "إقليم الدلتا" },
  { code: "SC-14", name: "كلية طب جامعة طنطا", scope: "إقليم الدلتا" },
  { code: "SC-15", name: "كلية طب جامعة الزقازيق", scope: "إقليم شرق الدلتا والقناة" },
  { code: "SC-16", name: "كلية طب جامعة قناة السويس", scope: "إقليم القناة وسيناء" },
];

// ─── 2. قائمة التخصصات الطبية المعيارية ────────────────────────────────────────
const MEDICAL_SPECIALTIES = [
  { code: "SPEC-01", name: "جراحة عامة" },
  { code: "SPEC-02", name: "جراحة عظام وكسور" },
  { code: "SPEC-03", name: "جراحة مخ وأعصاب" },
  { code: "SPEC-04", name: "جراحة قلب وصدر" },
  { code: "SPEC-05", name: "جراحة مسالك بولية وكلى" },
  { code: "SPEC-06", name: "جراحة أوعية دموية" },
  { code: "SPEC-07", name: "جراحة تجميل وحروق" },
  { code: "SPEC-08", name: "أمراض النساء والتوليد" },
  { code: "SPEC-09", name: "طب الأطفال وحديثي الولادة" },
  { code: "SPEC-10", name: "التخدير وعلاج الألم" },
  { code: "SPEC-11", name: "العناية المركزة وطب الحالات الحرجة" },
  { code: "SPEC-12", name: "الباطنة العامة وأمراض الجهاز الهضمي" },
  { code: "SPEC-13", name: "أمراض القلب والأوعية الدموية" },
  { code: "SPEC-14", name: "الأمراض الصدرية" },
  { code: "SPEC-15", name: "أمراض المخ والأعصاب" },
  { code: "SPEC-16", name: "طب وجراحة العيون" },
  { code: "SPEC-17", name: "أمراض الأنف والأذن والحنجرة" },
  { code: "SPEC-18", name: "طب الأسنان وجراحة الفم والفكين" },
  { code: "SPEC-19", name: "الأورام والطب النووي" },
  { code: "SPEC-20", name: "الأشعة التشخيصية والتدخلية" },
  { code: "SPEC-21", name: "الطب الشرعي والسموم الإكلينيكية" },
  { code: "SPEC-22", name: "الباثولوجيا الإكلينيكية والتحاليل الطبية" },
  { code: "SPEC-23", name: "جراحة أطفال" },
  { code: "SPEC-24", name: "جراحة أورام ومناظير" },
  { code: "SPEC-25", name: "جراحة السمنة ومناظير الجهاز الهضمي" },
  { code: "SPEC-26", name: "جراحة العمود الفقري" },
  { code: "SPEC-27", name: "أمراض الكلى والغسيل الكلوي" },
  { code: "SPEC-28", name: "الأمراض الجلدية والتناسلية" },
  { code: "SPEC-29", name: "الأمراض النفسية وعلاج الإدمان" },
  { code: "SPEC-30", name: "الروماتيزم والتأهيل والعلاج الطبيعي" },
  { code: "SPEC-31", name: "الأمراض المتوطنة والجهاز الهضمي والكبد" },
  { code: "SPEC-32", name: "طب الفم والأسنان (تقويم واستعاضة)" },
  { code: "SPEC-33", name: "طب الحالات الحرجة والطوارئ" },
  { code: "SPEC-34", name: "الباثولوجي (علم الأمراض الأنسجة)" },
];

// ─── 3. قائمة النيابات الرسمية المعتمدة ─────────────────────────────────────────
const OFFICIAL_PROSECUTIONS = [
  "أسوان الكلية",
  "أكتوبر الكلية",
  "إسنا الجزئية",
  "الأقصر الكلية",
  "الإسماعيلية الكلية",
  "البحر الأحمر الكلية",
  "الدخيلة الكلية",
  "الزرقا الجزئية",
  "الزقازيق الكلية",
  "السادس من أكتوبر الكلية",
  "السويس الكلية",
  "السيدة زينب",
  "الفيوم الكلية",
  "القاهرة الجديدة الكلية",
  "المحكمة التأديبية للصحة",
  "بني سويف الكلية",
  "بورسعيد الكلية",
  "قسم ثان وثالث الإسماعيلية",
  "جنوب أسيوط الكلية",
  "جنوب الجيزة الكلية",
  "جنوب الزقازيق الكلية",
  "جنوب القاهرة الكلية",
  "جنوب المنصورة الكلية",
  "جنوب المنيا الكلية",
  "جنوب بنها الكلية",
  "جنوب دمنهور الكلية",
  "جنوب سوهاج الكلية",
  "حلوان الكلية",
  "دمنهور الجزئية",
  "دمياط الكلية",
  "روض الفرج الجزئية",
  "شبين الكوم الكلية",
  "شبين الكوم الكلية - تلا الجزئية",
  "شرق القاهرة الكلية",
  "شرق طنطا الكلية",
  "شمال الجيزة الكلية",
  "شمال الزقازيق الكلية",
  "شمال القاهرة الكلية",
  "شمال المنصورة الكلية",
  "شمال المنيا الكلية",
  "شمال دمنهور الكلية",
  "غرب الإسكندرية الكلية",
  "غرب القاهرة",
  "غرب القاهرة العسكرية",
  "غرب القاهرة الكلية",
  "غرب القاهرة الكلية - الوايلي الجزئية",
  "قنا الكلية",
  "محكمة جنوب الزقازيق الابتدائية",
  "محكمة حلوان الابتدائية",
  "مديرية أمن قنا",
  "وسط القاهرة الكلية"
];


function inferGovernorate(name: string): string | null {
  if (name.includes("أسوان")) return "أسوان";
  if (name.includes("أكتوبر") || name.includes("الجيزة")) return "الجيزة";
  if (name.includes("الأقصر") || name.includes("إسنا")) return "الأقصر";
  if (name.includes("الإسماعيلية")) return "الإسماعيلية";
  if (name.includes("البحر الأحمر")) return "البحر الأحمر";
  if (name.includes("الإسكندرية") || name.includes("الدخيلة")) return "الإسكندرية";
  if (name.includes("دمياط") || name.includes("الزرقا")) return "دمياط";
  if (name.includes("الزقازيق")) return "الشرقية";
  if (name.includes("السويس")) return "السويس";
  if (name.includes("القاهرة") || name.includes("السيدة زينب") || name.includes("حلوان") || name.includes("روض الفرج") || name.includes("الوايلي") || name.includes("المحكمة التأديبية للصحة")) return "القاهرة";
  if (name.includes("الفيوم")) return "الفيوم";
  if (name.includes("بني سويف")) return "بني سويف";
  if (name.includes("بورسعيد")) return "بورسعيد";
  if (name.includes("أسيوط")) return "أسيوط";
  if (name.includes("المنصورة")) return "الدقهلية";
  if (name.includes("المنيا")) return "المنيا";
  if (name.includes("بنها")) return "القليوبية";
  if (name.includes("دمنهور")) return "البحيرة";
  if (name.includes("سوهاج")) return "سوهاج";
  if (name.includes("شبين الكوم") || name.includes("تلا")) return "المنوفية";
  if (name.includes("طنطا")) return "الغربية";
  if (name.includes("قنا")) return "قنا";
  return null;
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_REFERENCE_SEED !== "true") {
    throw new Error("Reference seed is disabled in production. Set ALLOW_REFERENCE_SEED=true for the controlled initialization window only.");
  }

  console.log("🌱 تعبئة البيانات المرجعية الرسمية فقط — بدون حسابات أو بيانات شخصية تجريبية");

  for (const sc of OFFICIAL_SUBCOMMITTEES) {
    await prisma.subCommittee.upsert({
      where: { code: sc.code },
      update: { name: sc.name, scope: sc.scope },
      create: { code: sc.code, name: sc.name, scope: sc.scope },
    });
  }

  for (const spec of MEDICAL_SPECIALTIES) {
    await prisma.specialty.upsert({
      where: { name: spec.name },
      update: { code: spec.code },
      create: { name: spec.name, code: spec.code },
    });
  }

  let procIdx = 1;
  for (const procName of OFFICIAL_PROSECUTIONS) {
    const code = `PROC-${String(procIdx).padStart(2, "0")}`;
    const governorate = inferGovernorate(procName);
    await prisma.prosecution.upsert({
      where: { name: procName },
      update: { governorate },
      create: { name: procName, code, governorate, active: true },
    });
    procIdx++;
  }

  console.log("✅ اكتملت البيانات المرجعية. لم يتم إنشاء أي مستخدم أو بيانات مالية/شخصية.");
}

main()
  .catch((error) => {
    console.error("❌ فشل seed المرجعي:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
