// @l0 L0-002 §4 · @req MCP-REV-01/REQ-2
"use client";

import { useEffect, useState } from "react";
import { Check, Clock3, Copy, KeyRound, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";

interface RevocationInfo {
  generacion: number;
  ultimoTokenAt: string | null;
  error?: string;
}

interface ManualToken {
  id: string;
  token_prefix: string;
  scope: string;
  etiqueta: string;
  emitido_en: string;
  expira_en: string;
  ultimo_uso_en: string | null;
}

const MCP_ENDPOINT = "https://khora-web.vercel.app/api/mcp";
const SUPPORTED_SCOPES = ["runtime:read", "volcados:read", "norm:turn"] as const;

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("es-MX") : "Nunca";
}

export default function PaginaMcpRevocacion() {
  const [info, setInfo] = useState<RevocationInfo | null>(null);
  const [tokens, setTokens] = useState<ManualToken[]>([]);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([...SUPPORTED_SCOPES]);
  const [expiresInDays, setExpiresInDays] = useState(90);
  const [label, setLabel] = useState("ChatGPT");
  const [issuedToken, setIssuedToken] = useState<{ token: string; bearer: string; expiresAt: string } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [copiado, setCopiado] = useState("");

  async function cargarInfo() {
    setCargando(true);
    try {
      const [revocationRes, tokenRes] = await Promise.all([
        fetch("/api/mcp/revocacion", { cache: "no-store" }),
        fetch("/api/mcp/manual-token", { cache: "no-store" }),
      ]);
      const revocationData = await revocationRes.json();
      const tokenData = await tokenRes.json();
      setInfo(revocationData);
      setTokens(Array.isArray(tokenData.tokens) ? tokenData.tokens : []);
      if (!revocationRes.ok || !tokenRes.ok) {
        setMensaje("Error al cargar el estado MCP.");
      }
    } catch (e) {
      setInfo({ generacion: 1, ultimoTokenAt: null, error: String(e) });
      setMensaje("Error al cargar el estado MCP: " + String(e));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarInfo();
  }, []);

  function toggleScope(scope: string) {
    setSelectedScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope],
    );
  }

  async function copiar(text: string, tipo: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiado(tipo);
      window.setTimeout(() => setCopiado(""), 1800);
    } catch {
      setMensaje("No se pudo copiar al portapapeles.");
    }
  }

  async function generarToken() {
    if (selectedScopes.length === 0) {
      setMensaje("Selecciona al menos un scope.");
      return;
    }

    setProcesando(true);
    setMensaje("Generando Bearer Token manual...");
    setIssuedToken(null);
    try {
      const res = await fetch("/api/mcp/manual-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scopes: selectedScopes,
          expires_in_days: expiresInDays,
          etiqueta: label,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMensaje("Error: " + String(data.error || res.status));
      } else {
        setIssuedToken({
          token: data.token,
          bearer: data.bearer,
          expiresAt: data.expires_at,
        });
        setMensaje("Token generado. KHORA no conservará el secreto en claro.");
        await cargarInfo();
      }
    } catch (e) {
      setMensaje("Error al generar token: " + String(e));
    } finally {
      setProcesando(false);
    }
  }

  async function revocarToken(id: string) {
    if (!confirm("¿Revocar este Bearer Token manual? Dejará de funcionar inmediatamente.")) return;

    setProcesando(true);
    try {
      const res = await fetch("/api/mcp/manual-token", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMensaje("Error al revocar token: " + String(data.error || res.status));
      } else {
        setMensaje("Token manual revocado.");
        if (issuedToken) setIssuedToken(null);
        await cargarInfo();
      }
    } catch (e) {
      setMensaje("Error al revocar token: " + String(e));
    } finally {
      setProcesando(false);
    }
  }

  async function revocarAcceso() {
    if (!confirm("¿Está seguro de que desea revocar el acceso MCP? Todos los tokens MCP activos dejarán de funcionar de inmediato.")) {
      return;
    }

    setProcesando(true);
    setMensaje("Revocando accesos...");
    try {
      const res = await fetch("/api/mcp/revocacion", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMensaje("Error: " + String(data.error || res.status));
      } else {
        setIssuedToken(null);
        setMensaje("Acceso revocado. OAuth y Bearer manuales quedan invalidados.");
        await cargarInfo();
      }
    } catch (e) {
      setMensaje("Error al revocar: " + String(e));
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div
      style={{
        backgroundColor: "var(--khora-bg)",
        color: "var(--khora-ink)",
        paddingBottom: "6rem",
      }}
      className="w-full flex flex-col items-center justify-center p-4 py-12 font-mono"
    >
      <div
        style={{
          backgroundColor: "var(--khora-surface)",
          borderColor: "var(--khora-border)",
          borderWidth: "1px",
          borderStyle: "solid",
        }}
        className="w-full max-w-3xl p-6 space-y-6 shadow-sm rounded-none"
      >
        <div className="flex flex-col items-center space-y-2 text-center">
          <KeyRound size={32} strokeWidth={1.75} style={{ color: "var(--khora-accent)" }} />
          <h1 style={{ color: "var(--khora-ink)" }} className="text-2xl font-bold uppercase tracking-wider">
            Control MCP & Revocación
          </h1>
          <p className="text-xs opacity-70">
            Administra OAuth y Bearer Tokens manuales para las capacidades de Cora/KHORA.
          </p>
        </div>

        <div
          style={{
            backgroundColor: "var(--khora-bg)",
            borderColor: "var(--khora-border)",
            borderWidth: "1px",
            borderStyle: "solid",
          }}
          className="p-4 space-y-4"
        >
          <div className="flex items-center gap-3">
            <ShieldAlert size={32} strokeWidth={1.75} style={{ color: "var(--khora-accent)" }} />
            <div className="flex-1">
              <span className="text-xs uppercase opacity-60 block">Generación de Seguridad</span>
              <span className="font-bold text-base">
                {cargando ? "Cargando..." : `Generación #${info?.generacion ?? 1}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: "var(--khora-border)" }}>
            <Clock3 size={32} strokeWidth={1.75} style={{ color: "var(--khora-accent)" }} />
            <div className="flex-1">
              <span className="text-xs uppercase opacity-60 block">Último Refresh Token OAuth</span>
              <span className="font-mono text-xs">{cargando ? "Cargando..." : formatDate(info?.ultimoTokenAt ?? null)}</span>
            </div>
          </div>
        </div>

        <section className="space-y-4 border-t pt-5" style={{ borderColor: "var(--khora-border)" }}>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider">Bearer Token manual</h2>
            <p className="text-xs opacity-70 mt-1">
              Alternativa opcional a OAuth. KHORA genera el secreto, conserva únicamente su hash y lo revoca por token o por generación global.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              maxLength={80}
              placeholder="Etiqueta (p. ej. ChatGPT)"
              className="w-full p-3 text-sm border bg-transparent"
              style={{ borderColor: "var(--khora-border)", color: "var(--khora-ink)" }}
            />
            <select
              value={expiresInDays}
              onChange={(event) => setExpiresInDays(Number(event.target.value))}
              className="p-3 text-sm border bg-transparent"
              style={{ borderColor: "var(--khora-border)", color: "var(--khora-ink)" }}
            >
              <option value={30}>30 días</option>
              <option value={90}>90 días</option>
              <option value={365}>365 días</option>
            </select>
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase opacity-60">Scopes del token</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {SUPPORTED_SCOPES.map((scope) => (
                <label
                  key={scope}
                  className="flex items-center gap-2 p-3 border text-xs cursor-pointer"
                  style={{ borderColor: "var(--khora-border)" }}
                >
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                  />
                  <code>{scope}</code>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={generarToken}
            disabled={procesando || cargando || selectedScopes.length === 0}
            className="w-full p-3 font-bold uppercase text-sm tracking-widest text-white border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--khora-accent)", borderColor: "var(--khora-accent)" }}
          >
            {procesando ? "Generando..." : "Generar Bearer Token Manual"}
          </button>

          {issuedToken && (
            <div
              className="space-y-3 p-4 border"
              style={{ borderColor: "var(--khora-accent)", backgroundColor: "var(--khora-bg)" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase opacity-60">Secreto recién generado</div>
                  <div className="text-xs mt-1 text-amber-300">
                    Se muestra ahora y no volverá a mostrarse desde KHORA.
                  </div>
                </div>
                <Check size={20} className="text-emerald-400" />
              </div>

              <code className="block p-3 text-xs break-all border" style={{ borderColor: "var(--khora-border)" }}>
                {issuedToken.token}
              </code>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  onClick={() => copiar(issuedToken.token, "token")}
                  className="p-3 border text-xs font-bold uppercase flex items-center justify-center gap-2"
                  style={{ borderColor: "var(--khora-border)" }}
                >
                  <Copy size={15} /> {copiado === "token" ? "Copiado" : "Copiar token"}
                </button>
                <button
                  onClick={() => copiar(issuedToken.bearer, "bearer")}
                  className="p-3 border text-xs font-bold uppercase flex items-center justify-center gap-2"
                  style={{ borderColor: "var(--khora-border)" }}
                >
                  <Copy size={15} /> {copiado === "bearer" ? "Copiado" : "Copiar Bearer"}
                </button>
              </div>

              <div className="text-xs opacity-70">
                <div>Endpoint MCP:</div>
                <code className="break-all">{MCP_ENDPOINT}</code>
                <div className="mt-1">Caduca: {formatDate(issuedToken.expiresAt)}</div>
                <div className="mt-1">
                  En una plataforma que tenga un campo específico &quot;Bearer Token&quot;, pega <strong>solo el token</strong>. Usa &quot;Bearer ...&quot; cuando pida la cabecera completa.
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-3 border-t pt-5" style={{ borderColor: "var(--khora-border)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider">Tokens manuales activos</h2>
            <span className="text-xs opacity-60">{tokens.length} activos</span>
          </div>

          {tokens.length === 0 ? (
            <div className="p-4 border text-xs opacity-60" style={{ borderColor: "var(--khora-border)" }}>
              No hay tokens manuales activos en la generación actual.
            </div>
          ) : (
            <div className="space-y-2">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="p-3 border flex flex-col gap-3 md:flex-row md:items-center"
                  style={{ borderColor: "var(--khora-border)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold">{token.etiqueta}</div>
                    <code className="text-xs opacity-70">{token.token_prefix}…</code>
                    <div className="text-[11px] opacity-60 break-all">
                      {token.scope} · expira {formatDate(token.expira_en)} · último uso {formatDate(token.ultimo_uso_en)}
                    </div>
                  </div>
                  <button
                    onClick={() => revocarToken(token.id)}
                    disabled={procesando}
                    className="p-2 border text-red-400 flex items-center justify-center gap-2 text-xs uppercase font-bold disabled:opacity-50"
                    style={{ borderColor: "var(--khora-border)" }}
                  >
                    <Trash2 size={14} /> Revocar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3 border-t pt-5" style={{ borderColor: "var(--khora-border)" }}>
          <p className="text-xs opacity-80 leading-relaxed">
            Revocación global: incrementa la generación de seguridad y deja inválidos de inmediato los access tokens OAuth, refresh tokens y Bearer Tokens manuales de esta cuenta.
          </p>

          <button
            onClick={revocarAcceso}
            disabled={procesando || cargando}
            className="w-full p-3 font-bold uppercase text-sm tracking-widest bg-red-700 text-white border border-red-600 transition-all cursor-pointer hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <ShieldAlert size={20} strokeWidth={1.75} />
            <span>{procesando ? "Revocando..." : "Revocar Todo el Acceso MCP"}</span>
          </button>
        </section>

        {mensaje && (
          <div
            style={{
              backgroundColor: "var(--khora-bg)",
              borderColor: "var(--khora-border)",
              borderWidth: "1px",
              borderStyle: "solid",
            }}
            className="p-3 text-xs flex items-center gap-3 font-mono"
          >
            {mensaje.includes("Error") ? <ShieldAlert size={24} className="text-red-400" /> : <Check size={24} className="text-emerald-400" />}
            <span className="break-all">{mensaje}</span>
          </div>
        )}

        <div className="text-center pt-2 flex items-center justify-between text-xs">
          <button onClick={cargarInfo} className="text-gray-400 hover:text-white flex items-center gap-1">
            <RefreshCw size={14} />
            <span>Actualizar estado</span>
          </button>
          <a href="/sistema/volcados" style={{ color: "var(--khora-accent)" }} className="uppercase tracking-wider hover:underline">
            Volver a Volcados
          </a>
        </div>
      </div>
    </div>
  );
}
