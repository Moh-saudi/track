import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const prosecution = await prisma.prosecution.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true } },
      },
    });

    if (!prosecution) {
      return NextResponse.json({ error: "النيابة غير موجودة" }, { status: 404 });
    }

    const cases = await prisma.case.findMany({
      where: {
        OR: [
          { prosecutionId: id },
          { partialProsecutionId: id },
          { prosecution: prosecution.name },
          { partialProsecution: prosecution.name },
        ],
      },
      select: {
        id: true,
        caseNumber: true,
        caseYear: true,
        registrationType: true,
        prosecutionCaseNumber: true,
        complainantName: true,
        complainantPhone: true,
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
            id: true,
            fullName: true,
            email: true,
          },
        },
        subCommittee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ caseYear: "desc" }, { createdAt: "desc" }],
      take: 2000,
    });

    return NextResponse.json({
      prosecution,
      totalCasesCount: cases.length,
      cases,
    });
  } catch (err: any) {
    console.error("GET /api/prosecutions/[id]/cases error:", err);
    return NextResponse.json({ error: err.message || "تعذر جلب سجلات النيابة" }, { status: 500 });
  }
}
