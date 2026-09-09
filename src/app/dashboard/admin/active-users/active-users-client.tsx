"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/formatters";
import {
  Users,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Building,
  CheckCircle2,
  Circle,
  AlertCircle,
  Shield,
  Hourglass,
} from "lucide-react";

interface UserItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
  employer: string | null;
  active: boolean;
  lastSeenAt: string | Date | null;
  todayActiveMinutes: number;
  lastActiveDate: string | null;
  subCommittee?: { name: string } | null;
}

interface Props {
  initialUsers: UserItem[];
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "مدير المنظومة",
  FOLLOW_UP_OFFICER: "موظف المتابعة والتوجيه",
  REGISTRATION_CLERK: "موظف قيد السجلات",
  SUBCOMMITTEE_MEMBER: "عضو / مقرر لجنة فاحصة",
  SUPREME_COMMITTEE: "عضو اللجنة العليا",
  FINANCE: "مسؤول الشؤون المالية",
};

export function ActiveUsersClient({ initialUsers }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [presenceFilter, setPresenceFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [refreshing, setRefreshing] = useState(false);

  // Auto-refresh every 30 seconds for live presence
  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh();
    }, 30 * 1000);
    return () => clearInterval(timer);
  }, [router]);

  function refreshNow() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  }

  const now = new Date();

  function getUserPresence(u: UserItem): {
    status: "online" | "away" | "offline";
    label: string;
    badgeColor: string;
    dotColor: string;
  } {
    if (!u.lastSeenAt) {
      return {
        status: "offline",
        label: "لم يسجل دخول بعد",
        badgeColor: "bg-slate-100 text-slate-500",
        dotColor: "bg-slate-400",
      };
    }

    const diffMin = (now.getTime() - new Date(u.lastSeenAt).getTime()) / (1000 * 60);

    if (diffMin <= 3) {
      return {
        status: "online",
        label: "متصل ونشط الآن",
        badgeColor: "bg-emerald-50 text-emerald-800 border border-emerald-200",
        dotColor: "bg-emerald-500 animate-pulse",
      };
    } else if (diffMin <= 30) {
      return {
        status: "away",
        label: `خامل منذ ${Math.round(diffMin)} دقيقة`,
        badgeColor: "bg-amber-50 text-amber-800 border border-amber-200",
        dotColor: "bg-amber-500",
      };
    } else {
      return {
        status: "offline",
        label: "غير متصل",
        badgeColor: "bg-slate-100 text-slate-600",
        dotColor: "bg-slate-400",
      };
    }
  }

  function formatDuration(minutes: number) {
    if (!minutes || minutes <= 0) return "—";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} دقيقة`;
    if (mins === 0) return `${hours} ساعة`;
    return `${hours} س و ${mins} د`;
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const presence = getUserPresence(u);

      if (presenceFilter === "ONLINE" && presence.status !== "online") return false;
      if (presenceFilter === "AWAY" && presence.status !== "away") return false;
      if (presenceFilter === "OFFLINE" && presence.status !== "offline") return false;
      if (presenceFilter === "OVER_60" && (u.todayActiveMinutes || 0) < 60) return false;
      if (presenceFilter === "NO_ACTIVE" && (u.todayActiveMinutes || 0) > 0) return false;

      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        return (
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.employer && u.employer.toLowerCase().includes(q)) ||
          (u.subCommittee && u.subCommittee.name.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [users, presenceFilter, roleFilter, searchTerm]);

  return (
    <div className="space-y-4 font-body">
      {/* شريط الفلاتر والبحث الحي */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث بالاسم، البريد، جهة العمل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pr-9 pl-3 text-xs rounded-xl border border-slate-300 bg-white placeholder:text-slate-400 focus:outline-hidden focus:border-teal-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* فلتر حالة التواجد والمدة */}
          <select
            value={presenceFilter}
            onChange={(e) => setPresenceFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-slate-700 focus:outline-hidden focus:border-teal-600 font-body"
          >
            <option value="ALL">كافة حالات التواجد</option>
            <option value="ONLINE">🟢 متصلون ونشطون الآن</option>
            <option value="AWAY">🟡 خاملون حالياً</option>
            <option value="OVER_60">عملوا أكثر من ساعة اليوم</option>
            <option value="NO_ACTIVE">لم يدخلوا المنظومة اليوم</option>
            <option value="OFFLINE">⚪ غير متصلين</option>
          </select>

          {/* فلتر الدور الوظيفي */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-slate-700 focus:outline-hidden focus:border-teal-600 font-body"
          >
            <option value="ALL">كافة الأدوار الوظيفية</option>
            <option value="REGISTRATION_CLERK">موظفو التسجيل</option>
            <option value="FOLLOW_UP_OFFICER">موظفو المتابعة والتوجيه</option>
            <option value="SUBCOMMITTEE_MEMBER">أعضاء اللجان الفرعية</option>
            <option value="SUPREME_COMMITTEE">أعضاء اللجنة العليا</option>
            <option value="FINANCE">الشؤون المالية</option>
            <option value="ADMIN">مديرو المنظومة</option>
          </select>

          <button
            type="button"
            onClick={refreshNow}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-colors shadow-2xs"
            title="تحديث الحالة اللحظية الآن"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">تحديث فوري</span>
          </button>
        </div>
      </div>

      {/* شريط الإحصائية السريعة للنتائج */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-3">
        <span>
          عدد المستخدمين المعروضين: <strong>{filteredUsers.length}</strong> من إجمالي{" "}
          <strong>{users.length}</strong>
        </span>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="text-teal-700 hover:underline"
          >
            إلغاء البحث
          </button>
        )}
      </div>

      {/* جدول المستخدمين ومعدل التواجد */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-600 font-heading">
                <th className="p-3.5">المستخدم</th>
                <th className="p-3.5">الدور الوظيفي والجهة</th>
                <th className="p-3.5">حالة الاتصال الحية</th>
                <th className="p-3.5">آخر ظهور وتفاعل</th>
                <th className="p-3.5">مدة النشاط اليوم</th>
                <th className="p-3.5 text-center">حالة الحساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-body">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    لا يوجد مستخدمون مطابقون لمعايير الفلترة المحددة
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const presence = getUserPresence(u);
                  const lastSeen = u.lastSeenAt ? new Date(u.lastSeenAt) : null;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* المستخدم */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 block font-heading text-sm">
                            {u.fullName}
                          </span>
                          <span className="text-slate-500 font-mono text-[11px] block">
                            {u.email}
                          </span>
                        </div>
                      </td>

                      {/* الدور والجهة */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800 block">
                            {ROLE_LABELS[u.role] || u.role}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {u.subCommittee?.name || u.employer || "ديوان عام الوزارة"}
                          </span>
                        </div>
                      </td>

                      {/* حالة الاتصال الحية */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${presence.badgeColor}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${presence.dotColor}`} />
                          <span>{presence.label}</span>
                        </span>
                      </td>

                      {/* آخر ظهور وتفاعل */}
                      <td className="p-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {lastSeen ? (
                          <div>
                            <div className="font-semibold text-slate-800">
                              {formatDate(lastSeen)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {lastSeen.toLocaleTimeString("ar-EG")}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic font-sans">—</span>
                        )}
                      </td>

                      {/* مدة النشاط اليوم */}
                      <td className="p-3.5 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Hourglass className="w-3.5 h-3.5 text-teal-600" />
                          <span className="font-bold text-slate-900">
                            {formatDuration(u.todayActiveMinutes)}
                          </span>
                        </div>
                      </td>

                      {/* حالة الحساب */}
                      <td className="p-3.5 text-center">
                        {u.active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800">
                            مُفعَّل
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800">
                            موقوف
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
