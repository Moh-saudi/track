"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AlertTriangle, ShieldAlert, X, Lock } from "lucide-react";

export function RiskModeBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    function checkCookie() {
      const match = document.cookie
        .split("; ")
        .find((row) => row.startsWith("risk_mode_session="));
      setIsActive(!!match);
    }
    checkCookie();
  }, [pathname]);

  function exitRiskMode() {
    document.cookie =
      "risk_mode_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    setIsActive(false);
    router.refresh();
  }

  if (!isActive) return null;

  return (
    <div className="bg-rose-700 text-white px-4 py-2.5 shadow-md font-body text-xs flex flex-col sm:flex-row items-center justify-between gap-2 z-40 relative animate-in slide-in-from-top duration-200">
      <div className="flex items-center gap-2 text-rose-100 font-medium">
        <ShieldAlert className="w-5 h-5 text-amber-300 shrink-0" />
        <span className="font-bold text-white font-heading text-sm">
          وضع إدارة المخاطر وتصحيح المسار الاستثنائي نشط:
        </span>
        <span className="hidden md:inline">
          كافة عمليات إعادة الفتح والإلغاء الاستثنائية تخضع لبروتوكول رقابي مشدد وموثقة بالرقم القومي والتأشيرة.
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={exitRiskMode}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-colors border border-white/20 shadow-2xs"
        >
          <Lock className="w-3 h-3" />
          <span>إنهاء وضع المخاطر والخروج</span>
        </button>
      </div>
    </div>
  );
}
