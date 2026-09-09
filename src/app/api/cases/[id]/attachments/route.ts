import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import fs from "fs/promises";
import path from "path";

// تخزين محلي بسيط للتطوير — يُستبدَل لاحقًا بخدمة تخزين ملفات على سيرفر الوزارة
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const caseRecord = await prisma.case.findUnique({ where: { id: params.id } });
  if (!caseRecord) return NextResponse.json({ error: "القضية غير موجودة" }, { status: 404 });

  const role = (session.user as any).role;
  const subCommitteeId = (session.user as any).subCommitteeId;
  if (role === "SUBCOMMITTEE_MEMBER" && caseRecord.subCommitteeId !== subCommitteeId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "لم يتم إرفاق ملف" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "نوع الملف غير مسموح به" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "حجم الملف يتجاوز الحد المسموح (15MB)" }, { status: 400 });
  }

  const safeBaseName = path.basename(file.name).replace(/[^\w.\-]+/g, "_");
  const ext = path.extname(safeBaseName).toLowerCase();
  const ALLOWED_EXTS = [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"];
  if (!ALLOWED_EXTS.includes(ext)) {
    return NextResponse.json({ error: "امتداد الملف غير مسموح به لأسباب أمنية" }, { status: 400 });
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const safeName = `${Date.now()}-${safeBaseName}`;
  const destPath = path.join(UPLOAD_DIR, safeName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(destPath, buffer);

  const attachment = await prisma.attachment.create({
    data: {
      caseId: params.id,
      fileName: path.basename(file.name),
      fileType: file.type,
      filePath: destPath,
      fileSize: file.size,
      uploadedById: (session.user as any).id,
    },
    include: {
      uploadedBy: {
        select: { id: true, fullName: true, role: true },
      },
    },
  });

  await writeAuditLog({
    entityType: "Attachment",
    entityId: attachment.id,
    action: "UPLOAD",
    userId: (session.user as any).id,
    afterData: { fileName: attachment.fileName, caseId: params.id },
  });

  return NextResponse.json(attachment, { status: 201 });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  const subCommitteeId = (session.user as any).subCommitteeId;

  const caseRecord = await prisma.case.findUnique({
    where: { id: params.id },
    select: { id: true, subCommitteeId: true },
  });
  if (!caseRecord) return NextResponse.json({ error: "القضية غير موجودة" }, { status: 404 });

  // فحص حظر الوصول عبر اللجان المختلفة
  if (role === "SUBCOMMITTEE_MEMBER" && caseRecord.subCommitteeId !== subCommitteeId) {
    return NextResponse.json({ error: "غير مصرح بالاطلاع على مرفقات هذه القضية" }, { status: 403 });
  }

  const attachments = await prisma.attachment.findMany({
    where: { caseId: params.id },
    include: {
      uploadedBy: {
        select: { id: true, fullName: true, role: true },
      },
    },
    orderBy: { uploadedAt: "desc" },
  });
  return NextResponse.json(attachments);
}
