import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; attachmentId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userSubCommitteeId = (session.user as any).subCommitteeId;

  // جلب السجل والمرفق للتأكد من الصلاحيات والتطابق
  const caseRecord = await prisma.case.findUnique({
    where: { id: params.id },
    select: { id: true, subCommitteeId: true, createdById: true },
  });

  if (!caseRecord) {
    return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
  }

  // عزل اللجان الفرعية: لا يحق لعضو لجنة فرعية تنزيل مرفقات لجنة أخرى
  if (role === "SUBCOMMITTEE_MEMBER" && caseRecord.subCommitteeId !== userSubCommitteeId) {
    return NextResponse.json({ error: "غير مصرح لك بالاطلاع على مرفقات هذا السجل" }, { status: 403 });
  }

  const attachment = await prisma.attachment.findFirst({
    where: {
      id: params.attachmentId,
      caseId: params.id,
    },
  });

  if (!attachment) {
    return NextResponse.json({ error: "المرفق غير موجود" }, { status: 404 });
  }

  // الحماية من التسلل عبر المسارات (Path Traversal Protection)
  const resolvedPath = path.resolve(attachment.filePath);
  if (!resolvedPath.startsWith(UPLOAD_DIR)) {
    return NextResponse.json({ error: "مسار المرفق غير صالح أمنياً" }, { status: 400 });
  }

  try {
    const fileStat = await fs.stat(resolvedPath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: "الملف غير موجود على السيرفر" }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(resolvedPath);
    const safeFileName = encodeURIComponent(attachment.fileName);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": attachment.fileType || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${safeFileName}`,
        "Content-Length": fileStat.size.toString(),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      },
    });
  } catch (err) {
    console.error("Attachment download error:", err);
    return NextResponse.json({ error: "تعذر قراءة ملف المرفق من السيرفر" }, { status: 404 });
  }
}
