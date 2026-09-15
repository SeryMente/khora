// @l0 L0-002-R · @req EP-LAUNCHER/UI-3
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Clock3,
  Container,
  FileText,
  KeyRound,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TerminalSquare,
  Trash2,
} from "lucide-react";

type Launcher = {
  id: string;
  version?: string;
  platform: string;
  shell: string;
  minimumVersion: string;
  storageBackend: string;
  execution?: string;
  status: string;
  command: string;
  mode: "normal";
  isolation?: string;
  hostToolPolicy?: string;
};
type Issued = {
  token: string;
  sessionId: string;
  expiresAt: string;
  command: string;
  apiBase: string;
  mode: "normal";
  launcher: Launcher;
};
type Summary = { id: string; estado: string; creado_en: string; ultimo_evento_en: string | null; cerrado_en: string | null };
type Notice = { kind: "idle" | "working" | "success" | "error"; text: string };
type JwtClaims = { iss?: unknown; sid?: unknown; typ?: unknown; exp?: unknown; launchMode?: unknown };

const API_MESSAGES: Record<string, string> = {
  not_authorized: "Tu sesión no está autorizada para emitir tokens del Entorno Persistente.",
  rate_limit_exceeded: "Se alcanzó el límite de cinco emisiones en quince minutos. Espera antes de generar otro token.",
  token_issue_unavailable: "Khora no pudo emitir el token de forma segura. No se creó un lanzamiento utilizable.",
  session_history_unavailable: "El historial de sesiones no está disponible temporalmente.",
  unsupported_launch_mode: "El modo de arranque solicitado no está soportado.",
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
  if (
    typeof candidate.token !== "string" ||
    typeof candidate.command !== "string" ||
    typeof candidate.sessionId !== "string" ||
    typeof candidate.expiresAt !== "string" ||
    typeof candidate.apiBase !== "string" ||
    candidate.mode !== "normal" ||
    !candidate.launcher ||
    typeof candidate.launcher.command !== "string" ||
    candidate.launcher.mode !== "normal"
  ) return null;
  const claims = decodeJwtClaims(candidate.token);
  const expiration = Date.parse(candidate.expiresAt);
  if (
    !claims ||
    claims.iss !== "khora-ep" ||
    claims.typ !== "ep-session" ||
    claims.sid !== candidate.sessionId ||
    claims.launchMode !== "normal" ||
    typeof claims.exp !== "number" ||
    !Number.isFinite(expiration) ||
    candidate.command !== candidate.launcher.command ||
    candidate.command.includes(candidate.token)
  ) return null;
  return candidate as Issued;
}

function messageFromResponse(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const value = data as { error?: unknown; code?: unknown; detail?: unknown; message?: unknown };
  for (const candidate of [value.code, value.detail, value.error]) {
    if (typeof candidate === "string" && API_MESSAGES[candidate]) return API_MESSAGES[candidate];
  }
  return typeof value.message === "string" && value.message.length <= 240 ? value.message : fallback;
}

async function copyCommandToClipboard(value: string): Promise<void> {
  if (!value) throw new Error("No hay comando para copiar.");
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.readOnly = true;
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  try {
    textarea.select();
    if (!document.execCommand("copy")) throw new Error("El navegador rechazó la copia.");
  } finally { textarea.remove(); }
}

async function copyTokenStrict(token: string): Promise<void> {
  if (!token) throw new Error("No hay token para copiar.");
  if (!navigator.clipboard?.writeText) {
    throw new Error("El navegador no permite copiar automáticamente al portapapeles.");
  }
  await navigator.clipboard.writeText(token);
}

