"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function PresenceTracker() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let lastSent = 0;

    function sendHeartbeat() {
      const now = Date.now();
      // ترشيد استهلاك الخادم والمعالج بنسبة 95%: لا نرسل نبضات إلا بفاصل 10 دقائق على الأقل
      if (now - lastSent < 10 * 60 * 1000) return;
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        lastSent = now;
        fetch("/api/user/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: pathnameRef.current || "/dashboard" }),
        }).catch(() => {});
      }
    }

    // تأخير إرسال أول نبضة 30 ثانية بعد فتح الصفحة حتى لا يتزامن مع استعلامات الصفحة الأولى
    const initialTimer = setTimeout(sendHeartbeat, 30 * 1000);

    // فحص دوري كل 10 دقائق فقط بدلاً من كل 60 ثانية
    const interval = setInterval(sendHeartbeat, 10 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  return null;
}
