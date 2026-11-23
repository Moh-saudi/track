/**
 * scripts/import-doctors.ts
 * جمهورية مصر العربية — رئاسة مجلس الوزراء
 * اللجنة العليا للمسؤولية الطبية وسلامة المريض
 *
 * أداة الرفع الجماعي الذاتي لقوائم الأطباء والاستشاريين من ملفات الإكسيل (XLS / CSV)
 *
 * الاستخدام:
 *   npx tsx scripts/import-doctors.ts [مسار_الملف] [خيارات]
 *
 * خيارات:
 *   --dry-run       فحص وتدقيق البيانات فقط دون الكتابة في قاعدة البيانات
 *   --committee=ID  تقييد الاستيراد بلجنة فرعية معينة (كود أو اسم أو معرّف)
 *
 * أمثلة:
 *   npx tsx scripts/import-doctors.ts templates/doctors_import_template.csv --dry-run
 *   npx tsx scripts/import-doctors.ts templates/doctors_import_template.xls
 *   npx tsx scripts/import-doctors.ts "C:/path/to/doctors_cairo.xlsx"
 */

import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma";
import { encryptOptionalField, decryptOptionalField } from "../src/lib/crypto";
import { isValidEgyptianPhone } from "../src/lib/formatters";

interface RawDoctorRow {
  rowNumber: number;
  subCommittee: string;
  name: string;
  title?: string;
  specialty?: string;
  employer?: string;
  nationalId?: string;
  phone?: string;
  financialType?: string;
  bankName?: string;
  cardNumber?: string;
  accountNumber?: string;
  iban?: string;
  notes?: string;
}

// تطبيع النصوص العربية للمقارنة الذكية (إزالة الهمزات والتشكيل والمسافات الزائدة)
function normalizeArabic(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "") // التشكيل
    .replace(/[أإآء]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\w\s\u0600-\u06FF]/gi, " ")
    .replace(/\s+/g, " ");
}

// تطبيع نوع الصرف المالي
function normalizeFinancialType(val?: string): "PAYROLL_CARD" | "BANK_ACCOUNT" | "BANK_CARD" | null {
  if (!val) return null;
  const clean = val.trim();
  if (/مرتب|payroll|راتب|حكومي/i.test(clean)) return "PAYROLL_CARD";
  if (/حساب|account|بنك|جاري/i.test(clean)) return "BANK_ACCOUNT";
  if (/ميزة|كارت|بطاقة|card|فيزا/i.test(clean)) return "BANK_CARD";
  return null;
}

