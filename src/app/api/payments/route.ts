import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !can((session.user as any).role, "VIEW_UPDATE_PAYMENTS")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const payments = await prisma.payment.findMany({
    include: {
      case: true,
      member: {
        select: {
          id: true,
          fullName: true,
          role: true,
          email: true,
          employer: true,
        },
      },
      doctor: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(payments);
}
