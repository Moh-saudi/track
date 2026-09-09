import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

const assignSchema = z.object({
  subCommitteeId: z.string().min(1, "يجب تحديد اللجنة الفرعية المحال إليها السجل"),
  specialtyIds: z.array(z.string()).optional(),
  durationDays: z.number().int().min(1).max(180).optional(),
  expectedDueDate: z.string().optional(),
  followUpNotes: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  // التحقق من صلاحية ROUTE_CASE حصراً لموظف المتابعة والتوجيه أو المشرف
  if (!session?.user || !can((session.user as any).role, "ROUTE_CASE")) {
    return NextResponse.json({ error: "غير مصرح — صلاحية التوجيه مخصصة لموظف المتابعة والتوجيه" }, { status: 403 });
  }

  const parsed = assignSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const before = await prisma.case.findUnique({
    where: { id: params.id },
    include: { specialties: true },
  });
  if (!before) {
    return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
  }

  // التحقق من أن اللجنة الفرعية المستهدفة مفعلة ونشطة
  const targetSubCommittee = await prisma.subCommittee.findUnique({
    where: { id: parsed.data.subCommitteeId },
    select: { id: true, active: true, name: true },
  });
  if (!targetSubCommittee) {
    return NextResponse.json({ error: "اللجنة الفرعية المحددة غير موجودة" }, { status: 404 });
  }
  if (!targetSubCommittee.active) {
    return NextResponse.json(
      { error: `اللجنة الفرعية (${targetSubCommittee.name}) موقوفة إدارياً ولا يمكن توجيه قضايا إليها حالياً.` },
      { status: 400 }
    );
  }

  // لا يمكن توجيه السجل إذا كان معتمداً نهائياً أو بانتظار قرار العليا إلا عبر وضع إدارة المخاطر للمشرف
  const role = (session.user as any).role;
  if (before.status !== "REGISTERED" && before.status !== "REFERRED_FOR_REVIEW" && role !== "ADMIN") {
    return NextResponse.json(
      { error: "لا يمكن توجيه أو إعادة إسناد السجل إلا إذا كان بانتظار التوجيه أو محالاً لإعادة الدراسة من اللجنة العليا." },
      { status: 400 }
    );
  }

  // حساب تاريخ المهلة المستهدفة (Expected Due Date)
  let computedDueDate: Date | null = null;
  if (parsed.data.expectedDueDate) {
    computedDueDate = new Date(parsed.data.expectedDueDate);
  } else if (parsed.data.durationDays) {
    computedDueDate = new Date();
    computedDueDate.setDate(computedDueDate.getDate() + parsed.data.durationDays);
  } else {
    // مهلة افتراضية 30 يوماً
    computedDueDate = new Date();
    computedDueDate.setDate(computedDueDate.getDate() + 30);
  }

  // إذا تم إرسال تخصصات جديدة أثناء التوجيه، يتم تحديث التخصصات
  if (parsed.data.specialtyIds && parsed.data.specialtyIds.length > 0) {
    await prisma.caseSpecialty.deleteMany({ where: { caseId: params.id } });
    await prisma.caseSpecialty.createMany({
      data: parsed.data.specialtyIds.map((sId) => ({
        caseId: params.id,
        specialtyId: sId,
      })),
    });
  }

  const updated = await prisma.case.update({
    where: { id: params.id },
    data: {
      subCommitteeId: parsed.data.subCommitteeId,
      assignedAt: new Date(),
      expectedDueDate: computedDueDate,
      followUpOfficerId: (session.user as any).id,
      followUpNotes: parsed.data.followUpNotes || null,
      status: "UNDER_SUBCOMMITTEE_REVIEW",
    },
    include: {
      subCommittee: true,
      specialties: { include: { specialty: true } },
    },
  });

  await writeAuditLog({
    entityType: "Case",
    entityId: updated.id,
    action: "ROUTE_TO_SUBCOMMITTEE",
    userId: (session.user as any).id,
    beforeData: before,
    afterData: updated,
  });

  return NextResponse.json(updated);
}
