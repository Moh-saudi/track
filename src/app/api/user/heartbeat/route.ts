import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  let clientPath = "/dashboard";
  try {
    const body = await req.json();
    if (body?.path && typeof body.path === "string") {
      clientPath = body.path;
    }
  } catch {
    // default to /dashboard if empty body
  }

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      lastSeenAt: true,
      todayActiveMinutes: true,
      lastActiveDate: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  }

  let newMinutes = user.todayActiveMinutes;
  if (user.lastActiveDate !== todayStr) {
    newMinutes = 1;
  } else {
    if (user.lastSeenAt) {
      const diffMs = now.getTime() - new Date(user.lastSeenAt).getTime();
      const diffMin = diffMs / (1000 * 60);
      if (diffMin <= 5) {
        newMinutes += 1;
      }
    } else {
      newMinutes += 1;
    }
  }

  // Find active session for this user today
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const activeSession = await prisma.userSession.findFirst({
    where: {
      userId,
      sessionDate: todayStr,
      isActive: true,
      lastActiveAt: { gte: fifteenMinutesAgo },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (activeSession) {
    // Increment existing active session
    const screenTimes = (activeSession.screenTimes as Record<string, number>) || {};
    screenTimes[clientPath] = (screenTimes[clientPath] || 0) + 1;

    await prisma.userSession.update({
      where: { id: activeSession.id },
      data: {
        lastActiveAt: now,
        logoutAt: now, // updated continuously as last seen
        totalMinutes: activeSession.totalMinutes + 1,
        screenTimes,
      },
    });
  } else {
    // Close any previous stale open sessions
    await prisma.userSession.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Create a new session starting now
    await prisma.userSession.create({
      data: {
        userId,
        sessionDate: todayStr,
        loginAt: now,
        lastActiveAt: now,
        logoutAt: now,
        totalMinutes: 1,
        screenTimes: { [clientPath]: 1 },
        isActive: true,
      },
    });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      lastSeenAt: now,
      todayActiveMinutes: newMinutes,
      lastActiveDate: todayStr,
    },
    select: {
      id: true,
      lastSeenAt: true,
      todayActiveMinutes: true,
    },
  });

  return NextResponse.json({
    success: true,
    lastSeenAt: updated.lastSeenAt,
    todayActiveMinutes: updated.todayActiveMinutes,
  });
}
