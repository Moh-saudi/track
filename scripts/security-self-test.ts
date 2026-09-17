import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getPasswordPolicyError } from "../src/lib/password-policy";
import { validateFileSignature } from "../src/lib/storage";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

assert.equal(getPasswordPolicyError("weak"), "كلمة المرور يجب ألا تقل عن 12 حرفًا");
assert.equal(getPasswordPolicyError("Strong-Password-2026!", "user@gov.eg"), null);
assert.ok(getPasswordPolicyError("User-Password-2026!", "user@gov.eg"));

assert.equal(validateFileSignature(Buffer.from("%PDF-1.7 test"), ".pdf"), true);
assert.equal(validateFileSignature(Buffer.from("not a pdf"), ".pdf"), false);
assert.equal(validateFileSignature(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]), ".png"), true);
assert.equal(validateFileSignature(Buffer.from([0xff,0xd8,0xff,0xe0]), ".jpg"), true);

const seed = read("prisma/seed.ts");
assert.ok(!seed.includes("ChangeMe123"), "Seed must not contain a shared demo password");
assert.ok(!seed.includes("@example.local"), "Seed must not create demo login aliases");
assert.ok(!/nationalId:\s*["']\d{14}/.test(seed), "Seed must not contain sample national IDs");
assert.ok(!/cardNumber:\s*["']\d/.test(seed), "Seed must not contain sample card numbers");

const auth = read("src/lib/auth.ts");
assert.ok(auth.includes("assertLoginAllowed"));
assert.ok(auth.includes("sessionVersion"));
assert.ok(!auth.includes("@example.local"));

const headers = read("next.config.js");
for (const header of [
  "Content-Security-Policy",
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "Permissions-Policy",
]) {
  assert.ok(headers.includes(header), `Missing security header: ${header}`);
}

const middleware = read("src/middleware.ts");
for (const prefix of ["/api/admin/:path*", "/api/subcommittee/:path*", "/api/cases/:path*", "/api/payments/:path*"]) {
  assert.ok(middleware.includes(prefix), `Middleware coverage missing: ${prefix}`);
}

const auditRoute = read("src/app/api/admin/audit-logs/route.ts");
assert.ok(auditRoute.includes("Math.min(Math.max(requestedLimit, 1), 200)"));

const attachmentRoute = read("src/app/api/cases/[id]/attachments/route.ts");
for (const required of ["validateFileSignature", "scanFileForMalware", "quarantineDir", "toStoredUploadPath"]) {
  assert.ok(attachmentRoute.includes(required), `Attachment hardening missing: ${required}`);
}

console.log("Security self-test: PASS");
