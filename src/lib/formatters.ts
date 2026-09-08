/**
 * src/lib/formatters.ts
 * دوال تنسيق الأرقام والتواريخ باللغة والأرقام الإنجليزية (Western Arabic Numerals 0-9)
 * بناءً على التوجيهات الحكومية المعتمدة للمنظومة
 */

/**
 * تنسيق التاريخ بالأرقام الإنجليزية (DD/MM/YYYY) أو (YYYY-MM-DD)
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * تنسيق التاريخ والوقت بالأرقام الإنجليزية (DD/MM/YYYY hh:mm AM/PM)
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";

  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * تنسيق الأرقام القياسية بالإنجليزية مع فواصل الآلاف (مثال: 1,250)
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return new Intl.NumberFormat("en-US").format(value);
}

/**
 * تنسيق العملة والمبالغ المالية بالإنجليزية (مثال: 100,000 ج.م)
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "0 ج.م";
  return `${new Intl.NumberFormat("en-US").format(value)} ج.م`;
}

/**
 * تحويل أي أرقام هندية/مشرقية في النص إلى أرقام إنجليزية (0-9)
 */
export function toEnglishDigits(str: string | null | undefined): string {
  if (!str) return "";
  const easternToWestern: Record<string, string> = {
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  };
  return str.replace(/[٠-٩]/g, (w) => easternToWestern[w] || w);
}
