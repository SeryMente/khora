"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Clipboard,
  KeyRound,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TerminalSquare,
  FileText
} from "lucide-react";

type Launcher = {
  id: string;
  platform: string;
  shell: string;
  minimumVersion: string;
  storageBackend: string;
  status: string;
  command: string;
};

type Issued = {
  token: string;
  sessionId: string;
  expiresAt: string;
  command: string;
  apiBase: string;
  launcher?: Launcher;
};

type Summary = {
  id: string;
  estado: string;
  creado_en: string;
  ultimo_evento_en: string | null;
  cerrado_en: string | null;
};

export default function SeguridadPage() {
  const [issued, setIssued] = useState<Issued | null>(null);
  const [sessions, setSessions] = useState<Summary[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // Accordion state & log inspection
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [logWhich, setLogWhich] = useState<"current" | "last" | null>(null);
  const [logContent, setLogContent] = useState<string>("");
  const [logBusy, setLogBusy] = useState(false);

  async function refresh() {
    try {
      const r = await fetch("/api/ep/token", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setSessions(d.sessions || []);
      }
    } catch {
      // Ignore background refresh errors
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function issue() {
    setBusy(true);
    setMessage("Generando token de una sola sesión...");
    setLogContent("");
    try {
      const r = await fetch("/api/ep/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "windows" }),
      });
      const d = await r.json();
      if (!r.ok) {
        throw new Error(d.message || d.error || String(r.status));
      }
      setIssued(d);
      setMessage("Token listo. Sigue los cuatro pasos en orden.");
      await refresh();
    } catch (e) {
      setMessage("Error: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Copiado al portapapeles: " + label);
    } catch {
      setMessage("Error al copiar: " + label);
    }
  }

  async function fetchLog(which: "current" | "last") {
    if (!issued?.token) {
      setLogContent("Error: Se requiere un token activo emitido en esta sesión para consultar los registros.");
      return;
    }
    setLogBusy(true);
    setLogWhich(which);
    try {
      const r = await fetch(`/api/ep/logs?which=${which}&format=ndjson`, {
        headers: { Authorization: `Bearer ${issued.token}` },
        cache: "no-store",
      });
      const text = await r.text();
      if (!r.ok) {
        setLogContent(`Error ${r.status}: ${text}`);
      } else {
        setLogContent(text.trim() || "(Bitácora vacía)");
      }
    } catch (e) {
      setLogContent("Error al consultar bitácora: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLogBusy(false);
    }
  }

  return (
    <main
      className="w-full flex justify-center p-4 py-12 font-mono min-h-screen"
      style={{ background: "var(--khora-bg)", color: "var(--khora-ink)" }}
    >
      <div className="w-full max-w-3xl space-y-8">
        {/* Page Header */}
        <header className="text-center space-y-2 border-b pb-6" style={{ borderColor: "var(--khora-border)" }}>
          <ShieldCheck className="mx-auto mb-2" size={42} style={{ color: "var(--khora-accent)" }} />
          <h1 className="text-2xl font-bold uppercase tracking-wider">Seguridad</h1>
          <p className="text-xs opacity-70">
            Control de Acceso · Entornos Persistentes · Bitácoras Auditables
          </p>
        </header>

        {/* Live ARIA region for screen reader announcements */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {message}
        </div>

        {/* Module Card: Entorno Persistente */}
        <section
          id="entorno-persistente"
          aria-labelledby="ep-card-title"
          className="p-6 space-y-6 border rounded-lg"
          style={{ background: "var(--khora-surface)", borderColor: "var(--khora-border)" }}
        >
          <header className="space-y-1">
            <div className="flex items-center gap-2">
              <KeyRound size={22} style={{ color: "var(--khora-accent)" }} />
              <h2 id="ep-card-title" className="text-lg font-bold uppercase tracking-wide">
                Entorno Persistente
              </h2>
            </div>
            <p className="text-xs opacity-70">
              Genera un token efímero de una sola sesión y descriptor de arranque para Entorno Persistente Medio v1.0.
            </p>
          </header>

          {/* Warning Notice */}
          <div
            className="border p-3 text-xs flex items-start gap-2 rounded"
            style={{ borderColor: "var(--khora-border)", background: "var(--khora-bg)" }}
          >
            <AlertTriangle className="shrink-0 text-amber-400 mt-0.5" size={16} />
            <div>
              <strong className="block font-semibold">Aviso de Sesión Única</strong>
              <span>
                El token se muestra una sola vez. Emitir uno nuevo revocará inmediatamente la sesión activa previa del usuario.
              </span>
            </div>
          </div>

          {/* Generate Token Button */}
          <button
            disabled={busy}
            onClick={issue}
            className="w-full p-3 font-bold uppercase tracking-widest bg-blue-700 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {busy ? "Generando..." : "Generar token para nueva sesión"}
          </button>

          {/* Status Message */}
          {message && (
            <div
              className="text-xs border p-3 rounded flex items-center gap-2"
              style={{ borderColor: "var(--khora-border)", background: "var(--khora-bg)" }}
            >
              {message.includes("Error") ? (
                <ShieldAlert className="text-red-400 shrink-0" size={18} />
              ) : (
                <Check className="text-emerald-400 shrink-0" size={18} />
              )}
              <span>{message}</span>
            </div>
          )}

          {/* Issued Session Card & 4-Step Flow */}
          {issued && (
            <div className="space-y-4 border p-4 rounded" style={{ borderColor: "var(--khora-border)" }}>
              <div className="text-sm border-b pb-3 space-y-1" style={{ borderColor: "var(--khora-border)" }}>
                <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Check size={18} /> Sesión activa: <code>{issued.sessionId}</code>
                </p>
                <p className="text-xs opacity-70">
                  Expiración: {new Date(issued.expiresAt).toLocaleString("es-MX")}
                </p>
                {issued.launcher && (
                  <p className="text-xs opacity-70">
                    Lanzador: <code>{issued.launcher.id}</code> ({issued.launcher.shell} v{issued.launcher.minimumVersion}+ {issued.launcher.storageBackend})
                  </p>
                )}
              </div>

              {/* 4-Step Visible Workflow */}
              <div className="space-y-3 text-sm">
                <h3 className="font-bold text-xs uppercase tracking-wider opacity-90">
                  Flujo de Arranque en 4 Pasos:
                </h3>
                <ol className="list-decimal ml-6 space-y-3">
                  <li className="opacity-90">
                    <strong>Generar token:</strong> Token efímero de sesión emitido exitosamente.
                  </li>
                  <li>
                    <button
                      onClick={() => copy(issued.command, "comando")}
                      className="inline-flex items-center gap-1.5 underline hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    >
                      <TerminalSquare size={16} /> <strong>Copiar comando</strong>
                    </button>{" "}
                    y pégalo en PowerShell sin presionar Enter aún.
                  </li>
                  <li>
                    <button
                      onClick={() => copy(issued.token, "token Khora")}
                      className="inline-flex items-center gap-1.5 underline hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    >
                      <Clipboard size={16} /> <strong>Copiar token Khora</strong>
                    </button>
                    ; este sustituirá al comando en el portapapeles.
                  </li>
                  <li className="opacity-90">
                    <strong>Ejecutar comando:</strong> Regresa a PowerShell y presiona Enter. El comando recoge y borra el token del portapapeles.
                  </li>
                </ol>
              </div>

              {/* Inline Expandable Log Accordion */}
              <div className="border-t pt-4 mt-4" style={{ borderColor: "var(--khora-border)" }}>
                <button
                  onClick={() => setAccordionOpen(!accordionOpen)}
                  aria-expanded={accordionOpen}
                  aria-controls="log-accordion-panel"
                  className="w-full flex justify-between items-center text-xs font-bold uppercase tracking-wider hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-blue-400 py-1"
                >
                  <span className="flex items-center gap-2">
                    <FileText size={16} style={{ color: "var(--khora-accent)" }} />
                    Consulta de Bitácora Remota (current / last)
                  </span>
                  {accordionOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>

                {accordionOpen && (
                  <div id="log-accordion-panel" className="mt-3 space-y-3">
                    <div className="flex gap-2">
                      <button
                        disabled={logBusy}
                        onClick={() => fetchLog("current")}
                        className="px-3 py-1.5 text-xs font-bold uppercase border rounded hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                        style={{ borderColor: "var(--khora-border)" }}
                      >
                        {logBusy && logWhich === "current" ? "Cargando..." : "Registro Actual (current)"}
                      </button>
                      <button
                        disabled={logBusy}
                        onClick={() => fetchLog("last")}
                        className="px-3 py-1.5 text-xs font-bold uppercase border rounded hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                        style={{ borderColor: "var(--khora-border)" }}
                      >
                        {logBusy && logWhich === "last" ? "Cargando..." : "Registro Anterior (last)"}
                      </button>
                    </div>

                    {logContent && (
                      <pre
                        className="p-3 text-xs whitespace-pre-wrap break-all border rounded max-h-64 overflow-y-auto"
                        style={{ background: "var(--khora-bg)", borderColor: "var(--khora-border)" }}
                      >
                        {logContent}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Sessions List */}
          <div className="border-t pt-4 space-y-2" style={{ borderColor: "var(--khora-border)" }}>
            <div className="flex justify-between items-center">
              <h3 className="font-bold uppercase text-xs tracking-wider">Sesiones Recientes</h3>
              <button
                onClick={refresh}
                aria-label="Actualizar sesiones recientes"
                className="hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-blue-400 p-1 rounded"
              >
                <RefreshCw size={16} />
              </button>
            </div>
            {sessions.length === 0 ? (
              <p className="text-xs opacity-60">Sin sesiones previas registradas.</p>
            ) : (
              <ul className="text-xs space-y-1">
                {sessions.map((s) => (
                  <li key={s.id} className="flex justify-between border-b pb-1" style={{ borderColor: "var(--khora-border)" }}>
                    <span>
                      <strong className="uppercase">[{s.estado}]</strong> {s.id}
                    </span>
                    <span className="opacity-70">
                      {new Date(s.creado_en).toLocaleString("es-MX")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
