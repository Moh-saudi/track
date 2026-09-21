"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/formatters";
import {
  Search,
  Filter,
  MoreHorizontal,
  Paperclip,
  User,
  Calendar,
  Building2,
  Stethoscope,
  Eye,
  ExternalLink,
  UserCheck,
  Edit3,
  CheckCircle2,
} from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; variant: "sky" | "violet" | "slate" }> = {
  COMPLAINT: { label: "شكوى", variant: "sky" },
  CASE: { label: "قضية", variant: "violet" },
  REPORT: { label: "محضر", variant: "slate" },
};

const STATUS_CONFIG: Record<string, { label: string; variant: "slate" | "amber" | "sky" | "emerald" | "rose" }> = {
  REGISTERED: { label: "بانتظار التوجيه", variant: "slate" },
  UNDER_SUBCOMMITTEE_REVIEW: { label: "قيد دراسة اللجنة الفرعية", variant: "amber" },
  PENDING_SUPREME_REVIEW: { label: "بانتظار اعتماد اللجنة العليا", variant: "sky" },
  APPROVED: { label: "معتمد (قرار نهائي)", variant: "emerald" },
  REFERRED_FOR_REVIEW: { label: "محال لإعادة الدراسة", variant: "rose" },
  CLOSED: { label: "مغلق", variant: "slate" },
};

export interface SerializedCase {
  id: string;
  caseNumber: string;
  caseYear: number;
  prosecutionCaseNumber?: string | null;
  registrationType: string;
  complainantName: string | null;
  prosecution: string | null;
  respondentName: string | null;
  respondents?: Array<{ name: string; phone?: string | null; profession?: string | null }>;
  complainants?: Array<{ name: string; phone?: string | null }>;
  hospitalName?: string | null;
  incomingDate?: string | null;
  attachmentsCount: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  isModified?: boolean;
  createdById?: string;
  createdByName?: string;
  isCreatedByMe?: boolean;
  subCommittee?: { id: string; name: string } | null;
  specialties?: { id: string; specialty: { id: string; name: string } }[];
}

export interface CasesTableProps {
  initialCases: SerializedCase[];
  subCommittees?: { id: string; name: string }[];
}

