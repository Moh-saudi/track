import dynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const RegistrationReportsClient = dynamic(
  () => import("./registration-reports-client"),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-9 h-9 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-600 font-medium font-body">جارِ تحميل منظومة التقارير والإحصائيات...</p>
      </div>
    ),
  }
);

export default function RegistrationReportsPage() {
  return <RegistrationReportsClient />;
}
