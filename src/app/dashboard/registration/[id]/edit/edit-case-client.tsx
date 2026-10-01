"use client";

import { useState, useEffect, useTransition, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EgyptianPhoneInput } from "@/components/ui/EgyptianPhoneInput";
import {
  Building2,
  Scale,
  ClipboardList,
  Search,
  Save,
  X,
  ArrowRight,
  Plus,
  Trash2,
  UserCheck,
  Users,
  ChevronDown,
  Check,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { EGYPT_GOVERNORATES } from "@/lib/constants/governorates";
import { OFFICIAL_PROSECUTIONS_LIST } from "@/lib/constants/prosecutions";
import { isValidEgyptianPhone } from "@/lib/formatters";

interface Prosecution {
  id: string;
  name: string;
  governorate?: string | null;
  type?: string | null;
  parentId?: string | null;
  parent?: { id: string; name: string } | null;
}

interface PartyEntry {
  name: string;
  phone: string;
}

interface SearchableSelectProps {
  label: string;
  required?: boolean;
  value: string;
  options: { id: string; name: string; subtitle?: string; badge?: string }[];
  placeholder: string;
  emptyMessage?: string;
  disabled?: boolean;
  isInvalid?: boolean;
  onChange: (id: string, name: string) => void;
}

function SearchableSelect({
  label,
  required = false,
  value,
  options,
  placeholder,
  emptyMessage = "لا توجد خيارات مطابقة",
  disabled = false,
  isInvalid = false,
  onChange,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedItem = options.find((opt) => opt.id === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const filteredOptions = options.filter((opt) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      opt.name.toLowerCase().includes(q) ||
      (opt.subtitle && opt.subtitle.toLowerCase().includes(q))
    );
  });

  return (
    <div className="form-group relative" ref={containerRef}>
      <label className={`form-label ${required ? "form-label-required" : ""}`}>
        {label}
      </label>

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setIsOpen(!isOpen);
              setSearch("");
            }
          }}
          className={`form-input text-xs font-medium h-10 w-full text-right flex items-center justify-between gap-2 cursor-pointer transition-colors bg-white ${
            disabled ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200" : ""
          } ${isOpen ? "border-teal-600 ring-2 ring-teal-600/20" : isInvalid ? "border-rose-400 ring-2 ring-rose-400/20" : ""}`}
        >
          <span className={`truncate ${selectedItem ? "text-slate-900 font-bold" : "text-slate-400"}`}>
            {selectedItem ? selectedItem.name : placeholder}
          </span>
          <div className="flex items-center gap-1 shrink-0 text-slate-400">
            {selectedItem && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("", "");
                }}
                className="p-1 hover:text-rose-600 transition-colors"
                title="مسح الاختيار"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180 text-teal-600" : ""}`} />
          </div>
        </button>

        {isOpen && !disabled && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 p-2 space-y-2 max-h-72 flex flex-col animate-in fade-in-50 zoom-in-95">
            <div className="relative shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم أو المحافظة هنا..."
                className="form-input text-xs pr-8 pl-3 h-8 bg-slate-50 border-slate-200 focus:bg-white focus:border-teal-600"
              />
            </div>

            <div className="overflow-y-auto flex-1 space-y-1 divide-y divide-slate-100/60 max-h-52 pr-0.5">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400 font-body">
                  {emptyMessage}
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.id === value;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onChange(opt.id, opt.name);
                        setIsOpen(false);
                      }}
                      className={`w-full text-right p-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 ${
                        isSelected
                          ? "bg-teal-50 text-teal-900 font-bold"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="block truncate font-body">{opt.name}</span>
                        {opt.subtitle && (
                          <span className="block text-[10px] text-slate-400 font-normal truncate">
                            {opt.subtitle}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface EditCaseClientProps {
  initialCase: {
    id: string;
    registrationType: "COMPLAINT" | "CASE" | "REPORT";
    caseNumber: string;
    caseYear: number;
    prosecutionCaseNumber?: string;
    incomingDate?: string;
    attachmentsCount?: number;
    governorate?: string;
    prosecution?: string;
    prosecutionId?: string;
    partialProsecution?: string;
    partialProsecutionId?: string;
    description?: string;
    complainantName?: string;
    complainantPhone?: string;
    respondentName?: string;
    respondentPhone?: string;
    complainants?: Array<{ name: string; phone?: string | null }>;
    respondents?: Array<{ name: string; phone?: string | null }>;
    status?: string;
  };
}

export default function EditCaseClient({ initialCase }: EditCaseClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [registrationType, setRegistrationType] = useState<"COMPLAINT" | "CASE" | "REPORT">(
    initialCase.registrationType || "COMPLAINT"
  );
  const [caseNumber, setCaseNumber] = useState(initialCase.caseNumber || "");
  const [prosecutionCaseNumber, setProsecutionCaseNumber] = useState(
    initialCase.prosecutionCaseNumber || ""
  );
  const [caseYear, setCaseYear] = useState<number>(initialCase.caseYear || new Date().getFullYear());
  const [incomingDate, setIncomingDate] = useState<string>(initialCase.incomingDate || "");
  const [governorate, setGovernorate] = useState(initialCase.governorate || "");
  const [description, setDescription] = useState(initialCase.description || "");
  const [attachmentsCount, setAttachmentsCount] = useState<number>(
    initialCase.attachmentsCount ?? 0
  );

  // تهيئة قائمة الشاكين
  const initialComplainants: PartyEntry[] = useMemo(() => {
    if (initialCase.complainants && initialCase.complainants.length > 0) {
      return initialCase.complainants.map((c) => ({
        name: c.name || "",
        phone: c.phone || "",
      }));
    }
    return [{ name: initialCase.complainantName || "", phone: initialCase.complainantPhone || "" }];
  }, [initialCase]);

  const [complainants, setComplainants] = useState<PartyEntry[]>(initialComplainants);

  // تهيئة قائمة المشكو في حقهم
  const initialRespondents: PartyEntry[] = useMemo(() => {
    if (initialCase.respondents && initialCase.respondents.length > 0) {
      return initialCase.respondents.map((r) => ({
        name: r.name || "",
        phone: r.phone || "",
      }));
    }
    return [{ name: initialCase.respondentName || "", phone: initialCase.respondentPhone || "" }];
  }, [initialCase]);

  const [respondents, setRespondents] = useState<PartyEntry[]>(initialRespondents);

  const [prosecutions, setProsecutions] = useState<Prosecution[]>([]);
  const [selectedPlenaryId, setSelectedPlenaryId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // تحميل النيابات وتحديثها
  useEffect(() => {
    async function loadData() {
      try {
        const prosRes = await fetch("/api/prosecutions");
        if (prosRes.ok) {
          const list: Prosecution[] = await prosRes.json();
          if (Array.isArray(list) && list.length > 0) {
            setProsecutions(list);
          }
        }
      } catch (e) {
        console.error("Failed to load prosecutions:", e);
      }
    }
    loadData();
  }, []);

  const mergedProsecutions: Prosecution[] = useMemo(() => {
    const serverMap = new Map<string, Prosecution>();
    prosecutions.forEach((p) => serverMap.set(p.name, p));

    const result: Prosecution[] = OFFICIAL_PROSECUTIONS_LIST.map((official, idx) => {
      const serverItem = serverMap.get(official.name);
      const serverParent = official.parentName ? serverMap.get(official.parentName) : null;

      const parentId =
        serverItem?.parentId ||
        serverParent?.id ||
        (official.parentName ? `official_plenary_${official.parentName}` : null);
      const parentObj =
        serverItem?.parent ||
        (official.parentName ? { id: parentId || "", name: official.parentName } : null);

      return {
        id: serverItem?.id || (official.type === "PLENARY" ? `official_plenary_${official.name}` : `official_district_${idx + 1}`),
        name: official.name,
        governorate: serverItem?.governorate || official.governorate,
        type: official.type,
        parentId: parentId,
        parent: parentObj,
      };
    });

    prosecutions.forEach((serverItem) => {
      if (!OFFICIAL_PROSECUTIONS_LIST.some((o) => o.name === serverItem.name)) {
        result.push(serverItem);
      }
    });

    return result;
  }, [prosecutions]);

  // مزامنة واختيار النيابة الحالية للسجل عند تحميل النيابات
  useEffect(() => {
    if (mergedProsecutions.length > 0) {
      if (!selectedPlenaryId && (initialCase.prosecution || initialCase.prosecutionId)) {
        const match = mergedProsecutions.find(
          (p) =>
            (initialCase.prosecutionId && p.id === initialCase.prosecutionId) ||
            p.name === initialCase.prosecution
        );
        if (match) setSelectedPlenaryId(match.id);
      }

      if (!selectedDistrictId && (initialCase.partialProsecution || initialCase.partialProsecutionId)) {
        const match = mergedProsecutions.find(
          (p) =>
            (initialCase.partialProsecutionId && p.id === initialCase.partialProsecutionId) ||
            p.name === initialCase.partialProsecution
        );
        if (match) setSelectedDistrictId(match.id);
      }
    }
  }, [mergedProsecutions, initialCase, selectedPlenaryId, selectedDistrictId]);

  const plenaryProsecutions = useMemo(() => {
    return mergedProsecutions.filter((p) => p.type === "PLENARY" || !p.parentId);
  }, [mergedProsecutions]);

  const districtProsecutions = useMemo(() => {
    return mergedProsecutions.filter(
      (p) => p.type === "DISTRICT" || !!p.parentId || p.name.includes("جزئية")
    );
  }, [mergedProsecutions]);

  const filteredPlenaryOptions = useMemo(() => {
    return plenaryProsecutions
      .filter((p) => !governorate || p.governorate === governorate)
      .map((p) => ({
        id: p.id,
        name: p.name,
        subtitle: p.governorate ? `محافظة ${p.governorate}` : undefined,
      }));
  }, [plenaryProsecutions, governorate]);

  const selectedPlenaryObj = useMemo(() => {
    return mergedProsecutions.find((p) => p.id === selectedPlenaryId);
  }, [mergedProsecutions, selectedPlenaryId]);

  const filteredDistrictOptions = useMemo(() => {
    if (selectedPlenaryId && selectedPlenaryObj) {
      const linked = districtProsecutions.filter((d) => {
        if (d.parentId === selectedPlenaryId || d.parent?.id === selectedPlenaryId) return true;
        if (d.parent?.name === selectedPlenaryObj.name) return true;
        const official = OFFICIAL_PROSECUTIONS_LIST.find((o) => o.name === d.name);
        if (official && official.parentName === selectedPlenaryObj.name) return true;
        return false;
      });

      return linked.map((p) => ({
        id: p.id,
        name: p.name,
        subtitle: `تابعة لـ ${selectedPlenaryObj.name}`,
      }));
    }

    if (governorate) {
      const byGov = districtProsecutions.filter((d) => {
        const dGov = d.governorate || OFFICIAL_PROSECUTIONS_LIST.find((o) => o.name === d.name)?.governorate;
        return dGov === governorate;
      });
      return byGov.map((p) => ({
        id: p.id,
        name: p.name,
        subtitle: p.parent?.name ? `تابعة لـ ${p.parent.name}` : `محافظة ${governorate}`,
      }));
    }

    return districtProsecutions.map((p) => ({
      id: p.id,
      name: p.name,
      subtitle: p.parent?.name ? `تابعة لـ ${p.parent.name}` : p.governorate ? `محافظة ${p.governorate}` : undefined,
    }));
  }, [districtProsecutions, selectedPlenaryId, selectedPlenaryObj, governorate]);

  function handleGovernorateChange(gov: string) {
    setGovernorate(gov);
    if (selectedPlenaryObj && selectedPlenaryObj.governorate && selectedPlenaryObj.governorate !== gov) {
      setSelectedPlenaryId("");
      setSelectedDistrictId("");
    }
  }

  function handlePlenarySelect(procId: string) {
    setSelectedPlenaryId(procId);
    setSelectedDistrictId("");
    if (!procId) return;
    const p = mergedProsecutions.find((item) => item.id === procId);
    if (p?.governorate) {
      setGovernorate(p.governorate);
    }
  }

  function handleDistrictSelect(procId: string) {
    setSelectedDistrictId(procId);
    if (!procId) return;
    const dist = mergedProsecutions.find((item) => item.id === procId);
    if (dist) {
      if (dist.parentId) {
        setSelectedPlenaryId(dist.parentId);
      } else if (dist.parent?.name) {
        const parent = mergedProsecutions.find((p) => p.name === dist.parent?.name);
        if (parent) setSelectedPlenaryId(parent.id);
      }
      if (dist.governorate && !governorate) {
        setGovernorate(dist.governorate);
      }
    }
  }

  // دوال الشاكين
  function addComplainant() {
    setComplainants((prev) => [...prev, { name: "", phone: "" }]);
  }
  function removeComplainant(index: number) {
    if (complainants.length <= 1) return;
    setComplainants((prev) => prev.filter((_, i) => i !== index));
  }
  function updateComplainant(index: number, field: keyof PartyEntry, value: string) {
    setComplainants((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  // دوال المشكو في حقهم
  function addRespondent() {
    setRespondents((prev) => [...prev, { name: "", phone: "" }]);
  }
  function removeRespondent(index: number) {
    if (respondents.length <= 1) {
      setRespondents([{ name: "", phone: "" }]);
      return;
    }
    setRespondents((prev) => prev.filter((_, i) => i !== index));
  }
  function updateRespondent(index: number, field: keyof PartyEntry, value: string) {
    setRespondents((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!caseNumber.trim()) {
      setError("يرجى إدخال رقم السجل بشكل صحيح");
      return;
    }

    const firstComplainant = complainants[0]?.name.trim();
    if (!firstComplainant) {
      setError("اسم الشاكي الأول حقل إلزامي (شاكي واحد على الأقل)");
      return;
    }

    // التحقق الصارم من النيابة الكلية
    const selectedPlenary = mergedProsecutions.find((p) => p.id === selectedPlenaryId);
    const selectedDistrict = mergedProsecutions.find((p) => p.id === selectedDistrictId);

    if (!selectedPlenaryId || !selectedPlenary) {
      setError("يرجى اختيار النيابة العامة الكلية المختصة (حقل إلزامي)");
      return;
    }

    if (
      (registrationType === "CASE" || registrationType === "REPORT") &&
      !prosecutionCaseNumber.trim()
    ) {
      setError(
        registrationType === "CASE"
          ? "يرجى إدخال رقم القضية المرتبط (حقل إلزامي عند قيد قضية)"
          : "يرجى إدخال رقم محضر النيابة المرتبط (حقل إلزامي عند قيد محضر نيابة)"
      );
      return;
    }

    const cleanComplainants = complainants
      .filter((c) => c.name.trim().length > 0)
      .map((c) => ({ name: c.name.trim(), phone: c.phone.trim() || null }));

    const cleanRespondents = respondents
      .filter((r) => r.name.trim().length > 0)
      .map((r) => ({ name: r.name.trim(), phone: r.phone.trim() || null }));

    for (const c of cleanComplainants) {
      if (c.phone && !isValidEgyptianPhone(c.phone)) {
        setError(`رقم هاتف الشاكي (${c.name}) غير صالح. يجب أن يتكون من 11 رقماً مصرياً يبدأ بـ 01 (مثال: 01012345678)`);
        return;
      }
    }

    for (const r of cleanRespondents) {
      if (r.phone && !isValidEgyptianPhone(r.phone)) {
        setError(`رقم هاتف المشكو في حقه (${r.name}) غير صالح. يجب أن يتكون من 11 رقماً مصرياً يبدأ بـ 01 (مثال: 01012345678)`);
        return;
      }
    }

    startTransition(async () => {
      try {
        const payload = {
          registrationType,
          caseNumber: caseNumber.trim(),
          prosecutionCaseNumber: prosecutionCaseNumber.trim() || null,
          caseYear: Number(caseYear),
          incomingDate: incomingDate || null,
          complainants: cleanComplainants,
          respondents: cleanRespondents,
          prosecutionId: selectedPlenaryId.startsWith("official_") ? null : selectedPlenaryId || null,
          prosecution: selectedPlenary?.name || null,
          partialProsecutionId: selectedDistrictId.startsWith("official_") ? null : selectedDistrictId || null,
          partialProsecution: selectedDistrict?.name || null,
          governorate: governorate.trim() || null,
          description: description.trim(),
          attachmentsCount: Number(attachmentsCount) || 0,
        };

        const res = await fetch(`/api/cases/${initialCase.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.redirected || res.url.includes("/login")) {
          throw new Error("انتهت جلسة تسجيل الدخول، يرجى تسجيل الدخول مجدداً والمحاولة");
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "تعذر تحديث بيانات السجل، يرجى مراجعة البيانات");
        }

        setSuccess("تم تحديث وتصحيح بيانات السجل بنجاح! جاري تحويلك لملف السجل...");
        setTimeout(() => {
          router.push(`/dashboard/registration/${initialCase.id}`);
          router.refresh();
        }, 1200);
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "قيد السجلات", href: "/dashboard/registration" },
          { label: `ملف السجل #${initialCase.caseNumber}`, href: `/dashboard/registration/${initialCase.id}` },
          { label: "تعديل وتصحيح بيانات السجل" },
        ]}
        title={`تعديل السجل: ${initialCase.caseNumber} / ${initialCase.caseYear}`}
        description="تعديل وتصحيح بيانات السجل والنيابة المختصة والأطراف المسجلين بدقة وتوثيق ذلك في سجل التدقيق الرقابي."
        actions={
          <Link
            href={`/dashboard/registration/${initialCase.id}`}
            prefetch={false}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs sm:text-sm font-medium hover:bg-slate-50 shadow-xs font-body"
          >
            <ArrowRight className="w-4 h-4" />
            <span>إلغاء والعودة للملف</span>
          </Link>
        }
      />

      <Card className="space-y-6 p-6 sm:p-8">
        {error && (
          <div className="alert-error text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert-success text-xs flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 p-3 rounded-xl font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. نوع السجل */}
          <div className="form-group">
            <label className="form-label form-label-required">نوع السجل</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { type: "COMPLAINT", label: "شكوى", desc: "واردة من مواطن أو جهة", icon: Building2 },
                { type: "CASE", label: "قضية", desc: "دعوى قضائية منظورة", icon: Scale },
                { type: "REPORT", label: "محضر نيابة عامة", desc: "إحالة من النيابة المختصة", icon: ClipboardList },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = registrationType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setRegistrationType(item.type as any)}
                    className={`p-3.5 rounded-xl border text-right transition-all flex items-start justify-between font-body ${
                      isSelected
                        ? "border-teal-600 bg-teal-50/70 text-teal-900 font-bold shadow-xs ring-1 ring-teal-600/30"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block font-heading">{item.label}</span>
                      <span className="text-[11px] text-slate-500 font-normal">{item.desc}</span>
                    </div>
                    <Icon className={`w-5 h-5 ${isSelected ? "text-teal-600" : "text-slate-400"}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. بيانات السجل الأساسية */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="form-group">
              <label className="form-label form-label-required">تاريخ الوارد</label>
              <input
                type="date"
                required
                value={incomingDate}
                onChange={(e) => setIncomingDate(e.target.value)}
                className="form-input text-xs font-mono font-medium h-10"
              />
            </div>

            <div className="form-group">
              <label className="form-label form-label-required">رقم السجل</label>
              <input
                type="text"
                required
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                placeholder="مثال: 1425"
                className="form-input text-xs font-mono font-medium h-10"
                dir="ltr"
              />
            </div>

            <div className="form-group">
              <label
                className={`form-label ${
                  registrationType === "CASE" || registrationType === "REPORT"
                    ? "form-label-required"
                    : ""
                }`}
              >
                {registrationType === "REPORT"
                  ? "رقم محضر النيابة"
                  : registrationType === "CASE"
                  ? "رقم القضية"
                  : "رقم الشكوى"}
              </label>
              <input
                type="text"
                required={registrationType === "CASE" || registrationType === "REPORT"}
                value={prosecutionCaseNumber}
                onChange={(e) => setProsecutionCaseNumber(e.target.value)}
                placeholder={
                  registrationType === "REPORT"
                    ? "مثال: 4521 إداري / جنح"
                    : registrationType === "CASE"
                    ? "مثال: 1082 مدني"
                    : "مثال: 582 لسنة 2026"
                }
                className="form-input text-xs font-mono font-medium h-10"
                dir="auto"
              />
            </div>

            <div className="form-group">
              <label className="form-label form-label-required">سنة القيد</label>
              <input
                type="number"
                required
                value={caseYear}
                onChange={(e) => setCaseYear(Number(e.target.value))}
                className="form-input text-xs font-mono font-medium h-10"
                dir="ltr"
              />
            </div>

            <div className="form-group">
              <label className="form-label">عدد المرفقات</label>
              <input
                type="number"
                min="0"
                value={attachmentsCount}
                onChange={(e) => setAttachmentsCount(Number(e.target.value))}
                className="form-input text-xs font-mono font-medium h-10"
                dir="ltr"
              />
            </div>
          </div>

          {/* 3. الشاكون وأصحاب الشكوى */}
          <div className="p-4 bg-slate-50/60 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-700" />
                <span className="text-xs font-bold text-slate-900 font-heading">
                  الشاكي / المبلّغ (مقدمو الشكوى)
                </span>
                <Badge variant="teal" size="sm">
                  {complainants.length}
                </Badge>
              </div>
              <button
                type="button"
                onClick={addComplainant}
                className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800 hover:bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة شاكي آخر</span>
              </button>
            </div>

            <div className="space-y-2">
              {complainants.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs"
                >
                  <div className="flex items-center gap-1.5 min-w-[70px] shrink-0">
                    <span className="text-[11px] font-bold text-slate-500">#{idx + 1}</span>
                    {idx === 0 ? (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        رئيسي *
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        إضافي
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      required={idx === 0}
                      value={item.name}
                      onChange={(e) => updateComplainant(idx, "name", e.target.value)}
                      placeholder={`اسم الشاكي ${idx === 0 ? "(إلزامي)" : "(اختياري)"}...`}
                      className="form-input text-xs h-9"
                    />
                  </div>
                  <div className="w-full sm:w-64 shrink-0">
                    <EgyptianPhoneInput
                      value={item.phone}
                      onChange={(val) => updateComplainant(idx, "phone", val)}
                      placeholder="رقم الهاتف (اختياري)..."
                      size="sm"
                    />
                  </div>
                  {complainants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeComplainant(idx)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors shrink-0"
                      title="حذف هذا الشاكي"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 4. المشكو في حقهم */}
          <div className="p-4 bg-slate-50/60 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-teal-700" />
                <span className="text-xs font-bold text-slate-900 font-heading">
                  المشكو في حقهم (الأطباء / مقدمو الخدمة الطبية)
                </span>
                <Badge variant="slate" size="sm">
                  {respondents.filter((r) => r.name.trim()).length || respondents.length}
                </Badge>
              </div>
              <button
                type="button"
                onClick={addRespondent}
                className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800 hover:bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة مشكو في حقه آخر</span>
              </button>
            </div>

            <div className="space-y-2">
              {respondents.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs"
                >
                  <div className="flex items-center gap-1.5 min-w-[70px] shrink-0">
                    <span className="text-[11px] font-bold text-slate-500">#{idx + 1}</span>
                    {idx === 0 && (
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        أساسي
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateRespondent(idx, "name", e.target.value)}
                      placeholder="اسم الطبيب أو المشكو في حقه..."
                      className="form-input text-xs h-9"
                    />
                  </div>
                  <div className="w-full sm:w-64 shrink-0">
                    <EgyptianPhoneInput
                      value={item.phone}
                      onChange={(val) => updateRespondent(idx, "phone", val)}
                      placeholder="رقم الهاتف (اختياري)..."
                      size="sm"
                    />
                  </div>
                  {respondents.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRespondent(idx)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors shrink-0"
                      title="حذف هذا الطرف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 5. النيابات المختصة */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-teal-700" />
                <span className="form-label font-bold text-slate-900 m-0">
                  النيابة العامة المختصة
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-body">
                تحديد النيابة الكلية إلزامي لحفظ السجل
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. المحافظة */}
              <div className="form-group">
                <label className="form-label">المحافظة</label>
                <select
                  value={governorate}
                  onChange={(e) => handleGovernorateChange(e.target.value)}
                  className="form-select text-xs font-medium h-10 bg-white"
                >
                  <option value="">-- جميع المحافظات ({EGYPT_GOVERNORATES.length}) --</option>
                  {EGYPT_GOVERNORATES.map((gov) => (
                    <option key={gov} value={gov}>
                      {gov}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. النيابة الكلية */}
              <SearchableSelect
                label="النيابة الكلية"
                required
                isInvalid={!selectedPlenaryId && !!error && error.includes("النيابة")}
                value={selectedPlenaryId}
                options={filteredPlenaryOptions}
                placeholder={`-- حدد النيابة الكلية (${filteredPlenaryOptions.length}) --`}
                emptyMessage="لا توجد نيابة كلية مطابقة"
                onChange={(id) => handlePlenarySelect(id)}
              />

              {/* 3. النيابة الجزئية */}
              <SearchableSelect
                label="النيابة الجزئية (اختياري)"
                value={selectedDistrictId}
                options={filteredDistrictOptions}
                placeholder={
                  selectedPlenaryObj
                    ? filteredDistrictOptions.length > 0
                      ? `-- النيابات الجزئية التابعة لـ ${selectedPlenaryObj.name} (${filteredDistrictOptions.length}) --`
                      : `-- لا توجد نيابة جزئية مسجلة تابعة لـ ${selectedPlenaryObj.name} --`
                    : `-- حدد النيابة الجزئية (${filteredDistrictOptions.length}) --`
                }
                emptyMessage="لا توجد نيابة جزئية مطابقة للبحث"
                onChange={(id) => handleDistrictSelect(id)}
              />
            </div>
          </div>

          {/* 6. ملخص الواقعة */}
          <div className="form-group">
            <label className="form-label form-label-required">ملخص الواقعة / تفاصيل الشكوى</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب ملخصاً وافياً عن الواقعة وتفاصيل الشكوى المقدمة والإجراءات المتخذة..."
              className="form-textarea text-xs leading-relaxed"
            />
          </div>

          {/* زر الحفظ */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Link
              href={`/dashboard/registration/${initialCase.id}`}
              className="h-10 px-5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold font-heading inline-flex items-center transition-colors"
            >
              إلغاء
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isPending}
              disabled={isPending}
              className="font-heading font-bold"
            >
              <Save className="w-4 h-4 ml-2" />
              <span>حفظ وتحديث بيانات السجل</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
