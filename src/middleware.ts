import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const ROUTE_ROLE_PREFIX: Record<string, string[]> = {
  "/dashboard/admin/risk-mode": ["ADMIN", "RISK_OFFICER"],
  "/dashboard/admin/audit-logs": ["ADMIN", "RISK_OFFICER"],
  "/dashboard/registration": ["REGISTRATION_CLERK", "ADMIN"],
  "/dashboard/follow-up": ["FOLLOW_UP_OFFICER", "ADMIN", "RISK_OFFICER"],
  "/dashboard/subcommittee": ["SUBCOMMITTEE_MEMBER", "ADMIN"],
  "/dashboard/supreme": ["SUPREME_COMMITTEE", "ADMIN", "RISK_OFFICER"],
  "/dashboard/finance": ["FINANCE", "ADMIN"],
  "/dashboard/admin": ["ADMIN"],
};

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token as any;
    const role = token?.role as string | undefined;

    if (token?.authInvalid) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const matchedPrefix = Object.keys(ROUTE_ROLE_PREFIX).find((prefix) =>
      pathname.startsWith(prefix)
    );
    if (matchedPrefix && (!role || !ROUTE_ROLE_PREFIX[matchedPrefix].includes(role))) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token && !(token as any)?.authInvalid,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/cases/:path*",
    "/api/payments/:path*",
    "/api/admin/:path*",
    "/api/subcommittee/:path*",
    "/api/supreme/:path*",
    "/api/follow-up/:path*",
    "/api/registration/:path*",
  ],
};
