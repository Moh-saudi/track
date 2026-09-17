/**
 * src/lib/formatters.ts
 * دوال تنسيق الأرقام والتواريخ باللغة والأرقام الإنجليزية (Western Arabic Numerals 0-9)
 * بناءً على التوجيهات الحكومية المعتمدة للمنظومة
 */

/**
 * تنسيق التاريخ بالأرقام الإنجليزية (DD/MM/YYYY)
 * متوافق بنسبة 100% مع بيئة SSR و Hydration دون أي تفاوت زمني بين السيرفر والمتصفح
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";

  if (typeof date === "string") {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return `${day}/${month}/${year}`;
    }
  }

  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";

  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * تنسيق التاريخ والوقت بالأرقام الإنجليزية (DD/MM/YYYY hh:mm AM/PM)
 * يعتمد على UTC لضمان التطابق التام بين HTML السيرفر ورندر المتصفح ومنع أخطاء Hydration #425
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";

  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();

  let hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours).padStart(2, "0");

  return `${day}/${month}/${year} ${hoursStr}:${minutes} ${ampm}`;
}

/**
 * تنسيق الوقت فقط (hh:mm:ss AM/PM) بتوقيت UTC لتفادي عدم تطابق Hydration
 */
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";

  let hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const seconds = String(d.getUTCSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours).padStart(2, "0");

  return `${hoursStr}:${minutes}:${seconds} ${ampm}`;
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
