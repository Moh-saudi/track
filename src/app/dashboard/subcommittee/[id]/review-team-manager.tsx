"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";

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
  hospitalName,
}: {
  caseId: string;
  currentUserId: string;
  hospitalName?: string;
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
  function handleDoctorChange(docId: string) {
    setSelectedDoctorId(docId);
    setError(null);
    setConflictAlert(null);

    if (!docId) return;

    const doc = availableDoctors.find((d) => d.id === docId);
    if (!doc) return;

    if (!doc.active) {
      setError(`تنبيه: الطبيب (${doc.name}) موقوف مؤقتاً في سجل اللجنة ولا يمكن إدراجه بفريق الفحص.`);
      return;
    }

    if (hospitalName && doc.employer) {
      const normHosp = hospitalName.trim().toLowerCase();
      const normEmp = doc.employer.trim().toLowerCase();

      if (normHosp === normEmp || normEmp.includes(normHosp) || normHosp.includes(normEmp)) {
        setConflictAlert(
          `⚠️ تنبيه تعارض مصالح محظور: الطبيب يعمل لدى (${doc.employer}) وهي نفس المنشأة المشكو في حقها (${hospitalName}). سيتم حظر التعيين تلقائياً لضمان النزاهة وحياد التقرير.`
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
    <div className="card border-slate-200 space-y-4">
      <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-black text-slate-900 flex items-center gap-2">
            <span>🩺</span>
            <span>تشكيل لجنة الفحص والاستشاريين المكلفين بدراسة القضية</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            يختار المقرر أعضاء فريق الفحص من سجل استشاريي لجنته، ويفحص النظام آلياً جهة العمل لمنع تعارض المصالح
          </p>
        </div>

        <Link
          href="/dashboard/subcommittee/doctors"
          className="text-[11px] font-bold text-[#1F4E79] hover:underline flex items-center gap-1 self-start sm:self-auto"
        >
          <span>👨‍⚕️</span>
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

      {/* نموذج اختيار وتعيين طبيب فاحص من سجل اللجنة */}
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
          <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center justify-between">
            <span>لم يتم قيد أطباء في سجل لجنتك الفرعية بعد.</span>
            <Link
              href="/dashboard/subcommittee/doctors"
              className="font-bold underline text-[#1F4E79]"
            >
              قيد أطباء الآن
            </Link>
          </div>
        )}
      </form>

      {/* قائمة أعضاء فريق الفحص المعينين للقضية */}
      <div className="space-y-2 pt-2">
        <h3 className="text-xs font-black text-slate-800">
          أعضاء فريق الفحص المكلفون ({reviewers.filter((r) => r.status !== "RECUSED").length}):
        </h3>

        {reviewers.length === 0 ? (
          <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-lg text-center">
            لم يتم تسمية أي فاحصين لهذه القضية حتى الآن. يرجى اختيار المقرر الفاحص والأعضاء.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {reviewers.map((rev) => {
              const docName = rev.doctor?.name || rev.user?.fullName || "طبيب فاحص";
              const docEmployer = rev.doctor?.employer || rev.user?.employer || "غير محدد";
              const docSpec = rev.doctor?.specialty?.name || rev.user?.specialty?.name || "تخصص معتمد";
              const isRecused = rev.status === "RECUSED";

              return (
                <div
                  key={rev.id}
                  className={`p-3 rounded-xl border text-xs flex flex-col justify-between space-y-2 ${
                    isRecused
                      ? "bg-rose-50/50 border-rose-200 opacity-60"
                      : "bg-white border-slate-200 shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{docName}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                            rev.roleInTeam === "HEAD_EXAMINER"
                              ? "bg-[#1F4E79] text-white"
                              : "bg-slate-100 text-slate-700 border"
                          }`}
                        >
                          {rev.roleInTeam === "HEAD_EXAMINER" ? "مقرر فاحص" : "عضو فاحص"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        🏥 جهة العمل: {docEmployer}
                      </p>
                      <p className="text-[10px] text-blue-700 font-semibold">
                        🩺 التخصص: {docSpec}
                      </p>
                    </div>

                    <div>
                      {isRecused ? (
                        <span className="badge bg-rose-100 text-rose-800 border-rose-300">
                          تنحى واعتذر
                        </span>
                      ) : (
                        <span className="badge bg-emerald-50 text-emerald-700 border-emerald-200">
                          مكلف بالفحص
                        </span>
                      )}
                    </div>
                  </div>

                  {/* إمكانية تسجيل اعتذار / تنحي */}
                  {!isRecused && (
                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-mono">
                        تاريخ التكليف: {new Date().toLocaleDateString("en-GB")}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowRecusalModal(rev.id)}
                        className="text-[10px] text-rose-600 hover:text-rose-800 font-bold hover:underline"
                      >
                        اعتذار / تنحي
                      </button>
                    </div>
                  )}

                  {isRecused && rev.recusalReason && (
                    <p className="text-[10px] text-rose-700 bg-rose-50 p-1.5 rounded border border-rose-200">
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 text-right">
            <h3 className="text-sm font-black text-rose-900 flex items-center gap-1.5">
              <span>⚠️</span>
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
              className="form-input text-xs"
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
