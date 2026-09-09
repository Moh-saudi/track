"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Scale,
  Eye,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  RotateCcw,
  User,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";

export interface SupremeCaseItem {
  id: string;
  caseNumber: string;
  caseYear: number;
  registrationType: string;
  respondentName: string | null;
  hospitalName: string | null;
  complainantName: string | null;
  prosecution: string | null;
  status: string;
  createdAt: string;
  subCommittee: { id: string; name: string } | null;
  specialties: { id: string; specialty: { id: string; name: string } }[];
  supremeDecisions: { id: string; decisionType: string; createdAt: string }[];
}

interface SupremeCasesTableProps {
  initialCases: SupremeCaseItem[];
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "sky" | "emerald" | "rose" | "slate" }
> = {
  PENDING_SUPREME_REVIEW: { label: "بانتظار قرار اللجنة العليا", variant: "sky" },
  APPROVED: { label: "معتمد (قرار نهائي)", variant: "emerald" },
  REFERRED_FOR_REVIEW: { label: "محال لإعادة الدراسة", variant: "rose" },
};

export function SupremeCasesTable({ initialCases }: SupremeCasesTableProps) {
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const pendingCount = initialCases.filter((c) => c.status === "PENDING_SUPREME_REVIEW").length;
  const approvedCount = initialCases.filter((c) => c.status === "APPROVED").length;
  const referredCount = initialCases.filter((c) => c.status === "REFERRED_FOR_REVIEW").length;

  const filteredCases = useMemo(() => {
    return initialCases.filter((c) => {
      // فلتر التبويب
      if (activeTab !== "ALL" && c.status !== activeTab) {
        return false;
      }

      // فلتر البحث
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      const matchNum = `${c.caseNumber}/${c.caseYear}`.includes(term);
      const matchComplainant = c.complainantName?.toLowerCase().includes(term);
      const matchRespondent = (c.respondentName || c.hospitalName)?.toLowerCase().includes(term);
      const matchProsecution = c.prosecution?.toLowerCase().includes(term);
      const matchCommittee = c.subCommittee?.name.toLowerCase().includes(term);

      return matchNum || matchComplainant || matchRespondent || matchProsecution || matchCommittee;
    });
  }, [initialCases, activeTab, searchTerm]);

  return (
    <div className="space-y-4 font-body">
      {/* ─── أشرطة الفلترة والبحث السريع ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* تبويبات الحالات */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-2 rounded-xl font-semibold transition-colors ${
              activeTab === "ALL"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            الكل ({initialCases.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PENDING_SUPREME_REVIEW")}
            className={`px-3 py-2 rounded-xl font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "PENDING_SUPREME_REVIEW"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200/80"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>بانتظار القرار ({pendingCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("APPROVED")}
            className={`px-3 py-2 rounded-xl font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "APPROVED"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>معتمدة نهائياً ({approvedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("REFERRED_FOR_REVIEW")}
            className={`px-3 py-2 rounded-xl font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "REFERRED_FOR_REVIEW"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/80"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>محالة لإعادة الدراسة ({referredCount})</span>
          </button>
        </div>

        {/* حقل البحث السريع */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم السجل، الشاكي، المشكو في حقه..."
            className="w-full h-10 pr-9 pl-4 text-xs rounded-xl border border-slate-300 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all font-body"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* ─── جدول السجلات ─── */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-bold font-heading text-slate-800">
            جدول مراجعة وبحث قضايا الدائرة العليا
          </h2>
          <span className="text-xs text-slate-500 font-body">{filteredCases.length} سجل متاح</span>
        </div>

        {filteredCases.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium font-body">
            لا توجد سجلات مطابقة لمعايير البحث والفلترة المحددة
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">رقم السجل / السنة</TableHead>
                  <TableHead className="whitespace-nowrap">النوع</TableHead>
                  <TableHead className="min-w-[160px]">المشكو في حقه</TableHead>
                  <TableHead className="min-w-[160px]">الشاكي / المريض</TableHead>
                  <TableHead className="min-w-[180px]">اللجنة الفرعية الفاحصة</TableHead>
                  <TableHead className="min-w-[160px]">التخصصات</TableHead>
                  <TableHead className="whitespace-nowrap">الحالة</TableHead>
                  <TableHead className="text-center whitespace-nowrap">الإجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((c) => {
                  const statusInfo = STATUS_CONFIG[c.status] ?? {
                    label: c.status,
                    variant: "slate",
                  };
                  const respondent = c.respondentName || c.hospitalName;
                  const isPending = c.status === "PENDING_SUPREME_REVIEW";

                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-bold text-slate-900 whitespace-nowrap font-mono">
                        {c.caseNumber} / {c.caseYear}
                      </TableCell>

                      <TableCell>
                        <Badge variant="slate" size="sm">
                          {c.registrationType === "COMPLAINT"
                            ? "شكوى"
                            : c.registrationType === "CASE"
                            ? "قضية"
                            : "محضر"}
                        </Badge>
                      </TableCell>

                      <TableCell className="font-medium text-slate-800 text-xs">
                        {respondent ? (
                          <span
                            className="font-semibold text-slate-900 truncate block max-w-[170px]"
                            title={respondent}
                          >
                            {respondent}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs">
                        <span
                          className="font-semibold text-slate-800 truncate block max-w-[150px]"
                          title={c.complainantName || ""}
                        >
                          {c.complainantName || "—"}
                        </span>
                        {c.prosecution && (
                          <span className="text-[11px] text-slate-500 truncate block max-w-[150px]">
                            {c.prosecution}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="font-semibold text-teal-800 text-xs font-heading">
                        {c.subCommittee?.name || "—"}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {c.specialties.map((s) => (
                            <Badge key={s.id} variant="slate" size="sm">
                              {s.specialty.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant={statusInfo.variant} size="sm">
                          {statusInfo.label}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center whitespace-nowrap">
                        {isPending ? (
                          <Link
                            href={`/dashboard/supreme/${c.id}`}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 shadow-xs transition-colors font-body"
                          >
                            <Scale className="w-3.5 h-3.5" />
                            <span>مراجعة واتخاذ القرار</span>
                          </Link>
                        ) : (
                          <Link
                            href={`/dashboard/supreme/${c.id}`}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors font-body"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>عرض القرار والتقرير</span>
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
