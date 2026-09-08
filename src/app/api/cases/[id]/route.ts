import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const item = await prisma.case.findUnique({
    where: { id: params.id },
    include: {
      subCommittee: true,
      specialties: { include: { specialty: true } },
      reviewers: {
        include: {
          user: {
            select: { id: true, fullName: true, employer: true, role: true, email: true },
          },
        },
      },
      followUpOfficer: { select: { id: true, fullName: true } },
      actions: { include: { recordedBy: true }, orderBy: { createdAt: "desc" } },
      supremeDecisions: { include: { decidedBy: true }, orderBy: { createdAt: "desc" } },
      attachments: { include: { uploadedBy: true }, orderBy: { uploadedAt: "desc" } },
      payments: { include: { member: true } },
    },
  });

  if (!item) return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });

  // اللجنة الفرعية لا ترى إلا قضاياها
  const role = (session.user as any).role;
  const subCommitteeId = (session.user as any).subCommitteeId;
  if (role === "SUBCOMMITTEE_MEMBER" && item.subCommitteeId !== subCommitteeId) {
    return NextResponse.json({ error: "غير مصرح بالاطلاع على هذا السجل" }, { status: 403 });
  }

  return NextResponse.json(item);
}
