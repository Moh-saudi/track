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
    const rawQuery = searchParams.get("q")?.trim() || "";

    if (!rawQuery || rawQuery.length < 1) {
      return NextResponse.json({ results: [] });
    }

    // تنظيف نص البحث
    const cleanQuery = rawQuery.replace(/^[#\s]+/, "").trim();

    // التحقق من صيغة "رقم / سنة" مثل "12/2026" أو "12 / 2026"
    const slashParts = cleanQuery.split("/").map((p) => p.trim());
    let parsedCaseNum: string | null = null;
    let parsedYear: number | null = null;

    if (slashParts.length === 2) {
      parsedCaseNum = slashParts[0];
      const y = parseInt(slashParts[1], 10);
      if (!isNaN(y) && y >= 1990 && y <= 2100) {
        parsedYear = y;
      }
    } else {
      const numOnly = parseInt(cleanQuery, 10);
      if (!isNaN(numOnly) && numOnly >= 1990 && numOnly <= 2100) {
        parsedYear = numOnly;
      }
    }

    const orConditions: any[] = [
      { caseNumber: { contains: cleanQuery, mode: "insensitive" } },
      { prosecutionCaseNumber: { contains: cleanQuery, mode: "insensitive" } },
      { complainantName: { contains: cleanQuery, mode: "insensitive" } },
      { respondentName: { contains: cleanQuery, mode: "insensitive" } },
      { entityName: { contains: cleanQuery, mode: "insensitive" } },
      { entityType: { contains: cleanQuery, mode: "insensitive" } },
      { hospitalName: { contains: cleanQuery, mode: "insensitive" } },
      { prosecution: { contains: cleanQuery, mode: "insensitive" } },
      { partialProsecution: { contains: cleanQuery, mode: "insensitive" } },
    ];

    if (parsedCaseNum && parsedYear) {
      orConditions.push({
        AND: [
          { caseNumber: { contains: parsedCaseNum, mode: "insensitive" } },
          { caseYear: parsedYear },
        ],
      });
    } else if (parsedYear) {
      orConditions.push({ caseYear: parsedYear });
    }

    const cases = await prisma.case.findMany({
      where: {
        OR: orConditions,
      },
      select: {
        id: true,
        caseNumber: true,
        caseYear: true,
        prosecutionCaseNumber: true,
        reportYear: true,
        registrationType: true,
        status: true,
        complainantName: true,
        respondentName: true,
        entityType: true,
        entityName: true,
        hospitalName: true,
        prosecution: true,
        createdAt: true,
        subCommittee: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { caseYear: "desc" },
        { createdAt: "desc" },
      ],
      take: 8,
    });

    return NextResponse.json({ results: cases });
  } catch (err: any) {
    console.error("Global search error:", err);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إجراء البحث السريع" },
      { status: 500 }
    );
  }
}
