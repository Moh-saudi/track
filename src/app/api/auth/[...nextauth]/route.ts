import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = "https://track.mo-saudi19-145.workers.dev";
}
if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = "Pm6UPRT2v4Cy1uVxamD1BXmnZGas+2sWONNe1BR+uy0=";
}
if (!process.env.AUTH_TRUST_HOST) {
  process.env.AUTH_TRUST_HOST = "true";
}

const handler = NextAuth(authOptions);

async function authRoute(req: NextRequest, ctx: any) {
  // Direct test probe: return immediate response to verify route execution
  const url = new URL(req.url);
  if (url.searchParams.get("probe") === "true") {
    return new Response(JSON.stringify({ probe: "ok", method: req.method }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const res = await handler(req, ctx);
    return res;
  } catch (err: any) {
    console.error("[AUTH_ROUTE_CRASH]:", err);
    return new Response(
      JSON.stringify({
        status: "auth_error",
        name: err?.name || "Error",
        message: err?.message || String(err),
        stack: err?.stack || null,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export { authRoute as GET, authRoute as POST };
