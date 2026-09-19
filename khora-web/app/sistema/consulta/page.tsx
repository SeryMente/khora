// @l0 L0-002 · @req KA-00/REQ-CHAT · @req CORA-01/REQ-1,REQ-3 · @acr ACR-1.1,ACR-1.2,ACR-3.1
"use client";

import React, { useState } from "react";
import {
  ConsultaView,
  ConsultaViewState,
  PerfilProveedor,
  MensajeChatSession,
  Evidencia,
} from "@/app/components/shared/ConsultaView";
import { ejecutarInferenciaOllamaLocal } from "@/lib/client/ollamaLocal";

export default function ConsultaPage() {
  const [mensajes, setMensajes] = useState<MensajeChatSession[]>([]);
  const [inputPregunta, setInputPregunta] = useState("");
  const [perfil, setPerfil] = useState<PerfilProveedor>("groq");
  const [modeloOverride, setModeloOverride] = useState("");
  const [modoGrafo, setModoGrafo] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLimpiarHistorial = () => {
    setMensajes([]);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const textoLimpio = inputPregunta.trim();
    if (!textoLimpio || generando) return;

    setError(null);
    setInputPregunta("");

    const userMsgId = crypto.randomUUID();
    const userMsg: MensajeChatSession = {
      id: userMsgId,
      rol: "user",
      contenido: textoLimpio,
    };

    const nuevosMensajes = [...mensajes, userMsg];
    setMensajes(nuevosMensajes);
    setGenerando(true);

    if (perfil === "local" && !modoGrafo) {
      // Inferencia Local directa Navegador -> http://localhost:11434 (API nativa de Ollama)
      const assistantMsgId = crypto.randomUUID();
      const modeloUsado = modeloOverride.trim() || "qwen3.8:27b";
      const initialAssistantMsg: MensajeChatSession = {
        id: assistantMsgId,
        rol: "assistant",
        contenido: "",
        origen: `ollama:${modeloUsado}`,
      };

      setMensajes([...nuevosMensajes, initialAssistantMsg]);

      try {
        const payloadMensajes = nuevosMensajes.map((m) => ({
          role: m.rol === "user" ? ("user" as const) : ("assistant" as const),
          content: m.contenido,
        }));

        await ejecutarInferenciaOllamaLocal({
          model: modeloUsado,
          messages: payloadMensajes,
          onChunk: (chunkText, fullText) => {
            setMensajes((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, contenido: fullText }
                  : m
              )
            );
          },
        });
      } catch (err: any) {
        const errorText =
          err.message ||
          "Error de conexión con Ollama en http://localhost:11434. Asegúrate de que Ollama esté corriendo.";
        setError(errorText);
        setMensajes((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId && !m.contenido
              ? { ...m, contenido: "Error al generar respuesta local.", error: errorText }
              : m
          )
        );
      } finally {
        setGenerando(false);
      }
    } else if (modoGrafo) {
      // Modo Grafo: Invocar /api/consulta (RAG existente)
      try {
        const response = await fetch("/api/consulta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pregunta: textoLimpio }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Error ${response.status} en consulta de grafo`);
        }

        const data = await response.json();
        const assistantMsg: MensajeChatSession = {
          id: crypto.randomUUID(),
          rol: "assistant",
          contenido: data.respuesta || (data.suficiencia ? "Respuesta procesada." : "Sin evidencia suficiente para responder."),
          origen: "grafo",
          fuentes: Array.isArray(data.evidencia) ? (data.evidencia as Evidencia[]) : [],
          suficiencia: Boolean(data.suficiencia),
          no_anclada: Boolean(data.no_anclada),
          degradacion_declarada: data.degradacion_declarada || null,
        };

        setMensajes([...nuevosMensajes, assistantMsg]);
      } catch (err: any) {
        setError(err.message || "Error al procesar la consulta en el grafo.");
      } finally {
        setGenerando(false);
      }
    } else {
      // Modo Chat Multi-Turno: Invocar /api/chat (SSE streaming)
      const assistantMsgId = crypto.randomUUID();
      const initialAssistantMsg: MensajeChatSession = {
        id: assistantMsgId,
        rol: "assistant",
        contenido: "",
        origen: `llm:${perfil}`,
      };

      setMensajes([...nuevosMensajes, initialAssistantMsg]);

      try {
        const payloadMensajes = nuevosMensajes.map((m) => ({
          rol: m.rol,
          contenido: m.contenido,
        }));

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            perfil,
            modelo_override: modeloOverride.trim() || undefined,
            mensajes: payloadMensajes,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const msgError = errData.detail?.mensaje || errData.error || `Error HTTP ${response.status}`;
          throw new Error(msgError);
        }

        if (!response.body) {
          throw new Error("El servidor no retornó un cuerpo ejecutable para streaming");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let bufferAcc = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          bufferAcc += decoder.decode(value, { stream: true });
          const lineas = bufferAcc.split("\n\n");
          bufferAcc = lineas.pop() || "";

          for (const bloque of lineas) {
            const lineaData = bloque.split("\n").find((l) => l.startsWith("data: "));
            if (!lineaData) continue;

            const jsonRaw = lineaData.substring(6).trim();
            if (!jsonRaw) continue;

            try {
              const evento = JSON.parse(jsonRaw);

              if (evento.tipo === "chunk") {
                setMensajes((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          contenido: m.contenido + (evento.texto || ""),
                          origen: evento.origen || m.origen,
                        }
                      : m
                  )
                );
              } else if (evento.tipo === "error") {
                const errorStr = evento.mensaje || evento.error || "Error durante el streaming";
                setError(errorStr);
                setMensajes((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, error: errorStr }
                      : m
                  )
                );
              } else if (evento.tipo === "fin") {
                // Stream concluido exitosamente
              }
            } catch (pErr) {
              console.warn("Error al parsear fragmento SSE:", pErr);
            }
          }
        }
      } catch (err: any) {
        const errorText = err.message || "Error inesperado durante la transmisión del chat.";
        setError(errorText);
        setMensajes((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId && !m.contenido
              ? { ...m, contenido: "Error al generar respuesta.", error: errorText }
              : m
          )
        );
      } finally {
        setGenerando(false);
      }
    }
  };

  const state: ConsultaViewState = {
    mensajes,
    inputPregunta,
    perfil,
    modeloOverride,
    modoGrafo,
    generando,
    error,
  };

  return (
    <ConsultaView
      state={state}
      actions={{
        onInputPreguntaChange: setInputPregunta,
        onPerfilChange: setPerfil,
        onModeloOverrideChange: setModeloOverride,
        onModoGrafoToggle: setModoGrafo,
        onSubmit: handleSubmit,
        onLimpiarHistorial: handleLimpiarHistorial,
      }}
    />
  );
}
