import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const steps: any = {};
  try {
    steps.step1_session = "checking session";
    const session = await getServerSession(authOptions);
    steps.user = session?.user ? { role: (session.user as any).role, id: session.user.id } : null;

    steps.step2_supremeSessions = "fetching supreme sessions";
    let sessions: any[] = [];
    try {
      sessions = await prisma.supremeSession.findMany({
        orderBy: { sessionDate: "asc" },
        include: {
          createdBy: { select: { fullName: true } },
          cases: {
            select: {
              id: true,
              caseNumber: true,
              caseYear: true,
              complainantName: true,
              hospitalName: true,
              entityType: true,
              entityName: true,
            },
          },
        },
      });
      steps.step2_result = { count: sessions.length };
    } catch (e: any) {
      steps.step2_error = { message: e.message, code: e.code, meta: e.meta };
    }

    steps.step3_users = "fetching supreme members";
    let supremeMembers: any[] = [];
    try {
      supremeMembers = await prisma.user.findMany({
        where: { role: "SUPREME_COMMITTEE", active: true },
        select: {
          id: true,
          fullName: true,
          email: true,
          employer: true,
        },
        orderBy: { fullName: "asc" },
      });
      steps.step3_result = { count: supremeMembers.length };
    } catch (e: any) {
      steps.step3_error = { message: e.message, code: e.code, meta: e.meta };
    }

    steps.step4_pendingCases = "fetching pending cases";
    let pendingCases: any[] = [];
    try {
      pendingCases = await prisma.case.findMany({
        where: {
          status: { in: ["PENDING_SUPREME_REVIEW", "UNDER_SUBCOMMITTEE_REVIEW"] },
        },
        select: {
          id: true,
          caseNumber: true,
          caseYear: true,
          complainantName: true,
          hospitalName: true,
          entityType: true,
          entityName: true,
          subCommittee: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      steps.step4_result = { count: pendingCases.length };
    } catch (e: any) {
      steps.step4_error = { message: e.message, code: e.code, meta: e.meta };
    }

    return NextResponse.json({ success: true, steps });
  } catch (globalErr: any) {
    return NextResponse.json(
      {
        success: false,
        steps,
        error: globalErr.message,
        stack: globalErr.stack,
      },
      { status: 500 }
    );
  }
}
