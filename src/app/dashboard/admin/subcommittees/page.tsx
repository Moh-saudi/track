"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";

interface SubCommittee {
  id: string;
  name: string;
  code: string;
  scope?: string;
  active: boolean;
  _count?: { cases: number; members: number };
}

interface Specialty {
  id: string;
  name: string;
  code?: string;
  active: boolean;
}

export default function AdminSubCommitteesPage() {
  const [subCommittees, setSubCommittees] = useState<SubCommittee[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [activeTab, setActiveTab] = useState<"COMMITTEES" | "SPECIALTIES">("COMMITTEES");

  const [scName, setScName] = useState("");
  const [scCode, setScCode] = useState("");
  const [scScope, setScScope] = useState("");

  const [specName, setSpecName] = useState("");
  const [specCode, setSpecCode] = useState("");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadData() {
    try {
      const [scRes, specRes] = await Promise.all([
        fetch("/api/subcommittees"),
        fetch("/api/specialties"),
      ]);
      if (scRes.ok) setSubCommittees(await scRes.json());
      if (specRes.ok) setSpecialties(await specRes.json());
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAddSubCommittee(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await fetch("/api/subcommittees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: scName, code: scCode, scope: scScope }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "تعذّر إضافة الجهة");
        return;
      }

      setScName("");
      setScCode("");
      setScScope("");
      setSuccess("تمت إضافة الجهة / اللجنة الفرعية بنجاح");
      loadData();
    });
  }

  async function handleAddSpecialty(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await fetch("/api/specialties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: specName, code: specCode }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "تعذّر إضافة التخصص الطبي");
        return;
      }

      setSpecName("");
      setSpecCode("");
      setSuccess("تمت إضافة التخصص الطبي بنجاح");
      loadData();
    });
  }

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            إدارة اللجان الفرعية والجهات المعتمدة والتخصصات الطبية
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            الـ 16 جهة المنصوص عليها في القرار الرسمي وقائمة التخصصات المعيارية
          </p>
        </div>

        <Link href="/dashboard/admin" className="btn-secondary text-xs">
          عودة للإدارة
        </Link>
      </div>

      {/* التبويبات */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("COMMITTEES")}
          className={`px-4 py-2.5 font-bold text-xs border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "COMMITTEES"
              ? "border-[#1F4E79] text-[#1F4E79] bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>🏛️ الجهات واللجان المعتمدة</span>
          <span className="badge bg-slate-100 text-slate-700">
            {subCommittees.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("SPECIALTIES")}
          className={`px-4 py-2.5 font-bold text-xs border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "SPECIALTIES"
              ? "border-[#1F4E79] text-[#1F4E79] bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>🩺 التخصصات الطبية</span>
          <span className="badge bg-slate-100 text-slate-700">
            {specialties.length}
          </span>
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      {/* ─── تبويب اللجان الـ 16 ─── */}
      {activeTab === "COMMITTEES" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card space-y-4 h-fit">
            <h2 className="text-xs font-black text-slate-900 border-b pb-2">
              ➕ إضافة جهة / لجنة فرعية جديدة
            </h2>

            <form onSubmit={handleAddSubCommittee} className="space-y-3">
              <div className="form-group">
                <label className="form-label form-label-required">اسم الجهة أو الكلية</label>
                <input
                  type="text"
                  required
                  value={scName}
                  onChange={(e) => setScName(e.target.value)}
                  placeholder="مثال: كلية طب جامعة بني سويف"
                  className="form-input text-xs"
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">كود الجهة</label>
                <input
                  type="text"
                  required
                  value={scCode}
                  onChange={(e) => setScCode(e.target.value)}
                  placeholder="مثال: SC-17"
                  className="form-input text-xs"
                />
              </div>

              <div className="form-group">
                <label className="form-label">النطاق الجغرافي / المؤسسي</label>
                <input
                  type="text"
                  value={scScope}
                  onChange={(e) => setScScope(e.target.value)}
                  placeholder="مثال: إقليم شمال الصعيد"
                  className="form-input text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="btn-primary w-full text-xs"
              >
                {isPending ? "جارٍ الإضافة..." : "حفظ الجهة واعتمادها"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 card p-0 overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-800">
              <span>قائمة الجهات المعتمدة في القرار الرسمي</span>
              <span className="text-slate-500">{subCommittees.length} جهة</span>
            </div>

            <div className="table-wrapper border-0 rounded-none shadow-none">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>م</th>
                    <th>اسم الجهة / اللجنة</th>
                    <th>النطاق</th>
                    <th>القضايا المسندة</th>
                    <th>الأعضاء</th>
                  </tr>
                </thead>
                <tbody>
                  {subCommittees.map((sc, idx) => (
                    <tr key={sc.id}>
                      <td className="font-mono text-slate-500 text-xs">
                        {idx + 1}
                      </td>
                      <td className="font-bold text-slate-800 text-xs">
                        {sc.name}
                      </td>
                      <td className="text-xs text-slate-600">
                        {sc.scope || "—"}
                      </td>
                      <td className="text-xs font-bold text-slate-700">
                        {sc._count?.cases || 0}
                      </td>
                      <td className="text-xs font-bold text-slate-700">
                        {sc._count?.members || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── تبويب التخصصات الطبية ─── */}
      {activeTab === "SPECIALTIES" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card space-y-4 h-fit">
            <h2 className="text-xs font-black text-slate-900 border-b pb-2">
              ➕ إضافة تخصص طبي جديد
            </h2>

            <form onSubmit={handleAddSpecialty} className="space-y-3">
              <div className="form-group">
                <label className="form-label form-label-required">اسم التخصص الطبي</label>
                <input
                  type="text"
                  required
                  value={specName}
                  onChange={(e) => setSpecName(e.target.value)}
                  placeholder="مثال: جراحة الأورام"
                  className="form-input text-xs"
                />
              </div>

              <div className="form-group">
                <label className="form-label">كود التخصص (اختياري)</label>
                <input
                  type="text"
                  value={specCode}
                  onChange={(e) => setSpecCode(e.target.value)}
                  placeholder="مثال: SPEC-23"
                  className="form-input text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="btn-primary w-full text-xs"
              >
                {isPending ? "جارٍ الإضافة..." : "حفظ التخصص"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3 text-xs">
              <span className="font-bold text-slate-800">التخصصات الطبية المعتمدة</span>
              <span className="badge bg-slate-100 text-slate-700">{specialties.length} تخصص</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[450px] overflow-y-auto">
              {specialties.map((spec) => (
                <div
                  key={spec.id}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold"
                >
                  <span>{spec.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
