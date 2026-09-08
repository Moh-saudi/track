/**
 * prisma/seed.ts
 * جمهورية مصر العربية — رئاسة مجلس الوزراء
 * اللجنة العليا للمسؤولية الطبية وسلامة المريض
 *
 * تعبئة البيانات الأولية المعتمدة:
 *   - اللجان والجهات الفرعية الـ 16 الرسمية
 *   - التخصصات الطبية المتعددة
 *   - المستخدمون القياسيون لمختلف الأدوار مع جهات العمل لفحص تعارض المصالح
 */

import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

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

async function main() {
  console.log("🌱 بدء تعبئة البيانات المعتمدة لرئاسة مجلس الوزراء — اللجنة العليا للمسؤولية الطبية...\n");

  // 1. إنشاء اللجان الفرعية الـ 16
  console.log("🏛️  تسجيل الجهات واللجان الفرعية الـ 16 المعتمدة:");
  for (const sc of OFFICIAL_SUBCOMMITTEES) {
    await prisma.subCommittee.upsert({
      where: { code: sc.code },
      update: { name: sc.name, scope: sc.scope },
      create: { code: sc.code, name: sc.name, scope: sc.scope },
    });
    console.log(`  ✅ [${sc.code}] ${sc.name} — (${sc.scope})`);
  }

  // 2. إنشاء التخصصات الطبية
  console.log("\n🩺 تسجيل التخصصات الطبية المعيارية:");
  for (const spec of MEDICAL_SPECIALTIES) {
    await prisma.specialty.upsert({
      where: { name: spec.name },
      update: { code: spec.code },
      create: { name: spec.name, code: spec.code },
    });
    console.log(`  ✅ [${spec.code}] ${spec.name}`);
  }

  // 3. تسجيل النيابات الرسمية
  console.log("\n⚖️ تسجيل النيابات الرسمية المعتمدة:");
  let procIdx = 1;
  for (const procName of OFFICIAL_PROSECUTIONS) {
    const code = `PROC-${String(procIdx).padStart(2, "0")}`;
    await prisma.prosecution.upsert({
      where: { name: procName },
      update: {},
      create: {
        name: procName,
        code,
        active: true,
      },
    });
    console.log(`  ✅ [${code}] ${procName}`);
    procIdx++;
  }

  const defaultPassword = "ChangeMe123!";
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  // 3. مستخدم مدير النظام
  console.log("\n👤 إنشاء حساب مدير النظام (ADMIN)...");
  await prisma.user.upsert({
    where: { email: "admin@example.local" },
    update: { fullName: "مدير النظام — رئاسة مجلس الوزراء", employer: "رئاسة مجلس الوزراء" },
    create: {
      email: "admin@example.local",
      fullName: "مدير النظام — رئاسة مجلس الوزراء",
      passwordHash,
      role: UserRole.ADMIN,
      employer: "رئاسة مجلس الوزراء",
      active: true,
    },
  });

  // 4. مستخدم موظف التسجيل (قيد السجلات فقط)
  console.log("👤 إنشاء حساب موظف التسجيل (REGISTRATION_CLERK)...");
  await prisma.user.upsert({
    where: { email: "clerk@example.local" },
    update: { fullName: "موظف قيد السجلات والشكاوى", employer: "الأمانة الفنية للجنة العليا" },
    create: {
      email: "clerk@example.local",
      fullName: "موظف قيد السجلات والشكاوى",
      passwordHash,
      role: UserRole.REGISTRATION_CLERK,
      employer: "الأمانة الفنية للجنة العليا",
      active: true,
    },
  });

  // 5. مستخدم موظف المتابعة والتوجيه (توزيع ومتابعة مدد اللجان)
  console.log("👤 إنشاء حساب موظف المتابعة والتوجيه (FOLLOW_UP_OFFICER)...");
  await prisma.user.upsert({
    where: { email: "followup@example.local" },
    update: { fullName: "أ. محمود شاكر — موظف المتابعة وتوجيه السجلات", employer: "إدارة المتابعة وتقييم الأداء" },
    create: {
      email: "followup@example.local",
      fullName: "أ. محمود شاكر — موظف المتابعة وتوجيه السجلات",
      passwordHash,
      role: UserRole.FOLLOW_UP_OFFICER,
      employer: "إدارة المتابعة وتقييم الأداء",
      active: true,
    },
  });

  // 6. مقرر اللجنة الفرعية (حساب واحد فقط لكل لجنة فرعية)
  const qasrElAiny = await prisma.subCommittee.findFirst({ where: { code: "SC-03" } });
  const genSurgery = await prisma.specialty.findFirst({ where: { name: "جراحة عامة" } });
  const anesthesia = await prisma.specialty.findFirst({ where: { name: "التخدير وعلاج الألم" } });
  const orthopedics = await prisma.specialty.findFirst({ where: { name: "جراحة عظام وكسور" } });
  const obgyn = await prisma.specialty.findFirst({ where: { name: "أمراض النساء والتوليد" } });

  console.log("👤 إنشاء حساب مقرر اللجنة الفرعية (حساب مستخدم واحد فقط للجنة)...");
  if (qasrElAiny) {
    await prisma.user.upsert({
      where: { email: "dr.ahmed@example.local" },
      update: {
        fullName: "أ.د. أحمد فؤاد — مقرر لجنة قصر العيني",
        employer: "كلية طب قصر العيني",
        subCommitteeId: qasrElAiny.id,
      },
      create: {
        email: "dr.ahmed@example.local",
        fullName: "أ.د. أحمد فؤاد — مقرر لجنة قصر العيني",
        passwordHash,
        role: UserRole.SUBCOMMITTEE_MEMBER,
        employer: "كلية طب قصر العيني",
        subCommitteeId: qasrElAiny.id,
        active: true,
      },
    });

    // 7. سجل الأطباء والاستشاريين التابعين للجنة الفرعية (بدون حسابات دخول للمنظومة)
    console.log("👨‍⚕️  تسجيل الأطباء والاستشاريين في سجل اللجنة الفرعية (لا يملكون حسابات دخول)...");
    const sampleDoctors = [
      {
        name: "أ.د. حازم القاضي",
        title: "أستاذ دكتور",
        employer: "مستشفيات جامعة القاهرة (قصر العيني)",
        specialtyId: genSurgery?.id,
        phone: "01001234567",
        nationalId: "26804150102345",
        financialType: "PAYROLL_CARD",
        bankName: "البنك الأهلي المصري (ميزة مرتبات حكومية)",
        cardNumber: "5078 1122 3344 5566",
        active: true,
      },
      {
        name: "د. سارة المنشاوي",
        title: "استشاري",
        employer: "معهد ناصر للبحوث والعلاج",
        specialtyId: anesthesia?.id,
        phone: "01119876543",
        nationalId: "27508200103456",
        financialType: "PAYROLL_CARD",
        bankName: "بنك مصر (فيزا مرتبات)",
        cardNumber: "5078 1234 5678 9012",
        active: true,
      },
      {
        name: "أ.د. طارق السعيد",
        title: "أستاذ دكتور",
        employer: "مستشفى الهلال الأحمر التخصصي",
        specialtyId: orthopedics?.id,
        phone: "01223456789",
        nationalId: "26203100104567",
        financialType: "BANK_ACCOUNT",
        bankName: "بنك القاهرة",
        accountNumber: "22004466880011",
        iban: "EG550004022004466880011000",
        active: true,
      },
      {
        name: "د. منى عبد الرحمن",
        title: "استشاري",
        employer: "مستشفى الجلاء للولادة",
        specialtyId: obgyn?.id,
        phone: "01098765432",
        nationalId: "27811050105678",
        financialType: "BANK_CARD",
        bankName: "البنك الأهلي المصري",
        cardNumber: "5078 9876 5432 1098",
        active: false, // موقوفة مؤقتاً لاختبار الإيقاف المؤقت
        notes: "موقوفة مؤقتاً لوجودها في إجازة علمية خارج البلاد",
      },
    ];

    for (const doc of sampleDoctors) {
      const existing = await prisma.subCommitteeDoctor.findFirst({
        where: { subCommitteeId: qasrElAiny.id, name: doc.name },
      });
      if (!existing) {
        await prisma.subCommitteeDoctor.create({
          data: {
            subCommitteeId: qasrElAiny.id,
            ...doc,
          },
        });
        console.log(`  ✅ إضافة الطبيب لسجل اللجنة: ${doc.name} (${doc.employer}) — ${doc.active ? "نشط" : "موقوف مؤقتاً"}`);
      } else {
        await prisma.subCommitteeDoctor.update({
          where: { id: existing.id },
          data: {
            nationalId: doc.nationalId,
            financialType: doc.financialType,
            bankName: doc.bankName,
            accountNumber: (doc as any).accountNumber || null,
            iban: (doc as any).iban || null,
            cardNumber: (doc as any).cardNumber || null,
          },
        });
        console.log(`  ✅ تحديث البيانات المالية للطبيب: ${doc.name}`);
      }
    }
  }

  // 7. عضو اللجنة العليا
  console.log("👤 إنشاء حساب عضو اللجنة العليا (SUPREME_COMMITTEE)...");
  await prisma.user.upsert({
    where: { email: "supreme@example.local" },
    update: { fullName: "المستشار / رئيس الدائرة العليا", employer: "اللجنة العليا للمسؤولية الطبية" },
    create: {
      email: "supreme@example.local",
      fullName: "المستشار / رئيس الدائرة العليا",
      passwordHash,
      role: UserRole.SUPREME_COMMITTEE,
      employer: "اللجنة العليا للمسؤولية الطبية",
      active: true,
    },
  });

  // 8. موظف المالية
  console.log("👤 إنشاء حساب موظف المالية (FINANCE)...");
  await prisma.user.upsert({
    where: { email: "finance@example.local" },
    update: { fullName: "مسؤول الشؤون المالية والتعويضات", employer: "صندوق التأمين الحكومي" },
    create: {
      email: "finance@example.local",
      fullName: "مسؤول الشؤون المالية والتعويضات",
      passwordHash,
      role: UserRole.FINANCE,
      employer: "صندوق التأمين الحكومي",
      active: true,
    },
  });

  console.log("\n✨ اكتملت تعبئة البيانات بنجاح!");
  console.log("═════════════════════════════════════════════════════════");
  console.log("🔑 حسابات تسجيل الدخول (كلمة المرور الموحدة: ChangeMe123!):");
  console.log("   • admin@example.local     → مدير النظام (ADMIN)");
  console.log("   • clerk@example.local     → موظف قيد السجلات (REGISTRATION_CLERK)");
  console.log("   • followup@example.local  → موظف المتابعة والتوجيه (FOLLOW_UP_OFFICER)");
  console.log("   • dr.ahmed@example.local  → مقرر اللجنة الفاحصة (SUBCOMMITTEE_MEMBER)");
  console.log("   • supreme@example.local   → عضو اللجنة العليا (SUPREME_COMMITTEE)");
  console.log("   • finance@example.local   → موظف المالية (FINANCE)");
  console.log("═════════════════════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("❌ خطأ أثناء تعبئة البيانات:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
