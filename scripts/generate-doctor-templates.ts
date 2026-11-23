/**
 * scripts/generate-doctor-templates.ts
 * جمهورية مصر العربية — رئاسة مجلس الوزراء
 * اللجنة العليا للمسؤولية الطبية وسلامة المريض
 *
 * أداة توليد نماذج الإكسيل المعتمدة لحصر وتسجيل أطباء واستشاريي اللجان الفرعية
 * يولد الملفين:
 *  1. templates/doctors_import_template.xls (ملف إكسيل متعدد الصفحات بتنسيق SpreadsheetML ويدعم RTL)
 *  2. templates/doctors_import_template.csv (ملف CSV بترميز UTF-8 مع BOM لفتحه مباشرة في إكسيل)
 */

import fs from "fs";
import path from "path";

// ─── 1. اللجان الفرعية الـ 16 الرسمية ──────────────────────────────────────────
const SUBCOMMITTEES = [
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

// ─── 2. التخصصات الطبية المعيارية الـ 34 ──────────────────────────────────────
const SPECIALTIES = [
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

// ─── 3. بيانات تجريبية استرشادية لتوضيح كيفية التعبئة للمستخدم ───────────────
const SAMPLE_DOCTORS = [
  {
    subCommittee: "كلية طب جامعة القاهرة (قصر العيني)",
    name: "أحمد محمود حسن إبراهيم",
    title: "أستاذ دكتور",
    specialty: "جراحة عامة",
    employer: "مستشفيات جامعة القاهرة - قصر العيني",
    nationalId: "27501010101234",
    phone: "01012345678",
    financialType: "فيزا مرتبات",
    bankName: "البنك الأهلي المصري",
    cardNumber: "5248123456789012",
    accountNumber: "",
    iban: "",
    notes: "رئيس قسم الجراحة الأسبق - خبير جراحات المناظير",
  },
  {
    subCommittee: "كلية طب جامعة عين شمس",
    name: "منى عبد العزيز محمد الدمرداش",
    title: "أستاذ دكتور",
    specialty: "التخدير وعلاج الألم",
    employer: "مستشفى الدمرداش الجامعي",
    nationalId: "28205150105678",
    phone: "01123456789",
    financialType: "حساب بنكي",
    bankName: "بنك مصر",
    cardNumber: "",
    accountNumber: "12345678901234",
    iban: "EG380002000100000012345678901",
    notes: "استشاري تخدير جراحات القلب المفتوح",
  },
  {
    subCommittee: "كلية طب جامعة الزقازيق",
    name: "طارق سليم عبد الرحمن النجار",
    title: "أستاذ مساعد",
    specialty: "أمراض النساء والتوليد",
    employer: "مستشفيات جامعة الزقازيق",
    nationalId: "27811200109012",
    phone: "01234567890",
    financialType: "فيزا مرتبات",
    bankName: "بنك القاهرة",
    cardNumber: "5378223344556677",
    accountNumber: "",
    iban: "",
    notes: "خبير مناظير الرحم والحقن المجهري",
  },
  {
    subCommittee: "كلية طب جامعة الإسكندرية",
    name: "سامح فاروق مصطفى الخولي",
    title: "استشاري",
    specialty: "جراحة عظام وكسور",
    employer: "المستشفى الرئيسي الجامعي بالإسكندرية",
    nationalId: "28003040103456",
    phone: "01098765432",
    financialType: "كارت ميزة",
    bankName: "البنك الأهلي المصري",
    cardNumber: "6038112233445566",
    accountNumber: "",
    iban: "",
    notes: "استشاري جراحة المفاصل الصناعية والإصابات الرياضية",
  },
  {
    subCommittee: "الهيئة العامة للمستشفيات والمعاهد التعليمية",
    name: "ياسر كمال حسن عبد الله",
    title: "استشاري زميل",
    specialty: "أمراض القلب والأوعية الدموية",
    employer: "معهد القلب القومي بإمبابة",
    nationalId: "27608100107890",
    phone: "01551234567",
    financialType: "حساب بنكي",
    bankName: "البنك التجاري الدولي (CIB)",
    cardNumber: "",
    accountNumber: "100023456789",
    iban: "EG150010000100000100023456789",
    notes: "استشاري قسطرة القلب التداخلية والحالات الحرجة",
  },
];

const COLUMNS = [
  { key: "subCommittee", label: "اسم اللجنة الفرعية (أو كودها)", width: 220, example: "كلية طب جامعة القاهرة (قصر العيني)" },
  { key: "name", label: "اسم الطبيب الاستشاري (رباعي/ثلاثي)", width: 200, example: "أحمد محمود حسن إبراهيم" },
  { key: "title", label: "اللقب العلمي", width: 120, example: "أستاذ دكتور" },
  { key: "specialty", label: "التخصص الطبي المعياري", width: 170, example: "جراحة عامة" },
  { key: "employer", label: "جهة العمل / المستشفى الأصلية", width: 220, example: "مستشفيات جامعة القاهرة" },
  { key: "nationalId", label: "الرقم القومي (14 رقماً)", width: 140, example: "27501010101234" },
  { key: "phone", label: "رقم الهاتف المحمول (11 رقماً)", width: 140, example: "01012345678" },
  { key: "financialType", label: "طريقة الصرف المالي", width: 130, example: "فيزا مرتبات / حساب بنكي" },
  { key: "bankName", label: "اسم البنك", width: 140, example: "البنك الأهلي المصري" },
  { key: "cardNumber", label: "رقم كارت الفيزا / ميزة (16 رقماً)", width: 160, example: "5248123456789012" },
  { key: "accountNumber", label: "رقم الحساب البنكي", width: 150, example: "12345678901234" },
  { key: "iban", label: "رقم الآيبان (IBAN إن وجد)", width: 200, example: "EG380002000100000012345678901" },
  { key: "notes", label: "ملاحظات إدارية", width: 220, example: "رئيس قسم الجراحة الأسبق" },
];

function escapeXml(unsafe: any): string {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generateSpreadsheetXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>نموذج حصر وتسجيل أطباء واستشاريي اللجان الفرعية</Title>
  <Subject>اللجنة العليا للمسؤولية الطبية وسلامة المريض</Subject>
  <Author>رئاسة مجلس الوزراء - جمهورية مصر العربية</Author>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="TitleHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F766E"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="14" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#0F766E" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SubTitleHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Color="#0F766E" ss:Bold="1"/>
   <Interior ss:Color="#CCFBF1" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="ColHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0D9488"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#134E4A" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataCell">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="DataCellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="SampleDataCell">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Color="#334155"/>
   <Interior ss:Color="#F0FDFA" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SampleDataCellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Color="#334155"/>
   <Interior ss:Color="#F0FDFA" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="InstructionsHeader">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Color="#0F766E" ss:Bold="1"/>
   <Interior ss:Color="#F0FDFA" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="InstructionsText">
   <Alignment ss:Horizontal="Right" ss:Vertical="Top" ss:WrapText="1"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#334155"/>
  </Style>
 </Styles>

 <!-- ════════════════ ورقة 1: بيانات الأطباء ════════════════ -->
 <Worksheet ss:Name="بيانات أطباء اللجان الفرعية">
  <Table ss:DefaultRowHeight="24">
   ${COLUMNS.map((col) => `<Column ss:Width="${col.width}"/>`).join("\n   ")}

   <!-- ترويسة رئيسية -->
   <Row ss:Height="36">
    <Cell ss:MergeAcross="${COLUMNS.length - 1}" ss:StyleID="TitleHeader">
     <Data ss:Type="String">اللجنة العليا للمسؤولية الطبية وسلامة المريض — نموذج الحصر والرفع الجماعي لأطباء واستشاريي اللجان الفرعية</Data>
    </Cell>
   </Row>
   <Row ss:Height="24">
    <Cell ss:MergeAcross="${COLUMNS.length - 1}" ss:StyleID="SubTitleHeader">
     <Data ss:Type="String">يرجى تسجيل بيانات الأطباء بكل لجنة بدقة (الصفوف الـ 5 الأولى نماذج استرشادية يمكن حذفها أو استبدالها ببياناتكم الفعلية)</Data>
    </Cell>
   </Row>

   <!-- أسماء الأعمدة -->
   <Row ss:Height="32">
    ${COLUMNS.map((col) => `<Cell ss:StyleID="ColHeader"><Data ss:Type="String">${escapeXml(col.label)}</Data></Cell>`).join("\n    ")}
   </Row>

   <!-- صفوف البيانات التجريبية الاسترشادية -->
   ${SAMPLE_DOCTORS.map((doc) => `
   <Row ss:Height="25">
    <Cell ss:StyleID="SampleDataCell"><Data ss:Type="String">${escapeXml(doc.subCommittee)}</Data></Cell>
    <Cell ss:StyleID="SampleDataCell"><Data ss:Type="String">${escapeXml(doc.name)}</Data></Cell>
    <Cell ss:StyleID="SampleDataCellCenter"><Data ss:Type="String">${escapeXml(doc.title)}</Data></Cell>
    <Cell ss:StyleID="SampleDataCellCenter"><Data ss:Type="String">${escapeXml(doc.specialty)}</Data></Cell>
    <Cell ss:StyleID="SampleDataCell"><Data ss:Type="String">${escapeXml(doc.employer)}</Data></Cell>
    <Cell ss:StyleID="SampleDataCellCenter"><Data ss:Type="String">${escapeXml(doc.nationalId)}</Data></Cell>
    <Cell ss:StyleID="SampleDataCellCenter"><Data ss:Type="String">${escapeXml(doc.phone)}</Data></Cell>
    <Cell ss:StyleID="SampleDataCellCenter"><Data ss:Type="String">${escapeXml(doc.financialType)}</Data></Cell>
    <Cell ss:StyleID="SampleDataCell"><Data ss:Type="String">${escapeXml(doc.bankName)}</Data></Cell>
    <Cell ss:StyleID="SampleDataCellCenter"><Data ss:Type="String">${escapeXml(doc.cardNumber)}</Data></Cell>
    <Cell ss:StyleID="SampleDataCellCenter"><Data ss:Type="String">${escapeXml(doc.accountNumber)}</Data></Cell>
    <Cell ss:StyleID="SampleDataCellCenter"><Data ss:Type="String">${escapeXml(doc.iban)}</Data></Cell>
    <Cell ss:StyleID="SampleDataCell"><Data ss:Type="String">${escapeXml(doc.notes)}</Data></Cell>
   </Row>`).join("")}

   <!-- 20 صف فارغ جاهز للكتابة والتعبئة -->
   ${Array.from({ length: 25 })
     .map(
       () => `
   <Row ss:Height="25">
    <Cell ss:StyleID="DataCell"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String"></Data></Cell>
   </Row>`
     )
     .join("")}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <RightToLeft/>
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>3</SplitHorizontal>
   <TopRowBottomPane>3</TopRowBottomPane>
   <ActivePane>2</ActivePane>
  </WorksheetOptions>
 </Worksheet>

 <!-- ════════════════ ورقة 2: دليل اللجان الفرعية ════════════════ -->
 <Worksheet ss:Name="دليل اللجان الفرعية المعتمدة">
  <Table ss:DefaultRowHeight="24">
   <Column ss:Width="100"/>
   <Column ss:Width="300"/>
   <Column ss:Width="250"/>

   <Row ss:Height="32">
    <Cell ss:MergeAcross="2" ss:StyleID="TitleHeader">
     <Data ss:Type="String">قائمة اللجان والجهات الفرعية الـ 16 المعتمدة رسمياً بالمنظومة</Data>
    </Cell>
   </Row>
   <Row ss:Height="28">
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">كود اللجنة</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">اسم اللجنة الفرعية / الجهة الرسمية</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">النطاق الجغرافي / المؤسسي</Data></Cell>
   </Row>
   ${SUBCOMMITTEES.map(
     (sc) => `
   <Row ss:Height="24">
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(sc.code)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(sc.name)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(sc.scope)}</Data></Cell>
   </Row>`
   ).join("")}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <RightToLeft/>
  </WorksheetOptions>
 </Worksheet>

 <!-- ════════════════ ورقة 3: دليل التخصصات الطبية ════════════════ -->
 <Worksheet ss:Name="دليل التخصصات المعيارية">
  <Table ss:DefaultRowHeight="24">
   <Column ss:Width="100"/>
   <Column ss:Width="320"/>

   <Row ss:Height="32">
    <Cell ss:MergeAcross="1" ss:StyleID="TitleHeader">
     <Data ss:Type="String">قائمة التخصصات الطبية المعيارية المعتمدة بالمنظومة (34 تخصصاً)</Data>
    </Cell>
   </Row>
   <Row ss:Height="28">
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">كود التخصص</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">اسم التخصص الطبي المعتمد</Data></Cell>
   </Row>
   ${SPECIALTIES.map(
     (sp) => `
   <Row ss:Height="24">
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(sp.code)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(sp.name)}</Data></Cell>
   </Row>`
   ).join("")}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <RightToLeft/>
  </WorksheetOptions>
 </Worksheet>

 <!-- ════════════════ ورقة 4: تعليمات وإرشادات التعبئة ════════════════ -->
 <Worksheet ss:Name="تعليمات وإرشادات التعبئة">
  <Table ss:DefaultRowHeight="26">
   <Column ss:Width="250"/>
   <Column ss:Width="550"/>

   <Row ss:Height="32">
    <Cell ss:MergeAcross="1" ss:StyleID="TitleHeader">
     <Data ss:Type="String">إرشادات وضوابط تعبئة نموذج حصر الأطباء والاستشاريين</Data>
    </Cell>
   </Row>

   <Row ss:Height="28">
    <Cell ss:StyleID="InstructionsHeader"><Data ss:Type="String">1. اسم اللجنة الفرعية</Data></Cell>
    <Cell ss:StyleID="InstructionsText"><Data ss:Type="String">يرجى كتابة اسم اللجنة بالضبط كما هو مدون في ورقة (دليل اللجان الفرعية) أو كتابة كود اللجنة مثل SC-03 أو SC-04.</Data></Cell>
   </Row>

   <Row ss:Height="28">
    <Cell ss:StyleID="InstructionsHeader"><Data ss:Type="String">2. اسم الطبيب الاستشاري</Data></Cell>
    <Cell ss:StyleID="InstructionsText"><Data ss:Type="String">يجب كتابة الاسم ثلاثياً أو رباعياً بوضوح دون ألقاب قبل الاسم (الألقاب مثل أ.د توضع في خانة اللقب العلمي).</Data></Cell>
   </Row>

   <Row ss:Height="28">
    <Cell ss:StyleID="InstructionsHeader"><Data ss:Type="String">3. التخصص الطبي</Data></Cell>
    <Cell ss:StyleID="InstructionsText"><Data ss:Type="String">يرجى اختيار التخصص كما هو مدون في ورقة (دليل التخصصات المعيارية) لتسهيل الفرز وتوزيع القضايا آلياً.</Data></Cell>
   </Row>

   <Row ss:Height="28">
    <Cell ss:StyleID="InstructionsHeader"><Data ss:Type="String">4. جهة العمل الأصلية</Data></Cell>
    <Cell ss:StyleID="InstructionsText"><Data ss:Type="String">إلزامية؛ لكشف أي تعارض مصالح محتمل تلقائياً عند تكليف الطبيب بفحص شكوى تخص نفس المستشفى التابع لها.</Data></Cell>
   </Row>

   <Row ss:Height="28">
    <Cell ss:StyleID="InstructionsHeader"><Data ss:Type="String">5. الرقم القومي (14 رقماً)</Data></Cell>
    <Cell ss:StyleID="InstructionsText"><Data ss:Type="String">إلزامي لصرف المكافآت والبدلات المالية المقررة قانوناً. يجب أن يتكون من 14 رقماً مصرياً صحيحاً.</Data></Cell>
   </Row>

   <Row ss:Height="28">
    <Cell ss:StyleID="InstructionsHeader"><Data ss:Type="String">6. رقم الهاتف المحمول</Data></Cell>
    <Cell ss:StyleID="InstructionsText"><Data ss:Type="String">يجب أن يتكون من 11 رقماً مصرياً صحيحاً يبدأ بـ (010 أو 011 أو 012 أو 015) لاستقبال رسائل التكليف والإشعارات.</Data></Cell>
   </Row>

   <Row ss:Height="28">
    <Cell ss:StyleID="InstructionsHeader"><Data ss:Type="String">7. البيانات المالية والمصرفية</Data></Cell>
    <Cell ss:StyleID="InstructionsText"><Data ss:Type="String">اختر طريقة الصرف (فيزا مرتبات / حساب بنكي / كارت ميزة). وفي حال الحساب البنكي يرجى تدوين اسم البنك ورقم الحساب أو الآيبان.</Data></Cell>
   </Row>

   <Row ss:Height="28">
    <Cell ss:StyleID="InstructionsHeader"><Data ss:Type="String">8. سرية وتشفير البيانات</Data></Cell>
    <Cell ss:StyleID="InstructionsText"><Data ss:Type="String">تنويه أمني: يتم تشفير الأرقام القومية وبيانات الحسابات البنكية فور رفعها بالمنظومة وفق معايير التشفير الحكومية AES-256-GCM.</Data></Cell>
   </Row>
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <RightToLeft/>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;
}

function generateCsv(): string {
  // نضيف UTF-8 BOM (\uFEFF) في بداية الملف ليتعرف عليه الإكسيل مباشرة ويدعم الحروف العربية
  const bom = "\uFEFF";
  const header = COLUMNS.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(",");
  const rows = SAMPLE_DOCTORS.map((d) =>
    [
      `"${d.subCommittee.replace(/"/g, '""')}"`,
      `"${d.name.replace(/"/g, '""')}"`,
      `"${d.title.replace(/"/g, '""')}"`,
      `"${d.specialty.replace(/"/g, '""')}"`,
      `"${d.employer.replace(/"/g, '""')}"`,
      `"${d.nationalId.replace(/"/g, '""')}"`,
      `"${d.phone.replace(/"/g, '""')}"`,
      `"${d.financialType.replace(/"/g, '""')}"`,
      `"${d.bankName.replace(/"/g, '""')}"`,
      `"${d.cardNumber.replace(/"/g, '""')}"`,
      `"${d.accountNumber.replace(/"/g, '""')}"`,
      `"${d.iban.replace(/"/g, '""')}"`,
      `"${d.notes.replace(/"/g, '""')}"`,
    ].join(",")
  );

  return bom + [header, ...rows].join("\r\n") + "\r\n";
}

function main() {
  const targetDir = path.resolve(process.cwd(), "templates");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 1. توليد ملف Excel SpreadsheetML متعدد الصفحات
  const xlsPath = path.join(targetDir, "doctors_import_template.xls");
  fs.writeFileSync(xlsPath, generateSpreadsheetXml(), "utf8");
  console.log(`✅ تم إنشاء نموذج الإكسيل متعدد الصفحات بنجاح:\n   ${xlsPath}`);

  // 2. توليد ملف CSV مع UTF-8 BOM
  const csvPath = path.join(targetDir, "doctors_import_template.csv");
  fs.writeFileSync(csvPath, generateCsv(), "utf8");
  console.log(`✅ تم إنشاء نموذج الـ CSV المعتمد بنجاح:\n   ${csvPath}`);
}

main();