export default function EntornoPersistentePanel() {
  const [issued, setIssued] = useState<Issued | null>(null);
  const [sessions, setSessions] = useState<Summary[]>([]);
  const [staticCommand, setStaticCommand] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>({ kind: "idle", text: "" });
  const [commandCopied, setCommandCopied] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [clipboardBlocked, setClipboardBlocked] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logBusy, setLogBusy] = useState(false);
  const [logContent, setLogContent] = useState("");

  const expiresAt = issued ? Date.parse(issued.expiresAt) : 0;
  const expired = Boolean(issued && (!Number.isFinite(expiresAt) || expiresAt <= Date.now()));
  const claims = useMemo(() => issued ? decodeJwtClaims(issued.token) : null, [issued]);
  const border = { borderColor: "var(--khora-border)" };

  async function refresh() {
    try {
      const response = await fetch("/api/ep/token", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) return;
      const data = await response.json();
      setSessions(Array.isArray(data.sessions) ? data.sessions.slice(0, 2) : []);
      if (typeof data.command === "string" && data.command.trim()) {
        setStaticCommand(data.command.trim());
      }
    } catch { /* La consulta secundaria no invalida la credencial activa. */ }
  }

  useEffect(() => { void refresh(); }, []);

  useEffect(() => {
    if (!issued) return;
    const remaining = Date.parse(issued.expiresAt) - Date.now();
    if (remaining <= 0) {
      setIssued(null);
      setClipboardBlocked(false);
      setNotice({ kind: "error", text: "El token venció y fue eliminado de esta página." });
      return;
    }
    const timer = window.setTimeout(() => {
      setIssued(null);
      setTokenCopied(false);
      setClipboardBlocked(false);
      setNotice({ kind: "error", text: "El token venció y fue eliminado de esta página." });
    }, Math.min(remaining, 2_147_000_000));
    return () => window.clearTimeout(timer);
  }, [issued]);

  useEffect(() => {
    const discard = () => {
      setIssued(null);
      setClipboardBlocked(false);
    };
    window.addEventListener("pagehide", discard);
    return () => window.removeEventListener("pagehide", discard);
  }, []);

  async function issue() {
    if (issued && !expired && !window.confirm("Preparar uno nuevo revocará inmediatamente el token actual. ¿Continuar?")) return;
    setBusy(true);
    setIssued(null);
    setTokenCopied(false);
    setClipboardBlocked(false);
    setLogContent("");
    setNotice({ kind: "working", text: "Preparando Entorno Persistente y revocando cualquier sesión anterior..." });

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch("/api/ep/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "windows" }),
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(messageFromResponse(data, `Khora rechazó la emisión (${response.status}).`));
      const validated = validateIssued(data);
      if (!validated) throw new Error("Khora devolvió un contrato de lanzamiento incompleto o inconsistente.");

      setIssued(validated);
      setStaticCommand(validated.command);
      await refresh();

      try {
        await copyTokenStrict(validated.token);
        setTokenCopied(true);
        setClipboardBlocked(false);
        setNotice({ kind: "success", text: "Token preparado. Regresa a PowerShell y presiona Enter." });
        window.setTimeout(() => setTokenCopied(false), 3000);
      } catch (clipErr) {
        setClipboardBlocked(true);
        setTokenCopied(false);
        setNotice({
          kind: "error",
          text: clipErr instanceof Error ? `No se pudo copiar el token automáticamente: ${clipErr.message}` : "El navegador bloqueó la escritura al portapapeles.",
        });
      }
    } catch (error) {
      const text = error instanceof DOMException && error.name === "AbortError"
        ? "La emisión superó 30 segundos y fue cancelada sin conservar credenciales."
        : error instanceof Error ? error.message : "No se pudo emitir el token.";
      setNotice({ kind: "error", text });
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
  }

  async function retryCopyToken() {
    if (!issued || expired) { setNotice({ kind: "error", text: "Genera una sesión vigente antes de copiar el token." }); return; }
    try {
      await copyTokenStrict(issued.token);
      setTokenCopied(true);
      setClipboardBlocked(false);
      setNotice({ kind: "success", text: "Token preparado. Regresa a PowerShell y presiona Enter." });
      window.setTimeout(() => setTokenCopied(false), 3000);
    } catch (error) {
      setClipboardBlocked(true);
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "El navegador volvió a bloquear el portapapeles." });
    }
  }

  async function copyCommand() {
    const cmd = issued?.command || staticCommand;
    if (!cmd) { setNotice({ kind: "error", text: "No hay comando de PowerShell disponible." }); return; }
    try {
      await copyCommandToClipboard(cmd);
      setCommandCopied(true);
      setNotice({ kind: "success", text: "Comando copiado exactamente. Pégalo en PowerShell, pero no presiones Enter todavía." });
      window.setTimeout(() => setCommandCopied(false), 2500);
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "El navegador no permitió copiar el comando." });
    }
  }

  async function discardCredential() {
    setIssued(null);
    setTokenCopied(false);
    setClipboardBlocked(false);
    setLogContent("");
    let clipCleaned = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(" ");
        clipCleaned = true;
      }
    } catch {}
    setNotice({
      kind: "success",
      text: clipCleaned
        ? "La credencial se eliminó de esta página y el portapapeles fue limpiado."
        : "La credencial se eliminó de esta página.",
    });
  }

  async function fetchLog(which: "current" | "last") {
    if (!issued || expired) { setNotice({ kind: "error", text: "Se requiere un token vigente para consultar la bitácora." }); return; }
    setLogBusy(true);
    try {
      const response = await fetch(`/api/ep/logs?which=${which}&format=ndjson`, {
        headers: { Authorization: `Bearer ${issued.token}` },
        cache: "no-store",
        credentials: "same-origin",
      });
      const text = await response.text();
      if (!response.ok) {
        let data: unknown = null;
        try { data = JSON.parse(text); } catch {}
        throw new Error(messageFromResponse(data, `No se pudo consultar la bitácora (${response.status}).`));
      }
      setLogContent((text.trim() || "(Bitácora vacía)").slice(0, 250_000));
    } catch (error) {
      setLogContent("");
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "No se pudo consultar la bitácora." });
    } finally { setLogBusy(false); }
  }

  const noticeIcon = notice.kind === "error"
    ? <ShieldAlert className="shrink-0 text-red-400" size={18} />
    : notice.kind === "working"
      ? <RefreshCw className="shrink-0 animate-spin" size={18} />
      : <Check className="shrink-0 text-emerald-400" size={18} />;

  const activeCommand = issued?.command || staticCommand;

  return <div className="space-y-7" data-ui-id="seguridad.ep.submodulo">
    <header className="space-y-3 border-b pb-6 text-center" style={border}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border" style={{ ...border, background: "var(--khora-surface)" }}>
        <Container size={30} style={{ color: "var(--khora-accent)" }} />
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] opacity-55">Seguridad · Submódulo</p>
      <h1 className="text-2xl font-bold uppercase tracking-[0.18em]">Entorno Persistente</h1>
      <p className="mx-auto max-w-2xl text-sm leading-relaxed opacity-70">Instancia un espacio de trabajo cifrado, observable y desechable en una sesión normal.</p>
    </header>

    <div aria-live="polite" aria-atomic="true" className="sr-only">{notice.text}</div>

    <section id="entorno-persistente" data-ui-id="seguridad.ep.container" aria-labelledby="ep-card-title" className="overflow-hidden rounded-xl border" style={{ ...border, background: "var(--khora-surface)" }}>
      <div className="space-y-5 border-b p-5 sm:p-7" style={border}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2"><KeyRound size={22} style={{ color: "var(--khora-accent)" }} /><h2 id="ep-card-title" className="text-lg font-bold uppercase tracking-wide">Sesión de Entorno Persistente</h2></div>
            <p className="max-w-2xl text-sm leading-relaxed opacity-70">El token se gestiona en memoria y se copia directamente a tu portapapeles sin renderizarse en pantalla.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wider"><span className="rounded-full border px-3 py-1" style={border}>BitLocker</span><span className="rounded-full border px-3 py-1" style={border}>VHDX nuevo</span><span className="rounded-full border px-3 py-1" style={border}>JWT efímero</span></div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border p-4 text-sm" style={{ ...border, background: "var(--khora-bg)" }}><AlertTriangle className="mt-0.5 shrink-0 text-amber-400" size={18} /><div><strong className="block">Una emisión nueva revoca la anterior</strong><p className="mt-1 opacity-70">El token vive exclusivamente en memoria hasta que vence, lo descartas o cierras la pestaña. Nunca se imprime en pantalla ni se guarda en el navegador.</p></div></div>

        <button type="button" data-ui-id="seguridad.ep.generar" disabled={busy} onClick={issue} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border p-3 text-sm font-bold uppercase tracking-[0.14em] hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--khora-accent)]" style={{ background: "var(--khora-accent)", color: "var(--khora-bg)", borderColor: "var(--khora-accent)" }}><RefreshCw size={17} className={busy ? "animate-spin" : ""} />{busy ? "Preparando de forma segura..." : issued ? "Preparar nuevo Entorno Persistente (revoca actual)" : "Preparar Entorno Persistente"}</button>
        {notice.text && <div role={notice.kind === "error" ? "alert" : "status"} className="flex items-start gap-3 rounded-lg border p-3 text-sm" style={{ ...border, background: "var(--khora-bg)" }}>{noticeIcon}<span>{notice.text}</span></div>}
      </div>

      <div className="space-y-6 p-5 sm:p-7" data-ui-id="seguridad.ep.pasos">
        {activeCommand && (
          <div className="space-y-3">
            <div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold" style={border}>1</span><div><h3 className="font-bold">Copia y pega el comando de PowerShell</h3><p className="text-xs opacity-65">Pégalo en Windows PowerShell 5.1, pero NO presiones Enter todavía.</p></div></div>
            <pre className="max-h-36 overflow-auto whitespace-pre-wrap break-all rounded-lg border p-4 text-xs leading-relaxed" style={{ ...border, background: "var(--khora-bg)" }} data-ui-id="seguridad.ep.comando">{activeCommand}</pre>
            <button type="button" onClick={copyCommand} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border p-3 text-sm font-bold hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--khora-accent)]" style={border} data-ui-id="seguridad.ep.copiar-comando">{commandCopied ? <Check size={17} className="text-emerald-400" /> : <TerminalSquare size={17} />}{commandCopied ? "Comando copiado exactamente" : "Copiar comando PowerShell"}</button>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <div className="space-y-3 rounded-lg border p-4" style={{ ...border, background: "var(--khora-bg)" }}>
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold" style={border}>2</span>
              <div>
                <h3 className="font-bold">Emisión y copia de token</h3>
                <p className="text-xs opacity-65">Al pulsar "Preparar Entorno Persistente", Khora emite la sesión y copia el token automáticamente al portapapeles.</p>
              </div>
            </div>
            {clipboardBlocked && (
              <button type="button" onClick={retryCopyToken} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border p-3 text-sm font-bold hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--khora-accent)]" style={{ borderColor: "var(--khora-accent)" }} data-ui-id="seguridad.ep.reintentar-token">
                <Clipboard size={17} /> Reintentar copiar token
              </button>
            )}
          </div>
          <ChevronRight className="hidden opacity-35 lg:block" aria-hidden="true" />
          <div className="space-y-3 rounded-lg border p-4" style={border}>
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold" style={border}>3</span>
              <div>
                <h3 className="font-bold">Regresa a PowerShell y presiona Enter</h3>
                <p className="text-xs opacity-65">El comando lee el token del portapapeles, lo limpia inmediatamente y arranca el entorno.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-400"><ShieldCheck size={16} />Sin token en pantalla, historial ni argumentos de proceso.</div>
          </div>
        </div>

        {issued && !expired && (
          <div className="space-y-4 border-t pt-5" style={border} data-ui-id="seguridad.ep.credencial">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3" style={border}><span className="block text-[10px] uppercase opacity-55">Sesión</span><code className="mt-1 block truncate text-xs" title={issued.sessionId}>{issued.sessionId}</code></div>
              <div className="rounded-lg border p-3" style={border}><span className="block text-[10px] uppercase opacity-55">Modo</span><span className="mt-1 block text-xs font-bold">Normal</span></div>
              <div className="rounded-lg border p-3" style={border}><span className="block text-[10px] uppercase opacity-55">Vencimiento</span><span className="mt-1 flex items-center gap-1.5 text-xs"><Clock3 size={14} />{new Date(issued.expiresAt).toLocaleString("es-MX")}</span></div>
              <div className="rounded-lg border p-3" style={border}><span className="block text-[10px] uppercase opacity-55">Estado</span><span className="mt-1 flex items-center gap-1.5 text-xs text-emerald-400"><Check size={14} />{claims?.typ === "ep-session" ? "Token en memoria" : "No válido"}</span></div>
            </div>
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between" style={border}>
              <p className="text-xs opacity-60">API canónica: <code>{issued.apiBase}</code></p>
              <button type="button" onClick={discardCredential} className="inline-flex min-h-11 items-center justify-center gap-2 text-xs opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--khora-accent)]"><Trash2 size={15} />Descartar credencial y limpiar portapapeles</button>
            </div>
          </div>
        )}

        {issued && !expired && (
          <div className="border-t pt-5" style={border}>
            <button type="button" onClick={() => setLogOpen((value) => !value)} aria-expanded={logOpen} aria-controls="log-panel" className="flex min-h-11 w-full items-center justify-between py-1 text-xs font-bold uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--khora-accent)]">
              <span className="flex items-center gap-2"><FileText size={16} />Bitácora remota</span>
              {logOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
            {logOpen && (
              <div id="log-panel" className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={logBusy} onClick={() => fetchLog("current")} className="min-h-11 rounded border px-3 py-2 text-xs font-bold uppercase disabled:opacity-50" style={border}>Sesión actual</button>
                  <button type="button" disabled={logBusy} onClick={() => fetchLog("last")} className="min-h-11 rounded border px-3 py-2 text-xs font-bold uppercase disabled:opacity-50" style={border}>Sesión anterior</button>
                </div>
                {logBusy && <p className="text-xs opacity-60">Consultando...</p>}
                {logContent && <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg border p-3 text-xs" style={{ ...border, background: "var(--khora-bg)" }}>{logContent}</pre>}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t p-5 sm:p-7" style={border}><div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-bold uppercase tracking-wider">Sesiones recientes</h3><button type="button" onClick={refresh} aria-label="Actualizar sesiones" className="min-h-11 min-w-11 rounded p-2 opacity-70 hover:opacity-100"><RefreshCw size={16} /></button></div>{sessions.length === 0 ? <p className="text-xs opacity-55">Sin sesiones previas registradas.</p> : <ul className="divide-y text-xs">{sessions.map((session) => <li key={session.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:justify-between"><span><strong className="uppercase">[{session.estado}]</strong> <code>{session.id}</code></span><span className="opacity-60">{new Date(session.creado_en).toLocaleString("es-MX")}</span></li>)}</ul>}</div>
    </section>
  </div>;
}