export function CasesTable({ initialCases }: CasesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const filteredCases = useMemo(() => {
    return initialCases.filter((c) => {
      if (typeFilter !== "ALL" && c.registrationType !== typeFilter) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      const matchNum = `${c.caseNumber}/${c.caseYear}`.includes(term);
      const matchProsCaseNum = c.prosecutionCaseNumber?.toLowerCase().includes(term);
      const matchComplainant = c.complainantName?.toLowerCase().includes(term);
      const matchProsecution = c.prosecution?.toLowerCase().includes(term);
      const matchRespondent = (c.respondentName || c.hospitalName)?.toLowerCase().includes(term);

      return Boolean(matchNum || matchProsCaseNum || matchComplainant || matchProsecution || matchRespondent);
    });
  }, [initialCases, searchTerm, typeFilter]);

  return (
    <div className="space-y-4 font-body">
      {/* ─── شريط التصفية والبحث (Toolbar) ─── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* حقل البحث */}
        <div className="relative flex-1 min-w-[220px]">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم السجل، رقم القضية أو المحضر، اسم الشاكي، النيابة، المشكو في حقه..."
            icon={<Search className="w-4 h-4 text-slate-400" />}
            className="h-10 text-xs"
          />
        </div>

        {/* فلاتر التصفية */}
        <div className="flex flex-wrap items-center gap-2">
          {/* فلتر النوع */}
          <div className="min-w-[130px]">
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 text-xs"
            >
              <option value="ALL">جميع الأنواع</option>
              <option value="COMPLAINT">شكاوى</option>
              <option value="CASE">قضايا</option>
              <option value="REPORT">محاضر</option>
            </Select>
          </div>

          {/* زر إعادة التعيين */}
          {(searchTerm || typeFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setTypeFilter("ALL");
              }}
              className="h-10 text-xs text-slate-500 hover:text-slate-800"
            >
              إلغاء الفلاتر
            </Button>
          )}
        </div>
      </div>

      {/* ─── شريط عدد النتائج ─── */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-body">
        <span>
          عرض <strong className="text-slate-800 font-mono">{filteredCases.length}</strong> من إجمالي{" "}
          <strong className="text-slate-800 font-mono">{initialCases.length}</strong> سجل مقيد
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] text-teal-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            <span>بيانات قيد معتمدة وموثقة</span>
          </span>
          <span className="flex items-center gap-1 text-[11px] text-amber-700">
            <Edit3 className="w-3.5 h-3.5 text-amber-600" />
            <span>رصد حالة التعديل</span>
          </span>
        </div>
      </div>

      {/* ─── حالة عدم وجود نتائج ─── */}
      {filteredCases.length === 0 && (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 font-body">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 font-heading">
              لا توجد سجلات مطابقة لمعايير البحث
            </h3>
            <p className="text-xs text-slate-500">
              جرّب تغيير كلمات البحث أو إعادة ضبط الفلاتر المختارة.
            </p>
          </div>
        </div>
      )}

      {/* ─── Desktop Table (عرض بيانات القيد فقط دون تفاصيل توجيه أو اعتماد) ─── */}
      {filteredCases.length > 0 && (
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم السجل والنوع</TableHead>
                <TableHead>رقم القضية / محضر النيابة</TableHead>
                <TableHead>الشاكي والجهة / النيابة</TableHead>
                <TableHead>المشكو في حقه</TableHead>
                <TableHead>تاريخ الوارد</TableHead>
                <TableHead>المرفقات</TableHead>
                <TableHead>تاريخ القيد</TableHead>
                <TableHead className="text-center">حالة السجل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.map((c) => {
                const typeInfo = TYPE_CONFIG[c.registrationType] ?? { label: c.registrationType, variant: "slate" };

                return (
                  <TableRow key={c.id}>
                    {/* رقم السجل + النوع */}
                    <TableCell>
                      <div className="space-y-1">
                        <span className="font-bold text-slate-900 font-mono text-sm block font-heading">
                          {c.caseNumber} / {c.caseYear}
                        </span>
                        <Badge variant={typeInfo.variant} size="sm">
                          {typeInfo.label}
                        </Badge>
                      </div>
                    </TableCell>

                    {/* رقم القضية / محضر النيابة */}
                    <TableCell>
                      {c.prosecutionCaseNumber ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-900 font-mono font-bold text-xs border border-slate-200" dir="auto">
                          {c.prosecutionCaseNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </TableCell>

                    {/* الشاكي والنيابة */}
                    <TableCell>
                      <div className="space-y-0.5 max-w-[200px]">
                        <p className="font-semibold text-slate-800 truncate" title={c.complainantName || ""}>
                          {c.complainantName || "—"}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate" title={c.prosecution || ""}>
                          {c.prosecution || "—"}
                        </p>
                      </div>
                    </TableCell>

                    {/* المشكو في حقه */}
                    <TableCell>
                      {c.respondents && c.respondents.length > 0 ? (
                        <div className="flex flex-col gap-0.5 max-w-[200px]">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 truncate" title={c.respondents.map(r => r.name).join(" - ")}>
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{c.respondents[0].name}</span>
                            {c.respondents.length > 1 && (
                              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-1 rounded shrink-0">
                                +{c.respondents.length - 1}
                              </span>
                            )}
                          </span>
                          {c.respondents[0].phone && (
                            <span className="text-[10px] text-slate-500 font-mono mr-5" dir="ltr">
                              {c.respondents[0].phone}
                            </span>
                          )}
                        </div>
                      ) : c.respondentName || c.hospitalName ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-800 max-w-[180px] truncate" title={(c.respondentName || c.hospitalName)!}>
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{c.respondentName || c.hospitalName}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </TableCell>

                    {/* تاريخ الوارد */}
                    <TableCell suppressHydrationWarning>
                      {c.incomingDate ? (
                        <span className="text-xs font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100 whitespace-nowrap" suppressHydrationWarning>
                          {formatDate(c.incomingDate)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </TableCell>

                    {/* المرفقات */}
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-medium border border-slate-200">
                        <Paperclip className="w-3 h-3 text-slate-400" />
                        <span>{c.attachmentsCount}</span>
                      </span>
                    </TableCell>

                    {/* تاريخ القيد */}
                    <TableCell className="text-xs font-mono text-slate-600 whitespace-nowrap" suppressHydrationWarning>
                      {formatDate(c.createdAt)}
                    </TableCell>

                    {/* موقف التعديل */}
                    <TableCell className="text-center">
                      {c.isModified ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold font-body"
                          title={c.updatedAt ? `آخر تعديل: ${formatDate(c.updatedAt)}` : "تم تعديل بيانات السجل"}
                        >
                          <Edit3 className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>تم التعديل</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium font-body">
                          <CheckCircle2 className="w-3 h-3 text-slate-300" />
                          <span>أصلي</span>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ─── Mobile Case Cards (شاشات الهواتف - بيانات التسجيل فقط) ─── */}
      {filteredCases.length > 0 && (
        <div className="md:hidden space-y-3">
          {filteredCases.map((c) => {
            const typeInfo = TYPE_CONFIG[c.registrationType] ?? { label: c.registrationType, variant: "slate" };

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
              >
                {/* الرأس: رقم السجل والنوع وتاريخ القيد */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <span className="text-base font-bold font-heading text-slate-900 block">
                      {c.caseNumber} / {c.caseYear}
                    </span>
                    <span className="text-xs text-slate-500 font-mono mt-0.5 block" suppressHydrationWarning>
                      قيد: {formatDate(c.createdAt)}
                    </span>
                  </div>

                  <Badge variant={typeInfo.variant} size="sm">
                    {typeInfo.label}
                  </Badge>
                </div>

                {/* البيانات الأساسية */}
                <div className="space-y-1.5 text-xs">
                  {c.prosecutionCaseNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">
                        {c.registrationType === "COMPLAINT"
                          ? "رقم الشكوى:"
                          : c.registrationType === "CASE"
                          ? "رقم القضية:"
                          : "رقم المحضر:"}
                      </span>
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200" dir="auto">
                        {c.prosecutionCaseNumber}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between">
                    <span className="text-slate-500">الشاكي / الجهة:</span>
                    <span className="font-semibold text-slate-800 text-left">
                      {c.complainantName || "—"} {c.prosecution ? `(${c.prosecution})` : ""}
                    </span>
                  </div>

                  {(c.respondentName || c.hospitalName) && (
                    <div className="flex items-start justify-between">
                      <span className="text-slate-500">المشكو في حقه:</span>
                      <span className="font-semibold text-slate-800">{c.respondentName || c.hospitalName}</span>
                    </div>
                  )}

                  {c.incomingDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">تاريخ الوارد:</span>
                      <span className="font-mono text-teal-800" suppressHydrationWarning>{formatDate(c.incomingDate)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">المرفقات:</span>
                    <span className="inline-flex items-center gap-1 text-slate-700 font-mono">
                      <Paperclip className="w-3 h-3 text-slate-400" />
                      <span>{c.attachmentsCount} ملف</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-500">موقف التعديل:</span>
                    {c.isModified ? (
                      <span className="text-[11px] font-bold text-amber-700">تم تعديله</span>
                    ) : (
                      <span className="text-[11px] text-slate-400">قيد أصلي</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
