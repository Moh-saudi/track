"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AssignForm({
  caseId,
  subCommittees,
}: {
  caseId: string;
  subCommittees: { id: string; name: string; code: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [subCommitteeId, setSubCommitteeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await fetch(`/api/cases/${caseId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subCommitteeId }),
      });

      if (!res.ok) {
        setError("تعذّر التوجيه — تأكد من اختيار اللجنة وحاول مرة أخرى");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard/registration");
        router.refresh();
      }, 800);
    });
  }

  if (success) {
    return (
      <div className="alert-success flex items-center gap-3">
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>تم توجيه القضية بنجاح — جارٍ التحويل...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="alert-error mb-4">{error}</div>
      )}

      <div className="form-group">
        <label htmlFor="subcommittee" className="label label-required">
          اختر اللجنة الفرعية المختصة
        </label>
        <select
          id="subcommittee"
          required
          value={subCommitteeId}
          onChange={e => setSubCommitteeId(e.target.value)}
          className="input"
        >
          <option value="">— اختر اللجنة —</option>
          {subCommittees.map(sc => (
            <option key={sc.id} value={sc.id}>
              {sc.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending || !subCommitteeId}
          className="btn-primary flex-1"
        >
          {isPending ? (
            <><div className="loading-spinner" /><span>جارِ التوجيه...</span></>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              توجيه للجنة الفرعية
            </>
          )}
        </button>
        <a href="/dashboard/registration" className="btn-secondary">
          إلغاء
        </a>
      </div>
    </form>
  );
}
