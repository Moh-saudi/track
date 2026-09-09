import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  const subCommitteeId = (session.user as any).subCommitteeId;
  const isFinanceOrAdmin = role === "FINANCE" || role === "ADMIN";

  const item = await prisma.case.findUnique({
    where: { id: params.id },
    include: {
      subCommittee: true,
      specialties: { include: { specialty: true } },
      reviewers: {
        include: {
          doctor: {
            select: {
              id: true,
              name: true,
              title: true,
              employer: true,
              phone: true,
              specialty: true,
            },
          },
          user: {
            select: { id: true, fullName: true, employer: true, role: true, email: true },
          },
        },
      },
      followUpOfficer: { select: { id: true, fullName: true } },
      actions: {
        include: {
          recordedBy: {
            select: { id: true, fullName: true, role: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      supremeDecisions: {
        include: {
          decidedBy: {
            select: { id: true, fullName: true, role: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      attachments: {
        include: {
          uploadedBy: {
            select: { id: true, fullName: true },
          },
        },
        orderBy: { uploadedAt: "desc" },
      },
      ...(isFinanceOrAdmin
        ? {
            payments: {
              include: {
                member: {
                  select: { id: true, fullName: true, role: true, email: true },
                },
                doctor: {
                  select: { id: true, name: true, employer: true, bankName: true, financialType: true },
                },
              },
            },
          }
        : {}),
    },
  });

  if (!item) return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });

  // اللجنة الفرعية لا ترى إلا قضاياها
  if (role === "SUBCOMMITTEE_MEMBER" && item.subCommitteeId !== subCommitteeId) {
    return NextResponse.json({ error: "غير مصرح بالاطلاع على هذا السجل" }, { status: 403 });
  }

  return NextResponse.json(item);
}
