import { prisma } from "@/lib/prisma";

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
      beforeData: params.beforeData as any,
      afterData: params.afterData as any,
    },
  });
}
