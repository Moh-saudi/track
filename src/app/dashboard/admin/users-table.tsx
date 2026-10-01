"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { isValidEgyptianPhone, sanitizeEgyptianPhone } from "@/lib/formatters";
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
import { EgyptianPhoneInput } from "@/components/ui/EgyptianPhoneInput";
import {
  KeyRound,
  Building2,
  Lock,
  X,
  UserPlus,
  Search,
  Filter,
  Shield,
  Stethoscope,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Edit,
  PowerOff,
  Power,
  RefreshCw,
  MessageCircle,
  Copy,
  Check,
  Send,
} from "lucide-react";

export interface UserItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
  employer: string | null;
  active: boolean;
  subCommitteeId?: string | null;
  specialtyId?: string | null;
  subCommittee?: { name: string } | null;
  specialty?: { name: string } | null;
  phone?: string | null;
  nationalId?: string | null;
  initialPassword?: string | null;
}


export interface SubCommitteeItem {
  id: string;
  name: string;
  code: string;
}

export interface SpecialtyItem {
  id: string;
  name: string;
  code?: string | null;
}

interface Props {
  users: UserItem[];
  subCommittees?: SubCommitteeItem[];
  specialties?: SpecialtyItem[];
}

// ─── الجهات الإدارية المعتمدة في المنظومة ───────────────────────────────────
export const ADMIN_DEPARTMENTS = [
  "اللجنة العليا للمسؤولية الطبية",
  "مكتب الاستلام والبريد",
  "قسم تسجيل الملفات والقيد",
  "قسم الأرشفة الإلكترونية",
  "قسم المتابعة والتوجيه",
  "قسم الموارد البشرية",
  "قسم المالية والبدلات",
  "قسم الشؤون القانونية",
  "مكتب مدير المنظومة",
  "كلية طب جامعة القاهرة (قصر العيني)",
  "كلية طب جامعة عين شمس",
  "كلية طب جامعة الأزهر",
  "كلية طب جامعة الإسكندرية",
  "كلية طب جامعة الفيوم",
  "كلية طب جامعة المنيا",
  "كلية طب جامعة أسيوط",
  "كلية طب جامعة سوهاج",
  "كلية طب جامعة أسوان",
  "كلية طب جامعة المنصورة",
  "كلية طب جامعة المنوفية",
  "كلية طب جامعة طنطا",
  "كلية طب جامعة الزقازيق",
  "كلية طب جامعة قناة السويس",
  "المجلس الصحي المصري",
  "الهيئة العامة للمستشفيات والمعاهد التعليمية",
  "مستشفى قصر العيني",
  "معهد الأورام القومي",
  "مركز القلب القومي",
  "أخرى",
];

export const ROLE_INFO: Record<
  string,
  {
    label: string;
    description: string;
    visibility: string;
    permissions: string[];
    badgeVariant: "slate" | "violet" | "sky" | "amber" | "teal" | "emerald" | "rose";
  }
