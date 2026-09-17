import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { formatDate } from "@/lib/formatters";

/**
 * POST /api/cases/[id]/revert-routing
 * إلغاء توجيه السجل وإعادته من اللجنة الفرعية إلى مسؤول المتابعة والتوجيه
 * متاح حصراً لمدير النظام (ADMIN)
 * شرط إلزامي: ألا تكون اللجنة الفرعية قد حددت تاريخ انعقاد لها (meetingDate == null)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "ADMIN") {
    return NextResponse.json(
      { error: "غير مصرح — إلغاء التوجيه وتصحيح المسار مخصص حصراً لمدير النظام (ADMIN)" },
      { status: 403 }
    );
  }

  let body: { reason?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const reason = body.reason?.trim() || "إلغاء توجيه خاطئ وتصحيح المسار بواسطة مدير المنظومة";

  const caseRecord = await prisma.case.findUnique({
    where: { id: (await params).id },
    include: {
      subCommittee: { select: { id: true, name: true } },
      actions: {
        select: { id: true, reportDate: true, reportText: true },
      },
    },
  });

  if (!caseRecord) {
    return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
  }

  // التأكد من أن القضية موجهة بالفعل
  if (!caseRecord.subCommitteeId) {
    return NextResponse.json(
      { error: "هذا السجل غير موجه لأي لجنة فرعية حالياً (هو بالفعل بقائمة بانتظار التوجيه)." },
      { status: 400 }
    );
  }

  // الشرط الحاسم: ألا تكون اللجنة الفرعية قد حددت تاريخ انعقاد
  if (caseRecord.meetingDate) {
    return NextResponse.json(
      {
        error: `لا يمكن إلغاء التوجيه لأن اللجنة الفرعية حددت بالفعل تاريخ انعقاد للجلسة في (${formatDate(
          caseRecord.meetingDate
        )}). يجب إلغاء موعد الانعقاد أولاً إذا تطلب الأمر.`,
      },
      { status: 400 }
    );
  }

  // التأكد من عدم صدور تقرير من اللجنة الفرعية
  const hasReport = caseRecord.actions.some(
    (a) => a.reportDate != null || (a.reportText && a.reportText.trim().length > 0)
  );
  if (hasReport) {
    return NextResponse.json(
      { error: "لا يمكن إلغاء التوجيه لأن اللجنة الفرعية قامت بإصدار تقريرها الطبي بالفعل." },
      { status: 400 }
    );
  }

  // التأكد من عدم اعتماد القضية نهائياً
  if (caseRecord.status === "APPROVED" || caseRecord.status === "CLOSED") {
    return NextResponse.json(
      { error: "لا يمكن إلغاء توجيه قضية معتمدة نهائياً أو مغلقة." },
      { status: 400 }
    );
  }

  const prevCommitteeName = caseRecord.subCommittee?.name || "اللجنة الفرعية";
  const prevCommitteeId = caseRecord.subCommitteeId;

  // إعادة ضبط السجل: سحب من اللجنة الفرعية، مسح فريق الفحص السابق، وإرجاع الحالة إلى REGISTERED
  const [updated] = await prisma.$transaction([
    prisma.case.update({
      where: { id: (await params).id },
      data: {
        subCommitteeId: null,
        assignedAt: null,
        expectedDueDate: null,
        status: "REGISTERED",
      },
      include: {
        createdBy: { select: { fullName: true } },
      },
    }),
    // حذف أي تشكيل مراجعين طبيين مرتبط باللجنة السابقة لتفادي التعارض
    prisma.caseReviewer.deleteMany({
      where: { caseId: (await params).id },
    }),
    // حذف أي سجلات جدول انعقاد مسبقة
    prisma.meetingReschedule.deleteMany({
      where: { caseId: (await params).id },
    }),
  ]);

  // تسجيل حركة التدقيق الرقابي الإلزامية
  await writeAuditLog({
    entityType: "Case",
    entityId: updated.id,
    action: "REVERT_ROUTING",
    userId: (session.user as any).id,
    beforeData: {
      subCommitteeId: prevCommitteeId,
      subCommitteeName: prevCommitteeName,
      status: caseRecord.status,
    },
    afterData: {
      subCommitteeId: null,
      status: "REGISTERED",
      reason,
      revertedByAdmin: (session.user as any).name || "مدير النظام",
    },
  });

  return NextResponse.json({
    success: true,
    message: `تم إلغاء توجيه السجل من (${prevCommitteeName}) بنجاح، وأُعيد فوراً إلى قائمة "بانتظار التوجيه" لدى مسؤول المتابعة والتوجيه.`,
    case: updated,
  });
}
