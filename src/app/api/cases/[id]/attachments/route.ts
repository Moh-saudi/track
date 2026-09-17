import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_EXTS = [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"];
const MAX_SIZE_BYTES = 15 * 1024 * 1024;

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

function publicAttachment(attachment: any) {
  const { filePath, ...safe } = attachment;
  return safe;
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
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "نوع الملف غير مسموح به" }, { status: 400 });
  if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ error: "حجم الملف يتجاوز الحد المسموح (15MB)" }, { status: 400 });

  const safeBaseName = path.basename(file.name).replace(/[^\w.\-]+/g, "_");
  const ext = path.extname(safeBaseName).toLowerCase();
  if (!ALLOWED_EXTS.includes(ext)) {
    return NextResponse.json({ error: "امتداد الملف غير مسموح به لأسباب أمنية" }, { status: 400 });
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const safeName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  const destPath = path.join(UPLOAD_DIR, safeName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(destPath, buffer, { flag: "wx" });

  const attachment = await prisma.attachment.create({
    data: {
      caseId: params.id,
      fileName: path.basename(file.name),
      fileType: file.type,
      filePath: destPath,
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
    afterData: { fileName: attachment.fileName, caseId: params.id, fileSize: attachment.fileSize },
  });

  return NextResponse.json(publicAttachment(attachment), { status: 201 });
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
