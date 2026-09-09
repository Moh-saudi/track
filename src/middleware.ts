import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// يفصل هذا الميدل-وير الوصول لكل مسار لوحة تحكم بحسب دور المستخدم (RBAC)
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
    const role = (req.nextauth.token as any)?.role as string | undefined;

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
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/api/cases/:path*", "/api/payments/:path*"],
};
