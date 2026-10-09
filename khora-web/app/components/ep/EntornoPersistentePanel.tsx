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
type WorkspaceRepo = { name: string; private: boolean; defaultBranch: string; extensionRoot: string | null };
type GitHubCredentialStatus = { configured: boolean; githubLogin: string | null; tokenSuffix: string | null; repositories: Array<{ name: string; read: boolean; write: boolean }>; updatedAt: string | null };
type MasterPasswordStatus = { configured: boolean; updatedAt: string | null; canManage?: boolean };
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
  const [repoCatalog, setRepoCatalog] = useState<WorkspaceRepo[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<string[]>(["CENSUS", "signal-interpreter"]);
  const [staticCommand, setStaticCommand] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>({ kind: "idle", text: "" });
  const [commandCopied, setCommandCopied] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [clipboardBlocked, setClipboardBlocked] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logBusy, setLogBusy] = useState(false);
  const [logContent, setLogContent] = useState("");
  const [githubTokenInput, setGithubTokenInput] = useState("");
  const [githubCredential, setGithubCredential] = useState<GitHubCredentialStatus | null>(null);
  const [githubCredentialBusy, setGithubCredentialBusy] = useState(false);
  const [masterPasswordInput, setMasterPasswordInput] = useState("");
  const [masterPasswordConfirmation, setMasterPasswordConfirmation] = useState("");
  const [masterPasswordStatus, setMasterPasswordStatus] = useState<MasterPasswordStatus | null>(null);
  const [masterPasswordBusy, setMasterPasswordBusy] = useState(false);

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

  async function loadRepoCatalog(silent = false): Promise<boolean> {
    try {
      const response = await fetch("/api/ep/repos", { cache: "no-store", credentials: "same-origin" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || !Array.isArray(data.repositories)) {
        throw new Error(messageFromResponse(data, "No se pudo cargar el catálogo de repositorios."));
      }
      const catalog = data.repositories as WorkspaceRepo[];
      setRepoCatalog(catalog);
      setSelectedRepos((current) => current.filter((name) => catalog.some((repo) => repo.name === name)));
      return true;
    } catch (error) {
      if (!silent) setNotice({ kind: "error", text: error instanceof Error ? error.message : "No se pudo cargar el catálogo de repositorios." });
      return false;
    }
  }

  async function loadGitHubCredentialStatus() {
    try {
      const response = await fetch("/api/ep/github-credential", { cache: "no-store", credentials: "same-origin" });
      const data = await response.json().catch(() => null);
      if (response.ok && data && typeof data.configured === "boolean") setGithubCredential(data as GitHubCredentialStatus);
      else setGithubCredential(null);
    } catch { setGithubCredential(null); }
  }

  async function loadMasterPasswordStatus() {
    try {
      const response = await fetch("/api/ep/master-password", { cache: "no-store", credentials: "same-origin" });
      const data = await response.json().catch(() => null);
      if (response.ok && data && typeof data.configured === "boolean") setMasterPasswordStatus(data as MasterPasswordStatus);
      else setMasterPasswordStatus(null);
    } catch { setMasterPasswordStatus(null); }
  }

  async function saveGitHubCredential() {
    const token = githubTokenInput;
    if (!token || githubCredentialBusy) return;
    setGithubTokenInput("");
    setGithubCredentialBusy(true);
    setNotice({ kind: "working", text: "Validando acceso a los repositorios requeridos y guardando la credencial cifrada..." });
    try {
      const response = await fetch("/api/ep/github-credential", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const messages: Record<string, string> = {
          invalid_token_format: "El formato del token no es compatible. Usa un PAT de GitHub clásico (ghp_) o de granularidad fina (github_pat_).",
          github_token_rejected: "GitHub rechazó el token o no pudo identificar la cuenta.",
          github_repo_access_missing: "La cuenta asociada al token no tiene permisos suficientes en uno de los seis repositorios requeridos, o GitHub no permitió comprobar el acceso. Para escribir ramas y commits, confirma Contents: Read and write y Metadata: Read en cada repositorio.",
          credential_vault_unavailable: "La bóveda cifrada no está disponible. La credencial no se guardó.",
          not_authorized: "La sesión OEP no está autorizada para gestionar secretos.",
        };
        throw new Error(messages[String(data?.error || "")] || "No se pudo guardar la credencial de GitHub.");
      }
      setGithubCredential(data as GitHubCredentialStatus);
      const catalogLoaded = await loadRepoCatalog(true);
      setNotice({
        kind: "success",
        text: catalogLoaded
          ? "Token validado y guardado cifrado; el selector de repositorios se actualizó. El secreto no se mostró ni se devolvió a la UI."
          : "Token validado y guardado cifrado; no se pudo recargar el catálogo. El secreto no se mostró ni se devolvió a la UI. Reintenta actualizar el catálogo antes de iniciar.",
      });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "No se pudo guardar la credencial." });
    } finally {
      setGithubTokenInput("");
      setGithubCredentialBusy(false);
    }
  }

  async function removeGitHubCredential() {
    if (githubCredentialBusy) return;
    if (!window.confirm("Se eliminará la credencial cifrada. Los nuevos arranques no podrán materializar repositorios hasta cargar otro token. ¿Continuar?")) return;
    setGithubCredentialBusy(true);
    try {
      const response = await fetch("/api/ep/github-credential", { method: "DELETE", cache: "no-store", credentials: "same-origin" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error("No se pudo eliminar la credencial de GitHub.");
      setGithubCredential({ configured: false, githubLogin: null, tokenSuffix: null, repositories: [], updatedAt: null });
      await loadRepoCatalog(true);
      setNotice({ kind: "success", text: "Credencial eliminada de la bóveda. Ningún token fue enviado al navegador." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "No se pudo eliminar la credencial." });
    } finally { setGithubCredentialBusy(false); }
  }

  async function saveMasterPassword() {
    if (masterPasswordBusy) return;
    if (masterPasswordInput.length < 16) {
      setNotice({ kind: "error", text: "La contraseña maestra debe tener al menos 16 caracteres." });
      return;
    }
    if (masterPasswordInput !== masterPasswordConfirmation) {
      setNotice({ kind: "error", text: "Las contraseñas maestras no coinciden." });
      return;
    }
    const password = masterPasswordInput;
    setMasterPasswordInput("");
    setMasterPasswordConfirmation("");
    setMasterPasswordBusy(true);
    try {
      const response = await fetch("/api/ep/master-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.ok !== true) {
        const message = data?.error === "oidc_reauthentication_required"
          ? "La configuración inicial o rotación de la contraseña maestra requiere una sesión OIDC autorizada."
          : data?.error === "master_password_policy"
            ? "Usa una contraseña de 16 a 1024 caracteres."
            : "No se pudo guardar la contraseña maestra.";
        throw new Error(message);
      }
      setMasterPasswordStatus({ configured: true, updatedAt: new Date().toISOString() });
      setNotice({ kind: "success", text: "Contraseña maestra de OEP configurada. El acceso posterior a EP tendrá caducidad y no abrirá el resto de Khôra." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "No se pudo configurar la contraseña maestra." });
    } finally {
      setMasterPasswordInput("");
      setMasterPasswordConfirmation("");
      setMasterPasswordBusy(false);
    }
  }

  useEffect(() => { void refresh(); void loadRepoCatalog(); void loadGitHubCredentialStatus(); void loadMasterPasswordStatus(); }, []);

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
        body: JSON.stringify({ platform: "windows", repositories: selectedRepos }),
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

                <section className="space-y-4 rounded-lg border p-4" style={{ ...border, background: "var(--khora-bg)" }} data-ui-id="seguridad.ep.github-credential">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold" style={border}>A</span>
            <div className="min-w-0">
              <h3 className="font-bold">Credencial de GitHub (secreto persistente)</h3>
              <p className="mt-1 text-xs leading-relaxed opacity-65">Carga aquí el PAT que ya tienes configurado para operar los repositorios. Khôra valida la cuenta y el acceso a los seis repositorios requeridos, cifra el secreto en el servidor con AES-256-GCM y solo lo revela al bootstrap PowerShell con una sesión EP válida. El navegador nunca puede volver a leer el token guardado.</p>
            </div>
          </div>
          <label className="block space-y-2 text-xs">
            <span className="font-bold uppercase tracking-wider">Personal Access Token de GitHub</span>
            <input
              type="password"
              autoComplete="new-password"
              spellCheck={false}
              value={githubTokenInput}
              onChange={(event) => setGithubTokenInput(event.target.value)}
              maxLength={8192}
              disabled={githubCredentialBusy}
              placeholder={githubCredential?.configured ? "Token guardado; escribe uno nuevo para rotarlo" : "ghp_… o github_pat_…"}
              className="min-h-12 w-full rounded-lg border bg-transparent px-4 py-3 text-sm outline-none focus-visible:ring-2 disabled:opacity-50"
              style={border}
              aria-label="Token de GitHub"
            />
            <span className="block opacity-55">No pegues el token en un issue, comentario, chat, URL o terminal compartida. Al guardar, el campo se vacía y no se permite recuperar el secreto desde la UI.</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={saveGitHubCredential} disabled={!githubTokenInput || githubCredentialBusy} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-xs font-bold uppercase disabled:opacity-50" style={{ ...border, background: "var(--khora-accent)", color: "var(--khora-bg)" }}>
              <ShieldCheck size={16} />{githubCredentialBusy ? "Validando..." : githubCredential?.configured ? "Validar y rotar token" : "Validar y guardar token"}
            </button>
            {githubCredential?.configured && <button type="button" onClick={removeGitHubCredential} disabled={githubCredentialBusy} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-xs font-bold uppercase disabled:opacity-50" style={border}><Trash2 size={15} />Eliminar token guardado</button>}
          </div>
          {githubCredential?.configured ? (
            <div className="space-y-2 rounded-lg border p-3 text-xs" style={border}>
              <p className="flex flex-wrap items-center gap-2"><ShieldCheck size={16} className="text-emerald-400" /> <strong>Secreto configurado</strong> · GitHub: <code>{githubCredential.githubLogin}</code> · finaliza en <code>{githubCredential.tokenSuffix}</code></p>
              <p className="opacity-60">Actualizado: {githubCredential.updatedAt ? new Date(githubCredential.updatedAt).toLocaleString("es-MX") : "fecha no disponible"}</p>
              <div className="grid gap-1 sm:grid-cols-2">
                {githubCredential.repositories.map((repo) => <span key={repo.name} className="flex items-center gap-2"><Check size={13} className={repo.read && repo.write ? "text-emerald-400" : "text-amber-400"} />{repo.name} · {repo.read ? "lectura" : "sin lectura"} / {repo.write ? "escritura de cuenta" : "sin escritura de cuenta"}</span>)}
              </div>
              <p className="opacity-55">La lectura de permisos de repositorio no inspecciona todos los scopes del PAT. Para crear y actualizar ramas, el PAT de granularidad fina debe tener Contents: Read and write y Metadata: Read en los repositorios que uses.</p>
            </div>
          ) : (
            <p className="text-xs opacity-55">{githubCredential === null ? "No se pudo confirmar el estado de la bóveda; prueba a actualizar la página." : "Todavía no se guardó un token. Sin este secreto, el comando de PowerShell fallará de forma segura antes de materializar repositorios."}</p>
          )}
        </section>

        {masterPasswordStatus?.canManage ? (
          <section className="space-y-4 rounded-lg border p-4" style={{ ...border, background: "var(--khora-bg)" }} data-ui-id="seguridad.ep.master-password">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold" style={border}>B</span>
              <div>
                <h3 className="font-bold">Contraseña maestra de OEP</h3>
                <p className="mt-1 text-xs leading-relaxed opacity-65">Se configura o rota una sola vez desde una sesión OIDC autorizada. Después puedes abrir el submódulo EP sin iniciar Google OIDC en cada terminal. Se almacena un verificador scrypt con salt aleatorio; nunca la contraseña en claro.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-2 text-xs"><span className="font-bold uppercase tracking-wider">Nueva contraseña (mínimo 16 caracteres)</span><input type="password" autoComplete="new-password" value={masterPasswordInput} onChange={(event) => setMasterPasswordInput(event.target.value)} maxLength={1024} disabled={masterPasswordBusy} className="min-h-11 w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2" style={border} /></label>
              <label className="block space-y-2 text-xs"><span className="font-bold uppercase tracking-wider">Confirmar contraseña</span><input type="password" autoComplete="new-password" value={masterPasswordConfirmation} onChange={(event) => setMasterPasswordConfirmation(event.target.value)} maxLength={1024} disabled={masterPasswordBusy} className="min-h-11 w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2" style={border} /></label>
            </div>
            <button type="button" onClick={saveMasterPassword} disabled={masterPasswordBusy || masterPasswordInput.length < 16 || !masterPasswordConfirmation} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-xs font-bold uppercase disabled:opacity-50" style={border}><KeyRound size={15} />{masterPasswordBusy ? "Guardando..." : masterPasswordStatus.configured ? "Rotar contraseña maestra" : "Configurar contraseña maestra"}</button>
            <p className="text-xs opacity-55">{masterPasswordStatus.configured ? "Contraseña maestra configurada" + (masterPasswordStatus.updatedAt ? " · actualizada " + new Date(masterPasswordStatus.updatedAt).toLocaleString("es-MX") : "") : "La primera configuración y la recuperación requieren iniciar sesión OIDC."}</p>
          </section>
        ) : (
          <section className="space-y-2 rounded-lg border p-4 text-xs" style={{ ...border, background: "var(--khora-bg)" }} data-ui-id="seguridad.ep.master-password.status">
            <h3 className="font-bold">Contraseña maestra de OEP</h3>
            {masterPasswordStatus?.configured
              ? <p className="opacity-65">Configurada · {masterPasswordStatus.updatedAt ? new Date(masterPasswordStatus.updatedAt).toLocaleString("es-MX") : "fecha no disponible"}. Esta sesión EP no puede rotarla; la recuperación requiere OIDC autorizado.</p>
              : <p className="opacity-65">Estado no confirmado. La configuración inicial o recuperación requiere una sesión OIDC autorizada.</p>}
          </section>
        )}

        <section className="space-y-4 rounded-lg border p-4" style={{ ...border, background: "var(--khora-bg)" }} data-ui-id="seguridad.ep.repositorios">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold" style={border}>0</span>
            <div>
              <h3 className="font-bold">Repositorios de trabajo</h3>
              <p className="text-xs opacity-65">Elige qué proyectos se materializarán dentro de <code>Desktop/EP</code>. KHORA queda reservado como runtime del bootstrap.</p>
            </div>
          </div>
          {repoCatalog.length === 0 ? (
            <p className="text-xs opacity-55">Cargando catálogo de SeryMente...</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {repoCatalog.filter((repo) => repo.name.toLowerCase() !== "khora").map((repo) => {
                const checked = selectedRepos.includes(repo.name);
                return <label key={repo.name} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-xs hover:bg-white/5" style={border}>
                  <input type="checkbox" checked={checked} onChange={() => setSelectedRepos((current) => checked ? current.filter((name) => name !== repo.name) : [...current, repo.name])} className="mt-0.5" />
                  <span className="min-w-0">
                    <strong className="block truncate">{repo.name}</strong>
                    <span className="opacity-55">{repo.private ? "privado" : "público"} · {repo.extensionRoot ? "extensión Chrome" : "workspace"}</span>
                  </span>
                </label>;
              })}
            </div>
          )}
          <div className="text-[11px] opacity-55">{selectedRepos.length} repositorio{selectedRepos.length === 1 ? "" : "s"} seleccionado{selectedRepos.length === 1 ? "" : "s"}.</div>
        </section>

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
