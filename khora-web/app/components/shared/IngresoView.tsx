// @l0 L0-002 · @req UI-04/INGRESO-INTEGRADO · Componente Presentacional Compartido de Ingreso
"use client";

import { useState, useEffect } from "react";
import * as Icons from "lucide-react";

export type IngresoViewState = {
  titulo: string;
  texto: string;
  estado: "inactivo" | "dictando";
  editando: boolean;
  soportado: boolean;
  escuchando: boolean;
  guardando: boolean;
  generandoTitulo: boolean;
  retranscribiendo: boolean;
  adjuntandoAudio: boolean;
  conAudio: boolean;
  partesContador: number;
  bytesAcumulados: number;
  reconexiones: number;
  pulidosOk: number;
  pulidosNo: number;
  reconciliacionMensaje: string;
  aviso: string;
  error: string;
  resultado: string;
};

export type IngresoViewActions = {
  onTituloChange?: (val: string) => void;
  onTextoChange?: (val: string) => void;
  onGenerarTitulo?: () => void;
  onIniciar?: () => void;
  onDetener?: () => void;
  onGuardar?: () => void;
  onRetranscribir?: () => void;
  onAdjuntarClick?: () => void;
  onLimpiar?: () => void;
  onConfirmarEdicion?: () => void;
};

