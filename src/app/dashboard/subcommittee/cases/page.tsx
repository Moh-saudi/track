import SubCommitteeDashboard from "../page";

export const revalidate = 0;

export default async function SubCommitteeCasesPage() {
  return await SubCommitteeDashboard({ searchParams: { tab: "cases" } });
}
