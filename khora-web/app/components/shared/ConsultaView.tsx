// @l0 L0-002 · @req KA-00/REQ-CHAT · @req CORA-01/REQ-1,REQ-3 · @acr ACR-1.1,ACR-1.2,ACR-3.1
"use client";

import React, { useState } from "react";
import {
  PenLine,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
  Bot,
  Network,
  AlertTriangle,
  Trash2,
} from "lucide-react";

export interface Evidencia {
  tripleta: string;
  provenance: string;
  derived_from: string;
}

export interface MensajeChatSession {
  id: string;
  rol: "user" | "assistant";
  contenido: string;
  origen?: string;
  fuentes?: Evidencia[];
  suficiencia?: boolean;
  no_anclada?: boolean;
  degradacion_declarada?: string | null;
  error?: string | null;
}

export type PerfilProveedor = "open_source" | "gemini" | "groq";

export interface ConsultaViewState {
  mensajes: MensajeChatSession[];
  inputPregunta: string;
  perfil: PerfilProveedor;
  modeloOverride: string;
  modoGrafo: boolean;
  generando: boolean;
  error: string | null;
}

export interface ConsultaViewActions {
  onInputPreguntaChange?: (val: string) => void;
  onPerfilChange?: (val: PerfilProveedor) => void;
  onModeloOverrideChange?: (val: string) => void;
  onModoGrafoToggle?: (val: boolean) => void;
  onSubmit?: (e: React.FormEvent) => void;
  onLimpiarHistorial?: () => void;
}

