"use client";

import { Check, Clipboard, Clock3, Eye, EyeOff, LockKeyhole, RefreshCw, ShieldCheck, Trash2, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

type Status = {
  active?: boolean;
  issuedAt?: string;
  expiresAt?: string;
  scope?: string;
  audience?: string;
  error?: string;
};

type Issued = {
  token: string;
  expiresAt: string;
  audience: string;
  scope: string;
  minutes: number;
};

export default function VaultAgentAccessPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);
  const [notice, setNotice] = useState("");

  async function refresh() {
    try {
      const response = await fetch("/api/security/vault-agent/token", { cache: "no-store" });
      const data = await response.json();
      setStatus(data && typeof data === "object" ? data : null);
    } catch {
      setStatus({ error: "No se pudo consultar el estado del acceso temporal." });
    }
  }

  useEffect(() => {
    void refresh();
    const clear = () => {
      setIssued(null);
      setVisible(false);
      setCopied(false);
    };
    window.addEventListener("pagehide", clear);
    return () => window.removeEventListener("pagehide", clear);
  }, []);

  useEffect(() => {
    if (!issued) return;
    const remaining = Date.parse(issued.expiresAt) - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) {
      setIssued(null);
      setVisible(false);
      setCopied(false);
      setNotice("La capacidad expiró y fue eliminada de esta página.");
      void refresh();
      return;
    }
    const timer = window.setTimeout(() => {
      setIssued(null);
      setVisible(false);
      setCopied(false);
      setNotice("La capacidad expiró y fue eliminada de esta página.");
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [issued]);

  async function issue() {
    if (issued && !window.confirm("Emitir una nueva capacidad revocará la actual. ¿Continuar?")) return;
    setBusy(true);
    setIssued(null);
    setCopied(false);
    setVisible(false);
    setNotice("Khora Web está emitiendo una capacidad criptográfica de una hora...");

    try {
      const response = await fetch("/api/security/vault-agent/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ minutes: 60 }),
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(
        data?.error === "rate_limit_exceeded"
          ? "Se alcanzó el límite temporal de emisiones."
          : data?.error === "not_authorized"
            ? "Tu sesión no está autorizada para emitir esta capacidad."
            : "Khora Web no pudo emitir la capacidad."
      );
      if (
        typeof data?.token !== "string" ||
        typeof data?.expiresAt !== "string" ||
        data.scope !== "canonical-vault" ||
        data.minutes !== 60
      ) {
        throw new Error("La respuesta de Khora no cumple el contrato criptográfico.");
      }

      const next: Issued = data;
      setIssued(next);
      await navigator.clipboard.writeText(next.token);
      setCopied(true);
      setNotice("Capacidad emitida y copiada al portapapeles. Pégala directamente en ChatGPT cuando vayas a trabajar en el entorno local.");
      window.setTimeout(() => setCopied(false), 2500);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo preparar la capacidad.");
    } finally {
      setBusy(false);
    }
  }

  async function copyToken() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.token);
      setCopied(true);
      setNotice("Capacidad copiada al portapapeles.");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setNotice("El navegador bloqueó el portapapeles. Activa Mostrar token para copiarlo manualmente.");
    }
  }

  async function revoke() {
    setBusy(true);
    try {
      const response = await fetch("/api/security/vault-agent/token", { method: "DELETE", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "No se pudo revocar la capacidad.");
      setIssued(null);
      setVisible(false);
      setCopied(false);
      try { await navigator.clipboard.writeText(" "); } catch {}
      setNotice(data?.revoked ? "Capacidad revocada inmediatamente." : "No había una capacidad activa.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo revocar la capacidad.");
    } finally {
      setBusy(false);
    }
  }

  const active = issued || (status?.active ? status : null);
  const expiresAt = active?.expiresAt ? Date.parse(active.expiresAt) : 0;
  const live = Boolean(active && Number.isFinite(expiresAt) && expiresAt > Date.now());

  return (
    <section
      data-ui-id="seguridad.boveda.agente"
      className="mt-6 space-y-5 border-t pt-6"
      style={{ borderColor: "var(--khora-border)" }}
      aria-labelledby="vault-agent-title"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck size={23} style={{ color: "var(--khora-accent)" }} />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-55">Khora Web · Acceso delegado</p>
          <h2 id="vault-agent-title" className="mt-1 text-lg font-bold">Capacidad para agente local</h2>
          <p className="mt-1 text-xs leading-relaxed opacity-70">
            Khora Web emite una credencial efímera de 60 minutos. No contiene secretos y solo autoriza al agente local a abrir la bóveda canónica.
          </p>
        </div>
      </div>

      <div className="rounded-lg border p-4 text-xs leading-relaxed" style={{ borderColor: "var(--khora-border)", background: "var(--khora-bg)" }}>
        <div className="flex items-start gap-3">
          <LockKeyhole size={17} className="mt-0.5 shrink-0" />
          <div>
            <strong className="block">La llave maestra no sale de tu PC.</strong>
            <span className="opacity-70">El agente local la mantiene protegida con Windows DPAPI; Khora solo administra la capacidad temporal.</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        data-ui-id="seguridad.boveda.agente.emitir"
        disabled={busy}
        onClick={issue}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border p-3 text-sm font-bold uppercase tracking-[0.12em] disabled:opacity-50"
        style={{ background: "var(--khora-accent)", color: "var(--khora-bg)", borderColor: "var(--khora-accent)" }}
      >
        <RefreshCw size={17} className={busy ? "animate-spin" : ""} />
        {busy ? "Procesando..." : live ? "Emitir nueva capacidad · revoca la actual" : "Emitir capacidad · 60 minutos"}
      </button>

      {live && active?.expiresAt && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3" style={{ borderColor: "var(--khora-border)" }}>
            <span className="flex items-center gap-2 text-[10px] uppercase opacity-55"><Clock3 size={14} /> Vencimiento</span>
            <strong className="mt-1 block text-xs">{new Date(active.expiresAt).toLocaleString("es-MX")}</strong>
          </div>
          <div className="rounded-lg border p-3" style={{ borderColor: "var(--khora-border)" }}>
            <span className="text-[10px] uppercase opacity-55">Estado</span>
            <strong className="mt-1 flex items-center gap-2 text-xs text-emerald-400"><Check size={14} /> Capacidad activa</strong>
          </div>
        </div>
      )}

      {issued && live && (
        <div className="space-y-3 rounded-lg border p-4" style={{ borderColor: "var(--khora-border)", background: "var(--khora-bg)" }}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold">Credencial emitida en esta página</span>
            <button type="button" onClick={() => setVisible((value) => !value)} className="inline-flex min-h-10 items-center gap-2 rounded border px-3 py-2 text-xs font-bold" style={{ borderColor: "var(--khora-border)" }}>
              {visible ? <EyeOff size={15} /> : <Eye size={15} />}
              {visible ? "Ocultar" : "Mostrar token"}
            </button>
          </div>
          {visible && (
            <textarea
              readOnly
              value={issued.token}
              onFocus={(event) => event.currentTarget.select()}
              className="min-h-28 w-full resize-none rounded border p-3 font-mono text-xs leading-relaxed"
              style={{ borderColor: "var(--khora-border)", background: "var(--khora-surface)", color: "var(--khora-ink)" }}
              aria-label="Token temporal de acceso a la bóveda"
            />
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={copyToken} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded border px-3 py-2 text-xs font-bold" style={{ borderColor: "var(--khora-border)" }}>
              {copied ? <Check size={15} /> : <Clipboard size={15} />}
              {copied ? "Copiado" : "Copiar token"}
            </button>
            <button type="button" onClick={revoke} disabled={busy} className="flex min-h-11 items-center justify-center gap-2 rounded border px-3 py-2 text-xs font-bold disabled:opacity-50" style={{ borderColor: "var(--khora-border)" }}>
              <Trash2 size={15} /> Revocar ahora
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div className="flex items-start gap-3 rounded-lg border p-3 text-xs leading-relaxed" style={{ borderColor: "var(--khora-border)", background: "var(--khora-bg)" }} role="status">
          {notice.includes("no pudo") || notice.includes("No se") || notice.includes("error") ? <TriangleAlert size={16} className="mt-0.5 shrink-0" /> : <Check size={16} className="mt-0.5 shrink-0" />}
          <span>{notice}</span>
        </div>
      )}
    </section>
  );
}
