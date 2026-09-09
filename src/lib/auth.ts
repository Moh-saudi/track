import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { subCommittee: true },
        });
        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        // إذا كانت اللجنة التابع لها الحساب موقوفة بنظام القفل التام
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
      }
      return token;
    },
    async session({ session, token }) {
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