// ─── 1. قراءة وتحليل ملفات CSV ──────────────────────────────────────────────────
function parseCsv(content: string): RawDoctorRow[] {
  // إزالة BOM إن وجد
  const cleanContent = content.startsWith("\uFEFF") ? content.slice(1) : content;
  const lines = cleanContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // كشف الفاصل (فاصلة عادية ، أو فاصلة منقوطة ؛ أو Tab)
  const firstLine = lines[0];
  let delimiter = ",";
  if (firstLine.includes(";") && firstLine.split(";").length > firstLine.split(",").length) delimiter = ";";
  else if (firstLine.includes("\t") && firstLine.split("\t").length > firstLine.split(",").length) delimiter = "\t";

  // دالة تفكيك سطر CSV مع احترام النصوص داخل علامات التنصيص
  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  const rows: RawDoctorRow[] = [];
  const headerCols = parseCsvLine(lines[0]).map((h) => normalizeArabic(h));

  // مطابقة الأعمدة حسب المسمى العربي
  const idx = {
    subCommittee: headerCols.findIndex((h) => h.includes("لجن") || h.includes("كود")),
    name: headerCols.findIndex((h) => h.includes("طبيب") || (h.includes("اسم") && !h.includes("بنك") && !h.includes("لجن"))),
    title: headerCols.findIndex((h) => h.includes("لقب") || h.includes("درج")),
    specialty: headerCols.findIndex((h) => h.includes("تخصص")),
    employer: headerCols.findIndex((h) => h.includes("عمل") || h.includes("مستشف")),
    nationalId: headerCols.findIndex((h) => h.includes("قومي") || h.includes("بطاق")),
    phone: headerCols.findIndex((h) => h.includes("هاتف") || h.includes("موبايل") || h.includes("تليفون")),
    financialType: headerCols.findIndex((h) => h.includes("صرف") || h.includes("طريق")),
    bankName: headerCols.findIndex((h) => h.includes("بنك") && !h.includes("حساب")),
    cardNumber: headerCols.findIndex((h) => h.includes("كارت") || h.includes("فيزا") || h.includes("ميز")),
    accountNumber: headerCols.findIndex((h) => h.includes("حساب")),
    iban: headerCols.findIndex((h) => h.includes("ايبان") || h.includes("iban")),
    notes: headerCols.findIndex((h) => h.includes("ملاحظ")),
  };

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.every((c) => !c)) continue; // صف فارغ

    rows.push({
      rowNumber: i + 1,
      subCommittee: cols[idx.subCommittee !== -1 ? idx.subCommittee : 0] || "",
      name: cols[idx.name !== -1 ? idx.name : 1] || "",
      title: cols[idx.title !== -1 ? idx.title : 2] || "",
      specialty: cols[idx.specialty !== -1 ? idx.specialty : 3] || "",
      employer: cols[idx.employer !== -1 ? idx.employer : 4] || "",
      nationalId: cols[idx.nationalId !== -1 ? idx.nationalId : 5] || "",
      phone: cols[idx.phone !== -1 ? idx.phone : 6] || "",
      financialType: cols[idx.financialType !== -1 ? idx.financialType : 7] || "",
      bankName: cols[idx.bankName !== -1 ? idx.bankName : 8] || "",
      cardNumber: cols[idx.cardNumber !== -1 ? idx.cardNumber : 9] || "",
      accountNumber: cols[idx.accountNumber !== -1 ? idx.accountNumber : 10] || "",
      iban: cols[idx.iban !== -1 ? idx.iban : 11] || "",
      notes: cols[idx.notes !== -1 ? idx.notes : 12] || "",
    });
  }

  return rows;
}

