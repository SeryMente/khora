"use client";

import { FormEvent, useState } from "react";
import { KeyRound, ShieldAlert, ShieldCheck } from "lucide-react";

export default function EpMasterGatePage() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/ep/master-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await response.json().catch(() => null);
      setPassword("");
      if (!response.ok || data?.ok !== true) {
        setError(response.status === 429
          ? "Se alcanzó el límite temporal de intentos. Espera y vuelve a intentarlo."
          : "No se pudo autorizar el arranque de Entorno Persistente. Verifica la contraseña o la disponibilidad del servicio.");
        return;
      }
      window.location.replace("/sistema/seguridad?tab=entorno-persistente");
    } catch {
      setPassword("");
      setError("No se pudo contactar al servicio de autorización. No se creó una sesión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center p-5 font-mono" style={{ background: "var(--khora-bg)", color: "var(--khora-ink)" }}>
      <section className="w-full max-w-md space-y-6 rounded-2xl border p-6 sm:p-8" style={{ borderColor: "var(--khora-border)", background: "var(--khora-surface)" }}>
        <header className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border" style={{ borderColor: "var(--khora-border)" }}>
            <KeyRound size={27} style={{ color: "var(--khora-accent)" }} aria-hidden="true" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--khora-accent)" }}>Khôra · acceso limitado</p>
          <h1 className="text-xl font-semibold uppercase tracking-wider">Entorno Persistente</h1>
          <p className="text-xs leading-relaxed opacity-65">Autoriza únicamente la preparación de una sesión EP. Esta puerta no abre las demás áreas de Khôra ni sustituye la autenticación general.</p>
        </header>

        <form className="space-y-4" onSubmit={submit}>
          <label className="block space-y-2 text-xs">
            <span className="font-bold uppercase tracking-wider">Contraseña maestra de EP</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              maxLength={1024}
              disabled={busy}
              className="min-h-12 w-full rounded-lg border bg-transparent px-4 py-3 text-sm outline-none focus-visible:ring-2"
              style={{ borderColor: "var(--khora-border)" }}
            />
          </label>
          <button
            type="submit"
            disabled={busy || !password}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--khora-accent)", color: "var(--khora-bg)" }}
          >
            <ShieldCheck size={17} aria-hidden="true" />
            {busy ? "Validando..." : "Autorizar Entorno Persistente"}
          </button>
        </form>

        {error && <div role="alert" className="flex items-start gap-2 rounded-lg border p-3 text-xs leading-relaxed" style={{ borderColor: "var(--khora-border)" }}><ShieldAlert size={17} className="mt-0.5 shrink-0" /><span>{error}</span></div>}

        <p className="text-[10px] leading-relaxed opacity-50">La autorización caduca en pocos minutos, se limita al módulo EP y no conserva la contraseña en esta página.</p>
      </section>
    </main>
  );
}
