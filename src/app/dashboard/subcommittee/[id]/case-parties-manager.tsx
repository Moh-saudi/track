"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserCheck,
  UserPlus,
  Phone,
  CreditCard,
  FileText,
  Save,
  Plus,
  Trash2,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export const MEDICAL_PROFESSIONS = [
  "طبيب بشري",
  "صيدلي",
  "طبيب أسنان",
  "طبيب علاج طبيعي",
  "ممرض",
  "فني",
  "أخرى",
] as const;

export interface Party {
  name: string;
  phone?: string | null;
  nationalId?: string | null;
  medicalProfession?: string | null;
  notes?: string | null;
}

export interface Attendee {
  id?: string;
  name: string;
  phone?: string | null;
  role?: string | null;
  nationalId?: string | null;
  medicalProfession?: string | null;
  notes?: string | null;
  isSummoned?: boolean;
}

interface CasePartiesManagerProps {
  caseId: string;
  initialComplainants: Party[];
  initialRespondents: Party[];
  initialAttendees: Attendee[];
  readOnly?: boolean;
}

export function CasePartiesManager({
  caseId,
  initialComplainants,
  initialRespondents,
  initialAttendees,
  readOnly = false,
}: CasePartiesManagerProps) {
  const router = useRouter();

  const [complainants, setComplainants] = useState<Party[]>(
    initialComplainants.length > 0 ? initialComplainants : [{ name: "", phone: "" }]
  );
  const [respondents, setRespondents] = useState<Party[]>(
    initialRespondents.length > 0 ? initialRespondents : [{ name: "", phone: "" }]
  );
  const [attendees, setAttendees] = useState<Attendee[]>(initialAttendees || []);

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // تحديث بيانات الشاكين
  function updateComplainant(index: number, field: keyof Party, value: string) {
    setComplainants((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  // تحديث بيانات المشكو في حقهم
  function updateRespondent(index: number, field: keyof Party, value: string) {
    setRespondents((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  // إدارة المدعوين والمستدعين الجدد للجلسة
  function addAttendee() {
    setAttendees((prev) => [
      ...prev,
      {
        id: "att_" + Date.now(),
        name: "",
        phone: "",
        role: "شاهد / مدعو للجلسة",
        nationalId: "",
        medicalProfession: "",
        notes: "",
        isSummoned: true,
      },
    ]);
  }

  function removeAttendee(index: number) {
    setAttendees((prev) => prev.filter((_, i) => i !== index));
  }

  function updateAttendee(index: number, field: keyof Attendee, value: any) {
    setAttendees((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  async function handleSave() {
    if (readOnly) return;
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      // تصفية السجلات الفارغة
      const validComplainants = complainants.filter((c) => c.name && c.name.trim().length > 0);
      const validRespondents = respondents.filter((r) => r.name && r.name.trim().length > 0);
      const validAttendees = attendees.filter((a) => a.name && a.name.trim().length > 0);

      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complainants: validComplainants,
          respondents: validRespondents,
          sessionAttendees: validAttendees,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "تعذر حفظ بيانات الأطراف والمدعوين");
      }

      setSuccessMessage("تم حفظ وتحديث بيانات الأطراف والرقم القومي والمستدعين بنجاح");
      router.refresh();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ غير متوقع أثناء الحفظ");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 font-body">
      {/* العنوان ورأس البطاقة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-heading text-slate-900">
              بيانات الأطراف والشاكين والمشكو في حقهم والمستدعين للجلسة
            </h2>
            <p className="text-xs text-slate-500">
              توثيق الأرقام القومية، المهن الطبية، الملاحظات، وإضافة مستدعين جدد لجلسة التحقيق والمداولة.
            </p>
          </div>
        </div>

        {!readOnly && (
          <Button
            type="button"
            onClick={handleSave}
            loading={isSaving}
            variant="primary"
            size="sm"
            icon={<Save className="w-4 h-4" />}
          >
            حفظ تحديثات الأطراف
          </Button>
        )}
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. الشاكون (المجني عليهم / المبلغون) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-600"></span>
            <h3 className="text-xs font-bold text-slate-900 font-heading">
              الشاكي / المبلّغ ({complainants.length})
            </h3>
          </div>
          <Badge variant="teal" size="sm">
            طرف شاكي
          </Badge>
        </div>

        <div className="space-y-3">
          {complainants.map((item, idx) => (
            <div
              key={idx}
              className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-xs font-bold text-slate-700">
                  شاكي #{idx + 1}: {item.name || "لم يُحدد الاسم بعد"}
                </span>
                {idx === 0 && (
                  <Badge variant="slate" size="sm">
                    الشاكي الرئيسي
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="form-label text-[11px] text-slate-600">الاسم بالكامل</label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={item.name}
                    onChange={(e) => updateComplainant(idx, "name", e.target.value)}
                    placeholder="اسم الشاكي..."
                    className="form-input text-xs h-9 bg-white"
                  />
                </div>

                <div>
                  <label className="form-label text-[11px] text-slate-600">رقم الهاتف</label>
                  <div className="relative">
                    <input
                      type="tel"
                      disabled={readOnly}
                      value={item.phone || ""}
                      onChange={(e) => updateComplainant(idx, "phone", e.target.value)}
                      placeholder="الهاتف..."
                      className="form-input text-xs h-9 font-mono pl-7 bg-white"
                      dir="ltr"
                    />
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="form-label text-[11px] text-slate-600">الرقم القومي (14 رقم)</label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={14}
                      disabled={readOnly}
                      value={item.nationalId || ""}
                      onChange={(e) => updateComplainant(idx, "nationalId", e.target.value)}
                      placeholder="الرقم القومي للشاكي..."
                      className="form-input text-xs h-9 font-mono pl-7 bg-white"
                      dir="ltr"
                    />
                    <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label text-[11px] text-slate-600">ملاحظات خاصة بالشاكي</label>
                <input
                  type="text"
                  disabled={readOnly}
                  value={item.notes || ""}
                  onChange={(e) => updateComplainant(idx, "notes", e.target.value)}
                  placeholder="أي ملاحظات تخص الشاكي أو صفته القانونية (وكيل، وريث، ولي أمر...)"
                  className="form-input text-xs h-9 bg-white"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. المشكو في حقهم (الأطباء / المنشآت الطبية) */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-600"></span>
            <h3 className="text-xs font-bold text-slate-900 font-heading">
              المشكو في حقهم ({respondents.length})
            </h3>
          </div>
          <Badge variant="amber" size="sm">
            طبيب / منشأة طبية
          </Badge>
        </div>

        <div className="space-y-3">
          {respondents.map((item, idx) => (
            <div
              key={idx}
              className="p-4 bg-amber-50/30 border border-amber-200/70 rounded-xl space-y-3"
            >
              <div className="flex items-center justify-between border-b border-amber-200/50 pb-2">
                <span className="text-xs font-bold text-amber-950">
                  مشكو في حقه #{idx + 1}: {item.name || "لم يُحدد الاسم بعد"}
                </span>
                {item.medicalProfession && (
                  <Badge variant="sky" size="sm">
                    {item.medicalProfession}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="form-label text-[11px] text-slate-600">اسم المشكو في حقه</label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={item.name}
                    onChange={(e) => updateRespondent(idx, "name", e.target.value)}
                    placeholder="اسم الطبيب / المنشأة..."
                    className="form-input text-xs h-9 bg-white"
                  />
                </div>

                <div>
                  <label className="form-label text-[11px] text-slate-600">مهنة المشكو في حقه</label>
                  <select
                    disabled={readOnly}
                    value={item.medicalProfession || ""}
                    onChange={(e) => updateRespondent(idx, "medicalProfession", e.target.value)}
                    className="form-select text-xs h-9 bg-white"
                  >
                    <option value="">-- حدد المهنة الطبية --</option>
                    {MEDICAL_PROFESSIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label text-[11px] text-slate-600">رقم الهاتف</label>
                  <div className="relative">
                    <input
                      type="tel"
                      disabled={readOnly}
                      value={item.phone || ""}
                      onChange={(e) => updateRespondent(idx, "phone", e.target.value)}
                      placeholder="الهاتف..."
                      className="form-input text-xs h-9 font-mono pl-7 bg-white"
                      dir="ltr"
                    />
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="form-label text-[11px] text-slate-600">الرقم القومي (14 رقم)</label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={14}
                      disabled={readOnly}
                      value={item.nationalId || ""}
                      onChange={(e) => updateRespondent(idx, "nationalId", e.target.value)}
                      placeholder="الرقم القومي..."
                      className="form-input text-xs h-9 font-mono pl-7 bg-white"
                      dir="ltr"
                    />
                    <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label text-[11px] text-slate-600">ملاحظات المشكو في حقه</label>
                <input
                  type="text"
                  disabled={readOnly}
                  value={item.notes || ""}
                  onChange={(e) => updateRespondent(idx, "notes", e.target.value)}
                  placeholder="ملاحظات حول جهة العمل، التخصص الدقيق، أو حالة الإخطار..."
                  className="form-input text-xs h-9 bg-white"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. مدعوون ومستدعون آخرون للجلسة لم يكونوا مقيدين مسبقاً */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <h3 className="text-xs font-bold text-slate-900 font-heading">
              المستدعون والمدعوون الإضافيون لجلسة الفحص ({attendees.length})
            </h3>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={addAttendee}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ استدعاء مدعو جديد للجلسة</span>
            </button>
          )}
        </div>

        {attendees.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center text-xs text-slate-500">
            لم يتم تسجيل أي مدعوين أو شهود إضافيين للجلسة حتى الآن. يمكنك استدعاء أطراف إضافية متى تطلبت المداولة ذلك.
          </div>
        ) : (
          <div className="space-y-3">
            {attendees.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-4 bg-blue-50/20 border border-blue-200/60 rounded-xl space-y-3"
              >
                <div className="flex items-center justify-between border-b border-blue-200/40 pb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="sky" size="sm">
                      تم استدعاؤه للجلسة
                    </Badge>
                    <span className="text-xs font-bold text-slate-800">
                      {item.name || "مدعو جديد"}
                    </span>
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removeAttendee(idx)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors text-xs flex items-center gap-1"
                      title="إلغاء هذا الاستدعاء"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="form-label text-[11px] text-slate-600">الاسم بالكامل</label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={item.name}
                      onChange={(e) => updateAttendee(idx, "name", e.target.value)}
                      placeholder="اسم المدعو / الشاهد..."
                      className="form-input text-xs h-9 bg-white"
                    />
                  </div>

                  <div>
                    <label className="form-label text-[11px] text-slate-600">صفة الاستدعاء / النوع</label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={item.role || ""}
                      onChange={(e) => updateAttendee(idx, "role", e.target.value)}
                      placeholder="مثال: شاهد واقعة، خبير استشاري، ممرض مساعد..."
                      className="form-input text-xs h-9 bg-white"
                    />
                  </div>

                  <div>
                    <label className="form-label text-[11px] text-slate-600">المهنة الطبية (إن انطبق)</label>
                    <select
                      disabled={readOnly}
                      value={item.medicalProfession || ""}
                      onChange={(e) => updateAttendee(idx, "medicalProfession", e.target.value)}
                      className="form-select text-xs h-9 bg-white"
                    >
                      <option value="">-- غير مهني طبي / أخرى --</option>
                      {MEDICAL_PROFESSIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label text-[11px] text-slate-600">رقم الهاتف</label>
                    <div className="relative">
                      <input
                        type="tel"
                        disabled={readOnly}
                        value={item.phone || ""}
                        onChange={(e) => updateAttendee(idx, "phone", e.target.value)}
                        placeholder="الهاتف..."
                        className="form-input text-xs h-9 font-mono pl-7 bg-white"
                        dir="ltr"
                      />
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label text-[11px] text-slate-600">الرقم القومي (14 رقم)</label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={14}
                        disabled={readOnly}
                        value={item.nationalId || ""}
                        onChange={(e) => updateAttendee(idx, "nationalId", e.target.value)}
                        placeholder="الرقم القومي..."
                        className="form-input text-xs h-9 font-mono pl-7 bg-white"
                        dir="ltr"
                      />
                      <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="form-label text-[11px] text-slate-600">ملاحظات الاستدعاء وتاريخ الإخطار</label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={item.notes || ""}
                      onChange={(e) => updateAttendee(idx, "notes", e.target.value)}
                      placeholder="ملاحظات الاستدعاء، وسيلة الإخطار، أو حضور الجلسة..."
                      className="form-input text-xs h-9 bg-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <Button
            type="button"
            onClick={handleSave}
            loading={isSaving}
            variant="primary"
            icon={<Save className="w-4 h-4" />}
          >
            حفظ كافة بيانات الأطراف والمستدعين
          </Button>
        </div>
      )}
    </div>
  );
}
