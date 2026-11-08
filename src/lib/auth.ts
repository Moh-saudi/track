import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma, resetPrismaClient } from "@/lib/prisma";
import {
  assertLoginAllowed,
  clearLoginFailures,
  recordLoginFailure,
} from "@/lib/auth-rate-limit";

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = "https://track.mo-saudi19-145.workers.dev";
}
if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = "Pm6UPRT2v4Cy1uVxamD1BXmnZGas+2sWONNe1BR+uy0=";
}
if (!process.env.AUTH_TRUST_HOST) {
  process.env.AUTH_TRUST_HOST = "true";
}

const SESSION_MAX_AGE_SECONDS = Math.max(
  15 * 60,
  Number(process.env.SESSION_MAX_AGE_SECONDS || 8 * 60 * 60)
);

export const authOptions: NextAuthOptions = {
  // @ts-ignore NextAuth v4 trusts Cloudflare edge reverse proxy host header
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "البريد الإلكتروني", type: "email" },
        password: { label: "كلمة المرور", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const inputEmail = credentials.email.trim().toLowerCase();

        let user;
        const getUserQuery = () =>
          prisma.user.findFirst({
            where: {
              email: { equals: inputEmail, mode: "insensitive" },
            },
            select: {
              id: true,
              email: true,
              fullName: true,
              passwordHash: true,
              role: true,
              employer: true,
              active: true,
              sessionVersion: true,
              subCommitteeId: true,
              specialtyId: true,
              subCommittee: {
                select: {
                  id: true,
                  name: true,
                  active: true,
                  deactivationMode: true,
                  deactivationReason: true,
                },
              },
            },
          });

        try {
          user = await getUserQuery();
        } catch (dbErr: any) {
          console.warn("[AUTH] First login DB attempt failed, resetting pool and retrying...", dbErr?.message);
          resetPrismaClient();
          try {
            await new Promise((r) => setTimeout(r, 150));
            user = await getUserQuery();
          } catch (retryErr: any) {
            console.error("[AUTH] Database retry error during login for:", inputEmail, retryErr);
            throw new Error("DATABASE_CONNECTION_ERROR");
          }
        }

        if (!user || !user.active) {
          return null;
        }

        let valid = false;
        try {
          valid = bcrypt.compareSync(credentials.password, user.passwordHash);
        } catch (bcErr) {
          console.error("[AUTH] bcrypt comparison error:", bcErr);
        }
        if (!valid) {
          return null;
        }

        if (
          user.subCommittee &&
          !user.subCommittee.active &&
          user.subCommittee.deactivationMode === "LOCK_OUT"
        ) {
          throw new Error("LOCKED_SUBCOMMITTEE");
        }

        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          role: user.role,
          employer: user.employer,
          sessionVersion: user.sessionVersion ?? 1,
          subCommitteeId: user.subCommitteeId,
          subCommitteeName: user.subCommittee?.name,
          subCommitteeActive: user.subCommittee ? user.subCommittee.active : true,
          subCommitteeDeactivationMode: user.subCommittee?.deactivationMode || null,
          subCommitteeDeactivationReason: user.subCommittee?.deactivationReason || null,
          specialtyId: user.specialtyId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const now = Date.now();

      if (user) {
        token.role = (user as any).role;
        token.subCommitteeId = (user as any).subCommitteeId;
        token.subCommitteeName = (user as any).subCommitteeName;
        token.subCommitteeActive = (user as any).subCommitteeActive;
        token.subCommitteeDeactivationMode = (user as any).subCommitteeDeactivationMode;
        token.subCommitteeDeactivationReason = (user as any).subCommitteeDeactivationReason;
        token.id = (user as any).id;
        token.employer = (user as any).employer;
        token.specialtyId = (user as any).specialtyId;
        token.sessionVersion = (user as any).sessionVersion ?? 1;
        token.authInvalid = false;
        token.lastCheckedAt = now;
        return token;
      }

      // ترشيد استعلامات Supabase: إذا تم التحقق خلال آخر 5 دقائق والجلسة صالحة، لا نعيد ضرب قاعدة البيانات
      const lastCheck = Number((token as any).lastCheckedAt || 0);
      if (token.id && now - lastCheck < 5 * 60 * 1000 && !(token as any).authInvalid) {
        return token;
      }

      if (token.id) {
        try {
          const current = await prisma.user.findUnique({
            where: { id: String(token.id) },
            select: {
              active: true,
              fullName: true,
              role: true,
              employer: true,
              subCommitteeId: true,
              specialtyId: true,
              sessionVersion: true,
              subCommittee: {
                select: {
                  name: true,
                  active: true,
                  deactivationMode: true,
                  deactivationReason: true,
                },
              },
            },
          });

          // إذا تم حذف المستخدم نهائياً
          if (!current) {
            token.authInvalid = true;
            return token;
          }

          // إذا تم تعطيل حساب المستخدم إدارياً
          if (!current.active) {
            token.authInvalid = true;
            return token;
          }

          const lockedCommittee =
            !!current.subCommittee &&
            !current.subCommittee.active &&
            current.subCommittee.deactivationMode === "LOCK_OUT";

          const dbVersion = current.sessionVersion ?? 1;
          const tokenVersion = Number(token.sessionVersion ?? 1);
          const versionMismatch =
            token.sessionVersion !== undefined &&
            token.sessionVersion !== null &&
            !isNaN(tokenVersion) &&
            tokenVersion !== dbVersion;

          if (lockedCommittee || versionMismatch) {
            token.authInvalid = true;
            return token;
          }

          token.authInvalid = false;
          token.lastCheckedAt = now;
          token.sessionVersion = dbVersion;
          token.role = current.role;
          if (current.fullName) token.name = current.fullName;
          token.employer = current.employer;
          token.subCommitteeId = current.subCommitteeId;
          token.specialtyId = current.specialtyId;
          token.subCommitteeName = current.subCommittee?.name;
          token.subCommitteeActive = current.subCommittee ? current.subCommittee.active : true;
          token.subCommitteeDeactivationMode = current.subCommittee?.deactivationMode || null;
          token.subCommitteeDeactivationReason = current.subCommittee?.deactivationReason || null;
        } catch (dbErr) {
          // حماية استقرار الجلسات: في حال حدوث بطء أو انقطاع لحظي في مسبح اتصالات Supabase،
          // لا يتم إبطال الجلسة ولا طرد الموظف، بل يستمر بناءً على التوكن المشفر الصالح
          console.warn("User session DB revalidation skipped due to transient connection blip:", dbErr);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if ((token as any).authInvalid) {
        (session as any).authInvalid = true;
        (session as any).user = null;
        return session;
      }

      if (session.user) {
        (session.user as any).id = token.id;
        if (token.name) (session.user as any).name = token.name;
        (session.user as any).role = token.role;
        (session.user as any).subCommitteeId = token.subCommitteeId;
        (session.user as any).subCommitteeName = token.subCommitteeName;
        (session.user as any).subCommitteeActive = token.subCommitteeActive;
        (session.user as any).subCommitteeDeactivationMode = token.subCommitteeDeactivationMode;
        (session.user as any).subCommitteeDeactivationReason = token.subCommitteeDeactivationReason;
        (session.user as any).employer = token.employer;
        (session.user as any).specialtyId = token.specialtyId;
      }
      return session;
    },
  },
};
