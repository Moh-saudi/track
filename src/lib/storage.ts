import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export function getUploadRoot(): string {
  const configured = process.env.UPLOAD_ROOT?.trim();
  return path.resolve(configured || path.join(process.cwd(), "uploads"));
}

export function getMaxUploadBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_MB || 25);
  const safeMb = Number.isFinite(mb) ? Math.min(Math.max(mb, 1), 100) : 25;
  return safeMb * 1024 * 1024;
}

export function caseAttachmentDir(caseId: string): string {
  return path.join(getUploadRoot(), "case-attachments", caseId);
}

export function nationalIdDocumentDir(): string {
  return path.join(getUploadRoot(), "doctor-national-id");
}

export function quarantineDir(): string {
  return path.join(getUploadRoot(), ".quarantine");
}

export function assertPathInsideUploadRoot(targetPath: string): string {
  const root = getUploadRoot();
  const resolved = path.resolve(targetPath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("INVALID_UPLOAD_PATH");
  }
  return resolved;
}

function startsWith(buffer: Buffer, signature: number[]): boolean {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, index) => buffer[index] === byte);
}

export function validateFileSignature(buffer: Buffer, extension: string): boolean {
  const ext = extension.toLowerCase();
  if (ext === ".pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (ext === ".png") return startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (ext === ".jpg" || ext === ".jpeg") return startsWith(buffer, [0xff, 0xd8, 0xff]);
  if (ext === ".doc") return startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (ext === ".docx") {
    const isZip = startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]);
    if (!isZip) return false;
    const sample = buffer.subarray(0, Math.min(buffer.length, 2 * 1024 * 1024)).toString("latin1");
    return sample.includes("[Content_Types].xml") && sample.includes("word/");
  }
  return false;
}

export async function ensureSecureDirectory(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true, mode: 0o750 });
  await fs.chmod(dir, 0o750).catch(() => undefined);
}

export async function scanFileForMalware(filePath: string): Promise<void> {
  const mode = (process.env.MALWARE_SCAN_MODE || "off").toLowerCase();
  if (mode === "off") return;

  const command = process.env.CLAMAV_COMMAND?.trim() || "clamdscan";
  try {
    await execFileAsync(command, ["--no-summary", filePath], {
      timeout: Number(process.env.CLAMAV_TIMEOUT_MS || 60_000),
      maxBuffer: 1024 * 1024,
    });
  } catch (error: any) {
    const exitCode = typeof error?.code === "number" ? error.code : null;
    if (exitCode === 1) throw new Error("MALWARE_DETECTED");
    if (mode === "required") throw new Error("MALWARE_SCANNER_UNAVAILABLE");
  }
}
