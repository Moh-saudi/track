import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import fs from "fs/promises";
import path from "path";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const DOCUMENT_DIR = path.resolve(process.cwd(), "uploads", "doctor-national-id");
const MAX_PDF_BYTES = 12 * 1024 * 1024;
const LOCAL_DOCUMENT_UPLOAD_ENABLED = process.env.ENABLE_LOCAL_DOCUMENT_UPLOAD === "true";

async function authorizeDoctorAccess(doctorId: string, user: any, write = false) {
  const doctor = await prisma.subCommitteeDoctor.findUnique({
    where: { id: doctorId },
    select: { id: true, name: true, subCommitteeId: true },
  });
  if (!doctor) return { error: "الطبيب غير موجود", status: 404 as const };

  const role = user.role as string;
  if (write) {
    if (role !== "ADMIN" && role !== "SUBCOMMITTEE_MEMBER") {
      return { error: "غير مصرح برفع مستند بطاقة الرقم القومي", status: 403 as const };
    }
  } else if (!["ADMIN", "SUBCOMMITTEE_MEMBER", "FINANCE"].includes(role)) {
    return { error: "غير مصرح بالاطلاع على مستند بطاقة الرقم القومي", status: 403 as const };
  }

  if (role === "SUBCOMMITTEE_MEMBER" && doctor.subCommitteeId !== user.subCommitteeId) {
    return { error: "غير مصرح بالوصول إلى بيانات عضو خارج لجنتك", status: 403 as const };
  }

  return { doctor };
}

function documentPath(doctorId: string) {
  return path.join(DOCUMENT_DIR, `${doctorId}.pdf`);
}

function storageDisabledResponse() {
  return NextResponse.json(
    { error: "تخزين ملفات بطاقة الرقم القومي غير مفعل على بيئة الاستضافة الحالية" },
    { status: 503 }
  );
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!LOCAL_DOCUMENT_UPLOAD_ENABLED) return storageDisabledResponse();

  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const access = await authorizeDoctorAccess(params.id, user, true);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "ملف بطاقة الرقم القومي مطلوب" }, { status: 400 });
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "يجب إرسال مستند البطاقة بصيغة PDF" }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "حجم ملف PDF غير صالح أو يتجاوز 12 ميجابايت" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const signature = new TextDecoder("ascii").decode(bytes.slice(0, 5));
  if (signature !== "%PDF-") {
    return NextResponse.json({ error: "محتوى الملف لا يطابق صيغة PDF" }, { status: 400 });
  }

  await fs.mkdir(DOCUMENT_DIR, { recursive: true });
  await fs.writeFile(documentPath(params.id), bytes);

  await writeAuditLog({
    entityType: "SubCommitteeDoctor",
    entityId: params.id,
    action: "UPLOAD_NATIONAL_ID_DOCUMENT",
    userId: user.id,
    afterData: { fileType: "application/pdf", fileSize: file.size },
  });

  return NextResponse.json({
    success: true,
    hasNationalIdDocument: true,
    downloadUrl: `/api/subcommittee/doctors/${params.id}/national-id-document`,
  });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!LOCAL_DOCUMENT_UPLOAD_ENABLED) return storageDisabledResponse();

  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const access = await authorizeDoctorAccess(params.id, user, false);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const targetPath = documentPath(params.id);
  try {
    const stat = await fs.stat(targetPath);
    if (!stat.isFile()) throw new Error("not-file");
    const buffer = await fs.readFile(targetPath);
    const safeName = encodeURIComponent(`national-id-${access.doctor.name}.pdf`);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${safeName}`,
        "Content-Length": stat.size.toString(),
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "لا يوجد ملف بطاقة رقم قومي مرفوع لهذا العضو" }, { status: 404 });
  }
}
