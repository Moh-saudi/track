"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface UserItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
  employer: string | null;
  active: boolean;
  subCommittee: { name: string } | null;
  specialty: { name: string } | null;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN:               "مدير المنظومة",
  FOLLOW_UP_OFFICER:   "موظف المتابعة والتوجيه",
  REGISTRATION_CLERK:  "موظف التسجيل والقيد",
  SUBCOMMITTEE_MEMBER: "عضو / مقرر لجنة فاحصة",
  SUPREME_COMMITTEE:   "عضو اللجنة العليا",
  FINANCE:             "الشؤون المالية",
};

const ROLE_BADGE: Record<string, string> = {
  ADMIN:               "bg-purple-100 text-purple-800 border border-purple-300",
  FOLLOW_UP_OFFICER:   "bg-blue-50 text-[#1F4E79] border border-blue-200 font-bold",
  REGISTRATION_CLERK:  "bg-blue-100 text-blue-800 border border-blue-300",
  SUBCOMMITTEE_MEMBER: "bg-teal-100 text-teal-800 border border-teal-300",
  SUPREME_COMMITTEE:   "bg-amber-100 text-amber-800 border border-amber-300",
  FINANCE:             "bg-emerald-100 text-emerald-800 border border-emerald-300",
};

export function AdminUsersTable({ users }: { users: UserItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // حالة مودال إعادة تعيين كلمة المرور بواسطة الإدارة
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    if (newPassword.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }

    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "تعذر إعادة تعيين كلمة المرور");

        setSuccessMsg(`تم تعيين كلمة مرور جديدة للمستخدم (${selectedUser.fullName}) بنجاح`);
        setSelectedUser(null);
        setNewPassword("");
        router.refresh();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="alert-success text-xs">
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="alert-error text-xs">
          <span>{error}</span>
        </div>
      )}

      <div className="table-wrapper border-0 rounded-none shadow-none">
        <table className="table-custom">
          <thead>
            <tr>
              <th>المستخدم</th>
              <th>البريد الإلكتروني</th>
              <th>الدور الوظيفي</th>
              <th>جهة العمل (فحص تعارض المصالح)</th>
              <th>اللجنة التابع لها</th>
              <th>الحالة</th>
              <th className="text-center">إدارة الأمان وكلمة المرور</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-bold text-slate-900 text-xs">
                  {u.fullName}
                </td>
                <td className="font-mono text-xs text-slate-600" dir="ltr">
                  {u.email}
                </td>
                <td>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${ROLE_BADGE[u.role] ?? "bg-slate-100 text-slate-700"}`}>
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                </td>
                <td className="text-xs font-bold text-slate-800">
                  {u.employer ? (
                    <span className="inline-flex items-center gap-1">
                      <span>🏛️</span>
                      <span>{u.employer}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="text-xs text-slate-600">
                  {u.subCommittee?.name ?? "—"}
                </td>
                <td>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${u.active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                    {u.active ? "نشط" : "معطل"}
                  </span>
                </td>
                <td className="text-center whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(u);
                      setError(null);
                      setSuccessMsg(null);
                      setNewPassword("");
                    }}
                    className="btn btn-sm bg-blue-50 text-[#1F4E79] hover:bg-blue-100 border border-blue-200 text-xs font-bold"
                    title="إعادة تعيين كلمة المرور حصرياً بواسطة الإدارة"
                  >
                    <span>🔑 تعيين كلمة مرور</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── نافذة مودال إعادة تعيين كلمة المرور بواسطة الإدارة ─── */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>🔒</span>
                  <span>إعادة تعيين كلمة مرور مستخدم</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  صلاحية حصرية للإدارة لتحديث كلمة المرور بناءً على طلب رسمي
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <p><strong className="text-slate-700">المستخدم:</strong> {selectedUser.fullName}</p>
              <p><strong className="text-slate-700">البريد الإلكتروني:</strong> <span className="font-mono">{selectedUser.email}</span></p>
              <p><strong className="text-slate-700">الدور:</strong> {ROLE_LABELS[selectedUser.role] ?? selectedUser.role}</p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="form-group">
                <label className="form-label form-label-required text-xs">كلمة المرور الجديدة المعتمدة</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة مرور قوية (8 أحرف على الأقل)..."
                  className="form-input text-xs font-mono"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  قم بإعطاء كلمة المرور للموظف شخصياً أو عبر وسيلة اتصال آمنة موثقة
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending || newPassword.length < 8}
                  className="btn-primary text-xs px-5 py-2 font-bold"
                >
                  {isPending ? "جارٍ التحديث..." : "حفظ كلمة المرور الجديدة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
