// @l0 L0-002 §4 · @req MCP-REV-01/REQ-2
"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldAlert, Check, Clock3, RefreshCw } from "lucide-react";

interface RevocationInfo {
  generacion: number;
  ultimoTokenAt: string | null;
  error?: string;
}

export default function PaginaMcpRevocacion() {
  const [info, setInfo] = useState<RevocationInfo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [procesando, setProcesando] = useState(false);

  async function cargarInfo() {
    setCargando(true);
    try {
      const res = await fetch("/api/mcp/revocacion", { cache: "no-store" });
      const data = await res.json();
      setInfo(data);
    } catch (e) {
      setInfo({ generacion: 1, ultimoTokenAt: null, error: String(e) });
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarInfo();
  }, []);

  async function revocarAcceso() {
    if (!confirm("¿Está seguro de que desea revocar el acceso MCP? Todos los tokens de Claude activos dejarán de funcionar de inmediato.")) {
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
        setMensaje("✅ Acceso revocado. Tokens invalidados de inmediato.");
        cargarInfo();
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
        className="w-full max-w-lg p-6 space-y-6 shadow-sm rounded-none"
      >
        <div className="flex flex-col items-center space-y-2 text-center">
          <KeyRound size={32} strokeWidth={1.75} style={{ color: "var(--khora-accent)" }} />
          <h1 style={{ color: "var(--khora-ink)" }} className="text-2xl font-bold uppercase tracking-wider">
            Control MCP & Revocación
          </h1>
          <p className="text-xs opacity-70">
            Administra el acceso de Claude a la API de volcados de Khora.
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
              <span className="text-xs uppercase opacity-60 block">Generación de Token</span>
              <span className="font-bold text-base">
                {cargando ? "Cargando..." : `Generación #${info?.generacion ?? 1}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: "var(--khora-border)" }}>
            <Clock3 size={32} strokeWidth={1.75} style={{ color: "var(--khora-accent)" }} />
            <div className="flex-1">
              <span className="text-xs uppercase opacity-60 block">Último Refresh Token Emitido</span>
              <span className="font-mono text-xs">
                {cargando
                  ? "Cargando..."
                  : info?.ultimoTokenAt
                  ? new Date(info.ultimoTokenAt).toLocaleString("es-MX")
                  : "Ninguno activo"}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs opacity-80 leading-relaxed">
            Si dejaste una sesión abierta en un equipo compartido, presionar este botón incrementará la generación de seguridad y destruirá todos los refresh tokens. Ningún access token anterior podrá seguir operando.
          </p>

          <button
            onClick={revocarAcceso}
            disabled={procesando || cargando}
            className="w-full p-3 font-bold uppercase text-sm tracking-widest bg-red-700 text-white border border-red-600 transition-all cursor-pointer hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <ShieldAlert size={20} strokeWidth={1.75} />
            <span>{procesando ? "Revocando..." : "Revocar Acceso Inmediatamente"}</span>
          </button>
        </div>

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
            {mensaje.includes("Error") ? (
              <ShieldAlert size={24} className="text-red-400" />
            ) : (
              <Check size={24} className="text-emerald-400" />
            )}
            <span className="break-all">{mensaje}</span>
          </div>
        )}

        <div className="text-center pt-2 flex items-center justify-between text-xs">
          <button
            onClick={cargarInfo}
            className="text-gray-400 hover:text-white flex items-center space-x-1"
          >
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
