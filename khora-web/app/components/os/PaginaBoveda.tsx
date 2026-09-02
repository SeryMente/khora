// @l0 L0-002-R · @req BOVEDA-01/RESKIN · @req SISTEMA-MENU/E1
"use client";

import { useEffect, useState } from "react";
import { LockKeyhole, Clock3, TriangleAlert, Check } from "lucide-react";

type Estado = { configurado?: boolean; abierta?: boolean; minutos?: number; error?: string };

export default function PaginaBoveda() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [pin, setPin] = useState("");
  const [aviso, setAviso] = useState("");

  async function consultar() {
    try {
      const r = await fetch("/api/boveda", { cache: "no-store" });
      setEstado(await r.json());
    } catch (e) {
      setEstado({ error: String(e) });
    }
  }

  useEffect(() => {
    consultar();
  }, []);

  async function enviar() {
    setAviso("procesando...");
    try {
      const r = await fetch("/api/boveda", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const d = await r.json();
      if (!r.ok) {
        setAviso("error: " + String(d?.error ?? r.status));
        return;
      }
      setAviso(d?.recienCreado === true ? "pin creado y boveda abierta" : "boveda abierta");
      setPin("");
      consultar();
    } catch (e) {
      setAviso("error: " + String(e));
    }
  }

  const configurado = estado?.configurado === true;
  const abierta = estado?.abierta === true;

  return (
    <div
      style={{
        backgroundColor: "var(--khora-bg)",
        color: "var(--khora-ink)",
        minHeight: "100vh",
        paddingBottom: "6rem",
      }}
      className="w-full flex flex-col items-center justify-center p-4 font-mono"
    >
      <div
        style={{
          backgroundColor: "var(--khora-surface)",
          borderColor: "var(--khora-border)",
          borderWidth: "1px",
          borderStyle: "solid",
        }}
        className="w-full max-w-md p-6 space-y-6 shadow-sm rounded-none"
      >
        {/* Header Icon & Title */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <LockKeyhole
            size={32}
            strokeWidth={1.75}
            style={{ color: "var(--khora-accent)" }}
          />
          <h1
            style={{ color: "var(--khora-ink)" }}
            className="text-2xl font-bold uppercase tracking-wider"
          >
            Bóveda
          </h1>
          <p className="text-xs opacity-70">
            Tus grabaciones y volcados están cifrados. El pin abre la bóveda.
          </p>
        </div>

        {/* Status Indicator */}
        <div
          style={{
            backgroundColor: "var(--khora-bg)",
            borderColor: "var(--khora-border)",
            borderWidth: "1px",
            borderStyle: "solid",
          }}
          className="p-4 space-y-3"
        >
          <div className="flex items-center gap-3">
            <LockKeyhole
              size={32}
              strokeWidth={1.75}
              style={{ color: "var(--khora-accent)" }}
            />
            <div className="flex-1">
              <span className="text-xs uppercase opacity-60 block">
                Estado de Seguridad
              </span>
              <span className="font-bold text-sm tracking-wide">
                {configurado
                  ? abierta
                    ? "ABIERTA"
                    : "CERRADA"
                  : "SIN PIN DEFINIDO"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: "var(--khora-border)" }}>
            <Clock3
              size={32}
              strokeWidth={1.75}
              style={{ color: "var(--khora-accent)" }}
            />
            <div className="flex-1">
              <span className="text-xs uppercase opacity-60 block">
                Tiempo de Sesión
              </span>
              <span className="font-bold text-sm">
                {String(estado?.minutos ?? 30)} minutos
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Instruction */}
        {!configurado && (
          <div
            style={{
              borderColor: "var(--khora-border)",
              borderWidth: "1px",
              borderStyle: "solid",
              backgroundColor: "var(--khora-bg)",
            }}
            className="p-3 text-xs opacity-80 leading-relaxed text-center"
          >
            El primer pin que escribas queda registrado como el pin de la bóveda. De 4 a 12 dígitos.
          </div>
        )}

        {/* Actions Form */}
        <div className="space-y-4">
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            inputMode="numeric"
            type="password"
            placeholder="••••"
            style={{
              backgroundColor: "var(--khora-bg)",
              color: "var(--khora-ink)",
              borderColor: "var(--khora-border)",
              borderWidth: "1px",
              borderStyle: "solid",
              letterSpacing: "0.25em",
            }}
            className="w-full p-3 font-mono text-center text-xl focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)] focus-visible:border-[var(--khora-accent)]"
          />

          <button
            onClick={enviar}
            disabled={pin.length < 4}
            style={{
              backgroundColor: "var(--khora-accent)",
              color: "var(--khora-bg)",
              borderColor: "var(--khora-accent)",
              borderWidth: "1px",
              borderStyle: "solid",
            }}
            className="w-full p-3 font-bold uppercase text-sm tracking-widest transition-all cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {configurado ? "Abrir bóveda" : "Definir pin"}
          </button>
        </div>

        {/* Response Notice */}
        {aviso && (
          <div
            style={{
              backgroundColor: "var(--khora-bg)",
              borderColor: "var(--khora-border)",
              borderWidth: "1px",
              borderStyle: "solid",
            }}
            className="p-3 text-xs flex items-center gap-3 font-mono"
          >
            {aviso.includes("error") ? (
              <TriangleAlert
                size={32}
                strokeWidth={1.75}
                style={{ color: "var(--khora-accent)" }}
              />
            ) : (
              <Check
                size={32}
                strokeWidth={1.75}
                style={{ color: "var(--khora-accent)" }}
              />
            )}
            <span className="break-all">{aviso}</span>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="text-center pt-2">
          <a
            href="/sistema/editar"
            style={{ color: "var(--khora-accent)" }}
            className="text-xs uppercase tracking-wider hover:underline"
          >
            volver a la edición de volcados
          </a>
        </div>
      </div>
    </div>
  );
}
