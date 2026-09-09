import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

const addReviewerSchema = z.object({
  doctorId: z.string().optional(),
  userId: z.string().optional(),
  roleInTeam: z.enum(["HEAD_EXAMINER", "EXAMINER"]).default("EXAMINER"),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const reviewers = await prisma.caseReviewer.findMany({
    where: { caseId: params.id },
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
        select: {
          id: true,
          fullName: true,
          email: true,
          employer: true,
          specialty: true,
          role: true,
        },
      },
    },
    orderBy: { assignedAt: "asc" },
  });

  return NextResponse.json(reviewers);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !can((session.user as any).role, "MANAGE_REVIEW_TEAM")) {
    return NextResponse.json({ error: "غير مصرح لك بتشكيل فريق الفحص" }, { status: 403 });
  }

  const parsed = addReviewerSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const targetCase = await prisma.case.findUnique({
    where: { id: params.id },
    select: { id: true, caseNumber: true, hospitalName: true, respondentName: true, subCommitteeId: true, status: true },
  });
  if (!targetCase) {
    return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
  }

  // لا يمكن تعديل فريق الفحص بعد اعتماد السجل إلا عند الإحالة لإعادة الدراسة
  if ((session.user as any).role !== "ADMIN" && targetCase.status !== "UNDER_SUBCOMMITTEE_REVIEW" && targetCase.status !== "REFERRED_FOR_REVIEW") {
    return NextResponse.json({
      error: "لا يمكن تعديل فريق الفحص بعد اعتماد السجل ورفعه للجنة العليا، إلا إذا أُحيل السجل لإعادة الدراسة",
    }, { status: 400 });
  }

  let doctorName = "";
  let doctorEmployer = "";
  let targetDoctorId: string | null = null;
  let targetUserId: string | null = null;

  if (parsed.data.doctorId) {
    const doc = await prisma.subCommitteeDoctor.findUnique({
      where: { id: parsed.data.doctorId },
      include: { specialty: true },
    });
    if (!doc) {
      return NextResponse.json({ error: "الطبيب الاستشاري غير مسجل بسجل اللجنة" }, { status: 400 });
    }
    if (!doc.active) {
      return NextResponse.json({ error: "الطبيب موقوف مؤقتاً باللجنة ولا يمكن إسناد فحص قضايا له حالياً" }, { status: 400 });
    }
    doctorName = doc.name;
    doctorEmployer = doc.employer;
    targetDoctorId = doc.id;
  } else if (parsed.data.userId) {
    const usr = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, fullName: true, employer: true, active: true },
    });
    if (!usr || !usr.active) {
      return NextResponse.json({ error: "المستخدم غير متاح" }, { status: 400 });
    }
    doctorName = usr.fullName;
    doctorEmployer = usr.employer || "";
    targetUserId = usr.id;
  } else {
    return NextResponse.json({ error: "يجب اختيار الطبيب الفاحص" }, { status: 400 });
  }

  // ─── فحص آلي صارم لتعارض المصالح (Conflict of Interest Check) ───
  const targetEntity = (targetCase.respondentName || targetCase.hospitalName || "").trim();
  if (targetEntity && doctorEmployer) {
    const normTarget = targetEntity.toLowerCase();
    const normEmployer = doctorEmployer.trim().toLowerCase();

    if (
      normTarget === normEmployer ||
      normEmployer.includes(normTarget) ||
      normTarget.includes(normEmployer)
    ) {
      return NextResponse.json(
        {
          error: "تعارض مصالح محظور",
          details: `لا يمكن إسناد فحص القضية للطبيب (${doctorName}) نظراً لتطابق جهة عمله (${doctorEmployer}) مع المشكو في حقه (${targetEntity}). يرجى اختيار استشاري آخر لضمان الحيدة والنزاهة وفقاً لقواعد المنظومة.`,
          conflictDetected: true,
        },
        { status: 400 }
      );
    }
  }

  // التحقق إن كان معيناً مسبقاً في القضية
  const existing = await prisma.caseReviewer.findFirst({
    where: {
      caseId: params.id,
      ...(targetDoctorId ? { doctorId: targetDoctorId } : { userId: targetUserId }),
    },
  });

  if (existing && existing.status !== "RECUSED") {
    return NextResponse.json({ error: "الطبيب معين بالفعل في فريق فحص هذه القضية" }, { status: 400 });
  }

  const reviewer = existing
    ? await prisma.caseReviewer.update({
        where: { id: existing.id },
        data: {
          roleInTeam: parsed.data.roleInTeam,
          status: "ASSIGNED",
          recusalReason: null,
          recusedAt: null,
          assignedAt: new Date(),
        },
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
            select: {
              id: true,
              fullName: true,
              email: true,
              employer: true,
              specialty: true,
              role: true,
            },
          },
        },
      })
    : await prisma.caseReviewer.create({
        data: {
          caseId: params.id,
          doctorId: targetDoctorId,
          userId: targetUserId,
          roleInTeam: parsed.data.roleInTeam,
          status: "ASSIGNED",
        },
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
            select: {
              id: true,
              fullName: true,
              email: true,
              employer: true,
              specialty: true,
              role: true,
            },
          },
        },
      });

  await writeAuditLog({
    entityType: "CaseReviewer",
    entityId: reviewer.id,
    action: "ASSIGN_EXAMINER",
    userId: (session.user as any).id,
    afterData: reviewer,
  });

  return NextResponse.json(reviewer, { status: 201 });
}
