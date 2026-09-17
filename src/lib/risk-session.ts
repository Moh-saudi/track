import crypto from "crypto";

const RISK_SESSION_TTL_SECONDS = 15 * 60;

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for risk-mode step-up authentication");
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createRiskSessionToken(userId: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + RISK_SESSION_TTL_SECONDS;
  const nonce = crypto.randomBytes(24).toString("base64url");
  const payload = `${userId}.${expiresAt}.${nonce}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyRiskSessionToken(token: string | undefined, userId: string): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 4) return false;

  const [tokenUserId, expiresAtRaw, nonce, signature] = parts;
  if (!tokenUserId || !expiresAtRaw || !nonce || !signature || tokenUserId !== userId) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;

  const payload = `${tokenUserId}.${expiresAtRaw}.${nonce}`;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const RISK_SESSION_MAX_AGE = RISK_SESSION_TTL_SECONDS;
