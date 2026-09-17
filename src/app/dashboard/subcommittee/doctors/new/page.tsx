"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Building, CreditCard, FileImage, Save, ShieldCheck, User } from "lucide-react";
import { PageHeader, Card, Button } from "@/components/ui";
import { createNationalIdPdf } from "@/lib/client/image-to-pdf";

interface Specialty {
  id: string;
  name: string;
}

const EGYPTIAN_BANKS = [
  "البنك الأهلي المصري (ميزة / مرتبات حكومية)",
  "بنك مصر (فيزا / ميزة مرتبات)",
  "بنك القاهرة",
  "بنك التعمير والإسكان",
  "بنك الإسكندرية",
  "البنك التجاري الدولي (CIB)",
  "بنك قناة السويس",
  "بنك فيصل الإسلامي المصري",
  "مصرف أبو ظبي الإسلامي",
  "بنك قطر الوطني (QNB)",
  "بنك البركة مصر",
  "أخرى / بنك آخر",
];

export default function NewDoctorPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [title, setTitle] = useState("أستاذ دكتور");
  const [employer, setEmployer] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [nationalId, setNationalId] = useState("");

  const [nationalIdFront, setNationalIdFront] = useState<File | null>(null);
  const [nationalIdBack, setNationalIdBack] = useState<File | null>(null);

  const [financialType, setFinancialType] = useState<"PAYROLL_CARD" | "BANK_ACCOUNT" | "BANK_CARD">("PAYROLL_CARD");
  const [bankName, setBankName] = useState("البنك الأهلي المصري (ميزة / مرتبات حكومية)");
  const [customBankName, setCustomBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [iban, setIban] = useState("");
  const [cardNumber, setCardNumber] = useState("");

  useEffect(() => {
    fetch("/api/specialties")
      .then((res) => (res.ok ? res.json() : []))
      .then(setSpecialties)
      .catch(console.error);
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) return setError("يرجى إدخال اسم الطبيب كاملاً");
    if (!employer.trim()) return setError("يرجى إدخال جهة عمل الطبيب");
    if (nationalId && nationalId.length !== 14) return setError("الرقم القومي يجب أن يتكون من 14 رقماً");
    if (!nationalIdFront || !nationalIdBack) {
      return setError("يجب رفع صورة وجه بطاقة الرقم القومي وصورة الظهر معاً");
    }

    const resolvedBankName = bankName === "أخرى / بنك آخر" ? customBankName.trim() : bankName;

    startTransition(async () => {
      let createdDoctorId: string | null = null;
      try {
        // يتم إنشاء ملف PDF محلياً أولاً حتى نتأكد من صلاحية الصورتين قبل إنشاء سجل العضو.
        const nationalIdPdf = await createNationalIdPdf(nationalIdFront, nationalIdBack);

        const createResponse = await fetch("/api/subcommittee/doctors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            title,
            employer: employer.trim(),
            specialtyId: specialtyId || undefined,
            phone: phone.trim() || undefined,
            notes: notes.trim() || undefined,
            nationalId: nationalId.trim() || undefined,
            financialType,
            bankName: resolvedBankName || undefined,
            accountNumber: financialType === "BANK_ACCOUNT" ? accountNumber.trim() || undefined : undefined,
            iban: financialType === "BANK_ACCOUNT" ? iban.trim() || undefined : undefined,
            cardNumber: financialType !== "BANK_ACCOUNT" ? cardNumber.trim() || undefined : undefined,
          }),
        });

        const doctor = await createResponse.json();
        if (!createResponse.ok) throw new Error(doctor.error || "تعذر إضافة الطبيب");
        createdDoctorId = doctor.id;

        const formData = new FormData();
        formData.append("file", nationalIdPdf, `national-id-${doctor.id}.pdf`);
        const documentResponse = await fetch(`/api/subcommittee/doctors/${doctor.id}/national-id-document`, {
          method: "POST",
          body: formData,
        });

        const documentResult = await documentResponse.json();
        if (!documentResponse.ok) {
          // إذا فشل حفظ المستند، نتراجع عن إنشاء السجل لتفادي عضو بدون مستند بطاقة مطلوب.
          await fetch(`/api/subcommittee/doctors/${doctor.id}`, { method: "DELETE" }).catch(() => undefined);
          createdDoctorId = null;
          throw new Error(documentResult.error || "تم رفض مستند بطاقة الرقم القومي");
        }

        router.push("/dashboard/subcommittee/doctors");
        router.refresh();
      } catch (err: any) {
        if (createdDoctorId) {
          console.error("Doctor was created but document workflow failed for:", createdDoctorId);
        }
        setError(err?.message || "تعذر حفظ بيانات العضو ومستند البطاقة");
      }
    });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "اللجان الفرعية", href: "/dashboard/subcommittee" },
          { label: "سجل أعضاء اللجنة", href: "/dashboard/subcommittee/doctors" },
          { label: "إضافة عضو جديد" },
        ]}
        title="إضافة عضو لجنة وبياناته المالية"
        description="تسجيل بيانات العضو ومستند بطاقة الرقم القومي بصورة مؤمنة لاستخدامه في أعمال اللجنة وصرف المستحقات."
        actions={
          <Link href="/dashboard/subcommittee/doctors" className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs sm:text-sm font-medium hover:bg-slate-50">
            <ArrowRight className="w-4 h-4" /> عودة للسجل
          </Link>
        }
      />

      <Card className="p-6 sm:p-8">
        {error && <div className="alert-error text-xs mb-5"><span>{error}</span></div>}

        <form onSubmit={handleSubmit} className="space-y-7">
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-teal-800 flex items-center gap-2">
              <User className="w-4 h-4" /> البيانات الشخصية والمهنية
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="form-group">
                <label className="form-label form-label-required">اسم العضو كاملاً</label>
                <input required className="form-input text-xs" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: أ.د. شريف كمال الدين" />
              </div>
              <div className="form-group">
                <label className="form-label form-label-required">الدرجة واللقب العلمي</label>
                <select className="form-select text-xs" value={title} onChange={(e) => setTitle(e.target.value)}>
                  <option>أستاذ دكتور</option><option>أستاذ مساعد</option><option>استشاري أول</option><option>استشاري</option><option>زميل / باحث</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label form-label-required">جهة العمل / المستشفى</label>
                <input required className="form-input text-xs" value={employer} onChange={(e) => setEmployer(e.target.value)} placeholder="جهة عمل العضو" />
              </div>
              <div className="form-group">
                <label className="form-label">التخصص الطبي</label>
                <select className="form-select text-xs" value={specialtyId} onChange={(e) => setSpecialtyId(e.target.value)}>
                  <option value="">— اختر التخصص —</option>
                  {specialties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">الرقم القومي (14 رقماً)</label>
                <input className="form-input text-xs font-mono" dir="ltr" maxLength={14} value={nationalId} onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ""))} placeholder="2XXXXXXXXXXXXX" />
              </div>
              <div className="form-group">
                <label className="form-label">رقم الهاتف</label>
                <input className="form-input text-xs font-mono" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
              </div>
            </div>
          </section>

          <section className="p-5 rounded-xl border border-sky-200 bg-sky-50/50 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white border border-sky-200"><ShieldCheck className="w-5 h-5 text-sky-700" /></div>
              <div>
                <h2 className="text-sm font-bold text-sky-950">مستند بطاقة الرقم القومي</h2>
                <p className="text-xs text-sky-800 mt-1">ارفع صورة الوجه وصورة الظهر. سيقوم النظام بدمجهما تلقائياً في ملف PDF واحد من صفحتين، ولن يحتفظ بالصورتين كملفين منفصلين.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block p-4 rounded-xl border-2 border-dashed border-sky-300 bg-white cursor-pointer hover:bg-sky-50 transition-colors">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-800"><FileImage className="w-4 h-4 text-sky-700" /> صورة وجه البطاقة *</span>
                <span className="block text-[10px] text-slate-500 mt-1">JPG / PNG / WEBP — بحد أقصى 6MB</span>
                <input required type="file" accept="image/jpeg,image/png,image/webp" className="mt-3 block w-full text-xs" onChange={(e) => setNationalIdFront(e.target.files?.[0] || null)} />
                {nationalIdFront && <span className="block text-[10px] text-emerald-700 mt-2">✓ {nationalIdFront.name}</span>}
              </label>
              <label className="block p-4 rounded-xl border-2 border-dashed border-sky-300 bg-white cursor-pointer hover:bg-sky-50 transition-colors">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-800"><FileImage className="w-4 h-4 text-sky-700" /> صورة ظهر البطاقة *</span>
                <span className="block text-[10px] text-slate-500 mt-1">JPG / PNG / WEBP — بحد أقصى 6MB</span>
                <input required type="file" accept="image/jpeg,image/png,image/webp" className="mt-3 block w-full text-xs" onChange={(e) => setNationalIdBack(e.target.files?.[0] || null)} />
                {nationalIdBack && <span className="block text-[10px] text-emerald-700 mt-2">✓ {nationalIdBack.name}</span>}
              </label>
            </div>
          </section>

          <section className="p-5 rounded-xl bg-purple-50/50 border border-purple-200 space-y-4">
            <h2 className="text-sm font-bold text-purple-950 flex items-center gap-2"><CreditCard className="w-4 h-4" /> البيانات المالية وصرف المستحقات</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {([['PAYROLL_CARD','فيزا مرتبات حكومية'],['BANK_ACCOUNT','حساب بنكي شخصي'],['BANK_CARD','فيزا / كارت بنكي خاص']] as const).map(([value,label]) => (
                <label key={value} className={`p-3 rounded-xl border cursor-pointer ${financialType === value ? "bg-purple-100 border-purple-400" : "bg-white border-slate-200"}`}>
                  <input type="radio" name="financialType" checked={financialType === value} onChange={() => setFinancialType(value)} className="ml-2" /> {label}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="form-group">
                <label className="form-label">اسم البنك</label>
                <select className="form-select text-xs" value={bankName} onChange={(e) => setBankName(e.target.value)}>{EGYPTIAN_BANKS.map((bank) => <option key={bank}>{bank}</option>)}</select>
              </div>
              {bankName === "أخرى / بنك آخر" && <div className="form-group"><label className="form-label">اسم البنك الآخر</label><input className="form-input text-xs" value={customBankName} onChange={(e) => setCustomBankName(e.target.value)} /></div>}
              {financialType === "BANK_ACCOUNT" ? <>
                <div className="form-group"><label className="form-label">رقم الحساب البنكي</label><input className="form-input text-xs font-mono" dir="ltr" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} /></div>
                <div className="form-group"><label className="form-label">IBAN</label><input className="form-input text-xs font-mono" dir="ltr" value={iban} onChange={(e) => setIban(e.target.value)} /></div>
              </> : <div className="form-group sm:col-span-2"><label className="form-label">رقم الكارت</label><input className="form-input text-xs font-mono" dir="ltr" maxLength={19} value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="XXXX XXXX XXXX XXXX" /></div>}
            </div>
          </section>

          <div className="form-group">
            <label className="form-label">ملاحظات إدارية</label>
            <input className="form-input text-xs" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="أي ملاحظات تخص العضو..." />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Link href="/dashboard/subcommittee/doctors"><Button type="button" variant="secondary">إلغاء</Button></Link>
            <Button type="submit" variant="primary" loading={isPending} icon={<Save className="w-4 h-4" />}>حفظ العضو ومستند البطاقة</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
