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
    function sendHeartbeat() {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetch("/api/user/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: pathnameRef.current || "/dashboard" }),
        }).catch(() => {});
      }
    }

    // Send immediately on mount / focus
    sendHeartbeat();

    // Pulse every 60 seconds
    const interval = setInterval(sendHeartbeat, 60 * 1000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
