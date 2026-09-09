import type { UserRole } from "@prisma/client";

// مصفوفة الصلاحيات المحدثة لرئاسة مجلس الوزراء — اللجنة العليا للمسؤولية الطبية وسلامة المريض
export const PERMISSIONS = {
  CREATE_CASE: ["REGISTRATION_CLERK", "ADMIN"],
  ROUTE_CASE: ["FOLLOW_UP_OFFICER", "ADMIN"], // حصراً لموظف المتابعة والتوجيه والمشرف
  VIEW_FOLLOW_UP_DASHBOARD: ["FOLLOW_UP_OFFICER", "ADMIN", "RISK_OFFICER"],
  VIEW_OWN_SUBCOMMITTEE_CASES: ["SUBCOMMITTEE_MEMBER", "ADMIN"],
  MANAGE_REVIEW_TEAM: ["SUBCOMMITTEE_MEMBER", "ADMIN"],
  RECUSE_ASSIGNMENT: ["SUBCOMMITTEE_MEMBER"],
  RECORD_SUBCOMMITTEE_REPORT: ["SUBCOMMITTEE_MEMBER"],
  VIEW_ALL_CASES: ["SUPREME_COMMITTEE", "ADMIN", "FOLLOW_UP_OFFICER", "RISK_OFFICER"],
  ISSUE_FINAL_DECISION: ["SUPREME_COMMITTEE"],
  VIEW_UPDATE_PAYMENTS: ["FINANCE", "ADMIN"],
  MANAGE_USERS_AND_ROLES: ["ADMIN"],
  MANAGE_SUBCOMMITTEES_AND_SPECIALTIES: ["ADMIN"],
  ACCESS_RISK_MODE: ["RISK_OFFICER", "ADMIN"],
  VIEW_AUDIT_LOGS: ["RISK_OFFICER", "ADMIN"],
  OVERRIDE_CASE_STATUS: ["RISK_OFFICER", "ADMIN"],
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export function can(role: UserRole | undefined | null, permission: PermissionKey): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

// المسار الافتراضي للوحة تحكم كل دور بعد تسجيل الدخول
export function defaultDashboardPath(role: UserRole): string {
  switch (role) {
    case "REGISTRATION_CLERK":
      return "/dashboard/registration";
    case "FOLLOW_UP_OFFICER":
      return "/dashboard/follow-up";
    case "SUBCOMMITTEE_MEMBER":
      return "/dashboard/subcommittee";
    case "SUPREME_COMMITTEE":
      return "/dashboard/supreme";
    case "FINANCE":
      return "/dashboard/finance";
    case "ADMIN":
      return "/dashboard/admin";
    case "RISK_OFFICER":
      return "/dashboard/admin/risk-mode";
    default:
      return "/dashboard";
  }
}
