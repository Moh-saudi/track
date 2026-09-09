"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/formatters";
import {
  ShieldAlert,
  Lock,
  Unlock,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  FileText,
  X,
  Send,
  Building,
  Scale,
  Search,
  Filter,
  Clock,
  Eye,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface CaseItem {
  id: string;
  caseNumber: string;
  caseYear: number;
  incomingDate?: string | null;
  complainantName: string | null;
  hospitalName: string | null;
  respondentName: string | null;
  status: string;
  assignedAt: string | null;
  isRiskOverridden: boolean;
  riskOverrideReason: string | null;
  riskOverrideDocument: string | null;
  riskOverriddenAt: string | null;
  subCommittee?: { id: string; name: string } | null;
  supremeDecisions: Array<{
    decisionType: string;
    meetingDate: string;
    decisionDetails: string;
  }>;
  actions: Array<{
    receivedDate: string | null;
    meetingDate: string | null;
    reportDate: string | null;
  }>;
}

interface Props {
  cases: CaseItem[];
}

const STATUS_LABELS: Record<string, { label: string; variant: "slate" | "amber" | "sky" | "emerald" | "rose" }> = {
  REGISTERED: { label: "بانتظار التوجيه", variant: "slate" },
  UNDER_SUBCOMMITTEE_REVIEW: { label: "قيد دراسة اللجنة الفرعية", variant: "amber" },
  PENDING_SUPREME_REVIEW: { label: "بانتظار اعتماد اللجنة العليا", variant: "sky" },
  APPROVED: { label: "معتمد (قرار نهائي)", variant: "emerald" },
  REFERRED_FOR_REVIEW: { label: "محال لإعادة الدراسة", variant: "rose" },
  CLOSED: { label: "مغلق", variant: "slate" },
};

export function RiskModeClient({ cases }: Props) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // الفلاتر والبحث
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // حالة نافذة تصحيح المسار
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>("UNDER_SUBCOMMITTEE_REVIEW");
  const [reason, setReason] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [overriding, setOverriding] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overrideSuccess, setOverrideSuccess] = useState(false);

  useEffect(() => {
    const hasCookie = document.cookie
      .split("; ")
      .some((row) => row.startsWith("risk_mode_session="));
    setIsAuthenticated(hasCookie);
  }, []);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/admin/risk-mode/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "كلمة المرور غير صحيحة");
      }

      setIsAuthenticated(true);
      router.refresh();
    } catch (err: any) {
      setAuthError(err.message || "حدث خطأ أثناء التحقق");
    } finally {
      setVerifying(false);
    }
  }

  function handleExit() {
    document.cookie =
      "risk_mode_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    setIsAuthenticated(false);
    router.refresh();
  }

  async function handleOverrideSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCase) return;

    setOverriding(true);
    setOverrideError(null);

    try {
      const res = await fetch(`/api/cases/${selectedCase.id}/risk-override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStatus,
          riskOverrideReason: reason,
          riskOverrideDocument: docNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "تعذر تصحيح مسار السجل");
      }

      setOverrideSuccess(true);
      setTimeout(() => {
        setSelectedCase(null);
        setOverrideSuccess(false);
        setReason("");
        setDocNumber("");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setOverrideError(err.message || "حدث خطأ أثناء إعادة فتح السجل");
    } finally {
      setOverriding(false);
    }
  }

  // تصفية القضايا
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // فلتر التبويب
      if (activeFilter === "OVERDUE") {
        const isOverdue =
          c.status === "REFERRED_FOR_REVIEW" ||
          (c.assignedAt && now - new Date(c.assignedAt).getTime() > thirtyDaysMs && c.status !== "APPROVED" && c.status !== "CLOSED");
        if (!isOverdue) return false;
      } else if (activeFilter === "OVERRIDDEN") {
        if (!c.isRiskOverridden) return false;
      } else if (activeFilter === "APPROVED") {
        if (c.status !== "APPROVED") return false;
      } else if (activeFilter === "SUBCOMMITTEE") {
        if (c.status !== "UNDER_SUBCOMMITTEE_REVIEW") return false;
      } else if (activeFilter === "SUPREME") {
        if (c.status !== "PENDING_SUPREME_REVIEW") return false;
      }

      // فلتر البحث
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const num = String(c.caseNumber).toLowerCase();
        const year = String(c.caseYear);
        const name = c.complainantName?.toLowerCase() || "";
        const comm = c.subCommittee?.name?.toLowerCase() || "";
        return num.includes(q) || year.includes(q) || name.includes(q) || comm.includes(q);
      }

      return true;
    });
  }, [cases, activeFilter, searchTerm, now, thirtyDaysMs]);

  // في حال لم يتم المصادقة بعد
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-lg text-center space-y-5 font-body">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold font-heading text-slate-900">
            بوابة غرفة عمليات إدارة المخاطر وتصحيح المسار
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            منطقة حوكمية استثنائية مشددة تتطلب تأكيد كلمة المرور للمصادقة وتوثيق جلسة العمل في السجل الرقابي، وتتيح التدخل الطارئ وتصحيح مسار القضايا المعيبة بموجب تأشيرات وسندات رسمية.
          </p>
        </div>

        {authError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
            {authError}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4 text-xs">
          <div className="text-right">
            <label className="block text-slate-700 font-semibold mb-1">
              تأكيد كلمة المرور لتفعيل وضع المخاطر
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="أدخل كلمة المرور الحالية للتأكيد..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pr-9 pl-4 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:border-rose-600 shadow-2xs font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={verifying}
            className="w-full h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors inline-flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
          >
            <Unlock className="w-4 h-4" />
            <span>{verifying ? "جاري التحقق الأمني..." : "تأكيد وتفعيل وضع إدارة المخاطر"}</span>
          </button>
        </form>
      </div>
    );
  }

  // عند تفعيل وضع إدارة المخاطر
  return (
    <div className="space-y-6 font-body">
      {/* بنر إشعار وضع إدارة المخاطر النشط */}
      <div className="p-5 rounded-3xl bg-rose-50/80 border-2 border-rose-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold font-heading text-rose-950">
              أنت الآن داخل غرفة عمليات إدارة المخاطر وتصحيح المسار (Break-Glass Active)
            </h3>
            <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
              يمكنك التدخل الاستثنائي واستدراك مسار السجلات المعتمدة أو المتعثرة. تذكر أن كل تدخل يُسجَّل فورياً بالسند والمبرر في سجل التدقيق الرقابي.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExit}
          className="px-4 py-2 rounded-xl bg-white border border-rose-300 text-rose-800 hover:bg-rose-100/60 transition-colors text-xs font-bold shrink-0 shadow-2xs"
        >
          إنهاء وضع المخاطر
        </button>
      </div>

      {/* شريط التبويبات والفلترة الرقابية */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl">
        {[
          { id: "ALL", label: `كافة السجلات (${cases.length})` },
          { id: "OVERDUE", label: "قضايا متأخرة (خطر التعثر)" },
          { id: "OVERRIDDEN", label: "تم تصحيح مسارها استثنائياً" },
          { id: "APPROVED", label: "معتمدة نهائياً (جاهزة للاستدراك)" },
          { id: "SUBCOMMITTEE", label: "قيد دراسة اللجنة الفرعية" },
          { id: "SUPREME", label: "بانتظار اعتماد اللجنة العليا" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all font-heading ${
              activeFilter === tab.id
                ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* جدول السجلات القابلة للمتابعة وتصحيح المسار */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-teal-600" />
              <span>جدول السجلات الخاضعة للرقابة وإدارة المخاطر</span>
            </h3>
            <p className="text-xs text-slate-500 font-body mt-0.5">
              عرض {filteredCases.length} سجل متاح للاستدراك وتصحيح المسار الإجرائي
            </p>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالرقم، السنة، الشاكي، أو اللجنة..."
              className="w-full h-10 pr-9 pl-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-600 focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-600 font-heading">
                <th className="p-3">رقم وسنة السجل</th>
                <th className="p-3">مقدم الشكوى</th>
                <th className="p-3">اللجنة الفرعية</th>
                <th className="p-3">المرحلة الحالية</th>
                <th className="p-3">مؤشر المخاطرة</th>
                <th className="p-3">موقف التدخل السابق</th>
                <th className="p-3 text-center">الإجراء الاستثنائي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-body">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    لا توجد سجلات تطابق معايير الفلترة المحددة
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => {
                  const statusInfo = STATUS_LABELS[c.status] || { label: c.status, variant: "slate" };
                  const isOverdue =
                    c.status === "REFERRED_FOR_REVIEW" ||
                    (c.assignedAt && now - new Date(c.assignedAt).getTime() > thirtyDaysMs && c.status !== "APPROVED" && c.status !== "CLOSED");

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {c.caseNumber} / {c.caseYear}
                        {c.incomingDate && (
                          <span className="text-[10px] text-teal-800 bg-teal-50 px-1 py-0.2 rounded mr-1 block">
                            وارد: {new Date(c.incomingDate).toLocaleDateString("ar-EG")}
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-slate-800">
                        {c.complainantName || "—"}
                      </td>

                      <td className="p-3 text-slate-700">
                        {c.subCommittee?.name || "بانتظار التوجيه"}
                      </td>

                      <td className="p-3">
                        <Badge variant={statusInfo.variant} size="sm">
                          {statusInfo.label}
                        </Badge>
                      </td>

                      <td className="p-3">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>تجاوز الإطار الزمني</span>
                          </span>
                        ) : (
                          <span className="text-emerald-700 text-[11px] font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>ضمن المعدل الطبيعي</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        {c.isRiskOverridden ? (
                          <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-0.5">
                            <span className="font-bold block">مُصحح المسار:</span>
                            <span className="text-[10px] text-amber-700 block">سند: {c.riskOverrideDocument}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCase(c);
                            setTargetStatus(
                              c.status === "APPROVED"
                                ? "UNDER_SUBCOMMITTEE_REVIEW"
                                : "PENDING_SUPREME_REVIEW"
                            );
                            setReason("");
                            setDocNumber("");
                            setOverrideError(null);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>تصحيح المسار</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── نافذة منبثقة لتنفيذ قرار تصحيح المسار الاستثنائي ─── */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-body">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-heading text-slate-900">
                    استدراك وتصحيح مسار السجل
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    سجل رقم: {selectedCase.caseNumber} لسنة {selectedCase.caseYear}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCase(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {overrideSuccess ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-bold text-emerald-900 font-heading">
                  تم تصحيح مسار السجل وتوثيق الإجراء بنجاح
                </h4>
                <p className="text-xs text-emerald-700">
                  تم قيد المذكرة الإدارية بسجل التدقيق الأمني وتوجيه السجل إلى المسار الجديد
                </p>
              </div>
            ) : (
              <form onSubmit={handleOverrideSubmit} className="space-y-4 text-xs">
                {overrideError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                    {overrideError}
                  </div>
                )}

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">مقدم الشكوى:</span>
                    <span className="font-bold text-slate-900">{selectedCase.complainantName || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">اللجنة المقيدة:</span>
                    <span className="font-bold text-slate-900">{selectedCase.subCommittee?.name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">الحالة الراهنة:</span>
                    <span className="font-bold text-slate-900">{selectedCase.status}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    المسار الإجرائي الجديد المراد توجيه السجل إليه
                  </label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:border-rose-600"
                  >
                    <option value="UNDER_SUBCOMMITTEE_REVIEW">
                      إعادة للدراسة باللجنة الفرعية المختصة (UNDER_SUBCOMMITTEE_REVIEW)
                    </option>
                    <option value="PENDING_SUPREME_REVIEW">
                      إعادة للعرض والمراجعة باللجنة العليا (PENDING_SUPREME_REVIEW)
                    </option>
                    <option value="REFERRED_FOR_REVIEW">
                      إحالة رسمية لإعادة الفحص بلجنة أخرى (REFERRED_FOR_REVIEW)
                    </option>
                    <option value="CLOSED">
                      حفظ أو إغلاق إداري طارئ (CLOSED)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    رقم وتاريخ السند الإداري / تأشيرة القرار الآمر بالتصحيح
                  </label>
                  <input
                    type="text"
                    required
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder="مثال: قرار وزاري رقم 45 لسنة 2026 أو مذكرة رقم 12"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white focus:border-rose-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    التسبيب الإداري والمبرر القانوني لفتح وتصحيح المسار
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="بيان الخطأ المادي أو المستند الطبي الطارئ الذي استوجب إعادة فتح السجل..."
                    className="w-full p-3 rounded-xl border border-slate-300 bg-white focus:border-rose-600 leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedCase(null)}
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={overriding}
                    disabled={overriding}
                  >
                    تأكيد وتوجيه السجل
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
