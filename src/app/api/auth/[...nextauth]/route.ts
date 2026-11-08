import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

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

async function authHandler(req: any, ctx: any) {
  try {
    return await handler(req, ctx);
  } catch (err: any) {
    console.error("[NEXTAUTH_CRASH]", err);
    return new Response(
      JSON.stringify({
        status: "auth_error",
        message: err?.message || String(err),
        stack: err?.stack,
        cause: err?.cause?.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export { authHandler as GET, authHandler as POST };
