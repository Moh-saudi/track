import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  targetStatus: z.enum([
    "UNDER_SUBCOMMITTEE_REVIEW",
    "PENDING_SUPREME_REVIEW",
    "REFERRED_FOR_REVIEW",
  ]),
  riskOverrideReason: z
    .string()
    .min(10, "يجب كتابة مبرر وتوصيف كافٍ للخطأ المادي أو المخاطرة (10 أحرف كحد أدنى)"),
  riskOverrideDocument: z
    .string()
    .min(3, "رقم السند الإداري أو تأشيرة القرار مطلوب"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!session?.user || (user?.role !== "ADMIN" && user?.role !== "RISK_OFFICER")) {
    return NextResponse.json(
      { error: "غير مصرح — صلاحية حصرية لمدير المنظومة ومسؤول إدارة المخاطر" },
      { status: 403 }
    );
  }

  // التحقق من تفعيل وضع المخاطر عبر تأكيد كلمة المرور حديثاً (Step-Up Authentication)
  const riskSessionCookie = req.cookies.get("risk_mode_session")?.value;
  if (!riskSessionCookie || riskSessionCookie !== `active_${user.id}`) {
    return NextResponse.json(
      {
        error: "جلسة وضع إدارة المخاطر غير مفعلة أو منتهية الصلاحية. يرجى تأكيد كلمة المرور وتفعيل وضع إدارة المخاطر أولاً لتنفيذ هذا الإجراء الاستثنائي.",
      },
      { status: 403 }
    );
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { targetStatus, riskOverrideReason, riskOverrideDocument } = parsed.data;

  const existingCase = await prisma.case.findUnique({
    where: { id: params.id },
    include: {
      subCommittee: true,
      supremeDecisions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!existingCase) {
    return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
  }

  const updatedCase = await prisma.case.update({
    where: { id: params.id },
    data: {
      status: targetStatus as any,
      isRiskOverridden: true,
      riskOverrideReason: riskOverrideReason.trim(),
      riskOverrideDocument: riskOverrideDocument.trim(),
      riskOverriddenAt: new Date(),
      riskOverriddenById: user.id,
    },
  });

  // Write high-priority audit log
  await writeAuditLog({
    entityType: "Case",
    entityId: params.id,
    action: "ADMIN_RISK_OVERRIDE",
    userId: user.id,
    beforeData: {
      caseNumber: existingCase.caseNumber,
      caseYear: existingCase.caseYear,
      previousStatus: existingCase.status,
    },
    afterData: {
      caseNumber: updatedCase.caseNumber,
      caseYear: updatedCase.caseYear,
      newStatus: updatedCase.status,
      riskOverrideReason: updatedCase.riskOverrideReason,
      riskOverrideDocument: updatedCase.riskOverrideDocument,
      overriddenAt: updatedCase.riskOverriddenAt,
    },
  });

  return NextResponse.json(updatedCase);
}
