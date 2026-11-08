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

async function authHandler(req: any, ctx: any) {
  const resolvedParams = ctx?.params ? await ctx.params : undefined;
  return NextAuth(req, { ...ctx, params: resolvedParams }, authOptions);
}

export { authHandler as GET, authHandler as POST };
