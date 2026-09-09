import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Shield,
  Lock,
  Info,
  Phone,
  User,
  CheckCircle2,
  Building2,
  Settings,
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "مدير المنظومة",
  FOLLOW_UP_OFFICER: "موظف المتابعة والتوجيه",
  REGISTRATION_CLERK: "موظف قيد وتوثيق السجلات",
  SUBCOMMITTEE_MEMBER: "مقرر / عضو لجنة فاحصة",
  SUPREME_COMMITTEE: "عضو اللجنة العليا للمسؤولية الطبية",
  FINANCE: "مسؤول الشؤون المالية والبدلات",
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
      {/* ─── رأس الصفحة الموحد ─── */}
      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "الملف الشخصي" },
        ]}
        title="الملف الشخصي وسياسة أمان الحساب"
        description="بيانات الحساب الوظيفي والسياسات الأمنية المعتمدة لحماية المنظومة."
      />

      {/* ─── تنبيه الأمان الحكومي الصارم بشأن كلمات المرور ─── */}
      <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-300 shadow-xs space-y-3 font-body">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-amber-950 font-heading">
              سياسة أمان وحماية الحسابات (إجراء أمني إلزامي)
            </h2>
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              طبقاً للوائح الأمان والسرية المعتمدة بالمنظومة الرقمية الحكومية، <strong>يُحظر تماماً تغيير كلمة المرور ذاتياً من قِبل المستخدم</strong>؛ وذلك منعاً لقيام أي شخص آخر أو مستخدم مشترك بتغيير كلمة المرور دون علمه أو الاستيلاء على صلاحيات الحساب.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-center gap-2 font-medium">
            <Info className="w-4 h-4 text-amber-700 shrink-0" />
            <span>لطلب إعادة تعيين أو تحديث كلمة المرور: يرجى الرجوع حصراً لمدير النظام أو الدعم الفني.</span>
          </div>
          <a
            href="mailto:support@medical-committee.gov.eg?subject=طلب%20إعادة%20تعيين%20كلمة%20المرور"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white border border-amber-300 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors self-start sm:self-auto"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>التواصل مع الدعم الفني</span>
          </a>
        </div>
      </div>

      {/* ─── بيانات المستخدم والحساب الوظيفي ─── */}
      <Card className="space-y-6">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
            <User className="w-4 h-4 text-teal-600" />
            <span>البيانات الوظيفية للحساب</span>
          </h3>
          <Badge variant="approved" size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}>
            حساب موثق ونشط
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs font-body">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-500 block font-medium">الاسم الكامل</span>
            <span className="text-sm font-bold text-slate-900 block font-heading">{user.fullName}</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-500 block font-medium">البريد الإلكتروني الوظيفي (اسم المستخدم)</span>
            <span className="text-sm font-mono font-semibold text-slate-900 block" dir="ltr">{user.email}</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-500 block font-medium">الدور الوظيفي والصلاحية</span>
            <span className="text-xs font-bold text-teal-800 block font-heading">
              {ROLE_LABELS[role] ?? role}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-500 block font-medium">جهة العمل الأصلية (لفحص تعارض المصالح)</span>
            <span className="text-xs font-semibold text-slate-900 block">
              {user.employer ? (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>{user.employer}</span>
                </span>
              ) : (
                "غير محدد"
              )}
            </span>
          </div>

          {user.subCommittee && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 sm:col-span-2">
              <span className="text-slate-500 block font-medium">اللجنة الفرعية الفاحصة المرتبط بها</span>
              <span className="text-xs font-bold text-slate-900 block">
                {user.subCommittee.name}
              </span>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium font-body">
              بصفتك مديراً للمنظومة، يمكنك إدارة وتعيين كلمات مرور جميع المستخدمين:
            </span>
            <Link
              href="/dashboard/admin"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 transition-colors shadow-xs font-body"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>الانتقال لإدارة المستخدمين</span>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
