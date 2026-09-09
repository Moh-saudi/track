"use client";

import { useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  Search,
  CreditCard,
  Building,
  Stethoscope,
  Building2,
  Check,
  Copy,
  AlertCircle,
} from "lucide-react";

interface DoctorFinanceItem {
  id: string;
  name: string;
  title: string | null;
  employer: string;
  phone: string | null;
  nationalId: string | null;
  financialType: string | null;
  bankName: string | null;
  accountNumber: string | null;
  iban: string | null;
  cardNumber: string | null;
  active: boolean;
  subCommittee: {
    id: string;
    name: string;
    code: string;
  };
  specialty?: {
    name: string;
  } | null;
}

export function DoctorsFinanceTable({
  doctors,
  subCommittees,
}: {
  doctors: DoctorFinanceItem[];
  subCommittees: { id: string; name: string; code: string }[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubCommittee, setSelectedSubCommittee] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  const filteredDoctors = doctors.filter((doc) => {
    const matchSearch =
      !searchTerm ||
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.nationalId && doc.nationalId.includes(searchTerm)) ||
      (doc.bankName && doc.bankName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.accountNumber && doc.accountNumber.includes(searchTerm)) ||
      (doc.cardNumber && doc.cardNumber.includes(searchTerm)) ||
      (doc.phone && doc.phone.includes(searchTerm));

    const matchCommittee = !selectedSubCommittee || doc.subCommittee.id === selectedSubCommittee;

    const matchType =
      filterType === "ALL" ||
      (filterType === "PAYROLL_CARD" && doc.financialType === "PAYROLL_CARD") ||
      (filterType === "BANK_ACCOUNT" && doc.financialType === "BANK_ACCOUNT") ||
      (filterType === "BANK_CARD" && doc.financialType === "BANK_CARD") ||
      (filterType === "MISSING" && !doc.accountNumber && !doc.cardNumber);

    return matchSearch && matchCommittee && matchType;
  });

  return (
    <div className="space-y-4">
      {/* أدوات البحث والفلترة المتقدمة للشؤون المالية */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-heading">
            <Search className="w-4 h-4 text-teal-600" />
            <span>بحث وتصفية حسابات الأطباء المصرفية</span>
          </h3>
          <span className="text-xs font-medium text-slate-500 font-body">
            تم العثور على {filteredDoctors.length} من إجمالي {doctors.length} طبيب
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1 font-body">
              البحث بالاسم / الرقم القومي / رقم الحساب / البنك
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="اكتب للبحث الفوري..."
              className="form-input text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1 font-body">
              اللجنة الفرعية التابع لها الطبيب
            </label>
            <select
              value={selectedSubCommittee}
              onChange={(e) => setSelectedSubCommittee(e.target.value)}
              className="form-select text-xs"
            >
              <option value="">— جميع اللجان الـ 16 —</option>
              {subCommittees.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1 font-body">
              نوع وسيلة الصرف
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="form-select text-xs"
            >
              <option value="ALL">الكل (جميع الوسائل)</option>
              <option value="PAYROLL_CARD">فيزا مرتبات حكومية (ميزة)</option>
              <option value="BANK_ACCOUNT">حسابات بنكية شخصية</option>
              <option value="BANK_CARD">كروت بنكية خاصة</option>
              <option value="MISSING">بانتظار استيفاء البيانات</option>
            </select>
          </div>
        </div>
      </Card>

      {/* جدول الحسابات البنكية للمسؤول المالي */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>اسم الطبيب / اللقب</TableHead>
            <TableHead>اللجنة الفرعية</TableHead>
            <TableHead>التخصص وجهة العمل</TableHead>
            <TableHead>الرقم القومي</TableHead>
            <TableHead>طريقة الصرف</TableHead>
            <TableHead>البنك وحساب التحويل</TableHead>
            <TableHead>هاتف التواصل</TableHead>
            <TableHead className="text-center">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredDoctors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="p-8 text-center text-xs text-slate-500">
                لا توجد بيانات أطباء مطابقة لمعايير البحث المحددة.
              </TableCell>
            </TableRow>
          ) : (
            filteredDoctors.map((doc) => {
              const targetNumber = doc.financialType === "BANK_CARD" ? doc.cardNumber : doc.accountNumber;
              const isCopied = copiedId === doc.id;

              return (
                <TableRow key={doc.id} className={!doc.active ? "bg-slate-50/70" : undefined}>
                  {/* الاسم */}
                  <TableCell className="font-bold text-slate-900 whitespace-nowrap font-heading">
                    <span className="text-slate-500 text-xs ml-1 font-body">{doc.title || "د."}</span>
                    <span>{doc.name}</span>
                    {!doc.active && (
                      <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium mr-1.5 font-body">
                        موقوف مؤقتاً
                      </span>
                    )}
                  </TableCell>

                  {/* اللجنة الفرعية */}
                  <TableCell className="text-xs whitespace-nowrap">
                    <Badge variant="teal" size="sm">
                      {doc.subCommittee.name}
                    </Badge>
                  </TableCell>

                  {/* التخصص والجهة */}
                  <TableCell className="text-xs">
                    <div className="font-medium text-slate-800 flex items-center gap-1">
                      {doc.specialty?.name ? (
                        <>
                          <Stethoscope className="w-3 h-3 text-teal-600 shrink-0" />
                          <span>{doc.specialty.name}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[160px] flex items-center gap-1 mt-0.5" title={doc.employer}>
                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{doc.employer}</span>
                    </div>
                  </TableCell>

                  {/* الرقم القومي */}
                  <TableCell className="text-xs font-mono font-medium text-slate-800" dir="ltr">
                    {doc.nationalId ? (
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {doc.nationalId}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-sans italic">—</span>
                    )}
                  </TableCell>

                  {/* طريقة الصرف */}
                  <TableCell>
                    {doc.financialType === "PAYROLL_CARD" ? (
                      <Badge variant="violet" size="sm" icon={<CreditCard className="w-3 h-3" />}>
                        فيزا مرتبات حكومية
                      </Badge>
                    ) : doc.financialType === "BANK_ACCOUNT" ? (
                      <Badge variant="sky" size="sm" icon={<Building className="w-3 h-3" />}>
                        حساب بنكي شخصي
                      </Badge>
                    ) : doc.financialType === "BANK_CARD" ? (
                      <Badge variant="emerald" size="sm" icon={<CreditCard className="w-3 h-3" />}>
                        كارت بنكي خاص
                      </Badge>
                    ) : (
                      <Badge variant="amber" size="sm">
                        غير محدد
                      </Badge>
                    )}
                  </TableCell>

                  {/* البنك وحساب التحويل */}
                  <TableCell className="text-xs">
                    {doc.bankName || targetNumber ? (
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-900">{doc.bankName || "بنك غير محدد"}</div>
                        {targetNumber ? (
                          <div className="font-mono font-medium text-emerald-700 text-[11px]" dir="ltr">
                            {targetNumber}
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-700">رقم الحساب غير مدخل</span>
                        )}
                        {doc.iban && (
                          <div className="text-[11px] font-mono text-slate-500 truncate max-w-[160px]" dir="ltr" title={doc.iban}>
                            IBAN: {doc.iban}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        <span>بانتظار استيفاء البيانات</span>
                      </span>
                    )}
                  </TableCell>

                  {/* الهاتف */}
                  <TableCell className="text-xs font-mono text-slate-600" dir="ltr">
                    {doc.phone || "—"}
                  </TableCell>

                  {/* الإجراءات: نسخ رقم الحساب */}
                  <TableCell className="text-center whitespace-nowrap">
                    {targetNumber ? (
                      <Button
                        type="button"
                        variant={isCopied ? "success" : "secondary"}
                        size="sm"
                        onClick={() => copyToClipboard(targetNumber, doc.id)}
                        icon={isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        title="نسخ رقم الحساب أو الكارت للحافظة المصرفية"
                      >
                        {isCopied ? "تم النسخ" : "نسخ الحساب"}
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