export function ConsultaView({
  state,
  actions = {},
  isReviewMode = false,
}: {
  state: ConsultaViewState;
  actions?: ConsultaViewActions;
  isReviewMode?: boolean;
}) {
  const {
    mensajes,
    inputPregunta,
    perfil,
    modeloOverride,
    modoGrafo,
    generando,
    error,
  } = state;

  const [evidenciaAbierta, setEvidenciaAbierta] = useState<Record<string, boolean>>({});

  const toggleEvidencia = (msgId: string) => {
    setEvidenciaAbierta((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (actions.onSubmit) {
      actions.onSubmit(e);
    }
  };

  return (
    <main
      data-ui-id="consulta.container"
      className="w-full flex justify-center p-4 py-8 pb-24 font-mono min-h-screen"
      style={{ background: "var(--khora-bg)", color: "var(--khora-ink)" }}
    >
      <div className="w-full max-w-4xl flex flex-col space-y-6">
        {/* Header */}
        <header
          data-ui-id="consulta.header"
          className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4"
          style={{ borderColor: "var(--khora-border)" }}
        >
          <div>
            <div className="flex items-center gap-2">
              <PenLine size={28} style={{ color: "var(--khora-accent)" }} />
              <h1 className="text-2xl font-bold uppercase tracking-wider">
                Consola de Consulta
              </h1>
            </div>
            <p className="text-xs opacity-70 mt-1">
              Chat multi-turno streaming con selección de proveedor LLM o modo RAG sobre grafo.
            </p>
          </div>

          {mensajes.length > 0 && (
            <button
              type="button"
              onClick={() => actions.onLimpiarHistorial?.()}
              disabled={generando}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase border rounded hover:opacity-80 transition-colors disabled:opacity-50"
              style={{
                borderColor: "var(--khora-border)",
                background: "var(--khora-surface)",
              }}
              title="Limpiar historial de la sesión"
            >
              <Trash2 size={14} /> Limpiar sesión
            </button>
          )}
        </header>

        {/* Panel de Configuración: Perfil, Modelo Override, Toggle Modo Grafo */}
        <section
          className="p-4 border rounded space-y-3"
          style={{
            borderColor: "var(--khora-border)",
            background: "var(--khora-surface)",
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Selector de Perfil */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold uppercase opacity-80">Perfil:</span>
              <select
                data-ui-id="consulta.selector-perfil"
                value={perfil}
                onChange={(e) =>
                  actions.onPerfilChange?.(e.target.value as PerfilProveedor)
                }
                disabled={generando || modoGrafo}
                className="p-1.5 border rounded bg-transparent font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                style={{
                  borderColor: "var(--khora-border)",
                  color: "var(--khora-ink)",
                }}
              >
                <option value="open_source">open_source (Llama/Local)</option>
                <option value="gemini">gemini (Google Vertex/AI)</option>
                <option value="groq">groq (Fast Inference)</option>
              </select>
            </div>

            {/* Input Modelo Override (Opcional) */}
            <div className="flex items-center gap-2 text-xs flex-1 min-w-[200px]">
              <span className="font-bold uppercase opacity-80 whitespace-nowrap">
                Modelo:
              </span>
              <input
                data-ui-id="consulta.input-modelo-override"
                type="text"
                value={modeloOverride}
                onChange={(e) => actions.onModeloOverrideChange?.(e.target.value)}
                placeholder="Override opcional (ej. llama-3.3-70b-versatile)"
                disabled={generando || modoGrafo}
                className="flex-1 p-1.5 border rounded bg-transparent text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                style={{
                  borderColor: "var(--khora-border)",
                  color: "var(--khora-ink)",
                }}
              />
            </div>

            {/* Toggle Modo Grafo */}
            <div className="flex items-center gap-2 text-xs">
              <Network size={16} style={{ color: "var(--khora-accent)" }} />
              <label className="flex items-center gap-2 cursor-pointer font-bold uppercase select-none">
                <input
                  data-ui-id="consulta.toggle-modo-grafo"
                  type="checkbox"
                  checked={modoGrafo}
                  onChange={(e) => actions.onModoGrafoToggle?.(e.target.checked)}
                  disabled={generando}
                  className="rounded focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                />
                Modo Grafo (RAG)
              </label>
            </div>
          </div>
        </section>

        {/* Error Banner General */}
        {error && (
          <div
            data-ui-id="consulta.error-banner"
            role="alert"
            className="p-4 border rounded flex items-start gap-3 text-xs"
            style={{
              borderColor: "rgba(239, 68, 68, 0.4)",
              background: "rgba(239, 68, 68, 0.08)",
            }}
          >
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold uppercase text-red-400">
                Error en la consulta
              </span>
              <p className="opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* Historial de la Conversación */}
        <section
          data-ui-id="consulta.messages-list"
          className="flex-1 space-y-4 min-h-[250px]"
        >
          {mensajes.length === 0 ? (
            <div
              className="p-12 text-center text-xs opacity-50 border rounded border-dashed"
              style={{ borderColor: "var(--khora-border)" }}
            >
              No hay preguntas en esta sesión. Escribe un mensaje abajo para comenzar.
            </div>
          ) : (
            mensajes.map((msg) => (
              <article
                key={msg.id}
                data-ui-id="consulta.message-item"
                className={`p-4 border rounded space-y-2 text-xs transition-colors ${
                  msg.rol === "user" ? "ml-6" : "mr-6"
                }`}
                style={{
                  borderColor: "var(--khora-border)",
                  background:
                    msg.rol === "user"
                      ? "rgba(16, 185, 129, 0.05)"
                      : "var(--khora-surface)",
                }}
              >
                {/* Header del Mensaje */}
                <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--khora-border)" }}>
                  <div className="flex items-center gap-2">
                    {msg.rol === "user" ? (
                      <User size={14} className="text-emerald-400" />
                    ) : (
                      <Bot size={14} style={{ color: "var(--khora-accent)" }} />
                    )}
                    <span className="font-bold uppercase tracking-wider">
                      {msg.rol === "user" ? "Usuario" : "Asistente"}
                    </span>
                  </div>

                  {/* Etiqueta de Origen */}
                  {msg.origen && (
                    <span
                      data-ui-id="consulta.message-origin"
                      className="px-2 py-0.5 rounded text-[10px] font-bold font-mono opacity-80"
                      style={{
                        background:
                          msg.origen === "grafo"
                            ? "rgba(99, 102, 241, 0.2)"
                            : "rgba(16, 185, 129, 0.15)",
                        color:
                          msg.origen === "grafo"
                            ? "#818cf8"
                            : "var(--khora-ink)",
                        border: "1px solid var(--khora-border)",
                      }}
                    >
                      {msg.origen}
                    </span>
                  )}
                </div>

                {/* Badges de Modo Grafo */}
                {msg.origen === "grafo" && (
                  <div className="flex flex-wrap items-center gap-2 py-1">
                    {typeof msg.suficiencia === "boolean" && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded border bg-stone-800 text-stone-300 border-stone-700">
                        {msg.suficiencia
                          ? "✓ Evidencia suficiente"
                          : "⚠️ Evidencia insuficiente"}
                      </span>
                    )}

                    {msg.no_anclada && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded border bg-amber-950 text-amber-300 border-amber-800">
                        Sin anclaje
                      </span>
                    )}
                  </div>
                )}

                {/* Contenido del Mensaje */}
                <div className="leading-relaxed whitespace-pre-wrap font-sans text-sm pt-1">
                  {renderMarkdownTexto(msg.contenido)}
                </div>

                {/* Error Específico del Mensaje */}
                {msg.error && (
                  <div className="mt-2 p-2 border rounded bg-red-950/30 border-red-800 text-red-300 text-xs">
                    {msg.error}
                  </div>
                )}

                {/* Aviso de Degradación en Modo Grafo */}
                {msg.degradacion_declarada && (
                  <div className="mt-2 p-2 border-l-2 border-amber-500 bg-stone-900/40 text-stone-300 text-xs">
                    <strong className="block mb-0.5">Aviso de degradación:</strong>
                    {msg.degradacion_declarada}
                  </div>
                )}

                {/* Fuentes / Evidencia en Modo Grafo */}
                {msg.origen === "grafo" && Array.isArray(msg.fuentes) && (
                  <div
                    data-ui-id="consulta.sources-panel"
                    className="mt-3 border-t pt-2"
                    style={{ borderColor: "var(--khora-border)" }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleEvidencia(msg.id)}
                      className="flex items-center justify-between w-full text-xs font-bold uppercase opacity-80 hover:opacity-100 py-1"
                    >
                      <span>
                        Fuentes / Evidencia ({msg.fuentes.length})
                      </span>
                      {evidenciaAbierta[msg.id] ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </button>

                    {evidenciaAbierta[msg.id] && (
                      <div className="mt-2 space-y-2">
                        {msg.fuentes.length === 0 ? (
                          <p className="text-[11px] opacity-60">
                            No se encontraron fuentes asociadas.
                          </p>
                        ) : (
                          msg.fuentes.map((ev, idx) => (
                            <div
                              key={idx}
                              className="p-2 border rounded font-mono text-[11px] space-y-1"
                              style={{
                                borderColor: "var(--khora-border)",
                                background: "var(--khora-bg)",
                              }}
                            >
                              <div className="font-bold text-emerald-400 break-all">
                                {ev.tripleta}
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2 opacity-70 text-[10px]">
                                <span>
                                  <strong>Origen:</strong> {ev.provenance}
                                </span>
                                <span>
                                  <strong>Derivado:</strong> {ev.derived_from}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))
          )}

          {/* Indicador de Generando Stream */}
          {generando && (
            <div
              data-ui-id="consulta.status-generating"
              className="p-3 border rounded flex items-center gap-2 text-xs opacity-80"
              style={{
                borderColor: "var(--khora-border)",
                background: "var(--khora-surface)",
              }}
            >
              <Loader2 size={16} className="animate-spin text-emerald-400" />
              <span>Generando respuesta en streaming...</span>
            </div>
          )}
        </section>

        {/* Input Formulario */}
        <form
          data-ui-id="consulta.form-input"
          onSubmit={handleFormSubmit}
          className="flex gap-3 pt-2"
        >
          <input
            data-ui-id="consulta.input-text"
            type="text"
            value={inputPregunta}
            onChange={(e) => actions.onInputPreguntaChange?.(e.target.value)}
            placeholder={
              modoGrafo
                ? "Escribe tu pregunta para el grafo (RAG)..."
                : "Escribe tu mensaje para la IA..."
            }
            disabled={generando}
            className="flex-1 p-3 border rounded shadow-sm text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            style={{
              borderColor: "var(--khora-border)",
              background: "var(--khora-surface)",
              color: "var(--khora-ink)",
            }}
          />

          <button
            data-ui-id="consulta.btn-enviar"
            type="submit"
            disabled={generando || !inputPregunta.trim()}
            className="px-6 py-3 font-bold uppercase rounded shadow-sm flex items-center gap-2 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "var(--khora-accent)",
              color: "var(--khora-bg)",
            }}
          >
            {generando ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <PenLine size={16} />
            )}
            {generando ? "Procesando" : "Enviar"}
          </button>
        </form>
      </div>
    </main>
  );
}

/**
 * Función auxiliar para formatear bloques de código y párrafos simples en markdown
 */
function renderMarkdownTexto(texto: string) {
  if (!texto) return null;

  // Split en bloques de código triple backtick
  const partes = texto.split(/(```[\s\S]*?```)/g);

  return partes.map((part, index) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const lineas = part.slice(3, -3).trim().split("\n");
      const primeraLinea = lineas[0].trim();
      const esLenguaje = !primeraLinea.includes(" ") && primeraLinea.length > 0;
      const codigo = esLenguaje ? lineas.slice(1).join("\n") : lineas.join("\n");

      return (
        <pre
          key={index}
          className="my-2 p-3 border rounded font-mono text-xs overflow-x-auto whitespace-pre break-all"
          style={{
            borderColor: "var(--khora-border)",
            background: "var(--khora-bg)",
            color: "var(--khora-ink)",
          }}
        >
          {codigo || part.slice(3, -3).trim()}
        </pre>
      );
    }

    return (
      <span key={index} className="whitespace-pre-wrap">
        {part}
      </span>
    );
  });
}