// ─── 2. قراءة وتحليل ملفات Excel SpreadsheetML (XML) ───────────────────────────
function parseSpreadsheetXml(content: string): RawDoctorRow[] {
  // فحص ما إذا كان الملف هو SpreadsheetML فعلاً
  if (!content.includes("<Workbook") && !content.includes("xmlns:ss")) {
    return [];
  }

  const rows: RawDoctorRow[] = [];
  // استخراج ورقة العمل الأولى
  const firstWorksheetMatch = content.match(/<Worksheet[^>]*ss:Name="([^"]*)"[^>]*>([\s\S]*?)<\/Worksheet>/i);
  const worksheetBody = firstWorksheetMatch ? firstWorksheetMatch[2] : content;

  // استخراج الصفوف
  const rowMatches = worksheetBody.matchAll(/<Row[^>]*>([\s\S]*?)<\/Row>/gi);
  let lineCounter = 0;
  let isHeaderParsed = false;
  let colMap = {
    subCommittee: 0,
    name: 1,
    title: 2,
    specialty: 3,
    employer: 4,
    nationalId: 5,
    phone: 6,
    financialType: 7,
    bankName: 8,
    cardNumber: 9,
    accountNumber: 10,
    iban: 11,
    notes: 12,
  };

  for (const match of rowMatches) {
    lineCounter++;
    const rowContent = match[1];

    // استخراج الخلايا
    const cellMatches = rowContent.matchAll(/<Cell(?:\s+[^>]*ss:Index="(\d+)")?[^>]*>(?:[\s\S]*?<Data[^>]*>([\s\S]*?)<\/Data>)?/gi);
    const cells: string[] = [];
    let currentIndex = 0;

    for (const cellMatch of cellMatches) {
      if (cellMatch[1]) {
        currentIndex = parseInt(cellMatch[1], 10) - 1;
      }
      const dataVal = cellMatch[2]
        ? cellMatch[2]
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .trim()
        : "";
      cells[currentIndex] = dataVal;
      currentIndex++;
    }

    if (cells.length === 0 || cells.every((c) => !c)) continue;

    // تخطي الترويسات الرئيسية والعناوين الإضافية
    const firstCell = normalizeArabic(cells[0] || "");
    if (firstCell.includes("اللجنه العليا") || firstCell.includes("نموذج الحصر") || firstCell.includes("يرجي تسجيل")) {
      continue;
    }

    if (!isHeaderParsed && (firstCell.includes("لجن") || firstCell.includes("كود") || cells.some((c) => normalizeArabic(c).includes("طبيب")))) {
      isHeaderParsed = true;
      cells.forEach((c, idx) => {
        const norm = normalizeArabic(c);
        if (norm.includes("لجن") || norm.includes("كود")) colMap.subCommittee = idx;
        else if (norm.includes("طبيب") || (norm.includes("اسم") && !norm.includes("بنك") && !norm.includes("لجن"))) colMap.name = idx;
        else if (norm.includes("لقب") || norm.includes("درج")) colMap.title = idx;
        else if (norm.includes("تخصص")) colMap.specialty = idx;
        else if (norm.includes("عمل") || norm.includes("مستشف")) colMap.employer = idx;
        else if (norm.includes("قومي") || norm.includes("بطاق")) colMap.nationalId = idx;
        else if (norm.includes("هاتف") || norm.includes("موبايل") || norm.includes("تليفون")) colMap.phone = idx;
        else if (norm.includes("صرف") || norm.includes("طريق")) colMap.financialType = idx;
        else if (norm.includes("كارت") || norm.includes("فيزا") || norm.includes("ميز")) colMap.cardNumber = idx;
        else if (norm.includes("حساب")) colMap.accountNumber = idx;
        else if (norm.includes("ايبان") || norm.includes("iban")) colMap.iban = idx;
        else if (norm.includes("بنك")) colMap.bankName = idx;
        else if (norm.includes("ملاحظ")) colMap.notes = idx;
      });
      continue;
    }

    // استخراج بيانات الطبيب
    const rowName = (cells[colMap.name] || "").trim();
    if (!rowName) continue; // اسم الطبيب إلزامي

    rows.push({
      rowNumber: lineCounter,
      subCommittee: (cells[colMap.subCommittee] || "").trim(),
      name: rowName,
      title: (cells[colMap.title] || "").trim(),
      specialty: (cells[colMap.specialty] || "").trim(),
      employer: (cells[colMap.employer] || "").trim(),
      nationalId: (cells[colMap.nationalId] || "").trim(),
      phone: (cells[colMap.phone] || "").trim(),
      financialType: (cells[colMap.financialType] || "").trim(),
      bankName: (cells[colMap.bankName] || "").trim(),
      cardNumber: (cells[colMap.cardNumber] || "").trim(),
      accountNumber: (cells[colMap.accountNumber] || "").trim(),
      iban: (cells[colMap.iban] || "").trim(),
      notes: (cells[colMap.notes] || "").trim(),
    });
  }

  return rows;
}

