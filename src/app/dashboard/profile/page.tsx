import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ROLE_LABELS: Record<string, string> = {
  ADMIN:               "مدير المنظومة",
  FOLLOW_UP_OFFICER:   "موظف المتابعة والتوجيه",
  REGISTRATION_CLERK:  "موظف قيد وتوثيق السجلات",
  SUBCOMMITTEE_MEMBER: "مقرر / عضو لجنة فاحصة",
  SUPREME_COMMITTEE:   "عضو اللجنة العليا للمسؤولية الطبية",
  FINANCE:             "مسؤول الشؤون المالية والتعويضات",
};

export default async function ProfileAccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subCommittee: true,
      specialty: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const role = user.role;
  const isAdmin = role === "ADMIN";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* رأس الصفحة */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded bg-[#1F4E79]/10 text-[#1F4E79] border border-[#1F4E79]/20 text-[11px] font-bold">
            🛡️ مركز أمان الحساب
          </span>
          <span className="text-xs text-slate-500 font-bold">اللجنة العليا للمسؤولية الطبية</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          الملف الشخصي وسياسة أمان الحساب
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          بيانات الحساب الوظيفي والسياسات الأمنية المعتمدة لحماية المنظومة
        </p>
      </div>

      {/* ─── تنبيه الأمان الحكومي الصارم بشأن كلمات المرور ─── */}
      <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-300 shadow-sm space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xl font-bold flex-shrink-0 shadow-sm">
            🔒
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-black text-amber-950">
              سياسة أمان وحماية الحسابات (إجراء أمني إلزامي)
            </h2>
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              طبقاً للوائح الأمان والسرية المعتمدة بالمنظومة الرقمية الحكومية، <strong>يُحظر تماماً تغيير كلمة المرور ذاتياً من قِبل المستخدم</strong>؛ وذلك منعاً لقيام أي شخص آخر أو مستخدم مشترك بتغيير كلمة المرور دون علمه أو الاستيلاء على صلاحيات الحساب.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-center gap-2 font-bold">
            <span>ℹ️</span>
            <span>لطلب إعادة تعيين أو تحديث كلمة المرور: يرجى الرجوع حصراً لمدير النظام أو الدعم الفني.</span>
          </div>
          <a
            href="mailto:support@medical-committee.gov.eg?subject=طلب%20إعادة%20تعيين%20كلمة%20المرور"
            className="btn btn-secondary bg-white text-xs px-3.5 py-1.5 font-bold border-amber-300 self-start sm:self-auto hover:bg-amber-100"
          >
            📞 التواصل مع الدعم الفني
          </a>
        </div>
      </div>

      {/* ─── بيانات المستخدم والحساب الوظيفي ─── */}
      <div className="card p-6 border-slate-200 space-y-6">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <span>👤</span>
            <span>البيانات الوظيفية للحساب</span>
          </h3>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>حساب موثق ونشط</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-500 block font-bold">الاسم الكامل</span>
            <span className="text-sm font-black text-slate-900 block">{user.fullName}</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-500 block font-bold">البريد الإلكتروني الوظيفي (اسم المستخدم)</span>
            <span className="text-sm font-mono font-bold text-slate-900 block" dir="ltr">{user.email}</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-500 block font-bold">الدور الوظيفي والصلاحية</span>
            <span className="text-xs font-black text-[#1F4E79] block">
              {ROLE_LABELS[role] ?? role}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-500 block font-bold">جهة العمل الأصلية (لفحص تعارض المصالح)</span>
            <span className="text-xs font-bold text-slate-900 block">
              {user.employer ? `🏛️ ${user.employer}` : "غير محدد"}
            </span>
          </div>

          {user.subCommittee && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 sm:col-span-2">
              <span className="text-slate-500 block font-bold">اللجنة الفرعية الفاحصة المرتبط بها</span>
              <span className="text-xs font-bold text-slate-900 block">
                🏥 {user.subCommittee.name}
              </span>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-bold">
              بصفتك مديراً للمنظومة، يمكنك إدارة وتعيين كلمات مرور جميع المستخدمين:
            </span>
            <Link
              href="/dashboard/admin"
              className="btn-primary text-xs px-4 py-2 font-bold"
            >
              ⚙️ الانتقال لإدارة المستخدمين
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
