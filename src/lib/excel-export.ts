// ============================================================================
// مولد ملفات إكسيل الرسمية المنسقة والمحمية (SpreadsheetML XML Engine)
// يدعم: التنسيق الكامل، الألوان، الحدود، اتجاه RTL، وحماية الورقة ضد التعديل
// بدون الحاجة لمكتبات خارجية - متوافق مع كافة إصدارات Microsoft Excel
// ============================================================================

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number; // عرض العمود بالتقريب
  align?: "left" | "center" | "right";
  type?: "String" | "Number";
}

export interface ExcelReportOptions {
  fileName: string;
  sheetName?: string;
  reportTitle: string;
  organizationName?: string;
  committeeName?: string;
  extractedBy?: string;
  extractedAt?: string;
  filterSummary?: string;
  totalRecords?: number;
  columns: ExcelColumn[];
  rows: Array<Record<string, any>>;
  isProtected?: boolean; // حماية الورقة من التعديل
}

function escapeXml(unsafe: any): string {
  if (unsafe === null || unsafe === undefined) return "";
  const str = String(unsafe);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function generateStyledProtectedExcel(options: ExcelReportOptions): void {
  const {
    fileName,
    sheetName = "سجل التقرير",
    reportTitle,
    organizationName = "جمهورية مصر العربية - رئاسة مجلس الوزراء",
    committeeName = "اللجنة العليا للمسؤولية الطبية وسلامة المريض",
    extractedBy = "مستخدم معتمد",
    extractedAt = new Date().toLocaleString("ar-EG"),
    filterSummary = "جميع السجلات (بدون فلترة)",
    totalRecords = options.rows.length,
    columns,
    rows,
    isProtected = true,
  } = options;

  const colCount = columns.length;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>${escapeXml(reportTitle)}</Title>
  <Author>${escapeXml(extractedBy)}</Author>
  <Created>${new Date().toISOString()}</Created>
  <Company>${escapeXml(committeeName)}</Company>
 </DocumentProperties>
 <Styles>
  <!-- النمط الافتراضي -->
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders/>
   <Font ss:FontName="Segoe UI, Tahoma, Arial" x:CharSet="178" ss:Size="10" ss:Color="#1e293b"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>

  <!-- عنوان المؤسسة الرئيسي -->
  <Style ss:ID="OrgHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI, Tahoma, Arial" ss:Size="11" ss:Bold="1" ss:Color="#475569"/>
   <Interior ss:Color="#f8fafc" ss:Pattern="Solid"/>
  </Style>

  <!-- عنوان اللجنة الرسمي -->
  <Style ss:ID="CommitteeHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI, Tahoma, Arial" ss:Size="13" ss:Bold="1" ss:Color="#0f766e"/>
   <Interior ss:Color="#f0fdfa" ss:Pattern="Solid"/>
  </Style>

  <!-- عنوان التقرير -->
  <Style ss:ID="ReportTitle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI, Tahoma, Arial" ss:Size="14" ss:Bold="1" ss:Color="#ffffff"/>
   <Interior ss:Color="#0f766e" ss:Pattern="Solid"/>
  </Style>

  <!-- شريط بيانات الاستخراج والفلترة -->
  <Style ss:ID="MetaBar">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI, Tahoma, Arial" ss:Size="9" ss:Bold="1" ss:Color="#334155"/>
   <Interior ss:Color="#e2e8f0" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
   </Borders>
  </Style>

  <!-- ترويسة جدول الأعمدة -->
  <Style ss:ID="TableHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Segoe UI, Tahoma, Arial" ss:Size="10" ss:Bold="1" ss:Color="#ffffff"/>
   <Interior ss:Color="#134e4a" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#042f2e"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#042f2e"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#042f2e"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#042f2e"/>
   </Borders>
  </Style>

  <!-- صف بيانات عادي -->
  <Style ss:ID="DataCellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI, Tahoma, Arial" ss:Size="9.5" ss:Color="#0f172a"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
   </Borders>
  </Style>

  <Style ss:ID="DataCellRight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI, Tahoma, Arial" ss:Size="9.5" ss:Color="#0f172a"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
   </Borders>
  </Style>

  <!-- صف بيانات بديل (Zebra striping) -->
  <Style ss:ID="ZebraCellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI, Tahoma, Arial" ss:Size="9.5" ss:Color="#0f172a"/>
   <Interior ss:Color="#f8fafc" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
   </Borders>
  </Style>

  <Style ss:ID="ZebraCellRight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI, Tahoma, Arial" ss:Size="9.5" ss:Color="#0f172a"/>
   <Interior ss:Color="#f8fafc" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
   </Borders>
  </Style>

  <!-- خلايا التذييل والإجماليات -->
  <Style ss:ID="FooterSummary">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI, Tahoma, Arial" ss:Size="10" ss:Bold="1" ss:Color="#0f766e"/>
   <Interior ss:Color="#f0fdfa" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3" ss:Color="#0f766e"/>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0f766e"/>
   </Borders>
  </Style>
 </Styles>

 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table ss:DefaultRowHeight="22">
`;

  // تحديد عرض الأعمدة
  columns.forEach((col) => {
    const width = col.width || 120;
    xml += `   <Column ss:AutoFitWidth="1" ss:Width="${width}"/>\n`;
  });

  // الصف 1: اسم المنظمة والجمهورية
  xml += `   <Row ss:Height="26">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="OrgHeader">
     <Data ss:Type="String">${escapeXml(organizationName)}</Data>
    </Cell>
   </Row>\n`;

  // الصف 2: اسم اللجنة العليا
  xml += `   <Row ss:Height="28">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="CommitteeHeader">
     <Data ss:Type="String">${escapeXml(committeeName)}</Data>
    </Cell>
   </Row>\n`;

  // الصف 3: عنوان التقرير
  xml += `   <Row ss:Height="32">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="ReportTitle">
     <Data ss:Type="String">${escapeXml(reportTitle)}</Data>
    </Cell>
   </Row>\n`;

  // الصف 4: سطر البيانات الوصفية (المستخرج والتاريخ والإجمالي)
  xml += `   <Row ss:Height="24">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="MetaBar">
     <Data ss:Type="String">تاريخ الاستخراج: ${escapeXml(extractedAt)} | الموظف المستخرج: ${escapeXml(extractedBy)} | إجمالي السجلات: ${escapeXml(totalRecords)} سجل | نطاق الفحص: ${escapeXml(filterSummary)}</Data>
    </Cell>
   </Row>\n`;

  // صف فارغ فاصل
  xml += `   <Row ss:Height="8"/>\n`;

  // الصف 5: ترويسة الأعمدة
  xml += `   <Row ss:Height="28">\n`;
  columns.forEach((col) => {
    xml += `    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(col.header)}</Data></Cell>\n`;
  });
  xml += `   </Row>\n`;

  // صفوف البيانات
  rows.forEach((row, rowIndex) => {
    const isZebra = rowIndex % 2 === 1;
    xml += `   <Row ss:Height="22">\n`;
    columns.forEach((col) => {
      const val = row[col.key];
      const align = col.align || "center";
      const styleId = isZebra
        ? (align === "right" ? "ZebraCellRight" : "ZebraCellCenter")
        : (align === "right" ? "DataCellRight" : "DataCellCenter");

      const isNum = col.type === "Number" && typeof val === "number";
      const dataType = isNum ? "Number" : "String";
      const displayVal = val === null || val === undefined ? "-" : String(val);

      xml += `    <Cell ss:StyleID="${styleId}"><Data ss:Type="${dataType}">${escapeXml(displayVal)}</Data></Cell>\n`;
    });
    xml += `   </Row>\n`;
  });

  // صف الإجمالي في التذييل
  xml += `   <Row ss:Height="26">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="FooterSummary">
     <Data ss:Type="String">نهاية التقرير - إجمالي السجلات المسجلة: ${escapeXml(totalRecords)} سجل - محرر إلكتروني محمي ومعتمد</Data>
    </Cell>
   </Row>\n`;

  xml += `  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <PageSetup>
    <Layout x:Orientation="Landscape"/>
    <Header x:Margin="0.3"/>
    <Footer x:Margin="0.3"/>
    <PageMargins x:Bottom="0.5" x:Left="0.5" x:Right="0.5" x:Top="0.5"/>
   </PageSetup>
   <DisplayRightToLeft/>
   <Selected/>
   <ProtectObjects>${isProtected ? "True" : "False"}</ProtectObjects>
   <ProtectScenarios>${isProtected ? "True" : "False"}</ProtectScenarios>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;

  // تنزيل الملف عبر المتصفح
  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // امتداد .xls يفتحه إكسيل مباشرة بكافة تنسيقاته وألوانه وحمايته
  const cleanName = fileName.endsWith(".xls") ? fileName : `${fileName}.xls`;
  a.setAttribute("download", cleanName);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

