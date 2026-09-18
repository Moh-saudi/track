import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import fs from "fs/promises";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { resolveStoredUploadPath } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { id, attachmentId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const userSubCommitteeId = (session.user as any).subCommitteeId;

  const caseRecord = await prisma.case.findUnique({
    where: { id: id },
    select: { id: true, subCommitteeId: true, createdById: true },
  });
  if (!caseRecord) return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });

  const permitted =
    (role === "REGISTRATION_CLERK" && caseRecord.createdById === userId) ||
    (role === "SUBCOMMITTEE_MEMBER" && !!userSubCommitteeId && caseRecord.subCommitteeId === userSubCommitteeId) ||
    can(role, "VIEW_ALL_CASES");
  if (!permitted) {
    return NextResponse.json({ error: "غير مصرح لك بالاطلاع على مرفقات هذا السجل" }, { status: 403 });
  }

  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, caseId: id },
  });
  if (!attachment) return NextResponse.json({ error: "المرفق غير موجود" }, { status: 404 });

  let resolvedPath: string;
  try {
    resolvedPath = resolveStoredUploadPath(attachment.filePath);
  } catch {
    return NextResponse.json({ error: "مسار المرفق غير صالح أمنياً" }, { status: 400 });
  }

  try {
    const fileStat = await fs.stat(resolvedPath);
    if (!fileStat.isFile()) return NextResponse.json({ error: "الملف غير موجود على السيرفر" }, { status: 404 });

    const fileBuffer = await fs.readFile(resolvedPath);
    const safeFileName = encodeURIComponent(attachment.fileName);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": attachment.fileType || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${safeFileName}`,
        "Content-Length": fileStat.size.toString(),
        "X-Content-Type-Options": "nosniff",
        "X-Download-Options": "noopen",
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (err) {
    console.error("Attachment download error:", err);
    return NextResponse.json({ error: "تعذر قراءة ملف المرفق من السيرفر" }, { status: 404 });
  }
}