export function IngresoView({
  state,
  actions = {},
  isReviewMode = false,
}: {
  state: IngresoViewState;
  actions?: IngresoViewActions;
  isReviewMode?: boolean;
}) {
  const {
    titulo,
    texto,
    estado,
    editando,
    soportado,
    escuchando,
    guardando,
    generandoTitulo,
    retranscribiendo,
    adjuntandoAudio,
    conAudio,
    partesContador,
    bytesAcumulados,
    reconexiones,
    pulidosOk,
    pulidosNo,
    reconciliacionMensaje,
    aviso,
    error,
    resultado,
  } = state;

  return (
    <main
      data-ui-id="ingreso.container"
      className="max-w-4xl mx-auto p-6 space-y-6"
      style={{
        backgroundColor: "var(--khora-bg)",
        color: "var(--khora-ink)",
        paddingBottom: "6rem",
      }}
    >
      {/* Cabecera de Sección */}
      <div className="border-b pb-4" style={{ borderColor: "var(--khora-border)" }}>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Icons.Keyboard size={32} strokeWidth={1.75} style={{ color: "var(--khora-accent)" }} />
          Ingreso Integrado
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--khora-accent)" }}>
          Método universal combinado: Dicta en vivo, escribe o pega directamente. La transcripción es editable in-situ con protección segmentaria.
        </p>
      </div>

      {!soportado && (
        <div className="p-3 border rounded-none text-sm flex items-center gap-2" style={{ borderColor: "var(--khora-border)", backgroundColor: "var(--khora-surface)", color: "var(--khora-accent)" }}>
          <Icons.TriangleAlert size={32} strokeWidth={1.75} className="shrink-0" />
          <span>Este navegador no soporta dictado en vivo. Puedes utilizar escritura o copiar y pegar contenido.</span>
        </div>
      )}

      {/* Inputs y Controles */}
      <div className="space-y-4">
        <div className="flex gap-2 items-center">
          <input
            data-ui-id="ingreso.titulo-input"
            value={titulo}
            onChange={(e) => actions.onTituloChange?.(e.target.value)}
            placeholder="Título opcional (escribe o genera con IA)"
            className="flex-1 p-2.5 border rounded-none text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)] focus-visible:border-[var(--khora-accent)]"
            style={{
              backgroundColor: "var(--khora-surface)",
              color: "var(--khora-ink)",
              borderColor: "var(--khora-border)",
            }}
          />
          <button
            data-ui-id="ingreso.btn-titulo-ia"
            onClick={() => actions.onGenerarTitulo?.()}
            disabled={generandoTitulo || !texto.trim()}
            className="px-3 py-2.5 border rounded-none cursor-pointer disabled:opacity-40 flex items-center gap-2 hover:opacity-90 transition-opacity font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)] text-xs"
            style={{
              backgroundColor: "var(--khora-surface)",
              color: "var(--khora-ink)",
              borderColor: "var(--khora-border)",
            }}
          >
            <Icons.Sparkles size={16} strokeWidth={1.75} />
            {generandoTitulo ? "Generando..." : "Título con IA"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {estado === "inactivo" ? (
            <button
              data-ui-id="ingreso.btn-iniciar"
              onClick={() => actions.onIniciar?.()}
              disabled={!soportado || editando || adjuntandoAudio || retranscribiendo}
              className="px-4 py-2 border rounded-none cursor-pointer disabled:opacity-40 flex items-center gap-2 hover:opacity-90 transition-opacity font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)]"
              style={{
                backgroundColor: "var(--khora-accent)",
                color: "var(--khora-bg)",
                borderColor: "var(--khora-accent)",
              }}
            >
              <Icons.Mic size={32} strokeWidth={1.75} />
              Iniciar dictado
            </button>
          ) : (
            <button
              data-ui-id="ingreso.btn-detener"
              onClick={() => actions.onDetener?.()}
              className="px-4 py-2 border rounded-none cursor-pointer flex items-center gap-2 hover:opacity-90 transition-opacity font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)]"
              style={{
                backgroundColor: "var(--khora-surface)",
                color: "var(--khora-ink)",
                borderColor: "var(--khora-border)",
              }}
            >
              <Icons.Pause size={32} strokeWidth={1.75} />
              Detener
            </button>
          )}

          <button
            data-ui-id="ingreso.btn-archivar"
            onClick={() => actions.onGuardar?.()}
            disabled={guardando || estado === "dictando" || editando || adjuntandoAudio || retranscribiendo}
            className="px-4 py-2 border rounded-none cursor-pointer disabled:opacity-40 flex items-center gap-2 hover:opacity-90 transition-opacity font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)]"
            style={{
              backgroundColor: "var(--khora-surface)",
              color: "var(--khora-ink)",
              borderColor: "var(--khora-border)",
            }}
          >
            <Icons.Check size={32} strokeWidth={1.75} />
            {guardando ? "archivando..." : "Archivar volcado"}
          </button>

          <button
            data-ui-id="ingreso.btn-retranscribir"
            onClick={() => actions.onRetranscribir?.()}
            disabled={retranscribiendo || adjuntandoAudio || estado !== "inactivo"}
            className="px-4 py-2 border rounded-none cursor-pointer disabled:opacity-40 flex items-center gap-2 hover:opacity-90 transition-opacity font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)]"
            style={{
              backgroundColor: "var(--khora-surface)",
              color: "var(--khora-ink)",
              borderColor: "var(--khora-border)",
            }}
          >
            <Icons.RefreshCw size={20} strokeWidth={1.75} />
            {retranscribiendo ? "Re-transcribiendo..." : "Re-transcribir audio"}
          </button>

          <button
            data-ui-id="ingreso.btn-adjuntar"
            onClick={() => actions.onAdjuntarClick?.()}
            disabled={adjuntandoAudio || retranscribiendo || estado !== "inactivo"}
            className="px-4 py-2 border rounded-none cursor-pointer disabled:opacity-40 flex items-center gap-2 hover:opacity-90 transition-opacity font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)]"
            style={{
              backgroundColor: "var(--khora-surface)",
              color: "var(--khora-ink)",
              borderColor: "var(--khora-border)",
            }}
          >
            <Icons.Paperclip size={20} strokeWidth={1.75} />
            {adjuntandoAudio ? "Adjuntando..." : "Adjuntar audio"}
          </button>

          <button
            data-ui-id="ingreso.btn-limpiar"
            onClick={() => actions.onLimpiar?.()}
            disabled={estado === "dictando" || editando || adjuntandoAudio || retranscribiendo}
            className="px-4 py-2 border rounded-none cursor-pointer disabled:opacity-40 flex items-center gap-2 hover:opacity-90 transition-opacity font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)]"
            style={{
              backgroundColor: "var(--khora-surface)",
              color: "var(--khora-ink)",
              borderColor: "var(--khora-border)",
            }}
          >
            <Icons.RotateCcw size={32} strokeWidth={1.75} />
            Limpiar
          </button>

          {estado === "dictando" && (
            <span data-ui-id="ingreso.status-listening" className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--khora-accent)" }}>
              <Icons.Activity size={32} strokeWidth={1.75} />
              {escuchando ? "escuchando" : "reconectando..."}
            </span>
          )}
        </div>
      </div>

      {/* Banner de Edición Activa */}
      {editando && (
        <div data-ui-id="ingreso.banner-edicion" className="p-3 border rounded-none text-sm flex items-center justify-between gap-4 animate-pulse" style={{ borderColor: "var(--khora-accent)", backgroundColor: "var(--khora-surface)", color: "var(--khora-ink)" }}>
          <div className="flex items-center gap-2">
            <Icons.PenTool size={32} strokeWidth={1.75} style={{ color: "var(--khora-accent)" }} />
            <span>
              <strong>Edición in-situ activa:</strong> El dictado está pausado. Confirma los cambios para reanudar.
            </span>
          </div>
          <button
            data-ui-id="ingreso.btn-confirmar-edicion"
            onClick={() => actions.onConfirmarEdicion?.()}
            className="px-3 py-1 bg-[var(--khora-accent)] text-[var(--khora-bg)] font-bold text-xs rounded-none cursor-pointer hover:opacity-90"
          >
            Confirmar edición
          </button>
        </div>
      )}

      {/* Área de Texto Editable */}
      <div className="relative">
        <textarea
          data-ui-id="ingreso.textarea"
          value={texto}
          onChange={(e) => actions.onTextoChange?.(e.target.value)}
          placeholder="Escribe, pega o inicia el dictado para transcribir..."
          className="w-full p-4 min-h-[260px] whitespace-pre-wrap leading-relaxed border rounded-none text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--khora-accent)] focus-visible:border-[var(--khora-accent)]"
          style={{
            backgroundColor: "var(--khora-surface)",
            borderColor: "var(--khora-border)",
            color: "var(--khora-ink)",
            resize: "vertical"
          }}
        />
      </div>

      {/* Estadísticas */}
      <p data-ui-id="ingreso.stats" className="text-xs font-medium" style={{ color: "var(--khora-accent)" }}>
        estado: {estado} / editando: {editando ? "sí" : "no"} / caracteres: {texto.length} / bloques pulidos: {pulidosOk} / bloques sin pulir: {pulidosNo} / audio: {conAudio ? "sí" : "no"} / partes subidas: {partesContador} ({(bytesAcumulados / (1024 * 1024)).toFixed(2)} MB) / reconexiones: {reconexiones}
      </p>

      {/* Alertas y Mensajes de Retorno */}
      {reconciliacionMensaje.length > 0 && (
        <div data-ui-id="ingreso.msg-reconciliacion" className="p-3 border rounded-none text-xs flex items-center gap-2" style={{ borderColor: "var(--khora-border)", backgroundColor: "var(--khora-surface)", color: "var(--khora-ink)" }}>
          <Icons.Sparkles size={20} strokeWidth={1.75} className="shrink-0" style={{ color: "var(--khora-accent)" }} />
          <span>{reconciliacionMensaje}</span>
        </div>
      )}
      {aviso.length > 0 && (
        <div data-ui-id="ingreso.aviso-degradado" className="p-3 border rounded-none text-sm flex items-center gap-2" style={{ borderColor: "var(--khora-border)", backgroundColor: "var(--khora-surface)", color: "var(--khora-accent)" }}>
          <Icons.TriangleAlert size={32} strokeWidth={1.75} className="shrink-0" />
          <span>{aviso}</span>
        </div>
      )}
      {error.length > 0 && (
        <div data-ui-id="ingreso.msg-error" className="p-3 border rounded-none text-sm flex items-center gap-2" style={{ borderColor: "var(--khora-border)", backgroundColor: "var(--khora-surface)", color: "var(--khora-accent)" }}>
          <Icons.ShieldX size={32} strokeWidth={1.75} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {resultado.length > 0 && (
        <div data-ui-id="ingreso.msg-resultado" className="p-3 border rounded-none text-sm flex items-center gap-2" style={{ borderColor: "var(--khora-border)", backgroundColor: "var(--khora-surface)", color: "var(--khora-ink)" }}>
          <Icons.CircleDot size={32} strokeWidth={1.75} className="shrink-0" />
          <span>{resultado}</span>
        </div>
      )}
    </main>
  );
}
