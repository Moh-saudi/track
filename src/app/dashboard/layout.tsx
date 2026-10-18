import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { authOptions } from "@/lib/auth";
import { DashboardShell } from "@/components/ui/DashboardShell";

import { PresenceTracker } from "@/components/analytics/PresenceTracker";
import { RiskModeBanner } from "@/components/admin/RiskModeBanner";
import { NextAuthProvider } from "@/components/providers/NextAuthProvider";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "مدير المنظومة",
  FOLLOW_UP_OFFICER: "موظف المتابعة والتوجيه",
  REGISTRATION_CLERK: "موظف قيد السجلات",
  SUBCOMMITTEE_MEMBER: "عضو / مقرر لجنة فاحصة",
  SUPREME_COMMITTEE: "عضو اللجنة العليا",
  SUPREME_SUPERVISOR: "مشرف اللجنة العليا على الموظفين ومعدل التشغيل",
  FINANCE: "مسؤول الشؤون المالية",
  RISK_OFFICER: "مسؤول إدارة المخاطر وتصحيح المسار",
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const role = ((session.user as any)?.role as string) || "REGISTRATION_CLERK";
  const employer = (session.user as any)?.employer as string | undefined;
  const roleLabel = ROLE_LABELS[role] ?? role;

  return (
    <NextAuthProvider session={session}>
      <DashboardShell
        user={{
          name: session.user.name,
          email: session.user.email,
          role: role,
          employer: employer,
        }}
        roleLabel={roleLabel}
        role={role}
      >
        <PresenceTracker />
        <RiskModeBanner />
        {children}
      </DashboardShell>
    </NextAuthProvider>
  );
}
