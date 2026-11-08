import { NextResponse } from "next/server";
import { Client } from "pg";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  let hyperdriveUrl = "";
  try {
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    if (ctx?.env?.HYPERDRIVE?.connectionString) {
      hyperdriveUrl = ctx.env.HYPERDRIVE.connectionString;
    }
  } catch {}

  const diagnostics: any = {
    hasHyperdrive: !!hyperdriveUrl,
    timestamp: new Date().toISOString(),
  };

  if (hyperdriveUrl) {
    try {
      const client = new Client({ connectionString: hyperdriveUrl });
      await client.connect();
      const res = await client.query('SELECT 1 as connected, NOW() as server_time;');
      diagnostics.hyperdrive = { status: "SUCCESS", rows: res.rows };
      await client.end();
      return NextResponse.json(diagnostics, { status: 200 });
    } catch (err: any) {
      diagnostics.hyperdrive = {
        status: "ERROR",
        message: err?.message,
        code: err?.code,
      };
    }
  }

  return NextResponse.json(diagnostics, {
    status: diagnostics.hyperdrive?.status === "SUCCESS" ? 200 : 500,
  });
}