> = {
  REGISTRATION_CLERK: {
    label: "موظف التسجيل والقيد",
    description: "مختص باستلام الشكاوى والمحاضر وقيدها أولياً على المنظومة دون توجيه",
    visibility: "يرى فقط القضايا والشكاوى التي قام بقيدها بنفسه",
    permissions: [
      "قيد شكوى أو قضية أو محضر جديد ببياناته الأولية",
      "إرفاق المستندات الرسمية والمحاضر الأولية",
      "استعراض تقارير ومعدلات التسجيل الشخصية",
    ],
    badgeVariant: "sky",
  },
  FOLLOW_UP_OFFICER: {
    label: "موظف المتابعة والتوجيه",
    description: "مختص بتوجيه القضايا للجان المختصة ومتابعة التزام اللجان بالمدد وإخطار النيابة",
    visibility: "يرى كافة القضايا غير الموجهة + مرصد متابعة مدد كافة اللجان",
    permissions: [
      "توجيه القضايا للجنة الفرعية المختصة والتخصص الدقيق",
      "متابعة التزام اللجان بالمدد الزمنية المحددة (SLA)",
      "توثيق تاريخ ورقم صادر مخاطبة النيابة العامة بموعد الجلسات",
    ],
    badgeVariant: "violet",
  },
  SUBCOMMITTEE_MEMBER: {
    label: "عضو / مقرر لجنة فرعية",
    description: "طبيب استشاري فاحص باللجنة الفرعية لإعداد التقارير الفنية وبيان الخطأ الطبي",
    visibility: "يرى حصرياً القضايا المحالة إلى لجنته الفرعية دون غيرها",
    permissions: [
      "إثبات استلام السجل وتحديد تاريخ انعقاد الجلسة",
      "تدوين توصيف الخطأ الطبي والإجراء المتخذ والتقرير الفني",
      "رفع المرفقات والتقارير الطبية المعتمدة",
    ],
    badgeVariant: "amber",
  },
  SUPREME_COMMITTEE: {
    label: "عضو اللجنة العليا",
    description: "عضو الدائرة العليا لاعتماد تقارير اللجان وإصدار القرارات النهائية",
    visibility: "يرى كافة القضايا والتقارير الفنية المرفوعة من كافة اللجان",
    permissions: [
      "مراجعة السجلات وإصدار القرارات النهائية (اعتماد / إحالة / مغاير)",
      "إدارة أجندة جلسات الانعقاد وتوجيه الدعوات للأعضاء",
    ],
    badgeVariant: "teal",
  },
  FINANCE: {
    label: "الشؤون المالية",
    description: "مختص بمتابعة استحقاقات وصرف بدلات حضور الجلسات للأعضاء",
    visibility: "يرى السجلات المعتمدة الصادرة بقرارات نهائية وجداول البدلات",
    permissions: [
      "متابعة استحقاق البدلات (5,000 ج.م للفرعية / 8,000 ج.م للعليا)",
      "توثيق تسديد البدلات بالتواريخ وأرقام الحسابات البنكية",
    ],
    badgeVariant: "emerald",
  },
  RISK_OFFICER: {
    label: "مسؤول إدارة المخاطر وتصحيح المسار (Risk Officer)",
    description: "مختص بالتدخل الاستثنائي واستدراك مسار القضايا المعيبة أو المعتمدة خطأً",
    visibility: "يرى كافة القضايا المعتمدة والمحالة ومرصد التوجيه وسجل التدقيق الرقابي",
    permissions: [
      "الدخول المصادق لوضع إدارة المخاطر وتصحيح المسار (Risk Mode)",
      "إعادة فتح واستدراك مسار القضايا الصادرة بقرارات معيبة مع إثبات السند الإداري",
      "إعادة السجلات للدراسة باللجان الفرعية أو إحالتها لإعادة الفحص بلجنة أخرى",
      "فحص سجل التدقيق والحركات الرقابية الشامل (Audit Logs)",
    ],
    badgeVariant: "rose",
  },
  ADMIN: {
    label: "مدير المنظومة (إشراف كامل)",
    description: "إدارة النظام والمستخدمين والصلاحيات والرقابة ووضع إدارة المخاطر",
    visibility: "وصول شامل لكافة شاشات وسجلات وتقارير المنظومة",
    permissions: [
      "إضافة وتعديل المستخدمين وتعيين الصلاحيات وإعادة تعيين كلمات المرور",
      "إدارة اللجان الفرعية والتخصصات الطبية وجهات النيابة العامة",
      "الدخول لوضع إدارة المخاطر وتصحيح مسار القضايا المعتمدة",
      "الاطلاع على سجل التدقيق الرقابي ومتابعة تواجد المستخدمين اللحظي",
    ],
    badgeVariant: "slate",
  },
};

