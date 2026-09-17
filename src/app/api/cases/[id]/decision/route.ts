import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getApprovedAllowanceRates } from "@/lib/finance-config";

const schema = z.object({
  meetingDate: z.string().min(1),
  decisionType: z.enum(["APPROVE", "REFER_BACK", "DIFFERENT"]),
  decisionDetails: z.string().min(1, "تفاصيل القرار مطلوبة"),
  referredSubCommitteeId: z.string().optional(),
}).refine((d) => d.decisionType !== "REFER_BACK" || !!d.referredSubCommitteeId, {
  message: "يجب تحديد اللجنة الفرعية المحال إليها",
  path: ["referredSubCommitteeId"],
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!session?.user || !can(user.role, "ISSUE_FINAL_DECISION")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const meetingDate = new Date(data.meetingDate);
  if (Number.isNaN(meetingDate.getTime())) {
    return NextResponse.json({ error: "تاريخ انعقاد اللجنة العليا غير صالح" }, { status: 400 });
  }

  try {
    const allowanceRates = getApprovedAllowanceRates();
    const result = await prisma.$transaction(async (tx) => {
      const caseRecord = await tx.case.findUnique({
        where: { id: params.id },
        select: { id: true, status: true, subCommitteeId: true, caseNumber: true, caseYear: true },
      });
      if (!caseRecord) throw new Error("CASE_NOT_FOUND");
      if (caseRecord.status !== "PENDING_SUPREME_REVIEW") throw new Error("INVALID_CASE_STATUS");

      if (data.decisionType === "REFER_BACK") {
        const target = await tx.subCommittee.findUnique({ where: { id: data.referredSubCommitteeId! } });
        if (!target || !target.active) throw new Error("INVALID_SUBCOMMITTEE");
      }

      const decision = await tx.supremeDecision.create({
        data: {
          caseId: params.id,
          meetingDate,
          decisionType: data.decisionType,
          decisionDetails: data.decisionDetails.trim(),
          referredSubCommitteeId: data.decisionType === "REFER_BACK" ? data.referredSubCommitteeId : null,
          decidedById: user.id,
        },
      });

      const nextStatus = data.decisionType === "REFER_BACK" ? "REFERRED_FOR_REVIEW" : "APPROVED";
      const updated = await tx.case.update({
        where: { id: params.id },
        data: {
          status: nextStatus,
          subCommitteeId: data.decisionType === "REFER_BACK" ? data.referredSubCommitteeId : undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: "SupremeDecision",
          entityId: decision.id,
          action: "CREATE",
          userId: user.id,
          afterData: {
            caseId: params.id,
            decisionType: decision.decisionType,
            meetingDate: decision.meetingDate,
          },
        },
      });

      if (nextStatus === "APPROVED") {
        const caseDetails = await tx.case.findUnique({
          where: { id: params.id },
          include: {
            reviewers: {
              where: { status: { not: "RECUSED" } },
              include: { doctor: true, user: true },
            },
            subCommittee: { include: { members: true } },
          },
        });

        if (caseDetails?.reviewers?.length) {
          for (const rev of caseDetails.reviewers) {
            const existing = await tx.payment.findFirst({
              where: {
                caseId: params.id,
                ...(rev.doctorId ? { doctorId: rev.doctorId } : {}),
                ...(rev.userId ? { memberId: rev.userId } : {}),
                recipientRole: "عضو لجنة فرعية",
              },
            });
            if (!existing) {
              await tx.payment.create({
                data: {
                  caseId: params.id,
                  doctorId: rev.doctorId || null,
                  memberId: rev.userId || null,
                  recipientRole: "عضو لجنة فرعية",
                  amount: allowanceRates.subcommittee,
                  entitled: true,
                  status: "NOT_PAID",
                },
              });
            }
          }
        } else if (caseDetails?.subCommittee?.members?.length) {
          for (const member of caseDetails.subCommittee.members) {
            const existing = await tx.payment.findFirst({
              where: { caseId: params.id, memberId: member.id, recipientRole: "مقرر اللجنة الفرعية" },
            });
            if (!existing) {
              await tx.payment.create({
                data: {
                  caseId: params.id,
                  memberId: member.id,
                  recipientRole: "مقرر اللجنة الفرعية",
                  amount: allowanceRates.subcommittee,
                  entitled: true,
                  status: "NOT_PAID",
                },
              });
            }
          }
        }

        const existingSupremePayment = await tx.payment.findFirst({
          where: { caseId: params.id, memberId: user.id, recipientRole: "عضو اللجنة العليا" },
        });
        if (!existingSupremePayment) {
          await tx.payment.create({
            data: {
              caseId: params.id,
              memberId: user.id,
              recipientRole: "عضو اللجنة العليا",
              amount: allowanceRates.supreme,
              entitled: true,
              status: "NOT_PAID",
            },
          });
        }

        await tx.auditLog.create({
          data: {
            entityType: "Payment",
            entityId: params.id,
            action: "CREATE",
            userId: user.id,
            afterData: {
              caseId: params.id,
              message: "تم توليد مستحقات بدلات الجلسات تلقائياً وفق القيم المعتمدة في إعدادات الخادم",
            },
          },
        });
      }

      return { decision, case: updated };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "CASE_NOT_FOUND") {
      return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "INVALID_CASE_STATUS") {
      return NextResponse.json({ error: "لا يمكن إصدار قرار اللجنة العليا إلا بعد صدور التقرير الفني ورفع السجل رسمياً للجنة العليا." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_SUBCOMMITTEE") {
      return NextResponse.json({ error: "اللجنة الفرعية المحال إليها غير موجودة أو غير نشطة" }, { status: 400 });
    }
    console.error("Supreme decision transaction failed:", error);
    return NextResponse.json({ error: "تعذر حفظ القرار بصورة آمنة. لم يتم تطبيق أي جزء من العملية." }, { status: 500 });
  }
}
