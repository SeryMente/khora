// @l0 L0-002-R · @req SISTEMA-MENU/E1 · @req EP-LAUNCHER/UI-2
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Check, ChevronDown, ChevronRight, Clipboard, Clock3, FileText, KeyRound, LockKeyhole, RefreshCw, ShieldAlert, ShieldCheck, TerminalSquare, Trash2 } from "lucide-react";
import PaginaBoveda from "@/app/components/os/PaginaBoveda";

type Launcher = { id: string; version?: string; platform: string; shell: string; minimumVersion: string; storageBackend: string; execution?: string; status: string; command: string };
type Issued = { token: string; sessionId: string; expiresAt: string; command: string; apiBase: string; launcher: Launcher };
type Summary = { id: string; estado: string; creado_en: string; ultimo_evento_en: string | null; cerrado_en: string | null };
type Notice = { kind: "idle" | "working" | "success" | "error"; text: string };
type CopyTarget = "command" | "token" | null;
type JwtClaims = { iss?: unknown; sid?: unknown; typ?: unknown; exp?: unknown };

const API_MESSAGES: Record<string, string> = {
  not_authorized: "Tu sesión no está autorizada para emitir tokens del Entorno Persistente.",
  rate_limit_exceeded: "Se alcanzó el límite de cinco emisiones en quince minutos. Espera antes de generar otro token.",
  token_issue_unavailable: "Khora no pudo emitir el token de forma segura. No se creó un lanzamiento utilizable.",
  session_history_unavailable: "El historial de sesiones no está disponible temporalmente.",
  missing_bearer: "Falta el token Khora.",
  invalid_token_format: "El valor no tiene el formato de un token Khora JWT completo.",
  invalid_token: "El token no es válido.",
  invalid_signature: "La firma del token no es válida.",
  invalid_audience: "El token fue emitido para una URL canónica distinta.",
  insufficient_scope: "El token no incluye el permiso requerido.",
  revoked_or_expired: "El token fue revocado por una emisión posterior o ya venció.",
  authentication_unavailable: "La validación del token no está disponible temporalmente.",
  bootstrap_state_unavailable: "Khora no pudo registrar de forma segura la descarga del gate.",
  event_log_unavailable: "La bitácora remota no está disponible temporalmente.",
};

function decodeJwtClaims(token: string): JwtClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
    const value = JSON.parse(new TextDecoder().decode(bytes));
    return value && typeof value === "object" ? value as JwtClaims : null;
  } catch { return null; }
}

function validateIssued(value: unknown): Issued | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Issued>;
  if (typeof candidate.token !== "string" || typeof candidate.command !== "string" || typeof candidate.sessionId !== "string" || typeof candidate.expiresAt !== "string" || typeof candidate.apiBase !== "string" || !candidate.launcher || typeof candidate.launcher.command !== "string") return null;
  const claims = decodeJwtClaims(candidate.token);
  const expiration = Date.parse(candidate.expiresAt);
  if (!claims || claims.iss !== "khora-ep" || claims.typ !== "ep-session" || claims.sid !== candidate.sessionId || typeof claims.exp !== "number" || !Number.isFinite(expiration) || candidate.command !== candidate.launcher.command || candidate.command.includes(candidate.token)) return null;
  return candidate as Issued;
}

function messageFromResponse(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const value = data as { error?: unknown; code?: unknown; detail?: unknown; message?: unknown };
  for (const candidate of [value.code, value.detail, value.error]) if (typeof candidate === "string" && API_MESSAGES[candidate]) return API_MESSAGES[candidate];
  return typeof value.message === "string" && value.message.length <= 240 ? value.message : fallback;
}

async function writeClipboardExact(value: string): Promise<void> {
  if (!value) throw new Error("No hay contenido para copiar.");
  if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return; }
  const textarea = document.createElement("textarea");
  textarea.value = value; textarea.readOnly = true; textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed"; textarea.style.opacity = "0"; textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  try { textarea.select(); if (!document.execCommand("copy")) throw new Error("El navegador rechazó la copia."); }
  finally { textarea.remove(); }
}

function SeguridadContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"seguridad" | "boveda">(searchParams?.get("tab") === "boveda" ? "boveda" : "seguridad");
  const [issued, setIssued] = useState<Issued | null>(null);
  const [sessions, setSessions] = useState<Summary[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>({ kind: "idle", text: "" });
  const [copied, setCopied] = useState<CopyTarget>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [logBusy, setLogBusy] = useState(false);
  const [logContent, setLogContent] = useState("");
  const expiresAt = issued ? Date.parse(issued.expiresAt) : 0;
  const expired = Boolean(issued && (!Number.isFinite(expiresAt) || expiresAt <= Date.now()));
  const claims = useMemo(() => issued ? decodeJwtClaims(issued.token) : null, [issued]);

  useEffect(() => { const tab = searchParams?.get("tab"); if (tab === "seguridad" || tab === "boveda") setActiveTab(tab); }, [searchParams]);

  async function refresh() {
    try {
      const response = await fetch("/api/ep/token", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) return;
      const data = await response.json();
      setSessions(Array.isArray(data.sessions) ? data.sessions.slice(0, 2) : []);
    } catch { /* La consulta secundaria no invalida la credencial activa. */ }
  }
  useEffect(() => { void refresh(); }, []);

  useEffect(() => {
    if (!issued) return;
    const remaining = Date.parse(issued.expiresAt) - Date.now();
    if (remaining <= 0) { setIssued(null); setNotice({ kind: "error", text: "El token venció y fue eliminado de esta página." }); return; }
    const timer = window.setTimeout(() => { setIssued(null); setCopied(null); setNotice({ kind: "error", text: "El token venció y fue eliminado de esta página." }); }, Math.min(remaining, 2_147_000_000));
    return () => window.clearTimeout(timer);
  }, [issued]);
  useEffect(() => { const discard = () => setIssued(null); window.addEventListener("pagehide", discard); return () => window.removeEventListener("pagehide", discard); }, []);

  async function issue() {
    if (issued && !expired && !window.confirm("Generar uno nuevo revocará inmediatamente el token actual. ¿Continuar?")) return;
    setBusy(true); setIssued(null); setCopied(null); setLogContent("");
    setNotice({ kind: "working", text: "Emitiendo una credencial efímera y revocando cualquier sesión anterior..." });
    const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch("/api/ep/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform: "windows" }), cache: "no-store", credentials: "same-origin", signal: controller.signal });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(messageFromResponse(data, `Khora rechazó la emisión (${response.status}).`));
      const validated = validateIssued(data);
      if (!validated) throw new Error("Khora devolvió un contrato de lanzamiento incompleto o inconsistente.");
      setIssued(validated); setNotice({ kind: "success", text: "Token validado. Copia primero el comando y después el token." }); await refresh();
    } catch (error) {
      const text = error instanceof DOMException && error.name === "AbortError" ? "La emisión superó 30 segundos y fue cancelada sin conservar credenciales." : error instanceof Error ? error.message : "No se pudo emitir el token.";
      setNotice({ kind: "error", text });
    } finally { window.clearTimeout(timeout); setBusy(false); }
  }

  async function copyTarget(target: Exclude<CopyTarget, null>) {
    if (!issued || expired) { setNotice({ kind: "error", text: "Genera un token vigente antes de copiar." }); return; }
    const value = target === "token" ? issued.token : issued.command;
    if (target === "token" && !decodeJwtClaims(value)) { setNotice({ kind: "error", text: "El token en memoria no supera la validación JWT local." }); return; }
    if (target === "command" && value.includes(issued.token)) { setNotice({ kind: "error", text: "El comando fue bloqueado porque contenía la credencial." }); return; }
    try {
      await writeClipboardExact(value); setCopied(target);
      setNotice({ kind: "success", text: target === "command" ? "Comando copiado exactamente. Pégalo en PowerShell, pero no presiones Enter todavía." : "Token Khora copiado exactamente. Regresa a PowerShell y presiona Enter." });
      window.setTimeout(() => setCopied((current) => current === target ? null : current), 2500);
    } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "El navegador no permitió copiar." }); }
  }

  async function discardCredential() {
    setIssued(null); setCopied(null); setLogContent("");
    try { await writeClipboardExact(" "); } catch {}
    setNotice({ kind: "success", text: "La credencial se eliminó de esta página y el portapapeles fue limpiado." });
  }

  async function fetchLog(which: "current" | "last") {
    if (!issued || expired) { setNotice({ kind: "error", text: "Se requiere un token vigente para consultar la bitácora." }); return; }
    setLogBusy(true);
    try {
      const response = await fetch(`/api/ep/logs?which=${which}&format=ndjson`, { headers: { Authorization: `Bearer ${issued.token}` }, cache: "no-store", credentials: "same-origin" });
      const text = await response.text();
      if (!response.ok) { let data: unknown = null; try { data = JSON.parse(text); } catch {} throw new Error(messageFromResponse(data, `No se pudo consultar la bitácora (${response.status}).`)); }
      setLogContent((text.trim() || "(Bitácora vacía)").slice(0, 250_000));
    } catch (error) { setLogContent(""); setNotice({ kind: "error", text: error instanceof Error ? error.message : "No se pudo consultar la bitácora." }); }
    finally { setLogBusy(false); }
  }

  const noticeIcon = notice.kind === "error" ? <ShieldAlert className="shrink-0 text-red-400" size={18} /> : notice.kind === "working" ? <RefreshCw className="shrink-0 animate-spin" size={18} /> : <Check className="shrink-0 text-emerald-400" size={18} />;
  const border = { borderColor: "var(--khora-border)" };

  return <div className="w-full max-w-5xl space-y-8">
    <div className="flex border-b" style={border} role="tablist" aria-label="Módulos de seguridad">
      {(["seguridad", "boveda"] as const).map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className="flex items-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--khora-accent)]" style={{ borderBottom: activeTab === tab ? "2px solid var(--khora-accent)" : "2px solid transparent", opacity: activeTab === tab ? 1 : .55 }}>{tab === "seguridad" ? <ShieldCheck size={18} /> : <LockKeyhole size={18} />}{tab === "seguridad" ? "Seguridad" : "Bóveda"}</button>)}
    </div>
    {activeTab === "boveda" ? <PaginaBoveda /> : <>
      <header className="space-y-3 border-b pb-6 text-center" style={border}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border" style={{ ...border, background: "var(--khora-surface)" }}><ShieldCheck size={30} style={{ color: "var(--khora-accent)" }} /></div>
        <h1 className="text-2xl font-bold uppercase tracking-[0.18em]">Seguridad</h1>
        <p className="mx-auto max-w-2xl text-sm opacity-70">Emisión controlada, lanzamiento cifrado y trazabilidad remota del Entorno Persistente.</p>
      </header>
      <div aria-live="polite" aria-atomic="true" className="sr-only">{notice.text}</div>
      <section id="entorno-persistente" data-ui-id="seguridad.ep.container" aria-labelledby="ep-card-title" className="overflow-hidden rounded-xl border" style={{ ...border, background: "var(--khora-surface)" }}>
        <div className="space-y-5 border-b p-5 sm:p-7" style={border}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="space-y-2"><div className="flex items-center gap-2"><KeyRound size={22} style={{ color: "var(--khora-accent)" }} /><h2 id="ep-card-title" className="text-lg font-bold uppercase tracking-wide">Entorno Persistente</h2></div><p className="max-w-2xl text-sm leading-relaxed opacity-70">Genera una credencial de sesión para Windows. El workspace se crea en un VHDX dedicado y cifrado con BitLocker.</p></div><div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wider"><span className="rounded-full border px-3 py-1" style={border}>PowerShell 5.1+</span><span className="rounded-full border px-3 py-1" style={border}>BitLocker</span><span className="rounded-full border px-3 py-1" style={border}>JWT efímero</span></div></div>
          <div className="flex items-start gap-3 rounded-lg border p-4 text-sm" style={{ ...border, background: "var(--khora-bg)" }}><AlertTriangle className="mt-0.5 shrink-0 text-amber-400" size={18} /><div><strong className="block">Una emisión nueva revoca la anterior</strong><p className="mt-1 opacity-70">El token completo vive solo en memoria hasta que vence, lo descartas o cierras la pestaña. Nunca se imprime ni se guarda en el navegador.</p></div></div>
          <button type="button" data-ui-id="seguridad.ep.generar" disabled={busy} onClick={issue} className="flex w-full items-center justify-center gap-2 rounded-lg border p-3 text-sm font-bold uppercase tracking-[0.14em] hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--khora-accent)]" style={{ background: "var(--khora-accent)", color: "var(--khora-bg)", borderColor: "var(--khora-accent)" }}><RefreshCw size={17} className={busy ? "animate-spin" : ""} />{busy ? "Generando de forma segura..." : issued ? "Generar y revocar token actual" : "Generar token Khora"}</button>
          {notice.text && <div role={notice.kind === "error" ? "alert" : "status"} className="flex items-start gap-3 rounded-lg border p-3 text-sm" style={{ ...border, background: "var(--khora-bg)" }}>{noticeIcon}<span>{notice.text}</span></div>}
        </div>
        {issued && !expired && <div className="space-y-6 p-5 sm:p-7" data-ui-id="seguridad.ep.credencial">
          <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border p-3" style={border}><span className="block text-[10px] uppercase opacity-55">Sesión</span><code className="mt-1 block truncate text-xs" title={issued.sessionId}>{issued.sessionId}</code></div><div className="rounded-lg border p-3" style={border}><span className="block text-[10px] uppercase opacity-55">Vencimiento</span><span className="mt-1 flex items-center gap-1.5 text-xs"><Clock3 size={14} />{new Date(issued.expiresAt).toLocaleString("es-MX")}</span></div><div className="rounded-lg border p-3" style={border}><span className="block text-[10px] uppercase opacity-55">Contrato</span><span className="mt-1 flex items-center gap-1.5 text-xs text-emerald-400"><Check size={14} />{claims?.typ === "ep-session" ? "JWT validado · 3 segmentos" : "No válido"}</span></div></div>
          <div className="space-y-3"><div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold" style={border}>1</span><div><h3 className="font-bold">Copia el comando</h3><p className="text-xs opacity-65">Pégalo en PowerShell sin ejecutarlo todavía.</p></div></div><pre className="max-h-36 overflow-auto whitespace-pre-wrap break-all rounded-lg border p-4 text-xs leading-relaxed" style={{ ...border, background: "var(--khora-bg)" }} data-ui-id="seguridad.ep.comando">{issued.command}</pre><button type="button" onClick={() => copyTarget("command")} className="flex w-full items-center justify-center gap-2 rounded-lg border p-3 text-sm font-bold hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--khora-accent)]" style={border} data-ui-id="seguridad.ep.copiar-comando">{copied === "command" ? <Check size={17} className="text-emerald-400" /> : <TerminalSquare size={17} />}{copied === "command" ? "Comando copiado exactamente" : "Copiar comando PowerShell"}</button></div>
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center"><div className="space-y-3 rounded-lg border p-4" style={{ ...border, background: "var(--khora-bg)" }}><div className="flex items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold" style={border}>2</span><div><h3 className="font-bold">Copia el token por separado</h3><p className="text-xs opacity-65">Se copia el JWT exacto, sin etiqueta, espacios ni truncamiento. No se muestra en pantalla.</p></div></div><button type="button" onClick={() => copyTarget("token")} className="flex w-full items-center justify-center gap-2 rounded-lg border p-3 text-sm font-bold hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--khora-accent)]" style={{ borderColor: "var(--khora-accent)" }} data-ui-id="seguridad.ep.copiar-token">{copied === "token" ? <Check size={17} className="text-emerald-400" /> : <Clipboard size={17} />}{copied === "token" ? "Token copiado exactamente" : "Copiar token Khora"}</button></div><ChevronRight className="hidden opacity-35 lg:block" aria-hidden="true" /><div className="space-y-3 rounded-lg border p-4" style={border}><div className="flex items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold" style={border}>3</span><div><h3 className="font-bold">Presiona Enter</h3><p className="text-xs opacity-65">El comando recoge el token, limpia el portapapeles y ejecuta el gate como archivo temporal.</p></div></div><div className="flex items-center gap-2 text-xs text-emerald-400"><ShieldCheck size={16} />Sin token en historial ni argumentos de otro proceso.</div></div></div>
          <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between" style={border}><p className="text-xs opacity-60">API canónica: <code>{issued.apiBase}</code></p><button type="button" onClick={discardCredential} className="inline-flex items-center justify-center gap-2 text-xs opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--khora-accent)]"><Trash2 size={15} />Descartar credencial y limpiar portapapeles</button></div>
          <div className="border-t pt-5" style={border}><button type="button" onClick={() => setLogOpen((value) => !value)} aria-expanded={logOpen} aria-controls="log-panel" className="flex w-full items-center justify-between py-1 text-xs font-bold uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--khora-accent)]"><span className="flex items-center gap-2"><FileText size={16} />Bitácora remota</span>{logOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</button>{logOpen && <div id="log-panel" className="mt-4 space-y-3"><div className="flex gap-2"><button type="button" disabled={logBusy} onClick={() => fetchLog("current")} className="rounded border px-3 py-2 text-xs font-bold uppercase disabled:opacity-50" style={border}>Sesión actual</button><button type="button" disabled={logBusy} onClick={() => fetchLog("last")} className="rounded border px-3 py-2 text-xs font-bold uppercase disabled:opacity-50" style={border}>Sesión anterior</button></div>{logBusy && <p className="text-xs opacity-60">Consultando...</p>}{logContent && <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg border p-3 text-xs" style={{ ...border, background: "var(--khora-bg)" }}>{logContent}</pre>}</div>}</div>
        </div>}
        <div className="border-t p-5 sm:p-7" style={border}><div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-bold uppercase tracking-wider">Sesiones recientes</h3><button type="button" onClick={refresh} aria-label="Actualizar sesiones" className="rounded p-1 opacity-70 hover:opacity-100"><RefreshCw size={16} /></button></div>{sessions.length === 0 ? <p className="text-xs opacity-55">Sin sesiones previas registradas.</p> : <ul className="divide-y text-xs">{sessions.map((session) => <li key={session.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:justify-between"><span><strong className="uppercase">[{session.estado}]</strong> <code>{session.id}</code></span><span className="opacity-60">{new Date(session.creado_en).toLocaleString("es-MX")}</span></li>)}</ul>}</div>
      </section>
    </>}
  </div>;
}

export default function SeguridadPage() {
  return <main className="flex min-h-screen w-full justify-center p-4 py-10 font-mono sm:p-8" style={{ background: "var(--khora-bg)", color: "var(--khora-ink)" }}><Suspense fallback={<div className="text-xs opacity-60">Cargando módulos de seguridad...</div>}><SeguridadContent /></Suspense></main>;
}
