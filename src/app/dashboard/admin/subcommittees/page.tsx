"use client";

import nextDynamic from "next/dynamic";

const AdminSubCommitteesClient = nextDynamic(
  () => import("./admin-subcommittees-client"),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-9 h-9 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-600 font-medium font-body">جارِ تحميل إدارة اللجان الفرعية...</p>
      </div>
    ),
  }
);

export default function AdminSubCommitteesPage() {
  return <AdminSubCommitteesClient />;
}
