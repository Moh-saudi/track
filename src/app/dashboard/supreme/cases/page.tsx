import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { BarChart3, Scale } from "lucide-react";
import { SupremeCasesTable, SupremeCaseItem } from "./cases-table";

export const revalidate = 0;

export default async function SupremeCasesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userRole = (session.user as any).role;
  if (userRole !== "SUPREME_COMMITTEE" && userRole !== "ADMIN" && userRole !== "SUPREME_SUPERVISOR") {
    redirect("/dashboard");
  }

  function safeIsoDate(d: any): string | null {
    if (!d) return null;
    const date = new Date(d);
    return isNaN(date.getTime()) ? null : date.toISOString();
  }

  let rawCases: any[] = [];
  try {
    rawCases = await prisma.case.findMany({
      where: {
        status: {
          in: ["PENDING_SUPREME_REVIEW", "APPROVED", "REFERRED_FOR_REVIEW"],
        },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        subCommittee: { select: { id: true, name: true } },
        specialties: {
          include: { specialty: { select: { id: true, name: true } } },
        },
        supremeDecisions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, decisionType: true, createdAt: true },
        },
      },
    });
  } catch (dbErr) {
    console.error("SupremeCasesPage DB fetch error:", dbErr);
  }

  const serializedCases: SupremeCaseItem[] = (rawCases || []).map((c) => ({
    id: c.id,
    caseNumber: c.caseNumber || "—",
    caseYear: c.caseYear || new Date().getFullYear(),
    registrationType: c.registrationType || "COMPLAINT",
    respondentName: c.respondentName || null,
    hospitalName: c.hospitalName || null,
    entityType: c.entityType || null,
    entityName: c.entityName || c.hospitalName || null,
    complainantName: c.complainantName || null,
    prosecution: c.prosecution || null,
    status: c.status || "PENDING_SUPREME_REVIEW",
    createdAt: safeIsoDate(c.createdAt) || new Date().toISOString(),
    subCommittee: c.subCommittee || null,
    specialties: Array.isArray(c.specialties)
      ? c.specialties.map((s: any) => ({
          id: s.id,
          specialty: { id: s.specialty?.id || s.id, name: s.specialty?.name || "تخصص غير محدد" },
        }))
      : [],
    supremeDecisions: Array.isArray(c.supremeDecisions)
      ? c.supremeDecisions.map((d: any) => ({
          id: d.id,
          decisionType: d.decisionType,
          createdAt: safeIsoDate(d.createdAt) || new Date().toISOString(),
        }))
      : [],
  }));

  const pendingCount = serializedCases.filter((c) => c.status === "PENDING_SUPREME_REVIEW").length;

  return (
    <div className="space-y-6 font-body">
      {/* ─── رأس الصفحة الموحد ─── */}
      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "اللجنة العليا", href: "/dashboard/supreme" },
          { label: "مراجعة السجلات والقرارات" },
        ]}
        title="جدول السجلات ومراجعة قرارات الدائرة العليا"
        description="مراجعة تقارير اللجان الفرعية واتخاذ القرارات النهائية بالاعتماد أو الإحالة لإعادة الدراسة أو القرارات المغايرة."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/supreme"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
            >
              <BarChart3 className="w-4 h-4 text-teal-600" />
              <span>لوحة المؤشرات والتحليلات</span>
            </Link>
          </div>
        }
      />

      {/* ─── جدول الإجراءات التفاعلي ─── */}
      <SupremeCasesTable initialCases={serializedCases} />
    </div>
  );
}
