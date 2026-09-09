import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const role = (session.user as any).role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "صلاحية التعديل لمدير المنظومة فقط" }, { status: 403 });
    }

    const body = await req.json();
    const updateData: any = {};
    if (body.name) updateData.name = body.name.trim();
    if (body.code !== undefined) updateData.code = body.code ? body.code.trim() : null;
    if (body.governorate !== undefined) updateData.governorate = body.governorate ? body.governorate.trim() : null;
    if (typeof body.active === "boolean") updateData.active = body.active;

    const updated = await prisma.prosecution.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PATCH /api/prosecutions/[id] error:", err);
    return NextResponse.json(
      { error: err?.message || "تعذر تعديل النيابة، يرجى المحاولة مرة أخرى" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const role = (session.user as any).role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "صلاحية الحذف لمدير النظام فقط" }, { status: 403 });
    }

    const casesCount = await prisma.case.count({
      where: { prosecutionId: params.id },
    });

    if (casesCount > 0) {
      return NextResponse.json(
        {
          error: `لا يمكن حذف النيابة لأنها مرتبطة بـ (${casesCount}) سجلات قضايا مسجلة بالمنظومة. يمكنك إيقاف تفعيلها بدلاً من ذلك.`,
        },
        { status: 400 }
      );
    }

    await prisma.prosecution.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/prosecutions/[id] error:", err);
    return NextResponse.json(
      { error: err?.message || "تعذر حذف النيابة" },
      { status: 500 }
    );
  }
}
