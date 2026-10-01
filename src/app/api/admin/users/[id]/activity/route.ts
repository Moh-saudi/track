import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !can((session.user as any).role, "MANAGE_USERS_AND_ROLES")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const [user, auditCount, createdCasesCount, recentLogs] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          employer: true,
          phone: true,
          nationalId: true,
          initialPassword: true,
          active: true,
          sessionVersion: true,
          lastSeenAt: true,
          todayActiveMinutes: true,
          lastActiveDate: true,
          createdAt: true,
          updatedAt: true,
          subCommittee: { select: { name: true, code: true } },
          specialty: { select: { name: true } },
        },
      }),
      prisma.auditLog.count({ where: { userId: id } }).catch(() => 0),
      prisma.case.count({ where: { createdById: id } }).catch(() => 0),
      prisma.auditLog.findMany({
        where: { userId: id },
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          entityType: true,
          entityId: true,
          action: true,
          createdAt: true,
        },
      }).catch(() => []),
    ]);

    if (!user) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    const todayMins = user.todayActiveMinutes || 0;
    const hours = Math.floor(todayMins / 60);
    const mins = todayMins % 60;
    const workRateFormatted = hours > 0 ? `${hours} س و ${mins} د` : `${mins} دقيقة`;

    return NextResponse.json({
      user,
      stats: {
        auditCount,
        createdCasesCount,
        todayActiveMinutes: todayMins,
        workRateFormatted,
      },
      recentLogs,
    });
  } catch (error: any) {
    console.error("Error fetching user activity:", error);
    return NextResponse.json({ error: "تعذر جلب تفاصيل ونشاط المستخدم" }, { status: 500 });
  }
}
