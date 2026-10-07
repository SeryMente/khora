"use client";

import { useEffect, useState } from "react";

export function UpdatePrompt() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleControllerChange = () => {
      if (navigator.serviceWorker.controller) setIsVisible(true);
    };

    let registration: ServiceWorkerRegistration | undefined;

    const checkForUpdates = async () => {
      try {
        registration = await navigator.serviceWorker.getRegistration();

        if (registration?.waiting) setIsVisible(true);

        registration?.addEventListener("updatefound", () => {
          const newWorker = registration!.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                setIsVisible(true);
              }
            });
          }
        });
      } catch (error) {
        console.error("SW registration check failed:", error);
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    void checkForUpdates();

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  const handleUpdate = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
        window.setTimeout(() => window.location.reload(), 500);
      }
    } catch (error) {
      console.error("Update failed:", error);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-0 right-0 top-0 z-50 bg-indigo-500/90 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium text-white">Versión nueva — Actualizar</span>
        <button
          type="button"
          onClick={() => void handleUpdate()}
          className="ml-4 rounded bg-white px-3 py-1 text-xs font-semibold text-indigo-500 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Actualizar
        </button>
      </div>
    </div>
  );
}
