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

  // ─── إنشاء سجل مالي تلقائياً عند الاعتماد ─────────────────────────────────
  // عند اعتماد القرار (APPROVE أو DIFFERENT) — ينشئ سجل Payment تلقائياً
  // للجنة المالية لمتابعة صرف التعويض
  if (nextStatus === "APPROVED") {
    const existingPayment = await prisma.payment.findFirst({ where: { caseId: params.id } });
    if (!existingPayment) {
      const payment = await prisma.payment.create({
        data: {
          caseId: params.id,
          status: "NOT_PAID",
          entitled: false, // تُحدَّد لاحقاً بواسطة إدارة المالية
        },
      });
      await writeAuditLog({
        entityType: "Payment",
        entityId: payment.id,
        action: "CREATE",
        userId: (session.user as any).id,
        afterData: { caseId: params.id, autoCreated: true },
      });
    }
  }

  return NextResponse.json({ decision, case: updated }, { status: 201 });
}
