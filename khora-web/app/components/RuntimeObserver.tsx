"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function runtimeId() {
  try {
    const existing = window.sessionStorage.getItem("khora-runtime-id");
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem("khora-runtime-id", created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

export function RuntimeObserver() {
  const pathname = usePathname();
  const runtimeIdRef = useRef("");

  useEffect(() => {
    runtimeIdRef.current = runtimeId();
  }, []);

  useEffect(() => {
    if (!runtimeIdRef.current || pathname === "/sistema/ingreso") return;

    const publish = (active = true) => {
      const payload = {
        schema_version: "1.0",
        runtime_id: runtimeIdRef.current,
        session_id: null,
        observed_at: new Date().toISOString(),
        route: pathname || "/",
        screen: pathname?.replace(/^\//, "").split("/")[0] || "inicio",
        active,
        visible: document.visibilityState === "visible",
        focused: document.hasFocus(),
        source: "khora-ui",
        privacy_class: "ANONYMIZED_RUNTIME_STATE",
        state: {
          lifecycle: active ? "present" : "pagehide",
          page_observer: "global",
        },
      };

      fetch("/api/observaciones/runtime-state", {
        method: "POST",
        credentials: "include",
        keepalive: !active,
        headers: {
          "Content-Type": "application/json",
          "X-Khora-Runtime-Source": "khora-ui",
        },
        body: JSON.stringify(payload),
      }).catch(() => {});
    };

    const timer = window.setInterval(() => publish(), 5000);
    const onVisibility = () => publish();
    const onFocus = () => publish();
    const onBlur = () => publish();
    const onPageHide = () => publish(false);

    publish();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [pathname]);

  return null;
}
