"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Stethoscope, UserCheck, AlertTriangle, Building2, UserMinus } from "lucide-react";

interface DoctorOption {
  id: string;
  name: string;
  title?: string | null;
  employer: string;
  specialty?: { name: string } | null;
  active: boolean;
  phone?: string | null;
}

interface Reviewer {
  id: string;
  doctorId?: string | null;
  userId?: string | null;
  roleInTeam: "HEAD_EXAMINER" | "EXAMINER";
  status: "ASSIGNED" | "RECUSED" | "COMPLETED";
  recusalReason?: string | null;
  doctor?: {
    id: string;
    name: string;
    title?: string | null;
    employer: string;
    specialty?: { name: string } | null;
  } | null;
  user?: {
    id: string;
    fullName: string;
    employer?: string | null;
    specialty?: { name: string } | null;
  } | null;
}

export function ReviewTeamManager({
  caseId,
  currentUserId,
  respondentName,
  hospitalName,
  readOnly = false,
}: {
  caseId: string;
  currentUserId: string;
  respondentName?: string;
  hospitalName?: string;
  readOnly?: boolean;
}) {
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [roleInTeam, setRoleInTeam] = useState<"HEAD_EXAMINER" | "EXAMINER">("EXAMINER");

  const [recusalReason, setRecusalReason] = useState("");
  const [showRecusalModal, setShowRecusalModal] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [conflictAlert, setConflictAlert] = useState<string | null>(null);

  async function loadReviewers() {
    try {
      const res = await fetch(`/api/cases/${caseId}/reviewers`);
      if (res.ok) setReviewers(await res.json());
    } catch (err) {
      console.error(err);
    }
  }

  async function loadDoctors() {
    try {
      const res = await fetch("/api/subcommittee/doctors");
      if (res.ok) setAvailableDoctors(await res.json());
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadReviewers();
    loadDoctors();
  }, [caseId]);

  // فحص استباقي فوري لتعارض المصالح عند اختيار الطبيب من القائمة
  function handleDoctorChange(doctorId: string) {
    setSelectedDoctorId(doctorId);
    setConflictAlert(null);
    setError(null);
    if (!doctorId) return;

    const doc = availableDoctors.find((d) => d.id === doctorId);
    if (!doc) return;

    if (!doc.active) {
      setError(`تنبيه: الطبيب (${doc.name}) موقوف مؤقتاً في سجل اللجنة ولا يمكن إدراجه بفريق الفحص.`);
      return;
    }

    const targetEntity = respondentName || hospitalName;
    if (targetEntity && doc.employer) {
      const normEntity = targetEntity.trim().toLowerCase();
      const normEmp = doc.employer.trim().toLowerCase();

      if (normEntity === normEmp || normEmp.includes(normEntity) || normEntity.includes(normEmp)) {
        setConflictAlert(
          `تنبيه تعارض مصالح محظور: الطبيب يعمل لدى (${doc.employer}) وهي مطابقة لبيانات المشكو في حقه (${targetEntity}). سيتم حظر التعيين تلقائياً لضمان النزاهة وحياد التقرير.`
        );
      }
    }
  }

  async function handleAddReviewer(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedDoctorId) {
      setError("يرجى اختيار الطبيب الاستشاري");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/reviewers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctorId: selectedDoctorId,
            roleInTeam,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          if (data.conflictDetected) {
            setConflictAlert(data.details);
          } else {
            setError(data.error || "تعذر إضافة الطبيب لفريق الفحص");
          }
          return;
        }

        setSelectedDoctorId("");
        setConflictAlert(null);
        await loadReviewers();
      } catch (err: any) {
        setError(err.message || "حدث خطأ غير متوقع");
      }
    });
  }

  async function handleRecuse(reviewerId: string) {
    if (!recusalReason || recusalReason.trim().length < 5) {
      setError("يرجى كتابة سبب موضوعي للتنحي والاعتذار (5 أحرف على الأقل)");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/reviewers/${reviewerId}/recuse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recusalReason }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "تعذر تسجيل التنحي");
          return;
        }

        setShowRecusalModal(null);
        setRecusalReason("");
        await loadReviewers();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold font-heading text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-600" />
            <span>تشكيل لجنة الفحص والاستشاريين المكلفين بدراسة القضية</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-body">
            يختار المقرر أعضاء فريق الفحص من سجل استشاريي لجنته، ويفحص النظام آلياً جهة العمل لمنع تعارض المصالح
          </p>
        </div>

        <Link
          href="/dashboard/subcommittee/doctors"
          className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1.5 self-start sm:self-auto font-body"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>إدارة سجل أطباء اللجنة</span>
        </Link>
      </div>

      {/* تنبيهات الخطأ أو تعارض المصالح */}
      {conflictAlert && (
        <div className="alert-conflict text-xs">
          <span>{conflictAlert}</span>
        </div>
      )}

      {error && (
        <div className="alert-error text-xs">
          <span>{error}</span>
        </div>
      )}

      {/* نموذج اختيار وتعيين طبيب فاحص من سجل اللجنة (متاح فقط قبل الاعتماد) */}
      {readOnly ? (
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
          <span>فريق الفحص معتمد ومغلق للاطلاع فقط (تم رفع السجل للجنة العليا)</span>
        </div>
      ) : (
        <form onSubmit={handleAddReviewer} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="text-[11px] font-bold text-slate-700">إضافة عضو / مقرر فاحص لفريق دراسة القضية:</div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-6 form-group">
              <label className="form-label text-[11px]">الطبيب الاستشاري (من سجل اللجنة الفرعية):</label>
              <select
                value={selectedDoctorId}
                onChange={(e) => handleDoctorChange(e.target.value)}
                className="form-select text-xs"
              >
                <option value="">— اختر طبيباً من أطباء اللجنة —</option>
                {availableDoctors.map((doc) => (
                  <option
                    key={doc.id}
                    value={doc.id}
                    disabled={!doc.active}
                  >
                    {doc.name} {doc.title ? `(${doc.title})` : ""} — {doc.specialty?.name || "عام"} — {doc.employer} {!doc.active ? "[موقوف مؤقتاً]" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3 form-group">
              <label className="form-label text-[11px]">الصفة في الفريق:</label>
              <select
                value={roleInTeam}
                onChange={(e) => setRoleInTeam(e.target.value as any)}
                className="form-select text-xs"
              >
                <option value="HEAD_EXAMINER">مقرر فاحص رئيسي</option>
                <option value="EXAMINER">عضو فاحص</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={isPending || !selectedDoctorId || !!conflictAlert}
                className="btn-primary w-full text-xs py-2 font-bold disabled:opacity-50"
              >
                {isPending ? "جارٍ الفحص والإضافة..." : "إضافة للجنة الفحص"}
              </button>
            </div>
          </div>

          {availableDoctors.length === 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between font-body">
              <span>لم يتم قيد أطباء في سجل لجنتك الفرعية بعد.</span>
              <Link
                href="/dashboard/subcommittee/doctors"
                className="font-bold underline text-teal-600 hover:text-teal-700"
              >
                قيد أطباء الآن
              </Link>
            </div>
          )}
        </form>
      )}

      {/* قائمة أعضاء فريق الفحص المعينين للقضية */}
      <div className="space-y-2 pt-2">
        <h3 className="text-xs font-bold font-heading text-slate-800">
          أعضاء فريق الفحص المكلفون ({reviewers.filter((r) => r.status !== "RECUSED").length}):
        </h3>

        {reviewers.length === 0 ? (
          <p className="text-xs text-slate-400 p-4 bg-slate-50 rounded-xl text-center font-body">
            لم يتم تسمية أي فاحصين لهذه القضية حتى الآن. يرجى اختيار المقرر الفاحص والأعضاء.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {reviewers.map((rev) => {
              const docName = rev.doctor?.name || rev.user?.fullName || "طبيب فاحص";
              const docEmployer = rev.doctor?.employer || rev.user?.employer || "غير محدد";
              const docSpec = rev.doctor?.specialty?.name || rev.user?.specialty?.name || "تخصص معتمد";
              const isRecused = rev.status === "RECUSED";

              return (
                <div
                  key={rev.id}
                  className={`p-4 rounded-xl border text-xs flex flex-col justify-between space-y-2 font-body ${
                    isRecused
                      ? "bg-rose-50/50 border-rose-200 opacity-60"
                      : "bg-white border-slate-200 shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 font-heading">{docName}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            rev.roleInTeam === "HEAD_EXAMINER"
                              ? "bg-teal-600 text-white"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {rev.roleInTeam === "HEAD_EXAMINER" ? "مقرر فاحص" : "عضو فاحص"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>جهة العمل: {docEmployer}</span>
                      </p>
                      <p className="text-xs text-teal-700 font-medium flex items-center gap-1 mt-0.5">
                        <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                        <span>التخصص: {docSpec}</span>
                      </p>
                    </div>

                    <div>
                      {isRecused ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-medium border border-rose-200">
                          تنحى واعتذر
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
                          مكلف بالفحص
                        </span>
                      )}
                    </div>
                  </div>

                  {/* إمكانية تسجيل اعتذار / تنحي (متاح فقط قبل الاعتماد) */}
                  {!isRecused && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-mono">
                        تاريخ التكليف: {new Date().toLocaleDateString("en-GB")}
                      </span>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => setShowRecusalModal(rev.id)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-semibold hover:underline"
                        >
                          اعتذار / تنحي
                        </button>
                      )}
                    </div>
                  )}

                  {isRecused && rev.recusalReason && (
                    <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                      <strong>سبب التنحي: </strong>{rev.recusalReason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* نافذة تسجيل الاعتذار والتنحي */}
      {showRecusalModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 text-right">
            <h3 className="text-sm font-bold font-heading text-rose-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>تسجيل تنحي واعتذار الطبيب عن فحص القضية</span>
            </h3>
            <p className="text-xs text-slate-600">
              يرجى إثبات سبب الاعتذار والتنحي رسمياً (مثل: صلة قرابة، معرفة سابقة بأطراف النزاع، تعارض مصالح مستجد):
            </p>

            <textarea
              rows={3}
              value={recusalReason}
              onChange={(e) => setRecusalReason(e.target.value)}
              placeholder="اكتب سبب التنحي والاعتذار هنا..."
              className="form-input form-textarea text-xs min-h-[90px]"
            />

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowRecusalModal(null)}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleRecuse(showRecusalModal)}
                disabled={isPending || !recusalReason.trim()}
                className="btn-danger text-xs px-4 py-1.5 font-bold"
              >
                {isPending ? "جارٍ الحفظ..." : "تأكيد التنحي"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