export function AdminUsersTable({
  users,
  subCommittees = [],
  specialties = [],
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // فلاتر البحث والفرز
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");

  // حالات النوافذ المنبثقة
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [passwordUser, setPasswordUser] = useState<UserItem | null>(null);

  // نموذج إنشاء مستخدم جديد
  const [formFullName, setFormFullName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<string>("REGISTRATION_CLERK");
  const [formEmployer, setFormEmployer] = useState("");
  const [formSubCommitteeId, setFormSubCommitteeId] = useState("");
  const [formSpecialtyId, setFormSpecialtyId] = useState("");
  const [formNationalId, setFormNationalId] = useState("");
  const [formPhone, setFormPhone] = useState("");

  // رسائل التنبيه والأخطاء
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // دالة موحدة لتوليد كلمة مرور قوية
  function generatePasswordString(): string {
    const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowercase = "abcdefghijkmnpqrstuvwxyz";
    const numbers = "23456789";
    const symbols = "!@#$%";
    let pwd = "";
    pwd += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    pwd += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    pwd += numbers.charAt(Math.floor(Math.random() * numbers.length));
    pwd += symbols.charAt(Math.floor(Math.random() * symbols.length));
    const all = uppercase + lowercase + numbers + symbols;
    for (let i = 0; i < 8; i++) {
      pwd += all.charAt(Math.floor(Math.random() * all.length));
    }
    return pwd.split("").sort(() => 0.5 - Math.random()).join("");
  }

  const [isSyncingPassword, setIsSyncingPassword] = useState(false);

  // مزامنة فورية لكلمة المرور في قاعدة البيانات لمنع أي تفاوت عند التوليد أو التعديل
  async function syncWhatsappPassword(userId?: string, newPwd?: string, phoneVal?: string) {
    if (!userId || !newPwd) return;
    setIsSyncingPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: newPwd.trim(),
          initialPassword: newPwd.trim(),
          phone: phoneVal?.trim() || undefined,
        }),
      });
      if (res.ok) {
        setWhatsappModal((prev) => (prev ? { ...prev, password: newPwd.trim(), needsPasswordSync: false } : null));
        router.refresh();
      }
    } catch (e) {
      console.error("Failed to sync password to user", e);
    } finally {
      setIsSyncingPassword(false);
    }
  }

  // توليد كلمة مرور قوية عشوائية
  function generateRandomPassword(target: "create" | "reset" | "whatsapp") {
    const pwd = generatePasswordString();
    if (target === "create") {
      setFormPassword(pwd);
    } else if (target === "reset") {
      setResetNewPassword(pwd);
    } else {
      setWhatsappPassword(pwd);
      setWhatsappModal((prev) => (prev ? { ...prev, needsPasswordSync: true } : null));
      if (whatsappModal?.id) {
        syncWhatsappPassword(whatsappModal.id, pwd, whatsappPhone);
      }
    }
  }

  // إعادة تعيين كلمة المرور
  const [resetNewPassword, setResetNewPassword] = useState("");

  // ميزة مشاركة بيانات الحساب عبر واتساب
  const [sendViaWhatsAppOnCreate, setSendViaWhatsAppOnCreate] = useState(true);
  const [whatsappModal, setWhatsappModal] = useState<{
    id?: string;
    fullName: string;
    email: string;
    password?: string;
    role: string;
    phone?: string;
    isNewAccount?: boolean;
    needsPasswordSync?: boolean;
  } | null>(null);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappPassword, setWhatsappPassword] = useState("");
  const [showPasswordInModal, setShowPasswordInModal] = useState(true);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // صياغة رسالة الواتساب الرسمية المعتمدة
  function buildWhatsAppMessageText({
    fullName,
    email,
    password,
    roleLabel,
    loginUrl,
  }: {
    fullName: string;
    email: string;
    password?: string;
    roleLabel: string;
    loginUrl: string;
  }): string {
    let msg = `السلام عليكم ورحمة الله وبركاته،\nالأستاذ/الدكتور: ${fullName}\n\n`;
    msg += `تحية طيبة وبعد،،\nيسعدنا إبلاغكم بأنه تم اعتماد وتفعيل حسابكم الرسمي على «منظومة تتبع قضايا المسؤولية الطبية» (اللجنة العليا للمسؤولية الطبية — جمهورية مصر العربية):\n\n`;
    msg += `🌐 رابط الدخول للمنظومة:\n${loginUrl}\n\n`;
    msg += `📧 البريد الإلكتروني:\n${email}\n`;
    const pwd = password && password.trim().length > 0 ? password.trim() : "—";
    msg += `🔑 كلمة المرور:\n${pwd}\n`;
    msg += `🛡️ الصلاحية والصفة:\n${roleLabel}\n\n`;
    msg += `⚠️ تنبيه أمني:\nهذه البيانات سرية وشخصية للغاية. يُرجى الدخول وتغيير كلمة المرور فور تسجيل الدخول من خلال صفحة الملف الشخصي.`;
    return msg;
  }

  // تصفية المستخدمين
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !searchTerm.trim() ||
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.employer && u.employer.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.subCommittee?.name && u.subCommittee.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesRole =
        selectedRoleFilter === "ALL" || u.role === selectedRoleFilter;

      const matchesStatus =
        selectedStatusFilter === "ALL" ||
        (selectedStatusFilter === "ACTIVE" && u.active) ||
        (selectedStatusFilter === "INACTIVE" && !u.active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, selectedRoleFilter, selectedStatusFilter]);

  // إرسال إنشاء مستخدم جديد
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (formPassword.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }

    if (formNationalId && !/^\d{14}$/.test(formNationalId)) {
      setError("الرقم القومي يجب أن يتكون من 14 رقماً بالضبط");
      return;
    }

    if (formPhone && !isValidEgyptianPhone(formPhone)) {
      setError("رقم الهاتف يجب أن يتكون من 11 رقماً مصرياً يبدأ بـ 01 (مثال: 01012345678)");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          fullName: formFullName,
          email: formEmail,
          password: formPassword,
          role: formRole,
          employer: formEmployer || null,
          subCommitteeId: formRole === "SUBCOMMITTEE_MEMBER" ? formSubCommitteeId || null : null,
          specialtyId: formSpecialtyId || null,
          nationalId: formNationalId || null,
          phone: formPhone || null,
          initialPassword: formPassword,
        };

        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || data.error || "تعذر إنشاء المستخدم");
        }

        const createdFullName = data.fullName || formFullName;
        const createdEmail = data.email || formEmail;
        const createdRole = formRole;
        // استخدام رقم الهاتف المحفوظ وكلمة المرور المحفوظة من البيانات المُرجعة
        const savedPhone = data.phone || formPhone;
        const savedPassword = formPassword.trim() || data.initialPassword || generatePasswordString();

        setSuccessMsg(`تم إنشاء حساب المستخدم (${createdFullName}) بالصلاحية المحددة بنجاح.`);
        setIsCreateOpen(false);

        // تصفير الحقول
        setFormFullName("");
        setFormEmail("");
        setFormPassword("");
        setFormPhone("");
        setFormNationalId("");
        setFormRole("REGISTRATION_CLERK");
        setFormEmployer("");
        setFormSubCommitteeId("");
        setFormSpecialtyId("");

        // فتح نافذة إرسال الواتساب بالبيانات المحفوظة مباشرة
        if (sendViaWhatsAppOnCreate) {
          setWhatsappModal({
            id: data.id,
            fullName: createdFullName,
            email: createdEmail,
            password: savedPassword,
            role: createdRole,
            phone: savedPhone,
            isNewAccount: true,
            needsPasswordSync: false,
          });
          setWhatsappPhone(savedPhone);
          setWhatsappPassword(savedPassword);
          setShowPasswordInModal(true);
        }

        router.refresh();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }


  // حفظ تعديل بيانات وصلاحيات المستخدم
  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setError(null);
    setSuccessMsg(null);

    if (formNationalId && !/^\d{14}$/.test(formNationalId)) {
      setError("الرقم القومي يجب أن يتكون من 14 رقماً بالضبط");
      return;
    }

    if (formPhone && !isValidEgyptianPhone(formPhone)) {
      setError("رقم الهاتف يجب أن يتكون من 11 رقماً مصرياً يبدأ بـ 01 (مثال: 01012345678)");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          fullName: formFullName,
          role: formRole,
          employer: formEmployer || null,
          subCommitteeId: formRole === "SUBCOMMITTEE_MEMBER" ? formSubCommitteeId || null : null,
          specialtyId: formSpecialtyId || null,
          nationalId: formNationalId || null,
          phone: formPhone || null,
        };

        const res = await fetch(`/api/admin/users/${editUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "تعذر تعديل بيانات المستخدم");

        setSuccessMsg(`تم تحديث بيانات وصلاحيات (${data.fullName}) بنجاح.`);
        setEditUser(null);
        router.refresh();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  // تبديل حالة المستخدم (تفعيل / تعطيل)
  async function handleToggleActive(user: UserItem) {
    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: !user.active }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "تعذر تغيير حالة الحساب");

        setSuccessMsg(
          `تم ${!user.active ? "تفعيل" : "تعطيل"} حساب المستخدم (${user.fullName}) بنجاح.`
        );
        router.refresh();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  // حفظ كلمة المرور الجديدة
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordUser) return;
    if (resetNewPassword.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }

    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        // تحديث كلمة المرور وحفظ initialPassword في نفس الوقت
        const res = await fetch(`/api/admin/users/${passwordUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newPassword: resetNewPassword,
            initialPassword: resetNewPassword, // حفظ الباسورد الجديد لاستخدامه في الواتساب لاحقاً
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "تعذر تعيين كلمة المرور");

        const targetUser = passwordUser;
        const newPwd = resetNewPassword;
        setSuccessMsg(`تم تعيين كلمة مرور جديدة للمستخدم (${targetUser.fullName}) بنجاح.`);
        setPasswordUser(null);
        setResetNewPassword("");

        // فتح نافذة إرسال كلمة المرور الجديدة عبر واتساب مع تعبئة الباسورد والهاتف تلقائياً
        setWhatsappModal({
          id: targetUser.id,
          fullName: targetUser.fullName,
          email: targetUser.email,
          password: newPwd,
          role: targetUser.role,
          phone: targetUser.phone || "",
          isNewAccount: false,
          needsPasswordSync: false,
        });
        setWhatsappPhone(targetUser.phone || "");
        setWhatsappPassword(newPwd);
        setShowPasswordInModal(true);

        router.refresh();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  // فتح مودال التعديل
  function openEditModal(u: UserItem) {
    setEditUser(u);
    setFormFullName(u.fullName);
    setFormEmail(u.email);
    setFormRole(u.role);
    setFormEmployer(u.employer || "");
    setFormSubCommitteeId(u.subCommitteeId || "");
    setFormSpecialtyId(u.specialtyId || "");
    setFormNationalId(u.nationalId || "");
    setFormPhone(u.phone || "");
    setError(null);
    setSuccessMsg(null);
  }

  return (
    <div className="space-y-4">
      {/* رسائل التنبيه */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* شريط الإجراءات والبحث */}
      <Card className="p-4 bg-white border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* حقل البحث */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث بالاسم، البريد، جهة العمل، أو اللجنة..."
                className="w-full h-10 pr-9 pl-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-600 focus:bg-white transition-colors"
              />
            </div>

            {/* فلتر الدور */}
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-teal-600"
            >
              <option value="ALL">كافة الصلاحيات والأدوار</option>
              {Object.entries(ROLE_INFO).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </select>

            {/* فلتر الحالة */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-teal-600"
            >
              <option value="ALL">كافة الحالات (نشط / معطل)</option>
              <option value="ACTIVE">الحسابات النشطة فقط</option>
              <option value="INACTIVE">الحسابات المعطلة فقط</option>
            </select>
          </div>

          {/* زر إضافة مستخدم جديد */}
          <div className="shrink-0">
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setIsCreateOpen(true);
                setFormFullName("");
                setFormEmail("");
                setFormPassword(generatePasswordString());
                setFormPhone("");
                setFormNationalId("");
                setFormRole("REGISTRATION_CLERK");
                setFormEmployer("");
                setFormSubCommitteeId("");
                setFormSpecialtyId("");
                setError(null);
                setSuccessMsg(null);
              }}
              icon={<UserPlus className="w-4 h-4" />}
            >
              <span>إضافة مستخدم وصلاحية جديدة</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* جدول المستخدمين */}
      <Card className="p-0 overflow-hidden border border-slate-200 shadow-2xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-heading">
              قائمة مستخدمي المنظومة وجهات العمل لفحص تعارض المصالح
            </h2>
            <p className="text-xs text-slate-500 font-body mt-0.5">
              تحديد ومراقبة الصلاحيات التشغيلية والجهات التابع لها كل مستخدم
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 font-body">
            عرض {filteredUsers.length} من أصل {users.length} مستخدم
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[220px] whitespace-nowrap">المستخدم</TableHead>
              <TableHead className="whitespace-nowrap">البريد الإلكتروني</TableHead>
              <TableHead className="whitespace-nowrap">الدور والصلاحية</TableHead>
              <TableHead className="whitespace-nowrap">جهة العمل</TableHead>
              <TableHead className="whitespace-nowrap">اللجنة / التخصص</TableHead>
              <TableHead className="text-center whitespace-nowrap">الحالة</TableHead>
              <TableHead className="text-center whitespace-nowrap">الإجراءات والتحكم</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                  لا توجد حسابات تطابق معايير البحث والفلترة المحددة
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u) => {
                const roleConfig = ROLE_INFO[u.role];
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-bold text-slate-900 text-xs font-heading whitespace-nowrap min-w-[220px]">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            u.active ? "bg-emerald-500" : "bg-rose-400"
                          }`}
                        />
                        <span className="leading-relaxed">{u.fullName}</span>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-slate-600 whitespace-nowrap" dir="ltr">
                      {u.email}
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      <Badge variant={roleConfig?.badgeVariant ?? "slate"}>
                        {roleConfig?.label ?? u.role}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs font-medium text-slate-800 whitespace-nowrap">
                      {u.employer ? (
                        <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{u.employer}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">غير محددة</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                      {u.subCommittee?.name ? (
                        <span className="text-slate-700 font-medium block">
                          {u.subCommittee.name}
                        </span>
                      ) : null}
                      {u.specialty?.name ? (
                        <span className="text-[11px] text-teal-700 block">
                          {u.specialty.name}
                        </span>
                      ) : null}
                      {!u.subCommittee?.name && !u.specialty?.name ? (
                        <span className="text-slate-400">—</span>
                      ) : null}
                    </TableCell>

                    <TableCell className="text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          u.active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {u.active ? "نشط" : "معطل"}
                      </span>
                    </TableCell>

                    <TableCell className="text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 justify-center">
                        {/* تعديل الصلاحيات */}
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          title="تعديل الدور والصلاحيات وجهة العمل"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-2xs"
                        >
                          <Edit className="w-3.5 h-3.5 text-slate-600" />
                          <span>تعديل</span>
                        </button>

                        {/* إعادة تعيين كلمة المرور */}
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordUser(u);
                            setError(null);
                            setSuccessMsg(null);
                            setResetNewPassword("");
                          }}
                          title="إعادة تعيين كلمة المرور"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-teal-200 bg-teal-50/60 hover:bg-teal-100 text-teal-700 text-xs font-medium transition-colors shadow-2xs"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                          <span>كلمة المرور</span>
                        </button>

                        {/* إرسال بيانات الدخول عبر واتساب */}
                        <button
                          type="button"
                          onClick={() => {
                            const initialPwd = u.initialPassword?.trim();
                            const pwd = initialPwd || generatePasswordString();
                            const isAutoGenerated = !initialPwd;
                            setWhatsappModal({
                              id: u.id,
                              fullName: u.fullName,
                              email: u.email,
                              role: u.role,
                              phone: u.phone || "",
                              isNewAccount: false,
                              needsPasswordSync: isAutoGenerated,
                            });
                            // استخدام رقم الهاتف وكلمة المرور المحفوظين أو المولدة فوراً
                            setWhatsappPhone(u.phone || "");
                            setWhatsappPassword(pwd);
                            setShowPasswordInModal(true);
                            setError(null);
                          }}
                          title="إرسال بيانات الحساب ورابط الدخول عبر واتساب"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors shadow-2xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>واتساب</span>
                        </button>

                        {/* تفعيل / تعطيل الحساب */}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          disabled={isPending}
                          title={u.active ? "تعطيل الحساب مؤقتاً" : "إعادة تفعيل الحساب"}
                          className={`p-1.5 rounded-lg border text-xs transition-colors shadow-2xs ${
                            u.active
                              ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                              : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          {u.active ? (
                            <PowerOff className="w-3.5 h-3.5" />
                          ) : (
                            <Power className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ─── مودال إضافة مستخدم وصلاحية جديدة ─── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 space-y-3 my-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
                <UserPlus className="w-4 h-4 text-teal-600" />
                <span>إضافة مستخدم جديد</span>
              </h3>
              <button type="button" onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              {/* الصف الأول: الاسم + البريد */}
              <div className="grid grid-cols-2 gap-2">
                <div className="form-group">
                  <label className="form-label form-label-required text-xs">الاسم الكامل</label>
                  <input type="text" required value={formFullName} onChange={(e) => setFormFullName(e.target.value)}
                    placeholder="د. محمد سامي الألفي" className="form-input text-xs" />
                </div>
                <div className="form-group">
                  <label className="form-label form-label-required text-xs">البريد الإلكتروني</label>
                  <input type="email" required value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="name@org.gov.eg" dir="ltr" className="form-input text-xs font-mono" />
                </div>
              </div>

              {/* الصف الثاني: كلمة المرور */}
              <div className="form-group">
                <div className="flex items-center justify-between">
                  <label className="form-label form-label-required text-xs">كلمة المرور الأولية</label>
                  <button type="button" onClick={() => generateRandomPassword("create")}
                    className="text-[11px] font-semibold text-teal-700 hover:underline">
                    ⚡ توليد تلقائي
                  </button>
                </div>
                <input type="text" required value={formPassword} onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="8 أحرف على الأقل..." className="form-input text-xs font-mono" />
              </div>

              {/* الصف الثالث: الدور + الجهة الإدارية */}
              <div className="grid grid-cols-2 gap-2">
                <div className="form-group">
                  <label className="form-label form-label-required text-xs">الدور والصلاحية</label>
                  <select required value={formRole} onChange={(e) => setFormRole(e.target.value)} className="form-input text-xs font-medium">
                    {Object.entries(ROLE_INFO).map(([key, info]) => (
                      <option key={key} value={key}>{info.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label text-xs">الجهة الإدارية</label>
                  <select value={formEmployer} onChange={(e) => setFormEmployer(e.target.value)} className="form-input text-xs">
                    <option value="">— اختر الجهة —</option>
                    {ADMIN_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* اللجنة الفرعية (فقط لعضو اللجنة) */}
              {formRole === "SUBCOMMITTEE_MEMBER" && (
                <div className="form-group">
                  <label className="form-label form-label-required text-xs text-amber-900">اللجنة الفرعية</label>
                  <select required value={formSubCommitteeId} onChange={(e) => setFormSubCommitteeId(e.target.value)} className="form-input text-xs bg-amber-50">
                    <option value="">— اختر اللجنة الفرعية —</option>
                    {subCommittees.map((sc) => <option key={sc.id} value={sc.id}>{sc.name} ({sc.code})</option>)}
                  </select>
                </div>
              )}

              {/* الصف الرابع: التخصص + الرقم القومي */}
              <div className="grid grid-cols-2 gap-2">
                <div className="form-group">
                  <label className="form-label text-xs">التخصص الطبي</label>
                  <select value={formSpecialtyId} onChange={(e) => setFormSpecialtyId(e.target.value)} className="form-input text-xs">
                    <option value="">— بدون تخصص —</option>
                    {specialties.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label text-xs">الرقم القومي (14 رقماً)</label>
                  <input type="text" inputMode="numeric" maxLength={14} value={formNationalId}
                    onChange={(e) => setFormNationalId(e.target.value.replace(/\D/g, ""))}
                    placeholder="2XXXXXXXXXXXXX" dir="ltr" className="form-input text-xs font-mono" />
                </div>
              </div>

              {/* الصف الخامس: رقم الهاتف + خيار إرسال واتساب */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="form-label text-xs flex items-center gap-1 mb-0">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    رقم الواتساب (يُحفظ في البروفايل)
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-semibold cursor-pointer shrink-0">
                    <input type="checkbox" checked={sendViaWhatsAppOnCreate}
                      onChange={(e) => setSendViaWhatsAppOnCreate(e.target.checked)}
                      className="w-3.5 h-3.5 text-emerald-600 rounded-sm border-emerald-300 cursor-pointer" />
                    <span>إرسال واتساب فور الحفظ</span>
                  </label>
                </div>
                <EgyptianPhoneInput
                  value={formPhone}
                  onChange={setFormPhone}
                  size="sm"
                />
              </div>

              {/* الأزرار */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <Button type="button" variant="secondary" size="sm" onClick={() => setIsCreateOpen(false)}>إلغاء</Button>
                <Button type="submit" variant="primary" size="sm" loading={isPending}
                  disabled={isPending || formFullName.length < 2 || !formEmail.includes("@")}>
                  إنشاء الحساب
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── مودال تعديل بيانات وصلاحيات المستخدم ─── */}
      {editUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 space-y-3 my-6 animate-in fade-in zoom-in-95">

            {/* رأس المودال */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
                <Edit className="w-4 h-4 text-teal-600" />
                <span>تعديل: {editUser.fullName}</span>
              </h3>
              <button type="button" onClick={() => setEditUser(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3">
              {/* الصف 1: الاسم + البريد (قراءة فقط) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="form-group">
                  <label className="form-label form-label-required text-xs">الاسم الكامل</label>
                  <input type="text" required value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    className="form-input text-xs" />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs">البريد الإلكتروني</label>
                  <input type="email" disabled value={formEmail} dir="ltr"
                    className="form-input text-xs font-mono bg-slate-100 text-slate-400 cursor-not-allowed" />
                </div>
              </div>

              {/* الصف 2: الدور + جهة العمل */}
              <div className="grid grid-cols-2 gap-2">
                <div className="form-group">
                  <label className="form-label form-label-required text-xs">الدور والصلاحية</label>
                  <select required value={formRole} onChange={(e) => setFormRole(e.target.value)}
                    className="form-input text-xs font-medium">
                    {Object.entries(ROLE_INFO).map(([key, info]) => (
                      <option key={key} value={key}>{info.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label text-xs">الجهة الإدارية</label>
                  <select value={formEmployer} onChange={(e) => setFormEmployer(e.target.value)} className="form-input text-xs">
                    <option value="">— اختر الجهة —</option>
                    {ADMIN_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* اللجنة الفرعية (فقط لعضو اللجنة) */}
              {formRole === "SUBCOMMITTEE_MEMBER" && (
                <div className="form-group">
                  <label className="form-label form-label-required text-xs text-amber-900">اللجنة الفرعية</label>
                  <select required value={formSubCommitteeId} onChange={(e) => setFormSubCommitteeId(e.target.value)} className="form-input text-xs bg-amber-50">
                    <option value="">— اختر اللجنة الفرعية —</option>
                    {subCommittees.map((sc) => <option key={sc.id} value={sc.id}>{sc.name} ({sc.code})</option>)}
                  </select>
                </div>
              )}

              {/* الصف 3: التخصص + الرقم القومي */}
              <div className="grid grid-cols-2 gap-2">
                <div className="form-group">
                  <label className="form-label text-xs">التخصص الطبي</label>
                  <select value={formSpecialtyId} onChange={(e) => setFormSpecialtyId(e.target.value)} className="form-input text-xs">
                    <option value="">— بدون تخصص —</option>
                    {specialties.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label text-xs">الرقم القومي (14 رقماً)</label>
                  <input type="text" inputMode="numeric" maxLength={14} value={formNationalId}
                    onChange={(e) => setFormNationalId(e.target.value.replace(/\D/g, ""))}
                    placeholder="2XXXXXXXXXXXXX" dir="ltr" className="form-input text-xs font-mono" />
                </div>
              </div>

              {/* الصف 4: رقم الواتساب */}
              <div className="form-group">
                <label className="form-label text-xs flex items-center gap-1 mb-1">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  رقم الواتساب (يُحفظ في البروفايل)
                </label>
                <EgyptianPhoneInput
                  value={formPhone}
                  onChange={setFormPhone}
                  size="sm"
                />
              </div>

              {/* الأزرار */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <Button type="button" variant="secondary" size="sm" onClick={() => setEditUser(null)}>إلغاء</Button>
                <Button type="submit" variant="primary" size="sm" loading={isPending} disabled={isPending}>
                  حفظ التعديلات
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ─── مودال تعيين كلمة المرور بواسطة الإدارة ─── */}
      {passwordUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
                  <Lock className="w-4 h-4 text-teal-600" />
                  <span>إعادة تعيين كلمة مرور مستخدم</span>
                </h3>
                <p className="text-xs text-slate-500">
                  صلاحية حصرية للإدارة لتحديث كلمة المرور بعد التحقق من الهوية
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPasswordUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <p><strong className="text-slate-700">المستخدم:</strong> {passwordUser.fullName}</p>
              <p><strong className="text-slate-700">البريد الإلكتروني:</strong> <span className="font-mono">{passwordUser.email}</span></p>
              <p><strong className="text-slate-700">الدور:</strong> {ROLE_INFO[passwordUser.role]?.label ?? passwordUser.role}</p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="form-group">
                <div className="flex items-center justify-between">
                  <label className="form-label form-label-required text-xs">كلمة المرور الجديدة</label>
                  <button
                    type="button"
                    onClick={() => generateRandomPassword("reset")}
                    className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 hover:underline flex items-center gap-1"
                  >
                    <span>توليد كلمة سر قوية تلقائياً</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="أدخل كلمة مرور قوية (8 أحرف على الأقل)..."
                  className="form-input text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setPasswordUser(null)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={isPending}
                  disabled={isPending || resetNewPassword.length < 8}
                >
                  حفظ كلمة المرور الجديدة
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── مودال إرسال بيانات الدخول عبر واتساب ─── */}
      {whatsappModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-3 my-6 animate-in fade-in zoom-in-95">

            {/* رأس المودال */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-heading">إرسال عبر واتساب</h3>
                  <p className="text-[11px] text-slate-500">{whatsappModal.fullName} — <Badge variant={ROLE_INFO[whatsappModal.role]?.badgeVariant ?? "slate"} className="text-[10px] py-0">{ROLE_INFO[whatsappModal.role]?.label ?? whatsappModal.role}</Badge></p>
                </div>
              </div>
              <button type="button" onClick={async () => {
                if (whatsappModal?.id && whatsappModal.needsPasswordSync) {
                  await syncWhatsappPassword(whatsappModal.id, whatsappPassword, whatsappPhone);
                }
                setWhatsappModal(null);
              }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* البريد + رقم الهاتف في صفين */}
            <div className="grid grid-cols-2 gap-2">
              {/* البريد */}
              <div className="form-group">
                <label className="form-label text-xs">البريد الإلكتروني</label>
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                  <span className="font-mono text-xs text-slate-700 flex-1 truncate" dir="ltr">{whatsappModal.email}</span>
                  <button type="button" onClick={() => { navigator.clipboard.writeText(whatsappModal.email); }}
                    className="text-slate-400 hover:text-teal-600 shrink-0">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* رقم الواتساب */}
              <div className="form-group">
                <label className="form-label text-xs mb-1">رقم الواتساب</label>
                <EgyptianPhoneInput
                  value={whatsappPhone}
                  onChange={setWhatsappPhone}
                  size="sm"
                />
              </div>
            </div>

            {/* كلمة المرور — ظاهرة دائماً ومضمنة تلقائياً في الرسالة */}
            <div className="form-group">
              <div className="flex items-center justify-between mb-1">
                <label className="form-label text-xs font-bold text-slate-700">كلمة المرور المضمنة في الرسالة</label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => generateRandomPassword("whatsapp")}
                    className="text-[11px] text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-0.5">
                    ⚡ توليد أخرى
                  </button>
                  <button type="button" onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-0.5">
                    {showPasswordInModal ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPasswordInModal ? "إخفاء" : "إظهار"}</span>
                  </button>
                  {whatsappPassword && (
                    <button type="button" onClick={() => { navigator.clipboard.writeText(whatsappPassword); setCopiedPassword(true); setTimeout(() => setCopiedPassword(false), 2000); }}
                      className="text-[11px] text-teal-600 hover:text-teal-800 font-semibold flex items-center gap-0.5">
                      {copiedPassword ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedPassword ? "نُسخت" : "نسخ"}</span>
                    </button>
                  )}
                </div>
              </div>
              <input
                type={showPasswordInModal ? "text" : "password"}
                value={whatsappPassword}
                onChange={(e) => {
                  setWhatsappPassword(e.target.value);
                  setWhatsappModal((prev) => (prev ? { ...prev, needsPasswordSync: true } : null));
                }}
                onBlur={() => {
                  if (whatsappModal?.id && whatsappModal.needsPasswordSync) {
                    syncWhatsappPassword(whatsappModal.id, whatsappPassword, whatsappPhone);
                  }
                }}
                placeholder="كلمة المرور..."
                className="form-input text-xs font-mono border-emerald-300 bg-emerald-50"
              />
              <span className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                {isSyncingPassword
                  ? "جارٍ حفظ وتحديث كلمة المرور في قاعدة البيانات..."
                  : "كلمة المرور ظاهرة ومحفوظة تلقائياً في قاعدة البيانات ومضمنة في الرسالة"}
              </span>
            </div>

            {/* معاينة الرسالة */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">معاينة الرسالة:</span>
                <button type="button" onClick={() => {
                  const origin = typeof window !== "undefined" ? window.location.origin : "https://trackcd.vercel.app";
                  const text = buildWhatsAppMessageText({
                    fullName: whatsappModal.fullName, email: whatsappModal.email,
                    password: whatsappPassword,
                    roleLabel: ROLE_INFO[whatsappModal.role]?.label || whatsappModal.role,
                    loginUrl: `${origin}/login`,
                  });
                  navigator.clipboard.writeText(text);
                  setCopiedText(true); setTimeout(() => setCopiedText(false), 2000);
                }} className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  {copiedText ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedText ? "تم النسخ ✅" : "نسخ الرسالة"}</span>
                </button>
              </div>
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                {buildWhatsAppMessageText({
                  fullName: whatsappModal.fullName, email: whatsappModal.email,
                  password: whatsappPassword,
                  roleLabel: ROLE_INFO[whatsappModal.role]?.label || whatsappModal.role,
                  loginUrl: typeof window !== "undefined" ? `${window.location.origin}/login` : "https://trackcd.vercel.app/login",
                })}
              </div>
            </div>

            {/* أزرار الإجراءات */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
              <Button type="button" variant="secondary" size="sm" onClick={async () => {
                if (whatsappModal?.id && whatsappModal.needsPasswordSync) {
                  await syncWhatsappPassword(whatsappModal.id, whatsappPassword, whatsappPhone);
                }
                setWhatsappModal(null);
              }}>إغلاق</Button>
              <Button type="button" variant="primary" size="sm"
                onClick={async () => {
                  if (whatsappPhone && !isValidEgyptianPhone(whatsappPhone)) {
                    alert("رقم الهاتف يجب أن يتكون من 11 رقماً مصرياً يبدأ بـ 01 (مثال: 01012345678)");
                    return;
                  }
                  const targetPwd = whatsappPassword.trim() || generatePasswordString();
                  // حفظ كلمة المرور وتحديث الحساب في قاعدة البيانات فوراً إذا كانت جديدة أو معدلة
                  if (whatsappModal.id && (whatsappModal.needsPasswordSync || targetPwd !== whatsappModal.password)) {
                    try {
                      await fetch(`/api/admin/users/${whatsappModal.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          newPassword: targetPwd,
                          initialPassword: targetPwd,
                          phone: whatsappPhone.trim() || undefined,
                        }),
                      });
                      router.refresh();
                    } catch (e) {
                      console.error("Failed to sync password to user", e);
                    }
                  }

                  const origin = typeof window !== "undefined" ? window.location.origin : "https://trackcd.vercel.app";
                  const messageText = buildWhatsAppMessageText({
                    fullName: whatsappModal.fullName, email: whatsappModal.email,
                    password: targetPwd,
                    roleLabel: ROLE_INFO[whatsappModal.role]?.label || whatsappModal.role,
                    loginUrl: `${origin}/login`,
                  });
                  let cleanPhone = whatsappPhone.replace(/\D/g, "");
                  if (cleanPhone.startsWith("00")) cleanPhone = cleanPhone.substring(2);
                  if (cleanPhone.startsWith("01") && cleanPhone.length === 11) cleanPhone = "2" + cleanPhone;
                  const encoded = encodeURIComponent(messageText);
                  const waUrl = cleanPhone
                    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
                    : `https://api.whatsapp.com/send?text=${encoded}`;
                  window.open(waUrl, "_blank", "noopener,noreferrer");
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
                icon={<Send className="w-3.5 h-3.5" />}
              >
                فتح وإرسال عبر WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

