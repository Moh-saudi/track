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

async function GET(req: NextRequest, ctx: any) {
  try {
    const res = await handler(req, ctx);
    const headers = new Headers(res.headers);
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        status: "caught_error",
        error: err?.name,
        message: err?.message,
        stack: err?.stack,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

async function POST(req: NextRequest, ctx: any) {
  try {
    const res = await handler(req, ctx);
    const headers = new Headers(res.headers);
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        status: "caught_error",
        error: err?.name,
        message: err?.message,
        stack: err?.stack,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export { GET, POST };
