import { NextResponse } from "next/server";
import { Client } from "pg";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres.wmgmikvjmsliizuagoer:142536475869Ph.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require";

  const diagnostics: any = {
    hasEnv: !!process.env.DATABASE_URL,
    urlRedacted: connectionString.replace(/:[^:@]+@/, ":***@"),
    timestamp: new Date().toISOString(),
  };

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });

  try {
    await client.connect();
    diagnostics.clientConnect = "OK";

    const res = await client.query('SELECT email, "fullName", role, active FROM "User" LIMIT 3;');
    diagnostics.users = res.rows;
    diagnostics.status = "SUCCESS";

    await client.end();
  } catch (err: any) {
    diagnostics.status = "CLIENT_ERROR";
    diagnostics.errorMessage = err?.message;
    diagnostics.errorCode = err?.code;
    diagnostics.errorStack = err?.stack;
    diagnostics.errorDetails = String(err);
    try {
      await client.end();
    } catch {}
  }

  return NextResponse.json(diagnostics, {
    status: diagnostics.status === "SUCCESS" ? 200 : 500,
  });
}
