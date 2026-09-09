import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

const schema = z
  .object({
    meetingDate: z.string(), // تاريخ انعقاد اللجنة العليا
    decisionType: z.enum(["APPROVE", "REFER_BACK", "DIFFERENT"]),
    decisionDetails: z.string().min(1, "تفاصيل القرار مطلوبة"),
    referredSubCommitteeId: z.string().optional(),
  })
  .refine((d) => d.decisionType !== "REFER_BACK" || !!d.referredSubCommitteeId, {
    message: "يجب تحديد اللجنة الفرعية المحال إليها",
    path: ["referredSubCommitteeId"],
  });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !can((session.user as any).role, "ISSUE_FINAL_DECISION")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const caseRecord = await prisma.case.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, subCommitteeId: true },
  });

  if (!caseRecord) {
    return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
  }

  // لا يمكن اعتماد القرار النهائي إلا للسجلات التي صدر تقريرها الفني ورُفعت للجنة العليا
  if (caseRecord.status !== "PENDING_SUPREME_REVIEW") {
    return NextResponse.json(
      {
        error: "لا يمكن إصدار قرار اللجنة العليا إلا بعد صدور التقرير الفني من اللجنة الفرعية ورفع السجل رسمياً (حالة بانتظار الاعتماد).",
      },
      { status: 400 }
    );
  }

  const decision = await prisma.supremeDecision.create({
    data: {
      caseId: params.id,
      meetingDate: new Date(data.meetingDate),
      decisionType: data.decisionType,
      decisionDetails: data.decisionDetails,
      referredSubCommitteeId: data.decisionType === "REFER_BACK" ? data.referredSubCommitteeId : null,
      decidedById: (session.user as any).id,
    },
  });

  const nextStatus =
    data.decisionType === "REFER_BACK" ? "REFERRED_FOR_REVIEW" : "APPROVED";

  const updated = await prisma.case.update({
    where: { id: params.id },
    data: {
      status: nextStatus,
      subCommitteeId:
        data.decisionType === "REFER_BACK" ? data.referredSubCommitteeId : undefined,
    },
  });

  await writeAuditLog({
    entityType: "SupremeDecision",
    entityId: decision.id,
    action: "CREATE",
    userId: (session.user as any).id,
    afterData: decision,
  });

  // ─── إنشاء سجلات البدلات المالية تلقائياً عند الاعتماد ──────────────────
  // بدل حضور جلسة لكل عضو من أعضاء اللجنة الفرعية: 5000 ج.م
  // بدل حضور جلسة لكل عضو من أعضاء اللجنة العليا: 8000 ج.م
  if (nextStatus === "APPROVED") {
    // 1. استرجاع بيانات القضية مع فريق الفحص واللجنة الفرعية
    const caseDetails = await prisma.case.findUnique({
      where: { id: params.id },
      include: {
        reviewers: {
          where: { status: { not: "RECUSED" } },
          include: { doctor: true, user: true },
        },
        subCommittee: {
          include: { members: true },
        },
      },
    });

    // 2. إنشاء بدلات أعضاء اللجنة الفرعية (5000 جنيه لكل عضو)
    if (caseDetails?.reviewers && caseDetails.reviewers.length > 0) {
      for (const rev of caseDetails.reviewers) {
        const existing = await prisma.payment.findFirst({
          where: {
            caseId: params.id,
            ...(rev.doctorId ? { doctorId: rev.doctorId } : {}),
            ...(rev.userId ? { memberId: rev.userId } : {}),
          },
        });
        if (!existing) {
          await prisma.payment.create({
            data: {
              caseId: params.id,
              doctorId: rev.doctorId || null,
              memberId: rev.userId || null,
              recipientRole: "عضو لجنة فرعية",
              amount: 5000,
              entitled: true,
              status: "NOT_PAID",
            },
          });
        }
      }
    } else if (caseDetails?.subCommittee?.members && caseDetails.subCommittee.members.length > 0) {
      for (const member of caseDetails.subCommittee.members) {
        const existing = await prisma.payment.findFirst({
          where: { caseId: params.id, memberId: member.id },
        });
        if (!existing) {
          await prisma.payment.create({
            data: {
              caseId: params.id,
              memberId: member.id,
              recipientRole: "مقرر اللجنة الفرعية",
              amount: 5000,
              entitled: true,
              status: "NOT_PAID",
            },
          });
        }
      }
    }

    // 3. إنشاء بدل عضو اللجنة العليا (8000 جنيه)
    const supremeUserId = (session.user as any).id;
    const existingSupremePayment = await prisma.payment.findFirst({
      where: {
        caseId: params.id,
        memberId: supremeUserId,
        recipientRole: "عضو اللجنة العليا",
      },
    });
    if (!existingSupremePayment) {
      await prisma.payment.create({
        data: {
          caseId: params.id,
          memberId: supremeUserId,
          recipientRole: "عضو اللجنة العليا",
          amount: 8000,
          entitled: true,
          status: "NOT_PAID",
        },
      });
    }

    await writeAuditLog({
      entityType: "Payment",
      entityId: params.id,
      action: "CREATE",
      userId: (session.user as any).id,
      afterData: { caseId: params.id, message: "تم توليد مستحقات بدلات الجلسات تلقائياً (5000 للفرعية / 8000 للعليا)" },
    });
  }

  return NextResponse.json({ decision, case: updated }, { status: 201 });
}
