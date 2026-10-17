"use client";

import { useEffect, useRef, useState } from "react";

type Props = { onUnlocked: () => Promise<void>; pendingDownload: boolean; onCancel: () => void };

/** Uses the existing owner-checked vault and HttpOnly cookie. No reset or PIN persistence. */
export default function CustodiaUnlock({ onUnlocked, pendingDownload, onCancel }: Props) {
  const [pin, setPin] = useState("");
  const [configured, setConfigured] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/boveda", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("No se pudo comprobar el acceso a la bóveda.");
        const data = await response.json();
        setConfigured(data.configurado === true);
        if (data.configurado !== true) setError("No hay un PIN configurado. Configúralo en Seguridad antes de desbloquear Custodia.");
      })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    input.current?.focus();
    return () => controller.abort();
  }, []);

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    if (busy || checking || !configured || !/^[0-9]{4,12}$/.test(pin)) return;
    setBusy(true); setError("");
    const submitted = pin;
    setPin("");
    try {
      const response = await fetch("/api/boveda", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: submitted, unlockOnly: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.abierta !== true) {
        throw new Error(data.error === "pin_incorrecto" ? "PIN incorrecto. Inténtalo de nuevo." : "No se pudo desbloquear la bóveda. Comprueba tu acceso e inténtalo de nuevo.");
      }
      const verification = await fetch("/api/boveda", { cache: "no-store" });
      if (!verification.ok || (await verification.json()).abierta !== true) {
        throw new Error("El desbloqueo no quedó vigente. Inténtalo de nuevo sin salir de Custodia.");
      }
      await onUnlocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desbloquear el audio.");
      input.current?.focus();
    } finally { setBusy(false); }
  }

  return <section aria-label="Desbloquear audio en Custodia" className="border p-4 space-y-3 mx-4 md:mx-8" style={{ borderColor: "var(--khora-border)", color: "var(--khora-ink)", background: "var(--khora-surface)" }}>
    <h2 className="font-bold">Desbloquear audio en Custodia</h2>
    <p className="text-sm">Introduce tu número de identificación personal (PIN) sin salir de esta pantalla. Se mantiene la protección de la bóveda.</p>
    <form onSubmit={unlock} className="flex flex-wrap items-end gap-3">
      <label className="text-sm">PIN de la bóveda
        <input ref={input} type="password" inputMode="numeric" autoComplete="off" minLength={4} maxLength={12} pattern="[0-9]{4,12}" required value={pin} onChange={event => setPin(event.target.value)} disabled={busy} className="block border p-2" style={{ borderColor: "var(--khora-border)", background: "var(--khora-bg)", color: "var(--khora-ink)" }} />
      </label>
      <button type="submit" disabled={checking || busy || !configured || !/^[0-9]{4,12}$/.test(pin)} className="border px-3 py-2 disabled:opacity-50" style={{ borderColor: "var(--khora-border)" }}>{busy ? "Desbloqueando…" : pendingDownload ? "Desbloquear y descargar MP3" : "Desbloquear audio"}</button>
      {pendingDownload && <button type="button" onClick={onCancel} disabled={busy} className="underline text-sm">Cancelar descarga pendiente</button>}
    </form>
    {checking && <p role="status" className="text-sm">Comprobando acceso…</p>}
    {error && <p role="alert" className="text-sm">{error}</p>}
  </section>;
}
