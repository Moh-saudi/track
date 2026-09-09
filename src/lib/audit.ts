import { prisma } from "@/lib/prisma";

const SENSITIVE_KEYS = new Set([
  "passwordHash",
  "password",
  "currentPassword",
  "newPassword",
  "accountNumber",
  "cardNumber",
  "iban",
  "nationalIdCipher",
]);

function sanitizePayload(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  if (data instanceof Date) return data;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      sanitized[key] = "[بيانات سرية ومحمية]";
    } else if (value && typeof value === "object") {
      sanitized[key] = sanitizePayload(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export async function writeAuditLog(params: {
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  beforeData?: unknown;
  afterData?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      userId: params.userId,
      beforeData: sanitizePayload(params.beforeData) as any,
      afterData: sanitizePayload(params.afterData) as any,
    },
  });
}
