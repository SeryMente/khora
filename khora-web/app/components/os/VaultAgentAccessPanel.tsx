"use client";

import { Check, Clipboard, Clock3, Eye, EyeOff, LockKeyhole, RefreshCw, ShieldCheck, Trash2, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  issuedAt: string;
  expiresAt: string;
  audience: string;
  scope: string;
  minutes: number;
};

type HistoryEntry = {
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  status: "active" | "expired" | "revoked";
  scope: string;
  audience: string;
};

type History = {
  total: number;
  active: number;
  expired: number;
  revoked: number;
  entries: HistoryEntry[];
  error?: string;
};

function formatRemaining(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime())
    ? parsed.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" })
    : "—";
}

function statusLabel(status: HistoryEntry["status"]): string {
  if (status === "active") return "ACTIVA";
  if (status === "expired") return "EXPIRADA";
  return "REVOCADA";
}

export default function VaultAgentAccessPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(() => Date.now());

  async function refresh() {
    try {
      const [statusResponse, historyResponse] = await Promise.all([
        fetch("/api/security/vault-agent/token", { cache: "no-store" }),
        fetch("/api/security/vault-agent/history?limit=12", { cache: "no-store" }),
      ]);
      const [statusData, historyData] = await Promise.all([statusResponse.json(), historyResponse.json()]);
      const validHistory = historyData && typeof historyData === "object" &&
        ["total", "active", "expired", "revoked"].every((key) => Number.isInteger(historyData[key]) && historyData[key] >= 0) &&
        Array.isArray(historyData.entries) && historyData.entries.every((entry: HistoryEntry) =>
          entry && ["active", "expired", "revoked"].includes(entry.status) &&
          [entry.issuedAt, entry.expiresAt, entry.scope, entry.audience].every((value) => typeof value === "string") &&
          (entry.revokedAt === null || typeof entry.revokedAt === "string"));
      if (!statusResponse.ok || !historyResponse.ok || !statusData || typeof statusData !== "object" ||
          typeof statusData.active !== "boolean" || !validHistory) {
        throw new Error("Respuesta de acceso temporal no disponible o inválida.");
      }
      setStatus(statusData);
      setHistory(historyData);
    } catch {
      setStatus({ error: "No se pudo consultar el estado del acceso temporal." });
      setHistory({ total: 0, active: 0, expired: 0, revoked: 0, entries: [], error: "No se pudo consultar el historial." });
    }
  }

  useEffect(() => {
    void refresh();
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const poll = window.setInterval(() => void refresh(), 15000);
    const clear = () => {
      setIssued(null);
      setVisible(false);
      setCopied(false);
    };
    window.addEventListener("pagehide", clear);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(poll);
      window.removeEventListener("pagehide", clear);
    };
  }, []);

  const active = issued || (status?.active ? status : null);
  const expiresAtMs = active?.expiresAt ? Date.parse(active.expiresAt) : 0;
  const remainingMs = expiresAtMs - now;
  const live = Boolean(active && Number.isFinite(expiresAtMs) && remainingMs > 0);

  useEffect(() => {
    if (!issued || !Number.isFinite(expiresAtMs) || remainingMs > 0) return;
    setIssued(null);
    setVisible(false);
    setCopied(false);
    setNotice("La capacidad expiró y fue eliminada de esta página.");
    void refresh();
  }, [expiresAtMs, issued, remainingMs]);

  const historico = useMemo(() => history ?? { total: 0, active: 0, expired: 0, revoked: 0, entries: [] }, [history]);

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
      if (!response.ok) {
        throw new Error(
          data?.error === "rate_limit_exceeded"
            ? "Se alcanzó el límite temporal de emisiones."
            : data?.error === "not_authorized"
              ? "Tu sesión no está autorizada para emitir esta capacidad."
              : "Khora Web no pudo emitir la capacidad."
        );
      }
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
      setNotice("Capacidad emitida y copiada al portapapeles. Pégala directamente en ChatGPT para trabajar en el entorno local.");
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
            Credencial efímera de 60 minutos. No contiene secretos y solo autoriza al agente local a abrir la bóveda canónica.
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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Emisiones", historico.total],
          ["Activa", historico.active],
          ["Expiradas", historico.expired],
          ["Revocadas", historico.revoked],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border p-3" style={{ borderColor: "var(--khora-border)", background: "var(--khora-bg)" }}>
            <span className="block text-[9px] uppercase tracking-[0.12em] opacity-55">{label}</span>
            <strong className="mt-1 block text-lg tabular-nums">{value}</strong>
          </div>
        ))}
      </div>

      {live && active?.expiresAt && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3" style={{ borderColor: "var(--khora-border)" }}>
            <span className="flex items-center gap-2 text-[10px] uppercase opacity-55"><Clock3 size={14} /> Contador en vivo</span>
            <strong className="mt-1 block font-mono text-xl tabular-nums">{formatRemaining(remainingMs)}</strong>
            <span className="mt-1 block text-[10px] opacity-55">vence {formatDate(active.expiresAt)}</span>
          </div>
          <div className="rounded-lg border p-3" style={{ borderColor: "var(--khora-border)" }}>
            <span className="text-[10px] uppercase opacity-55">Estado</span>
            <strong className="mt-2 flex items-center gap-2 text-xs"><Check size={14} style={{ color: "var(--khora-accent)" }} /> Capacidad activa</strong>
            <span className="mt-1 block text-[10px] opacity-55">emitida {formatDate(active.issuedAt ?? "")}</span>
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

      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-55">Auditoría de capacidades</p>
            <h3 className="mt-1 text-sm font-bold">Historial de emisiones</h3>
          </div>
          <span className="text-[10px] opacity-50">actualiza cada 15 s</span>
        </div>

        <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--khora-border)" }}>
          {historico.entries.length === 0 ? (
            <div className="p-4 text-xs opacity-60">Todavía no hay emisiones registradas.</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--khora-border)" }}>
              {historico.entries.map((entry) => (
                <div key={entry.issuedAt + entry.expiresAt} className="grid gap-2 p-3 text-xs sm:grid-cols-[1.35fr_1fr_0.8fr] sm:items-center">
                  <div>
                    <span className="block text-[9px] uppercase opacity-45">Generada</span>
                    <strong className="font-mono text-[11px]">{formatDate(entry.issuedAt)}</strong>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase opacity-45">{entry.status === "revoked" ? "Revocada" : "Expiración"}</span>
                    <span className="font-mono text-[11px]">{formatDate(entry.revokedAt ?? entry.expiresAt)}</span>
                  </div>
                  <div className="sm:text-right">
                    <span className="inline-flex rounded border px-2 py-1 text-[9px] font-bold tracking-[0.12em]" style={{ borderColor: "var(--khora-border)" }}>
                      {statusLabel(entry.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {(notice || status?.error || history?.error) && (
        <div className="flex items-start gap-3 rounded-lg border p-3 text-xs leading-relaxed" style={{ borderColor: "var(--khora-border)", background: "var(--khora-bg)" }} role="status">
          {notice.includes("no pudo") || notice.includes("No se") || status?.error || history?.error ? <TriangleAlert size={16} className="mt-0.5 shrink-0" /> : <Check size={16} className="mt-0.5 shrink-0" />}
          <span>{notice || status?.error || history?.error}</span>
        </div>
      )}
    </section>
  );
}
