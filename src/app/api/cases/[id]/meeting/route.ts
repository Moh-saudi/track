import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const meetingSchema = z.object({
  meetingDate: z.string().min(1, "يجب إدخال تاريخ انعقاد جلسة اللجنة"),
  reason: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const userSubCommitteeId = (session.user as any).subCommitteeId;

  if (role !== "SUBCOMMITTEE_MEMBER" && role !== "ADMIN") {
    return NextResponse.json({ error: "تحديد موعد الانعقاد مخصص لمقرر اللجنة الفرعية أو المدير" }, { status: 403 });
  }

  const currentCase = await prisma.case.findUnique({
    where: { id: params.id },
  });

  if (!currentCase) {
    return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
  }

  if (role === "SUBCOMMITTEE_MEMBER" && currentCase.subCommitteeId !== userSubCommitteeId) {
    return NextResponse.json({ error: "غير مصرح — هذا السجل غير محال للجنتك الفرعية" }, { status: 403 });
  }

  // لا يمكن تعديل بيانات موعد الجلسة بعد اعتماد السجل إلا عند الإحالة لإعادة الدراسة
  if (role !== "ADMIN" && currentCase.status !== "UNDER_SUBCOMMITTEE_REVIEW" && currentCase.status !== "REFERRED_FOR_REVIEW") {
    return NextResponse.json({
      error: "لا يمكن تعديل موعد الجلسة بعد اعتماد السجل ورفعه للجنة العليا، إلا إذا أُحيل السجل لإعادة الدراسة",
    }, { status: 400 });
  }

  // فحص نشاط اللجنة الفرعية
  if (role !== "ADMIN" && currentCase.subCommitteeId) {
    const sc = await prisma.subCommittee.findUnique({
      where: { id: currentCase.subCommitteeId },
      select: { active: true },
    });
    if (sc && !sc.active) {
      return NextResponse.json({
        error: "لا يمكن تعديل موعد الجلسة لأن نشاط هذه اللجنة الفرعية موقوف مؤقتاً بقرار إداري.",
      }, { status: 403 });
    }
  }

  const body = await req.json();
  const parsed = meetingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const newMeetingDate = new Date(parsed.data.meetingDate);
  const oldMeetingDate = currentCase.meetingDate ? new Date(currentCase.meetingDate) : null;
  
  // هل هذا تعديل على موعد قائم؟
  const isReschedule = !!(oldMeetingDate && oldMeetingDate.toISOString().split("T")[0] !== newMeetingDate.toISOString().split("T")[0]);

  if (isReschedule && (!parsed.data.reason || parsed.data.reason.trim().length < 3)) {
    return NextResponse.json({
      error: "يرجى كتابة وتوضيح سبب تعديل أو تأجيل موعد انعقاد الجلسة ليظهر في مرصد المتابعة والتوجيه",
    }, { status: 400 });
  }

  const updatedCase = await prisma.case.update({
    where: { id: params.id },
    data: {
      meetingDate: newMeetingDate,
      meetingDateReason: isReschedule ? parsed.data.reason?.trim() : currentCase.meetingDateReason,
      meetingDateUpdatedAt: isReschedule ? new Date() : currentCase.meetingDateUpdatedAt,
    },
  });

  // تسجيل التعديل في جدول التعديلات الدائم
  if (isReschedule) {
    await prisma.meetingReschedule.create({
      data: {
        caseId: params.id,
        oldDate: oldMeetingDate,
        newDate: newMeetingDate,
        reason: parsed.data.reason!.trim(),
        createdById: userId,
      },
    });
  }

  // تسجيل العملية في سجل التدقيق الموحد
  await writeAuditLog({
    entityType: "Case",
    entityId: params.id,
    action: isReschedule ? "RESCHEDULE_MEETING" : "SCHEDULE_MEETING",
    userId,
    beforeData: {
      meetingDate: oldMeetingDate ? oldMeetingDate.toISOString() : null,
      reason: currentCase.meetingDateReason,
    },
    afterData: {
      meetingDate: newMeetingDate.toISOString(),
      reason: isReschedule ? parsed.data.reason?.trim() : null,
    },
  });

  return NextResponse.json({
    success: true,
    meetingDate: updatedCase.meetingDate,
    meetingDateReason: updatedCase.meetingDateReason,
    meetingDateUpdatedAt: updatedCase.meetingDateUpdatedAt,
    message: isReschedule
      ? "تم تحديث موعد الجلسة وتوثيق سبب التعديل لمسؤول المتابعة بنجاح"
      : "تم حفظ موعد انعقاد جلسة اللجنة بنجاح",
  });
}
