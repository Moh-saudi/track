import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session?.user || (role !== "ADMIN" && role !== "RISK_OFFICER")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");
  const action = searchParams.get("action");
  const userId = searchParams.get("userId");
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  const where: any = {};
  if (entityType && entityType !== "ALL") where.entityType = entityType;
  if (action && action !== "ALL") where.action = action;
  if (userId && userId !== "ALL") where.userId = userId;

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          employer: true,
        },
      },
    },
  });

  return NextResponse.json(logs);
}
