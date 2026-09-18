import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  assertLoginAllowed,
  clearLoginFailures,
  recordLoginFailure,
} from "@/lib/auth-rate-limit";

const SESSION_MAX_AGE_SECONDS = Math.max(
  15 * 60,
  Number(process.env.SESSION_MAX_AGE_SECONDS || 8 * 60 * 60)
);

export const authOptions: NextAuthOptions = {
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
        await assertLoginAllowed(inputEmail);

        const user = await prisma.user.findFirst({
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

        if (!user || !user.active) {
          await recordLoginFailure(inputEmail);
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          await recordLoginFailure(inputEmail);
          return null;
        }

        if (
          user.subCommittee &&
          !user.subCommittee.active &&
          user.subCommittee.deactivationMode === "LOCK_OUT"
        ) {
          await recordLoginFailure(inputEmail);
          throw new Error("LOCKED_SUBCOMMITTEE");
        }

        await clearLoginFailures(inputEmail);

        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          role: user.role,
          employer: user.employer,
          sessionVersion: user.sessionVersion,
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
        token.sessionVersion = (user as any).sessionVersion;
        token.authInvalid = false;
        return token;
      }

      if (token.id) {
        const current = await prisma.user.findUnique({
          where: { id: String(token.id) },
          select: {
            active: true,
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

        const lockedCommittee =
          !!current?.subCommittee &&
          !current.subCommittee.active &&
          current.subCommittee.deactivationMode === "LOCK_OUT";

        if (
          !current ||
          !current.active ||
          lockedCommittee ||
          current.sessionVersion !== Number(token.sessionVersion)
        ) {
          token.authInvalid = true;
          return token;
        }

        token.authInvalid = false;
        token.role = current.role;
        token.employer = current.employer;
        token.subCommitteeId = current.subCommitteeId;
        token.specialtyId = current.specialtyId;
        token.subCommitteeName = current.subCommittee?.name;
        token.subCommitteeActive = current.subCommittee ? current.subCommittee.active : true;
        token.subCommitteeDeactivationMode = current.subCommittee?.deactivationMode || null;
        token.subCommitteeDeactivationReason = current.subCommittee?.deactivationReason || null;
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
