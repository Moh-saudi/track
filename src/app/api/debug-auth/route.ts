import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const steps: Record<string, any> = {};

  // Step 1: Query login throttle
  const t0 = Date.now();
  try {
    const throttle = await prisma.loginThrottle.findFirst();
    steps.step1_throttle = { ok: true, durationMs: Date.now() - t0, found: !!throttle };
  } catch (e: any) {
    steps.step1_throttle = { ok: false, error: e.message, durationMs: Date.now() - t0 };
  }

  // Step 2: Query admin user
  const t1 = Date.now();
  let user: any = null;
  try {
    user = await prisma.user.findFirst({
      where: { email: { equals: "admin@example.local", mode: "insensitive" } },
      select: { id: true, email: true, active: true, passwordHash: true, role: true },
    });
    steps.step2_user = {
      ok: true,
      durationMs: Date.now() - t1,
      found: !!user,
      id: user?.id,
      email: user?.email,
      active: user?.active,
      hashLength: user?.passwordHash?.length,
    };
  } catch (e: any) {
    steps.step2_user = { ok: false, error: e.message, durationMs: Date.now() - t1 };
  }

  // Step 3: Test bcrypt comparison
  const t2 = Date.now();
  try {
    if (user?.passwordHash) {
      const match = await bcrypt.compare("ChangeMe123!", user.passwordHash);
      steps.step3_bcrypt = { ok: true, durationMs: Date.now() - t2, match };
    } else {
      steps.step3_bcrypt = { ok: false, error: "No user or hash" };
    }
  } catch (e: any) {
    steps.step3_bcrypt = { ok: false, error: e.message, durationMs: Date.now() - t2 };
  }

  return NextResponse.json({ success: true, steps });
}
