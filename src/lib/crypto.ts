import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) throw new Error("FIELD_ENCRYPTION_KEY غير معرّف في متغيرات البيئة");
  const key = raw.length === 64 ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("FIELD_ENCRYPTION_KEY يجب أن يكون 32 بايت (hex بطول 64 حرفًا أو base64)");
  }
  return key;
}

export function encryptField(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return PREFIX + [iv, authTag, encrypted].map((b) => b.toString("base64")).join(":");
}

export function isEncryptedField(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function decryptField(cipherText: string): string {
  const normalized = cipherText.startsWith(PREFIX) ? cipherText.slice(PREFIX.length) : cipherText;
  const [ivB64, authTagB64, dataB64] = normalized.split(":");
  if (!ivB64 || !authTagB64 || !dataB64) throw new Error("قيمة التشفير غير صالحة");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function encryptOptionalField(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  return isEncryptedField(normalized) ? normalized : encryptField(normalized);
}

export function decryptOptionalField(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!isEncryptedField(value)) {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.REQUIRE_ENCRYPTED_SENSITIVE_FIELDS === "true"
    ) {
      throw new Error("تم اكتشاف بيانات حساسة غير مشفرة في بيئة الإنتاج");
    }
    return value;
  }
  return decryptField(value);
}
