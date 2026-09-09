import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ActiveUsersClient } from "./active-users-client";
import {
  Users,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserCheck,
} from "lucide-react";

export const revalidate = 0;

export default async function ActiveUsersPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session?.user || role !== "ADMIN") {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    orderBy: [
      { lastSeenAt: "desc" },
      { todayActiveMinutes: "desc" },
      { fullName: "asc" },
    ],
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      employer: true,
      active: true,
      lastSeenAt: true,
      todayActiveMinutes: true,
      lastActiveDate: true,
      subCommittee: {
        select: {
          name: true,
        },
      },
    },
  });

  const now = new Date().getTime();
  const threeMinutesMs = 3 * 60 * 1000;
  const fifteenMinutesMs = 15 * 60 * 1000;

  const onlineCount = users.filter((u) => {
    if (!u.lastSeenAt) return false;
    return now - new Date(u.lastSeenAt).getTime() <= threeMinutesMs;
  }).length;

  const idleCount = users.filter((u) => {
    if (!u.lastSeenAt) return false;
    const diff = now - new Date(u.lastSeenAt).getTime();
    return diff > threeMinutesMs && diff <= fifteenMinutesMs;
  }).length;

  const activeTodayCount = users.filter((u) => (u.todayActiveMinutes || 0) > 0).length;
  const totalUsers = users.length;

  const serializedUsers = users.map((u) => ({
    ...u,
    lastSeenAt: u.lastSeenAt ? u.lastSeenAt.toISOString() : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "الإدارة والرقابة", href: "/dashboard/admin" },
          { label: "المستخدمون المتصلون ومدة العمل" },
        ]}
        title="متابعة المستخدمين المتصلين ومدة العمل اليومية"
        description="مراقبة التواجد اللحظي لكافة مستخدمي المنظومة وإجمالي دقائق العمل المنجزة خلال اليوم مع إمكانية الفلترة بالمدة والدور"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="متصلون الآن (Live)"
          value={onlineCount}
          description="حسابات نشطة وتتفاعل خلال آخر 3 دقائق"
          icon={<Activity className="h-6 w-6 text-emerald-600" />}
          variant="emerald"
        />

        <StatCard
          title="في وضع الخمول (Idle)"
          value={idleCount}
          description="متواجدون بين 3 و 15 دقيقة مضت"
          icon={<Clock className="h-6 w-6 text-amber-600" />}
          variant="amber"
        />

        <StatCard
          title="عملوا اليوم على المنظومة"
          value={activeTodayCount}
          description="سجلوا دقائق تفاعل وإنتاجية اليوم"
          icon={<UserCheck className="h-6 w-6 text-teal-600" />}
          variant="teal"
        />

        <StatCard
          title="إجمالي حسابات المنظومة"
          value={totalUsers}
          description="كافة المستخدمين المقيدين بقاعدة البيانات"
          icon={<Users className="h-6 w-6 text-slate-600" />}
          variant="slate"
        />
      </div>

      <ActiveUsersClient initialUsers={serializedUsers} />
    </div>
  );
}
