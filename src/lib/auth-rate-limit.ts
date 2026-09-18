import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const WINDOW_MINUTES = Math.max(1, Number(process.env.LOGIN_RATE_WINDOW_MINUTES || 15));
const BLOCK_MINUTES = Math.max(1, Number(process.env.LOGIN_BLOCK_MINUTES || 15));
const MAX_FAILURES = Math.max(3, Number(process.env.LOGIN_MAX_FAILURES || 5));

function identifierHash(identifier: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for login throttling");
  return crypto.createHmac("sha256", secret).update(identifier.trim().toLowerCase()).digest("hex");
}

export async function assertLoginAllowed(identifier: string): Promise<void> {
  const key = identifierHash(identifier);
  const row = await prisma.loginThrottle.findUnique({ where: { identifierHash: key } });
  if (!row?.blockedUntil) return;
  if (row.blockedUntil.getTime() > Date.now()) {
    throw new Error("LOGIN_TEMPORARILY_BLOCKED");
  }
}

export async function recordLoginFailure(identifier: string): Promise<void> {
  const key = identifierHash(identifier);
  const now = new Date();
  const windowMs = WINDOW_MINUTES * 60_000;
  const blockMs = BLOCK_MINUTES * 60_000;

  const current = await prisma.loginThrottle.findUnique({ where: { identifierHash: key } });
  const outsideWindow = !current || now.getTime() - current.windowStart.getTime() > windowMs;
  const nextCount = outsideWindow ? 1 : current.failureCount + 1;
  const blockedUntil = nextCount >= MAX_FAILURES ? new Date(now.getTime() + blockMs) : null;

  await prisma.loginThrottle.upsert({
    where: { identifierHash: key },
    create: {
      identifierHash: key,
      failureCount: nextCount,
      windowStart: now,
      blockedUntil,
    },
    update: {
      failureCount: nextCount,
      windowStart: outsideWindow ? now : current!.windowStart,
      blockedUntil,
    },
  });
}

export async function clearLoginFailures(identifier: string): Promise<void> {
  const key = identifierHash(identifier);
  await prisma.loginThrottle.delete({ where: { identifierHash: key } }).catch(() => undefined);
}
