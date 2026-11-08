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

  const tests: any[] = [
    {
      name: "pooler_6543_ssl_true",
      url: "postgresql://postgres.wmgmikvjmsliizuagoer:142536475869Ph.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
      ssl: true,
    },
    {
      name: "pooler_6543_ssl_false",
      url: "postgresql://postgres.wmgmikvjmsliizuagoer:142536475869Ph.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
      ssl: false,
    },
    {
      name: "direct_5432_ssl_true",
      url: "postgresql://postgres.wmgmikvjmsliizuagoer:142536475869Ph.@aws-0-eu-central-1.pooler.supabase.com:5432/postgres",
      ssl: true,
    },
  ];

  const results: any[] = [];

  for (const t of tests) {
    const client = new Client({
      connectionString: t.url,
      ssl: t.ssl,
      connectionTimeoutMillis: 5000,
    });

    try {
      await client.connect();
      const res = await client.query('SELECT 1 as connected;');
      results.push({ name: t.name, status: "SUCCESS", rows: res.rows });
      await client.end();
      break; // Stop on first success!
    } catch (err: any) {
      results.push({
        name: t.name,
        status: "ERROR",
        message: err?.message,
        code: err?.code,
      });
      try {
        await client.end();
      } catch {}
    }
  }

  diagnostics.results = results;

  return NextResponse.json(diagnostics, {
    status: results.some((r) => r.status === "SUCCESS") ? 200 : 500,
  });
}
