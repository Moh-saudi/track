import AdminAuditLogsPage from "../audit-logs/page";

export const revalidate = 0;

export default async function AuditActionsPage() {
  return await AdminAuditLogsPage({ searchParams: { tab: "actions" } });
}
