// ============================================================================
// الخيارات المعتمدة حصرياً لدراسة اللجنة الفرعية للمسؤولية الطبية
// تظهر هذه الاختيارات الخمسة فقط في دراسة اللجنة وتُعرض للجنة العليا
// ============================================================================

export const SUBCOMMITTEE_FINDINGS = [
  "لا يوجد خطأ طبي ولا مضاعفة طبية",
  "مضاعفه طبية واردة الحدوث ولا يوجد أى خطأ طبى",
  "خطأ طبى من الطبيب المشكو في حقه",
  "خطأ طبى جسيم  من الطبيب المشكو في حقه",
  "خطأ طبي علي المنشأة الطبية",
] as const;

export type SubCommitteeFinding = (typeof SUBCOMMITTEE_FINDINGS)[number];

export interface FindingConfigItem {
  label: string;
  badge: string;
  color: string;
  border: string;
  bg: string;
  ring: string;
  iconType: "shield" | "check" | "alert-triangle" | "alert-circle" | "building";
}

export const FINDING_CONFIG: Record<string, FindingConfigItem> = {
  "لا يوجد خطأ طبي ولا مضاعفة طبية": {
    label: "لا يوجد خطأ طبي ولا مضاعفة طبية",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-300",
    color: "text-emerald-900",
    border: "border-emerald-300",
    bg: "bg-emerald-50/70",
    ring: "ring-emerald-500/20",
    iconType: "shield",
  },
  "مضاعفه طبية واردة الحدوث ولا يوجد أى خطأ طبى": {
    label: "مضاعفه طبية واردة الحدوث ولا يوجد أى خطأ طبى",
    badge: "bg-teal-50 text-teal-800 border-teal-300",
    color: "text-teal-900",
    border: "border-teal-300",
    bg: "bg-teal-50/70",
    ring: "ring-teal-500/20",
    iconType: "check",
  },
  "خطأ طبى من الطبيب المشكو في حقه": {
    label: "خطأ طبى من الطبيب المشكو في حقه",
    badge: "bg-amber-50 text-amber-900 border-amber-300",
    color: "text-amber-950",
    border: "border-amber-300",
    bg: "bg-amber-50/70",
    ring: "ring-amber-500/20",
    iconType: "alert-triangle",
  },
  "خطأ طبى جسيم  من الطبيب المشكو في حقه": {
    label: "خطأ طبى جسيم  من الطبيب المشكو في حقه",
    badge: "bg-rose-50 text-rose-900 border-rose-300",
    color: "text-rose-950",
    border: "border-rose-300",
    bg: "bg-rose-50/70",
    ring: "ring-rose-500/20",
    iconType: "alert-circle",
  },
  "خطأ طبي علي المنشأة الطبية": {
    label: "خطأ طبي علي المنشأة الطبية",
    badge: "bg-purple-50 text-purple-900 border-purple-300",
    color: "text-purple-950",
    border: "border-purple-300",
    bg: "bg-purple-50/70",
    ring: "ring-purple-500/20",
    iconType: "building",
  },
};

export function getFindingConfig(finding?: string | null): FindingConfigItem {
  if (!finding) {
    return {
      label: "قيد فحص اللجنة",
      badge: "bg-slate-100 text-slate-700 border-slate-300",
      color: "text-slate-800",
      border: "border-slate-200",
      bg: "bg-slate-50",
      ring: "ring-slate-300",
      iconType: "check",
    };
  }

  // مطابقة تامة
  if (FINDING_CONFIG[finding]) {
    return FINDING_CONFIG[finding];
  }

  // مطابقة مرنة للنصوص السابقة
  const trimmed = finding.trim();
  for (const [key, config] of Object.entries(FINDING_CONFIG)) {
    if (trimmed.includes(key) || key.includes(trimmed)) {
      return config;
    }
  }

  if (trimmed.includes("جسيم")) return FINDING_CONFIG["خطأ طبى جسيم  من الطبيب المشكو في حقه"];
  if (trimmed.includes("المنشأة")) return FINDING_CONFIG["خطأ طبي علي المنشأة الطبية"];
  if (trimmed.includes("مضاعف")) return FINDING_CONFIG["مضاعفه طبية واردة الحدوث ولا يوجد أى خطأ طبى"];
  if (trimmed.includes("انتفاء") || trimmed.includes("لا يوجد")) return FINDING_CONFIG["لا يوجد خطأ طبي ولا مضاعفة طبية"];
  if (trimmed.includes("خطأ")) return FINDING_CONFIG["خطأ طبى من الطبيب المشكو في حقه"];

  return {
    label: finding,
    badge: "bg-teal-50 text-teal-800 border-teal-300",
    color: "text-teal-900",
    border: "border-teal-300",
    bg: "bg-teal-50/70",
    ring: "ring-teal-500/20",
    iconType: "check",
  };
}
