import crypto from "crypto";

// تشفير الحقول الحساسة (مثل الرقم القومي) قبل تخزينها — AES-256-GCM
// يعتمد على FIELD_ENCRYPTION_KEY في .env (مفتاح 32 بايت بصيغة base64 أو hex)

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("FIELD_ENCRYPTION_KEY غير معرّف في متغيرات البيئة");
  }
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
  // تخزين: iv:authTag:ciphertext بترميز base64
  return [iv, authTag, encrypted].map((b) => b.toString("base64")).join(":");
}

export function decryptField(cipherText: string): string {
  const [ivB64, authTagB64, dataB64] = cipherText.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}
