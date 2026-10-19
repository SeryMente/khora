"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LockKeyhole } from "lucide-react";

const IDLE_MS = 5 * 60 * 1000;
type CheckpointHandler = () => void | Promise<void>;

declare global {
  interface Window {
    __KHORA_LOCK_HANDLERS?: Set<CheckpointHandler>;
    __KHORA_REPORT_ACTIVITY?: () => void;
  }
}

export function registerKhoraLockCheckpoint(handler: CheckpointHandler) {
  if (typeof window === "undefined") return () => undefined;
  window.__KHORA_LOCK_HANDLERS ??= new Set();
  window.__KHORA_LOCK_HANDLERS.add(handler);
  return () => window.__KHORA_LOCK_HANDLERS?.delete(handler);
}

export function reportKhoraActivity() {
  try { window.__KHORA_REPORT_ACTIVITY?.(); } catch {}
}

export default function AutoLockProvider({ children }: { children: React.ReactNode }) {
  const graphReading = usePathname() === "/grafo";
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<number | null>(null);
  const lastActivityRef = useRef(Date.now());

  const arm = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (graphReading) return;
    const remaining = Math.max(1000, IDLE_MS - (Date.now() - lastActivityRef.current));
    timerRef.current = window.setTimeout(() => {
      if (Date.now() - lastActivityRef.current >= IDLE_MS) {
        setBusy(true);
        const handlers = Array.from(window.__KHORA_LOCK_HANDLERS ?? []);
        Promise.allSettled(
          handlers.map((handler) =>
            Promise.race([
              Promise.resolve().then(handler),
              new Promise<void>((resolve) => window.setTimeout(resolve, 8000)),
            ]),
          ),
        ).finally(() => {
          setBusy(false);
          setPin("");
          setError("");
          setLocked(true);
        });
      } else {
        arm();
      }
    }, remaining);
  }, [graphReading]);

  const activity = useCallback(() => {
    if (locked) return;
    lastActivityRef.current = Date.now();
    arm();
  }, [arm, locked]);

  useEffect(() => {
    if (graphReading) {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      lastActivityRef.current = Date.now();
      return;
    }
    window.__KHORA_REPORT_ACTIVITY = activity;
    const events = ["pointerdown", "keydown", "touchstart", "wheel", "focus"];
    events.forEach((eventName) => window.addEventListener(eventName, activity, { passive: true }));
    arm();

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, activity));
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      delete window.__KHORA_REPORT_ACTIVITY;
    };
  }, [activity, arm, graphReading]);

  async function unlock() {
    setError("");
    if (!/^\d{4,12}$/.test(pin)) {
      setError("El PIN debe contener entre 4 y 12 dígitos.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/security/lock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.ok !== true) {
        setError(data?.error === "pin_incorrecto" ? "PIN incorrecto." : "No se pudo desbloquear Khora.");
        return;
      }

      setLocked(false);
      setPin("");
      lastActivityRef.current = Date.now();
      arm();
    } catch (err) {
      setError("No se pudo verificar el PIN: " + String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div
        aria-hidden={locked && !graphReading}
        style={{
          filter: locked && !graphReading ? "blur(10px)" : undefined,
          pointerEvents: locked && !graphReading ? "none" : undefined,
        }}
      >
        {children}
      </div>

      {locked && !graphReading && (
        <div
          data-testid="khora-autolock"
          role="dialog"
          aria-modal="true"
          aria-labelledby="khora-autolock-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,.88)", color: "var(--khora-ink)" }}
        >
          <div
            className="w-full max-w-sm rounded-xl border p-7 shadow-2xl"
            style={{ background: "var(--khora-surface)", borderColor: "var(--khora-border)" }}
          >
            <div className="flex flex-col items-center text-center">
              <LockKeyhole size={38} aria-hidden="true" style={{ color: "var(--khora-accent)" }} />
              <h1 id="khora-autolock-title" className="mt-4 text-xl font-bold uppercase tracking-[.18em]">
                Khora bloqueada
              </h1>
              <p className="mt-2 text-xs opacity-70">
                La sesión autenticada permanece activa. Introduce el PIN de seguridad de Khora para continuar.
              </p>
            </div>

            <label htmlFor="khora-autolock-pin" className="sr-only">PIN de seguridad</label>
            <input
              id="khora-autolock-pin"
              autoFocus
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 12))}
              onKeyDown={(event) => {
                if (event.key === "Enter") void unlock();
              }}
              inputMode="numeric"
              type="password"
              autoComplete="off"
              aria-describedby="khora-autolock-help"
              className="mt-6 w-full rounded-md border bg-transparent p-3 text-center text-xl tracking-[.35em] outline-none"
              style={{ borderColor: "var(--khora-border)" }}
              placeholder="••••"
            />
            <p id="khora-autolock-help" className="sr-only">
              Introduce entre 4 y 12 dígitos y pulsa Desbloquear.
            </p>

            <button
              type="button"
              onClick={() => void unlock()}
              disabled={busy || pin.length < 4}
              className="mt-4 w-full rounded-md p-3 text-sm font-bold uppercase tracking-widest disabled:opacity-50"
              style={{ background: "var(--khora-accent)", color: "var(--khora-bg)" }}
            >
              {busy ? "Verificando…" : "Desbloquear"}
            </button>

            {error && (
              <p role="alert" className="mt-3 text-center text-xs" style={{ color: "var(--khora-accent)" }}>
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
