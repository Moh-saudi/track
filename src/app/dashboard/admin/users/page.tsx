import AdminDashboardPage from "../page";

export const revalidate = 0;

export default async function AdminUsersPage() {
  return await AdminDashboardPage({ searchParams: { tab: "users" } });
}
