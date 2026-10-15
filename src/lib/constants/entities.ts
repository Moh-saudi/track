// قائمة أنواع الجهات المعتمدة في منظومة تتبع القضايا والشكاوى
export interface EntityTypeConfig {
  id: string;
  label: string;
  placeholder: string;
  badgeVariant: "teal" | "purple" | "amber" | "blue" | "slate" | "emerald";
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const ENTITY_TYPES: readonly EntityTypeConfig[] = [
  {
    id: "مستشفى حكومي",
    label: "مستشفى حكومي",
    placeholder: "مثال: مستشفى المنيرة العام / مستشفى أحمد ماهر التعليمي / مستشفى شبين الكوم التعليمي",
    badgeVariant: "teal",
    bgClass: "bg-teal-50",
    textClass: "text-teal-800",
    borderClass: "border-teal-200",
  },
  {
    id: "مستشفى جامعي",
    label: "مستشفى جامعي",
    placeholder: "مثال: مستشفيات جامعة القاهرة (قصر العيني) / مستشفيات جامعة عين شمس (الدمرداش) / مستشفيات جامعة أسيوط",
    badgeVariant: "emerald",
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-800",
    borderClass: "border-emerald-200",
  },
  {
    id: "مستشفى خاص",
    label: "مستشفى خاص",
    placeholder: "مثال: مستشفى دار الفؤاد / المركز الطبي التخصصي / مستشفى السلام الدولي",
    badgeVariant: "purple",
    bgClass: "bg-purple-50",
    textClass: "text-purple-800",
    borderClass: "border-purple-200",
  },
  {
    id: "قوات مسلحة",
    label: "قوات مسلحة",
    placeholder: "مثال: المجمع الطبي للقوات المسلحة بالمعادي / مستشفى كوبري القبة / الجلاء العسكري",
    badgeVariant: "amber",
    bgClass: "bg-amber-50",
    textClass: "text-amber-800",
    borderClass: "border-amber-200",
  },
  {
    id: "داخلية",
    label: "داخلية",
    placeholder: "مثال: مستشفى الشرطة بالعجوزة / مستشفى هيئة الشرطة بمدينة نصر / الإسكندرية",
    badgeVariant: "blue",
    bgClass: "bg-sky-50",
    textClass: "text-sky-800",
    borderClass: "border-sky-200",
  },
  {
    id: "أخرى",
    label: "أخرى",
    placeholder: "اكتب اسم الجهة أو المنشأة المعنية المشكو في حقها...",
    badgeVariant: "slate",
    bgClass: "bg-slate-100",
    textClass: "text-slate-800",
    borderClass: "border-slate-300",
  },
] as const;

export type EntityTypeValue = (typeof ENTITY_TYPES)[number]["id"];

export function getEntityConfig(entityType?: string | null): EntityTypeConfig | undefined {
  if (!entityType) return undefined;
  return ENTITY_TYPES.find((e) => e.id === entityType || e.label === entityType);
}

export function getEntityPlaceholder(entityType?: string | null): string {
  const conf = getEntityConfig(entityType);
  return conf ? conf.placeholder : "اكتب اسم الجهة أو المنشأة الطبية المشكو في حقها...";
}