// ─── الدالة الرئيسية لمعالجة واستيراد البيانات ───────────────────────────────────
async function runImport() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const committeeFilterArg = args.find((a) => a.startsWith("--committee="))?.split("=")[1]?.trim();

  // تحديد ملف الإدخال
  let filePath = args.find((a) => !a.startsWith("--"));
  if (!filePath) {
    // البحث التلقائي عن النموذج في templates
    if (fs.existsSync("templates/doctors_import_template.xls")) {
      filePath = "templates/doctors_import_template.xls";
    } else if (fs.existsSync("templates/doctors_import_template.csv")) {
      filePath = "templates/doctors_import_template.csv";
    }
  }

  if (!filePath || !fs.existsSync(filePath)) {
    console.error(`❌ خطأ: لم يتم العثور على الملف المحدد: "${filePath || "(لم يُحدد مسار)"}"`);
    console.log(`\nطريقة الاستخدام:\n  npx tsx scripts/import-doctors.ts [مسار_الملف] [--dry-run]\n`);
    process.exit(1);
  }

  console.log(`\n===============================================================`);
  console.log(`   🏥 منظومة تتبع قضايا المسؤولية الطبية — أداة الرفع الجماعي للأطباء`);
  console.log(`===============================================================`);
  console.log(`📁 الملف المستهدف: ${path.resolve(filePath)}`);
  console.log(`⚙️  وضع التشغيل:   ${isDryRun ? "🔍 فحص وتدقيق فقط (Dry Run)" : "🚀 تنفيذ فعلي وحفظ في قاعدة البيانات"}`);
  if (committeeFilterArg) {
    console.log(`🎯 تقييد اللجنة:   ${committeeFilterArg}`);
  }
  console.log(`---------------------------------------------------------------\n`);

  // قراءة محتوى الملف
  const fileContent = fs.readFileSync(filePath, "utf8");
  let rawRows: RawDoctorRow[] = [];

  if (filePath.endsWith(".xls") || filePath.endsWith(".xml") || fileContent.includes("<Workbook")) {
    console.log(`📖 جارٍ قراءة الملف بتنسيق SpreadsheetML Excel...`);
    rawRows = parseSpreadsheetXml(fileContent);
  } else {
    console.log(`📖 جارٍ قراءة الملف بتنسيق CSV...`);
    rawRows = parseCsv(fileContent);
  }

  console.log(`📊 تم العثور على (${rawRows.length}) سطر بيانات أطباء في الملف.`);
  if (rawRows.length === 0) {
    console.log(`⚠️  لا توجد أسطر بيانات صالحة للمعالجة. تأكد من أن أسماء الأعمدة مطابقة للنموذج.`);
    process.exit(0);
  }

  // 1. تحميل اللجان الفرعية والتخصصات المعتمدة من قاعدة البيانات (مع قائمة احتياطية معتمدة)
  let allCommittees: { id: string; name: string; code: string }[] = [];
  let allSpecialties: { id: string; name: string; code?: string | null }[] = [];

  try {
    allCommittees = await prisma.subCommittee.findMany({
      select: { id: true, name: true, code: true },
    });
    allSpecialties = await prisma.specialty.findMany({
      select: { id: true, name: true, code: true },
    });
  } catch (err: any) {
    if (isDryRun) {
      console.warn(`   ⚠️ تعذر الاتصال المباشر بقاعدة البيانات (${err.code || err.message}). سيتم استخدام القوائم المرجعية الـ 16 المعتمدة للفحص.`);
      allCommittees = [
        { id: "fallback-sc-01", code: "SC-01", name: "المجلس الصحي المصري" },
        { id: "fallback-sc-02", code: "SC-02", name: "الهيئة العامة للمستشفيات والمعاهد التعليمية" },
        { id: "fallback-sc-03", code: "SC-03", name: "كلية طب جامعة القاهرة (قصر العيني)" },
        { id: "fallback-sc-04", code: "SC-04", name: "كلية طب جامعة عين شمس" },
        { id: "fallback-sc-05", code: "SC-05", name: "كلية طب جامعة الأزهر (بنين بالقاهرة)" },
        { id: "fallback-sc-06", code: "SC-06", name: "كلية طب جامعة الإسكندرية" },
        { id: "fallback-sc-07", code: "SC-07", name: "كلية طب جامعة الفيوم" },
        { id: "fallback-sc-08", code: "SC-08", name: "كلية طب جامعة المنيا" },
        { id: "fallback-sc-09", code: "SC-09", name: "كلية طب جامعة أسيوط" },
        { id: "fallback-sc-10", code: "SC-10", name: "كلية طب جامعة سوهاج" },
        { id: "fallback-sc-11", code: "SC-11", name: "كلية طب جامعة أسوان" },
        { id: "fallback-sc-12", code: "SC-12", name: "كلية طب جامعة المنصورة" },
        { id: "fallback-sc-13", code: "SC-13", name: "كلية طب جامعة المنوفية" },
        { id: "fallback-sc-14", code: "SC-14", name: "كلية طب جامعة طنطا" },
        { id: "fallback-sc-15", code: "SC-15", name: "كلية طب جامعة الزقازيق" },
        { id: "fallback-sc-16", code: "SC-16", name: "كلية طب جامعة قناة السويس" },
      ];
      allSpecialties = [
        { id: "sp-01", code: "SPEC-01", name: "جراحة عامة" },
        { id: "sp-02", code: "SPEC-02", name: "جراحة عظام وكسور" },
        { id: "sp-03", code: "SPEC-03", name: "جراحة مخ وأعصاب" },
        { id: "sp-04", code: "SPEC-04", name: "جراحة قلب وصدر" },
        { id: "sp-05", code: "SPEC-05", name: "جراحة مسالك بولية وكلى" },
        { id: "sp-06", code: "SPEC-06", name: "جراحة أوعية دموية" },
        { id: "sp-07", code: "SPEC-07", name: "جراحة تجميل وحروق" },
        { id: "sp-08", code: "SPEC-08", name: "أمراض النساء والتوليد" },
        { id: "sp-09", code: "SPEC-09", name: "طب الأطفال وحديثي الولادة" },
        { id: "sp-10", code: "SPEC-10", name: "التخدير وعلاج الألم" },
        { id: "sp-11", code: "SPEC-11", name: "العناية المركزة وطب الحالات الحرجة" },
        { id: "sp-12", code: "SPEC-12", name: "الباطنة العامة وأمراض الجهاز الهضمي" },
        { id: "sp-13", code: "SPEC-13", name: "أمراض القلب والأوعية الدموية" },
        { id: "sp-14", code: "SPEC-14", name: "الأمراض الصدرية" },
        { id: "sp-15", code: "SPEC-15", name: "أمراض المخ والأعصاب" },
        { id: "sp-16", code: "SPEC-16", name: "طب وجراحة العيون" },
        { id: "sp-17", code: "SPEC-17", name: "أمراض الأنف والأذن والحنجرة" },
        { id: "sp-18", code: "SPEC-18", name: "طب الأسنان وجراحة الفم والفكين" },
        { id: "sp-19", code: "SPEC-19", name: "الأورام والطب النووي" },
        { id: "sp-20", code: "SPEC-20", name: "الأشعة التشخيصية والتدخلية" },
        { id: "sp-21", code: "SPEC-21", name: "الطب الشرعي والسموم الإكلينيكية" },
        { id: "sp-22", code: "SPEC-22", name: "الباثولوجيا الإكلينيكية والتحاليل الطبية" },
      ];
    } else {
      throw err;
    }
  }

  console.log(`🏢 تم تحميل (${allCommittees.length}) لجنة فرعية و (${allSpecialties.length}) تخصص طبي من المنظومة.\n`);

  // دوال المطابقة الذكية للجان والتخصصات
  function findSubCommittee(identifier: string) {
    const clean = identifier.trim();
    const norm = normalizeArabic(clean);

    // 1. مطابقة بالكود (مثلاً SC-03)
    let found = allCommittees.find((c) => c.code.toLowerCase() === clean.toLowerCase());
    if (found) return found;

    // 2. مطابقة بالاسم الدقيق
    found = allCommittees.find((c) => c.name.trim() === clean);
    if (found) return found;

    // 3. مطابقة بالاسم بعد التطبيع وإزالة الفوارق الطفيفة
    found = allCommittees.find((c) => {
      const cNorm = normalizeArabic(c.name);
      return cNorm === norm || cNorm.includes(norm) || norm.includes(cNorm);
    });

    return found || null;
  }

  function findSpecialty(nameOrCode: string) {
    const clean = nameOrCode.trim();
    const norm = normalizeArabic(clean);

    let found = allSpecialties.find((s) => s.code && s.code.toLowerCase() === clean.toLowerCase());
    if (found) return found;

    found = allSpecialties.find((s) => s.name.trim() === clean);
    if (found) return found;

    found = allSpecialties.find((s) => {
      const sNorm = normalizeArabic(s.name);
      return sNorm === norm || sNorm.includes(norm) || norm.includes(sNorm);
    });

    return found || null;
  }

  // إحصائيات المعالجة
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors: { row: number; name: string; reason: string }[] = [];

  for (const row of rawRows) {
    // 1. فحص اسم الطبيب
    if (!row.name || row.name.trim().length < 2) {
      skippedCount++;
      errors.push({ row: row.rowNumber, name: row.name || "(فارغ)", reason: "اسم الطبيب غير مدون أو أقل من حرفين" });
      continue;
    }

    // 2. تحديد ومطابقة اللجنة الفرعية
    const subCommittee = findSubCommittee(row.subCommittee);
    if (!subCommittee) {
      skippedCount++;
      errors.push({
        row: row.rowNumber,
        name: row.name,
        reason: `تعذر مطابقة اللجنة الفرعية: "${row.subCommittee}". راجع قائمة اللجان الـ 16 المعتمدة.`,
      });
      continue;
    }

    if (committeeFilterArg) {
      const isMatch =
        subCommittee.id === committeeFilterArg ||
        subCommittee.code.toLowerCase() === committeeFilterArg.toLowerCase() ||
        normalizeArabic(subCommittee.name).includes(normalizeArabic(committeeFilterArg));
      if (!isMatch) {
        skippedCount++;
        continue;
      }
    }

    // 3. تحديد ومطابقة التخصص الطبي
    let specialtyId: string | null = null;
    if (row.specialty && row.specialty.trim()) {
      const specialty = findSpecialty(row.specialty);
      if (specialty) {
        specialtyId = specialty.id;
      } else {
        // إنشاء التخصص إذا كان غير موجود بعد تأكيده
        if (!isDryRun) {
          try {
            const newSpec = await prisma.specialty.create({
              data: { name: row.specialty.trim() },
            });
            specialtyId = newSpec.id;
            allSpecialties.push(newSpec);
            console.log(`   ✨ تم إضافة تخصص طبي جديد للقاعدة: (${row.specialty.trim()})`);
          } catch {
            // ربما تم إنشاؤه بالتوازي
          }
        }
      }
    }

    // 4. تدقيق الرقم القومي إن وجد (14 رقماً مصرياً)
    let cleanNationalId = row.nationalId ? row.nationalId.replace(/\D/g, "").trim() : "";
    if (cleanNationalId && cleanNationalId.length !== 14) {
      console.warn(`   ⚠️ السطر [${row.rowNumber}] للطبيب (${row.name}): الرقم القومي (${cleanNationalId}) ليس 14 رقماً.`);
    }

    // 5. تدقيق رقم الهاتف
    let cleanPhone = row.phone ? row.phone.replace(/[\s-]/g, "").trim() : "";
    if (cleanPhone && !isValidEgyptianPhone(cleanPhone)) {
      console.warn(`   ⚠️ السطر [${row.rowNumber}] للطبيب (${row.name}): رقم الهاتف (${cleanPhone}) غير مطابق لصيغة الموبايل المصري.`);
    }

    // 6. تطبيع البيانات المالية
    const financialType = normalizeFinancialType(row.financialType);
    const cleanCardNumber = row.cardNumber ? row.cardNumber.replace(/\D/g, "").trim() : null;
    const cleanAccount = row.accountNumber ? row.accountNumber.trim() : null;
    const cleanIban = row.iban ? row.iban.replace(/\s+/g, "").toUpperCase().trim() : null;

    if (isDryRun) {
      console.log(`   🔍 [فحص السطر ${row.rowNumber}] ${row.name} ⬅️ لجنة: ${subCommittee.name} (${row.specialty || "عام"})`);
      createdCount++;
      continue;
    }

    // 7. فحص ما إذا كان الطبيب مسجلاً بالفعل في نفس اللجنة (لمنع التكرار والتحديث الذكي)
    const existingDoctors = await prisma.subCommitteeDoctor.findMany({
      where: { subCommitteeId: subCommittee.id },
      select: { id: true, name: true, nationalId: true },
    });

    // المطابقة بالرقم القومي (بعد فك التشفير) أو بالاسم الدقيق
    let existingMatch = existingDoctors.find((d) => {
      const decNat = decryptOptionalField(d.nationalId);
      if (cleanNationalId && decNat && decNat === cleanNationalId) return true;
      return normalizeArabic(d.name) === normalizeArabic(row.name);
    });

    if (existingMatch) {
      // تحديث بيانات الطبيب المسجل
      await prisma.subCommitteeDoctor.update({
        where: { id: existingMatch.id },
        data: {
          title: row.title?.trim() || undefined,
          employer: row.employer?.trim() || undefined,
          specialtyId: specialtyId || undefined,
          phone: cleanPhone || undefined,
          nationalId: cleanNationalId ? encryptOptionalField(cleanNationalId) : undefined,
          financialType: financialType || undefined,
          bankName: row.bankName?.trim() || undefined,
          accountNumber: cleanAccount ? encryptOptionalField(cleanAccount) : undefined,
          cardNumber: cleanCardNumber ? encryptOptionalField(cleanCardNumber) : undefined,
          iban: cleanIban ? encryptOptionalField(cleanIban) : undefined,
          notes: row.notes?.trim() || undefined,
          active: true,
        },
      });
      updatedCount++;
      console.log(`   🔄 تم تحديث بيانات: (${row.name}) — لجنة: ${subCommittee.name}`);
    } else {
      // إدراج طبيب استشاري جديد مع تشفير البيانات الحساسة
      await prisma.subCommitteeDoctor.create({
        data: {
          subCommitteeId: subCommittee.id,
          name: row.name.trim(),
          title: row.title?.trim() || "استشاري",
          employer: row.employer?.trim() || "غير محدد",
          specialtyId: specialtyId,
          phone: cleanPhone || null,
          nationalId: cleanNationalId ? encryptOptionalField(cleanNationalId) : null,
          financialType: financialType,
          bankName: row.bankName?.trim() || null,
          accountNumber: cleanAccount ? encryptOptionalField(cleanAccount) : null,
          cardNumber: cleanCardNumber ? encryptOptionalField(cleanCardNumber) : null,
          iban: cleanIban ? encryptOptionalField(cleanIban) : null,
          notes: row.notes?.trim() || null,
          active: true,
        },
      });
      createdCount++;
      console.log(`   ✅ تم إدراج وقيد: (${row.name}) — لجنة: ${subCommittee.name}`);
    }
  }

  // ─── طباعة تقرير النتيجة النهائي ───────────────────────────────────────────────
  console.log(`\n===============================================================`);
  console.log(`                      📊 ملخص نتائج الاستيراد`);
  console.log(`===============================================================`);
  console.log(`إجمالي الأسطر المفحوصة: ${rawRows.length}`);
  if (isDryRun) {
    console.log(`الأسطر الصالحة للإدراج: ${createdCount} ✅`);
  } else {
    console.log(`الأطباء الجدد المضافين:  ${createdCount} ✅`);
    console.log(`الأطباء الذين تم تحديثهم: ${updatedCount} 🔄`);
  }
  console.log(`الأخطاء / الأسطر المستبعدة: ${skippedCount} ❌`);

  if (errors.length > 0) {
    console.log(`\n⚠️  تفاصيل الملاحظات والأخطاء بالأسطر المستبعدة:`);
    errors.forEach((err) => {
      console.log(`   - السطر [${err.row}] (${err.name}): ${err.reason}`);
    });
  }
  console.log(`===============================================================\n`);
}

runImport()
  .catch((e) => {
    console.error("❌ حدث خطأ غير متوقع أثناء المعالجة:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
