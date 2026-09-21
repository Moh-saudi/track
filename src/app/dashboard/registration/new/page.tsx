"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  FileText,
  Building2,
  Scale,
  ClipboardList,
  Search,
  Save,
  X,
  ArrowRight,
  Plus,
  Trash2,
  User,
  Users,
  Phone,
  UserCheck,
} from "lucide-react";
import { EGYPT_GOVERNORATES } from "@/lib/constants/governorates";

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

export default function NewCasePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [registrationType, setRegistrationType] = useState<"COMPLAINT" | "CASE" | "REPORT">("COMPLAINT");
  const [caseNumber, setCaseNumber] = useState("");
  const [prosecutionCaseNumber, setProsecutionCaseNumber] = useState("");
  const [caseYear, setCaseYear] = useState<number>(new Date().getFullYear());
  const [incomingDate, setIncomingDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [hospitalName, setHospitalName] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [showAllProsecutions, setShowAllProsecutions] = useState(false);
  const [description, setDescription] = useState("");
  const [attachmentsCount, setAttachmentsCount] = useState<number>(0);

  // قائمة الشاكين (متعدد)
  const [complainants, setComplainants] = useState<PartyEntry[]>([{ name: "", phone: "" }]);
  // قائمة المشكو في حقهم (متعدد)
  const [respondents, setRespondents] = useState<PartyEntry[]>([{ name: "", phone: "" }]);

  // النيابات المختصة (كلية وجزئية)
  const [prosecutions, setProsecutions] = useState<Prosecution[]>([]);
  const [selectedPlenaryId, setSelectedPlenaryId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [prosecutionSearch, setProsecutionSearch] = useState("");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const prosRes = await fetch("/api/prosecutions");
        if (prosRes.ok) {
          const list: Prosecution[] = await prosRes.json();
          setProsecutions(list);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadData();
  }, []);

  // فصل النيابات إلى كلية وجزئية
  const plenaryProsecutions = prosecutions.filter(
    (p) => !p.type || p.type === "PLENARY" || !p.parentId
  );
  const districtProsecutions = prosecutions.filter(
    (p) => p.type === "DISTRICT" || !!p.parentId
  );

  // تصفية النيابات الكلية بحسب المحافظة والبحث
  const filteredPlenaryProsecutions = plenaryProsecutions.filter((p) => {
    const q = prosecutionSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.governorate && p.governorate.toLowerCase().includes(q));
    const matchesGov = !governorate || showAllProsecutions || p.governorate === governorate;
    return matchesSearch && matchesGov;
  });

  // تصفية النيابات الجزئية التابعة للنيابة الكلية المختارة
  const filteredDistrictProsecutions = districtProsecutions.filter((p) => {
    if (selectedPlenaryId) {
      return p.parentId === selectedPlenaryId;
    }
    if (governorate && !showAllProsecutions) {
      return p.governorate === governorate;
    }
    return true;
  });

  const selectedPlenary = prosecutions.find((p) => p.id === selectedPlenaryId);
  const selectedDistrict = prosecutions.find((p) => p.id === selectedDistrictId);

  function handleGovernorateChange(gov: string) {
    setGovernorate(gov);
    setShowAllProsecutions(false);
    if (gov && selectedPlenary && selectedPlenary.governorate && selectedPlenary.governorate !== gov) {
      setSelectedPlenaryId("");
      setSelectedDistrictId("");
    }
  }

  function handlePlenarySelect(procId: string) {
    setSelectedPlenaryId(procId);
    setSelectedDistrictId(""); // تصفير الجزئية عند تغيير الكلية
    if (!procId) return;
    const p = prosecutions.find((item) => item.id === procId);
    if (p?.governorate) {
      setGovernorate(p.governorate);
      setShowAllProsecutions(false);
    }
  }

  // دوال إدارة الشاكين
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

  // دوال إدارة المشكو في حقهم
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

    if (!caseNumber.trim()) {
      setError("يرجى إدخال رقم السجل بشكل صحيح");
      return;
    }

    const firstComplainant = complainants[0]?.name.trim();
    if (!firstComplainant) {
      setError("اسم الشاكي الأول حقل إلزامي (شاكي واحد على الأقل)");
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

    startTransition(async () => {
      try {
        const payload = {
          registrationType,
          caseNumber: caseNumber.trim(),
          prosecutionCaseNumber: prosecutionCaseNumber.trim() || undefined,
          caseYear: Number(caseYear),
          incomingDate: incomingDate || undefined,
          hospitalName: hospitalName.trim() || undefined,
          complainantName: cleanComplainants[0]?.name,
          complainantPhone: cleanComplainants[0]?.phone || undefined,
          respondentName: cleanRespondents[0]?.name || undefined,
          respondentPhone: cleanRespondents[0]?.phone || undefined,
          complainants: cleanComplainants,
          respondents: cleanRespondents,
          prosecutionId: selectedPlenaryId || undefined,
          prosecution: selectedPlenary?.name || undefined,
          partialProsecutionId: selectedDistrictId || undefined,
          partialProsecution: selectedDistrict?.name || undefined,
          governorate: governorate.trim() || undefined,
          description: description.trim(),
          attachmentsCount: Number(attachmentsCount) || 0,
        };

        const res = await fetch("/api/cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "تعذر قيد السجل، يرجى مراجعة البيانات");
        }

        router.push("/dashboard/registration");
        router.refresh();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ─── رأس الصفحة الموحد ─── */}
      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "قيد السجلات", href: "/dashboard/registration" },
          { label: "قيد سجل جديد" },
        ]}
        title="قيد شكوى / قضية / محضر نيابة جديد"
        description="تسجيل وحفظ بيانات السجل والمرفقات والأطراف تمهيداً للإحالة للجان الفحص الفرعية."
        actions={
          <Link
            href="/dashboard/registration"
            prefetch={false}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs sm:text-sm font-medium hover:bg-slate-50 shadow-xs font-body"
          >
            <ArrowRight className="w-4 h-4" />
            <span>عودة للسجلات</span>
          </Link>
        }
      />

      <Card className="space-y-6 p-6 sm:p-8">
        {error && (
          <div className="alert-error text-xs">
            <span>{error}</span>
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

          {/* 2. تاريخ الوارد + رقم السجل + رقم القضية / محضر النيابة + سنة القيد + عدد المرفقات */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="form-group">
              <label className="form-label form-label-required">تاريخ الوارد (الاستلام)</label>
              <input
                type="date"
                required
                value={incomingDate}
                onChange={(e) => setIncomingDate(e.target.value)}
                className="form-input text-xs font-mono font-medium h-10"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block font-body truncate">
                تاريخ ورود كتاب النيابة
              </span>
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
              <span className="text-[10px] text-slate-500 mt-0.5 block font-body truncate">
                الرقم الداخلي للمنظومة
              </span>
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
                className={`form-input text-xs font-mono font-medium h-10 ${
                  (registrationType === "CASE" || registrationType === "REPORT") && !prosecutionCaseNumber.trim()
                    ? "border-amber-300 focus:border-teal-600"
                    : ""
                }`}
                dir="auto"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block font-body truncate">
                {registrationType === "COMPLAINT"
                  ? "رقم الشكوى الواردة (اختياري)"
                  : "رقم السجل بالنيابة المختصة"}
              </span>
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
              <span className="text-[10px] text-slate-500 mt-0.5 block font-body truncate">
                سنة تقييد السجل
              </span>
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
              <span className="text-[10px] text-slate-500 mt-0.5 block font-body truncate">
                الورقية / الرقمية
              </span>
            </div>
          </div>

          {/* 3. الشاكون وأصحاب الشكوى (متعدد) */}
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

            <div className="space-y-2.5">
              {complainants.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 bg-white rounded-lg border border-slate-200 shadow-2xs"
                >
                  <div className="flex items-center gap-1.5 min-w-[80px]">
                    <span className="text-[11px] font-bold text-slate-500">#{idx + 1}</span>
                    {idx === 0 && (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        الرئيسي *
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
                  <div className="w-full sm:w-56 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="tel"
                      value={item.phone}
                      onChange={(e) => updateComplainant(idx, "phone", e.target.value)}
                      placeholder="رقم الهاتف (اختياري)..."
                      className="form-input text-xs font-mono h-9"
                      dir="ltr"
                    />
                  </div>
                  {complainants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeComplainant(idx)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                      title="حذف هذا الشاكي"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 font-body">
              * اسم الشاكي الأول حقل إلزامي، ويمكن إضافة أكثر من شاكي مع أرقام الهواتف إن وجدت.
            </p>
          </div>

          {/* 4. المشكو في حقهم (الأطباء / المنشآت الطبية) (متعدد) */}
          <div className="p-4 bg-slate-50/60 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-teal-700" />
                <span className="text-xs font-bold text-slate-900 font-heading">
                  المشكو في حقهم (الطبيب / المنشأة الطبية)
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

            <div className="space-y-2.5">
              {respondents.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 bg-white rounded-lg border border-slate-200 shadow-2xs"
                >
                  <div className="flex items-center gap-1.5 min-w-[80px]">
                    <span className="text-[11px] font-bold text-slate-500">#{idx + 1}</span>
                    {idx === 0 && (
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        الأساسي
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateRespondent(idx, "name", e.target.value)}
                      placeholder="اسم الطبيب أو المركز أو المشكو في حقه..."
                      className="form-input text-xs h-9"
                    />
                  </div>
                  <div className="w-full sm:w-56 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="tel"
                      value={item.phone}
                      onChange={(e) => updateRespondent(idx, "phone", e.target.value)}
                      placeholder="رقم الهاتف (اختياري)..."
                      className="form-input text-xs font-mono h-9"
                      dir="ltr"
                    />
                  </div>
                  {respondents.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRespondent(idx)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                      title="حذف هذا الطرف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2">
              <label className="form-label text-slate-700">اسم المنشأة الطبية / المستشفى محل الواقعة (إن وجد)</label>
              <input
                type="text"
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                placeholder="مثال: مستشفى قصر العيني، مركز الشفاء للجراحة..."
                className="form-input text-xs h-9"
              />
            </div>
          </div>

          {/* 5. النيابات المختصة (المحافظة -> النيابة الكلية -> النيابة الجزئية) */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-teal-700" />
                <span className="form-label font-bold text-slate-900 m-0">
                  النيابة العامة المختصة (الكلية والجزئية)
                </span>
              </div>
              {selectedPlenary && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="teal" size="sm">
                    الكلية: {selectedPlenary.name}
                  </Badge>
                  {selectedDistrict && (
                    <Badge variant="sky" size="sm">
                      الجزئية: {selectedDistrict.name}
                    </Badge>
                  )}
                  {governorate && (
                    <Badge variant="slate" size="sm">
                      {governorate}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* أ. المحافظة والبحث السريع */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label">المحافظة التابعة</label>
                <select
                  value={governorate}
                  onChange={(e) => handleGovernorateChange(e.target.value)}
                  className="form-select text-xs font-medium h-9"
                >
                  <option value="">-- حدد المحافظة ({EGYPT_GOVERNORATES.length} محافظة) --</option>
                  {EGYPT_GOVERNORATES.map((gov) => (
                    <option key={gov} value={gov}>
                      {gov}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">بحث سريع في أسماء النيابات</label>
                <div className="relative">
                  <input
                    type="text"
                    value={prosecutionSearch}
                    onChange={(e) => {
                      const query = e.target.value;
                      setProsecutionSearch(query);
                      const match = plenaryProsecutions.find((p) => {
                        const q = query.trim().toLowerCase();
                        return (
                          p.name.toLowerCase().includes(q) ||
                          (p.governorate && p.governorate.toLowerCase().includes(q))
                        );
                      });
                      if (match && query.trim().length >= 2) {
                        handlePlenarySelect(match.id);
                      }
                    }}
                    placeholder="اكتب اسم النيابة للبحث المباشر..."
                    className="form-input text-xs pr-3 pl-8 bg-white h-9"
                  />
                  {prosecutionSearch && (
                    <button
                      type="button"
                      onClick={() => setProsecutionSearch("")}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold px-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {governorate && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-teal-50 border border-teal-200/80 text-xs text-teal-950 font-body">
                <span className="font-medium">
                  💡 تصفية النيابات تلقائياً لمحافظة <strong>{governorate}</strong> ({filteredPlenaryProsecutions.length} نيابة كلية متاحة)
                </span>
                {!showAllProsecutions ? (
                  <button
                    type="button"
                    onClick={() => setShowAllProsecutions(true)}
                    className="text-xs text-teal-800 hover:text-teal-950 underline font-bold"
                  >
                    عرض جميع نيابات الجمهورية
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAllProsecutions(false)}
                    className="text-xs text-teal-800 hover:text-teal-950 underline font-bold"
                  >
                    إعادة التصفية لـ {governorate} فقط
                  </button>
                )}
              </div>
            )}

            {/* ب. النيابة الكلية والنيابة الجزئية جنباً إلى جنب */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label font-bold text-slate-900">
                  النيابة الكلية <span className="text-rose-600">*</span>
                </label>
                <select
                  value={selectedPlenaryId}
                  onChange={(e) => handlePlenarySelect(e.target.value)}
                  className="form-select text-xs font-medium text-slate-900 bg-white border-slate-300 h-10"
                >
                  <option value="">
                    -- حدد النيابة الكلية ({filteredPlenaryProsecutions.length} خيار) --
                  </option>
                  {filteredPlenaryProsecutions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.governorate ? `(${p.governorate})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label font-bold text-slate-900">
                  النيابة الجزئية (اختياري)
                </label>
                <select
                  value={selectedDistrictId}
                  onChange={(e) => setSelectedDistrictId(e.target.value)}
                  disabled={filteredDistrictProsecutions.length === 0}
                  className="form-select text-xs font-medium text-slate-900 bg-white border-slate-300 h-10 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">
                    {filteredDistrictProsecutions.length === 0
                      ? "-- لا توجد نيابات جزئية مرتبطة مباشرة --"
                      : `-- حدد النيابة الجزئية (${filteredDistrictProsecutions.length} خيار) --`}
                  </option>
                  {filteredDistrictProsecutions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.parent ? `[تابعة لـ ${p.parent.name}]` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 6. ملخص الواقعة / موضوع الشكوى */}
          <div className="form-group">
            <label className="form-label form-label-required">ملخص الواقعة / موضوع الشكوى</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب ملخص الإجراء الطبي المتنازع بشأنه وما ورد بتقرير النيابة أو عريضة الشكوى..."
              className="form-input form-textarea text-xs"
            />
          </div>

          {/* أزرار الحفظ والإلغاء */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Link href="/dashboard/registration" prefetch={false}>
              <Button type="button" variant="secondary">
                إلغاء
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              loading={isPending}
              icon={<Save className="w-4 h-4" />}
            >
              قيد وحفظ السجل رسمياً
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
