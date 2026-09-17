import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import {
  canonicalMimeForExtension,
  caseAttachmentDir,
  ensureSecureDirectory,
  getMaxUploadBytes,
  quarantineDir,
  scanFileForMalware,
  toStoredUploadPath,
  validateFileSignature,
} from "@/lib/storage";

const ALLOWED_EXTS = [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"];

function canAccessCase(role: string, userId: string, userSubCommitteeId: string | null | undefined, record: any) {
  return (
    (role === "REGISTRATION_CLERK" && record.createdById === userId) ||
    (role === "SUBCOMMITTEE_MEMBER" && !!userSubCommitteeId && record.subCommitteeId === userSubCommitteeId) ||
    can(role as any, "VIEW_ALL_CASES")
  );
}

function canUpload(role: string, userId: string, userSubCommitteeId: string | null | undefined, record: any) {
  return (
    (role === "REGISTRATION_CLERK" && record.createdById === userId) ||
    (role === "SUBCOMMITTEE_MEMBER" && !!userSubCommitteeId && record.subCommitteeId === userSubCommitteeId) ||
    role === "FOLLOW_UP_OFFICER" || role === "ADMIN" || role === "RISK_OFFICER"
  );
}

function safeOriginalName(name: string): string {
  return path.basename(name).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 240) || "attachment";
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const subCommitteeId = (session.user as any).subCommitteeId;
  const caseRecord = await prisma.case.findUnique({
    where: { id: params.id },
    select: { id: true, createdById: true, subCommitteeId: true },
  });
  if (!caseRecord) return NextResponse.json({ error: "القضية غير موجودة" }, { status: 404 });
  if (!canUpload(role, userId, subCommitteeId, caseRecord)) {
    return NextResponse.json({ error: "غير مصرح برفع مرفقات لهذه القضية" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "لم يتم إرفاق ملف" }, { status: 400 });

  const maxSize = getMaxUploadBytes();
  if (file.size <= 0 || file.size > maxSize) {
    return NextResponse.json(
      { error: `حجم الملف غير صالح أو يتجاوز الحد المسموح (${Math.round(maxSize / 1024 / 1024)}MB)` },
      { status: 400 }
    );
  }

  const originalName = safeOriginalName(file.name);
  const ext = path.extname(originalName).toLowerCase();
  if (!ALLOWED_EXTS.includes(ext)) {
    return NextResponse.json({ error: "امتداد الملف غير مسموح به لأسباب أمنية" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateFileSignature(buffer, ext)) {
    return NextResponse.json({ error: "محتوى الملف لا يطابق نوعه أو امتداده" }, { status: 400 });
  }

  const finalDir = caseAttachmentDir(params.id);
  const tempDir = quarantineDir();
  await ensureSecureDirectory(finalDir);
  await ensureSecureDirectory(tempDir);

  const opaqueId = crypto.randomUUID();
  const finalName = `${Date.now()}-${opaqueId}${ext}`;
  const quarantinePath = path.join(tempDir, `${opaqueId}${ext}`);
  const finalPath = path.join(finalDir, finalName);

  try {
    await fs.writeFile(quarantinePath, buffer, { flag: "wx", mode: 0o640 });
    await scanFileForMalware(quarantinePath);
    await fs.rename(quarantinePath, finalPath);
    await fs.chmod(finalPath, 0o640).catch(() => undefined);
  } catch (error: any) {
    await fs.unlink(quarantinePath).catch(() => undefined);
    await fs.unlink(finalPath).catch(() => undefined);

    if (error?.message === "MALWARE_DETECTED") {
      return NextResponse.json({ error: "تم رفض الملف بعد اكتشاف محتوى ضار" }, { status: 422 });
    }
    if (error?.message === "MALWARE_SCANNER_UNAVAILABLE") {
      return NextResponse.json({ error: "خدمة فحص الملفات غير متاحة حاليًا، تم إيقاف الرفع حفاظًا على الأمان" }, { status: 503 });
    }
    console.error("Attachment storage error:", error);
    return NextResponse.json({ error: "تعذر حفظ المرفق على مخزن الملفات الآمن" }, { status: 500 });
  }

  try {
    const attachment = await prisma.attachment.create({
      data: {
        caseId: params.id,
        fileName: originalName,
        fileType: canonicalMimeForExtension(ext),
        filePath: toStoredUploadPath(finalPath),
        fileSize: file.size,
        uploadedById: userId,
      },
      include: { uploadedBy: { select: { id: true, fullName: true, role: true } } },
    });

    await writeAuditLog({
      entityType: "Attachment",
      entityId: attachment.id,
      action: "UPLOAD",
      userId,
      afterData: {
        fileName: attachment.fileName,
        caseId: params.id,
        fileSize: attachment.fileSize,
        fileType: attachment.fileType,
      },
    });

    const { filePath, ...safeAttachment } = attachment;
    return NextResponse.json(safeAttachment, { status: 201 });
  } catch (error) {
    await fs.unlink(finalPath).catch(() => undefined);
    console.error("Attachment DB error:", error);
    return NextResponse.json({ error: "تعذر تسجيل المرفق بعد حفظه" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const subCommitteeId = (session.user as any).subCommitteeId;
  const caseRecord = await prisma.case.findUnique({
    where: { id: params.id },
    select: { id: true, createdById: true, subCommitteeId: true },
  });
  if (!caseRecord) return NextResponse.json({ error: "القضية غير موجودة" }, { status: 404 });
  if (!canAccessCase(role, userId, subCommitteeId, caseRecord)) {
    return NextResponse.json({ error: "غير مصرح بالاطلاع على مرفقات هذه القضية" }, { status: 403 });
  }

  const attachments = await prisma.attachment.findMany({
    where: { caseId: params.id },
    select: {
      id: true,
      caseId: true,
      fileName: true,
      fileType: true,
      fileSize: true,
      uploadedAt: true,
      uploadedBy: { select: { id: true, fullName: true, role: true } },
    },
    orderBy: { uploadedAt: "desc" },
  });
  return NextResponse.json(attachments);
}
