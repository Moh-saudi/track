import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const caseNumber = searchParams.get("caseNumber")?.trim();
    const caseYearStr = searchParams.get("caseYear")?.trim();
    const prosecutionCaseNumber = searchParams.get("prosecutionCaseNumber")?.trim();
    const registrationType = searchParams.get("registrationType")?.trim();

    const caseYear = caseYearStr ? parseInt(caseYearStr, 10) : undefined;

    let incomingMatch: any = null;
    let prosecutionMatches: any[] = [];

    // 1. التحقق الفوري من رقم سجل الوارد والسنة
    if (caseNumber && caseYear && !isNaN(caseYear)) {
      incomingMatch = await prisma.case.findFirst({
        where: {
          caseNumber: caseNumber,
          caseYear: caseYear,
          ...(registrationType && registrationType !== "ALL" ? { registrationType: registrationType as any } : {}),
        },
        select: {
          id: true,
          caseNumber: true,
          caseYear: true,
          registrationType: true,
          prosecutionCaseNumber: true,
          complainantName: true,
          respondentName: true,
          hospitalName: true,
          entityName: true,
          prosecution: true,
          partialProsecution: true,
          governorate: true,
          status: true,
          incomingDate: true,
          createdAt: true,
          createdBy: {
            select: {
              fullName: true,
              role: true,
            },
          },
        },
      });
    }

    // 2. التحقق الفوري من رقم القضية أو محضر النيابة
    if (prosecutionCaseNumber && prosecutionCaseNumber.length >= 2) {
      prosecutionMatches = await prisma.case.findMany({
        where: {
          prosecutionCaseNumber: {
            contains: prosecutionCaseNumber,
            mode: "insensitive",
          },
          ...(caseYear && !isNaN(caseYear) ? { caseYear: caseYear } : {}),
        },
        select: {
          id: true,
          caseNumber: true,
          caseYear: true,
          registrationType: true,
          prosecutionCaseNumber: true,
          complainantName: true,
          respondentName: true,
          hospitalName: true,
          entityName: true,
          prosecution: true,
          governorate: true,
          status: true,
          createdAt: true,
          createdBy: {
            select: {
              fullName: true,
              role: true,
            },
          },
        },
        take: 3,
        orderBy: { createdAt: "desc" },
      });

      // استبعاد المطابقة المطابقة لسجل الوارد إن وجدت لتفادي التكرار
      if (incomingMatch) {
        prosecutionMatches = prosecutionMatches.filter((m) => m.id !== incomingMatch.id);
      }
    }

    return NextResponse.json({
      incomingDuplicate: {
        exists: !!incomingMatch,
        caseItem: incomingMatch,
      },
      prosecutionDuplicate: {
        exists: prosecutionMatches.length > 0,
        count: prosecutionMatches.length,
        cases: prosecutionMatches,
      },
    });
  } catch (error: any) {
    console.error("Error checking duplicate:", error);
    return NextResponse.json({ error: "فشل التحقق من التكرار" }, { status: 500 });
  }
}
