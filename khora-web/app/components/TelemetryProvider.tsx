"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { logTelemetryEvent } from "@/lib/telemetry";

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasBooted = useRef(false);

  // BOOT Event
  useEffect(() => {
    if (!hasBooted.current) {
      hasBooted.current = true;
      logTelemetryEvent({
        moduleId: "khora-web",
        action: "BOOT",
        severity: "INFO",
        payload: { userAgent: navigator.userAgent },
      });
    }
  }, []);

  // NAVIGATE Event
  useEffect(() => {
    if (hasBooted.current) {
      logTelemetryEvent({
        moduleId: "khora-web",
        action: "NAVIGATE",
        severity: "INFO",
        payload: { path: pathname },
      });
    }
  }, [pathname]);

  // ERROR Event (global listener)
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      logTelemetryEvent({
        moduleId: "khora-web",
        action: "ERROR",
        severity: "ERROR",
        errorDetails: {
          message: event.message,
          stack: event.error?.stack,
        },
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logTelemetryEvent({
        moduleId: "khora-web",
        action: "ERROR",
        severity: "ERROR",
        errorDetails: {
          message: event.reason?.message || "Unhandled Promise Rejection",
          stack: event.reason?.stack,
        },
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return <>{children}</>;
}
