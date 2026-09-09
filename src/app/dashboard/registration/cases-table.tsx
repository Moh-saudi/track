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
  registrationType: string;
  complainantName: string | null;
  prosecution: string | null;
  respondentName: string | null;
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
  subCommittee: { id: string; name: string } | null;
  specialties: { id: string; specialty: { id: string; name: string } }[];
}

export interface CasesTableProps {
  initialCases: SerializedCase[];
  subCommittees?: { id: string; name: string }[];
}

export function CasesTable({ initialCases, subCommittees = [] }: CasesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [committeeFilter, setCommitteeFilter] = useState("ALL");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const filteredCases = useMemo(() => {
    return initialCases.filter((c) => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && c.registrationType !== typeFilter) return false;
      if (committeeFilter !== "ALL" && c.subCommittee?.id !== committeeFilter) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      const matchNum = `${c.caseNumber}/${c.caseYear}`.includes(term);
      const matchComplainant = c.complainantName?.toLowerCase().includes(term);
      const matchProsecution = c.prosecution?.toLowerCase().includes(term);
      const matchRespondent = (c.respondentName || c.hospitalName)?.toLowerCase().includes(term);
      const matchCommittee = c.subCommittee?.name.toLowerCase().includes(term);

      return matchNum || matchComplainant || matchProsecution || matchRespondent || matchCommittee;
    });
  }, [initialCases, searchTerm, statusFilter, typeFilter, committeeFilter]);

  const toggleMenu = (id: string) => {
    setActiveMenuId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4 font-body">
      {/* ─── شريط التصفية والبحث (Toolbar) ─── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* حقل البحث */}
        <div className="relative flex-1 min-w-[220px]">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم السجل، اسم الشاكي، النيابة، المشكو في حقه..."
            icon={<Search className="w-4 h-4 text-slate-400" />}
            className="h-10 text-xs"
          />
        </div>

        {/* فلاتر التصفية */}
        <div className="flex flex-wrap items-center gap-2">
          {/* فلتر الحالة */}
          <div className="min-w-[130px]">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 text-xs"
            >
              <option value="ALL">جميع الحالات</option>
              <option value="REGISTERED">بانتظار التوجيه</option>
              <option value="UNDER_SUBCOMMITTEE_REVIEW">قيد دراسة الفرعية</option>
              <option value="PENDING_SUPREME_REVIEW">بانتظار العليا</option>
              <option value="APPROVED">معتمدة</option>
              <option value="REFERRED_FOR_REVIEW">محالة لإعادة الدراسة</option>
            </Select>
          </div>

          {/* فلتر النوع */}
          <div className="min-w-[110px]">
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

          {/* فلتر اللجنة الفرعية */}
          {subCommittees.length > 0 && (
            <div className="min-w-[140px]">
              <Select
                value={committeeFilter}
                onChange={(e) => setCommitteeFilter(e.target.value)}
                className="h-10 text-xs"
              >
                <option value="ALL">جميع اللجان</option>
                {subCommittees.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* زر إعادة التعيين */}
          {(searchTerm || statusFilter !== "ALL" || typeFilter !== "ALL" || committeeFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
                setTypeFilter("ALL");
                setCommitteeFilter("ALL");
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
          <strong className="text-slate-800 font-mono">{initialCases.length}</strong> سجل
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] text-teal-700">
            <UserCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>مسجّل السجل موضح لكل سجل</span>
          </span>
          <span className="flex items-center gap-1 text-[11px] text-amber-700">
            <Edit3 className="w-3.5 h-3.5 text-amber-600" />
            <span>حالة التعديل مرصودة لحظياً</span>
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

      {/* ─── Desktop Table (شاشات الكمبيوتر والتابلت الكبيرة) ─── */}
      {filteredCases.length > 0 && (
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم السجل والنوع</TableHead>
                <TableHead>الشاكي والجهة / النيابة</TableHead>
                <TableHead>المشكو في حقه</TableHead>
                <TableHead>مسجّل السجل (القائم بالقيد)</TableHead>
                <TableHead>حالة التعديل</TableHead>
                <TableHead>اللجنة والتخصصات</TableHead>
                <TableHead>المرفقات</TableHead>
                <TableHead>تاريخ القيد</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-center w-28">الإجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.map((c) => {
                const typeInfo = TYPE_CONFIG[c.registrationType] ?? { label: c.registrationType, variant: "slate" };
                const statusInfo = STATUS_CONFIG[c.status] ?? { label: c.status, variant: "slate" };

                return (
                  <TableRow key={c.id}>
                    {/* رقم السجل + النوع + تاريخ الوارد */}
                    <TableCell>
                      <div className="space-y-1">
                        <span className="font-bold text-slate-900 font-mono text-sm block font-heading">
                          {c.caseNumber} / {c.caseYear}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant={typeInfo.variant} size="sm">
                            {typeInfo.label}
                          </Badge>
                          {c.incomingDate && (
                            <span className="text-[10px] text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded font-mono border border-teal-100" title="تاريخ الوارد">
                              وارد: {new Date(c.incomingDate).toLocaleDateString("ar-EG")}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* الشاكي والنيابة */}
                    <TableCell>
                      <div className="space-y-0.5 max-w-[180px]">
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
                      {c.respondentName || c.hospitalName ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-800 max-w-[160px] truncate" title={(c.respondentName || c.hospitalName)!}>
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{c.respondentName || c.hospitalName}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </TableCell>

                    {/* مسجّل السجل (القائم بالقيد) */}
                    <TableCell>
                      {c.isCreatedByMe ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-50 text-sky-800 border border-sky-200 text-xs font-semibold font-body" title="قيد بواسطتك">
                          <UserCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span>أنا (حسابك)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium font-body truncate max-w-[150px]" title={c.createdByName || "موظف تسجيل"}>
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{c.createdByName || "موظف تسجيل"}</span>
                        </span>
                      )}
                    </TableCell>

                    {/* هل تم التعديل عليه أم لا */}
                    <TableCell>
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
                          <span>أصلي (لم يُعدّل)</span>
                        </span>
                      )}
                    </TableCell>

                    {/* اللجنة والتخصصات */}
                    <TableCell>
                      <div className="space-y-1 max-w-[180px]">
                        <p className="font-semibold text-xs text-slate-900 truncate" title={c.subCommittee?.name || "بانتظار التوجيه"}>
                          {c.subCommittee?.name || <span className="text-slate-400 font-normal">بانتظار التوجيه</span>}
                        </p>
                        {c.specialties.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {c.specialties.slice(0, 2).map((s) => (
                              <Badge key={s.id} variant="slate" size="sm">
                                {s.specialty.name}
                              </Badge>
                            ))}
                            {c.specialties.length > 2 && (
                              <span className="text-[10px] text-slate-500 font-bold">
                                +{c.specialties.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* المرفقات */}
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-medium border border-slate-200">
                        <Paperclip className="w-3 h-3 text-slate-400" />
                        <span>{c.attachmentsCount}</span>
                      </span>
                    </TableCell>

                    {/* تاريخ القيد */}
                    <TableCell className="text-xs font-mono text-slate-600 whitespace-nowrap">
                      {formatDate(c.createdAt)}
                    </TableCell>

                    {/* الحالة */}
                    <TableCell>
                      <Badge variant={statusInfo.variant} size="sm">
                        {statusInfo.label}
                      </Badge>
                    </TableCell>

                    {/* الإجراء المباشر: عرض التفاصيل */}
                    <TableCell className="text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          href={`/dashboard/registration/${c.id}`}
                          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-teal-50 text-teal-800 hover:bg-teal-600 hover:text-white border border-teal-200/80 transition-colors text-xs font-semibold font-heading shadow-2xs"
                          title="استعراض ملف وتفاصيل السجل كاملاً"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>عرض التفاصيل</span>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ─── Mobile Case Cards (شاشات الهواتف والأجهزة الصغيرة) ─── */}
      {filteredCases.length > 0 && (
        <div className="md:hidden space-y-3">
          {filteredCases.map((c) => {
            const typeInfo = TYPE_CONFIG[c.registrationType] ?? { label: c.registrationType, variant: "slate" };
            const statusInfo = STATUS_CONFIG[c.status] ?? { label: c.status, variant: "slate" };

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
              >
                {/* الرأس: رقم السجل والنوع والحالة */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <span className="text-base font-bold font-heading text-slate-900 block">
                      {c.caseNumber} / {c.caseYear}
                    </span>
                    <span className="text-xs text-slate-500 font-mono mt-0.5 block">
                      {formatDate(c.createdAt)}
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={statusInfo.variant} size="sm">
                      {statusInfo.label}
                    </Badge>
                    <Badge variant={typeInfo.variant} size="sm">
                      {typeInfo.label}
                    </Badge>
                  </div>
                </div>

                {/* البيانات الأساسية */}
                <div className="space-y-1.5 text-xs">
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

                  {/* مسجل السجل والتعديل في الموبايل */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-500">مسجّل السجل:</span>
                    {c.isCreatedByMe ? (
                      <span className="text-xs font-bold text-sky-800 font-heading">أنا (حسابك)</span>
                    ) : (
                      <span className="text-xs font-medium text-slate-700">{c.createdByName || "موظف تسجيل"}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">موقف التعديل:</span>
                    {c.isModified ? (
                      <span className="text-[11px] font-bold text-amber-700">تم تعديله</span>
                    ) : (
                      <span className="text-[11px] text-slate-400">قيد أصلي</span>
                    )}
                  </div>

                  <div className="flex items-start justify-between">
                    <span className="text-slate-500">اللجنة المحال إليها:</span>
                    <span className="font-semibold text-slate-900">
                      {c.subCommittee?.name || "بانتظار التوجيه"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">المرفقات:</span>
                    <span className="inline-flex items-center gap-1 text-slate-700 font-mono">
                      <Paperclip className="w-3 h-3 text-slate-400" />
                      <span>{c.attachmentsCount} ملف</span>
                    </span>
                  </div>
                </div>

                {/* الإجراء المباشر */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  <Link
                    href={`/dashboard/registration/${c.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 font-heading"
                  >
                    <span>استعراض ملف وتفاصيل السجل</span>
                    <Eye className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
