// @l0 L0-002 · @req KPI-01/PAGE · Panel de KPIs & Benchmarks LLM
"use client";

import React, { useState } from "react";
import {
  KpiPanelView,
  KpiPanelViewState,
  ProfileKpiResult,
} from "@/app/components/shared/KpiPanelView";
import { PerfilProveedor } from "@/app/components/shared/ConsultaView";
import { logTelemetryEvent } from "@/lib/telemetry";
import { ejecutarInferenciaOllamaLocal } from "@/lib/client/ollamaLocal";

export default function KpisPage() {
  const [promptInput, setPromptInput] = useState("");
  const [selectedProfiles, setSelectedProfiles] = useState<PerfilProveedor[]>([
    "groq",
    "gemini",
    "open_source",
  ]);
  const [generandoGlobal, setGenerandoGlobal] = useState(false);
  const [sinPerfilesConfigurados, setSinPerfilesConfigurados] = useState(false);

  const [resultados, setResultados] = useState<Record<PerfilProveedor, ProfileKpiResult>>({
    groq: {
      perfil: "groq",
      estado: "idle",
      contenido: "",
      ttftMs: null,
      durationMs: null,
      realTokens: null,
      charCount: 0,
      tps: null,
      isExactTokens: false,
    },
    gemini: {
      perfil: "gemini",
      estado: "idle",
      contenido: "",
      ttftMs: null,
      durationMs: null,
      realTokens: null,
      charCount: 0,
      tps: null,
      isExactTokens: false,
    },
    open_source: {
      perfil: "open_source",
      estado: "idle",
      contenido: "",
      ttftMs: null,
      durationMs: null,
      realTokens: null,
      charCount: 0,
      tps: null,
      isExactTokens: false,
    },
    local: {
      perfil: "local",
      estado: "idle",
      contenido: "",
      ttftMs: null,
      durationMs: null,
      realTokens: null,
      charCount: 0,
      tps: null,
      isExactTokens: false,
    },
  });

  const handleProfileToggle = (perfil: PerfilProveedor, selected: boolean) => {
    if (selected) {
      if (!selectedProfiles.includes(perfil)) {
        setSelectedProfiles([...selectedProfiles, perfil]);
      }
    } else {
      setSelectedProfiles(selectedProfiles.filter((p) => p !== perfil));
    }
  };

  const ejecutarFanOut = async (prompt: string, perfiles: PerfilProveedor[]) => {
    if (!prompt.trim() || perfiles.length === 0 || generandoGlobal) return;

    setGenerandoGlobal(true);
    setSinPerfilesConfigurados(false);

    // Inicializar estado para los perfiles seleccionados
    setResultados((prev) => {
      const proximo = { ...prev };
      for (const p of perfiles) {
        proximo[p] = {
          perfil: p,
          estado: "generando",
          contenido: "",
          ttftMs: null,
          durationMs: null,
          realTokens: null,
          charCount: 0,
          tps: null,
          isExactTokens: false,
        };
      }
      return proximo;
    });

    // Disparar peticiones HTTP en paralelo para cada perfil (fan-out)
    const promesas = perfiles.map(async (perfil) => {
      if (perfil === "local") {
        // Inferencia Local directa Navegador -> http://localhost:11434 (API nativa)
        try {
          const resLocal = await ejecutarInferenciaOllamaLocal({
            model: "qwen3.8:27b",
            messages: [{ role: "user", content: prompt }],
            onChunk: (chunkText, fullText) => {
              setResultados((prev) => ({
                ...prev,
                local: {
                  ...prev.local,
                  contenido: fullText,
                  charCount: fullText.length,
                },
              }));
            },
          });

          setResultados((prev) => ({
            ...prev,
            local: {
              ...prev.local,
              estado: "exito",
              contenido: resLocal.contenido,
              ttftMs: resLocal.ttftMs,
              durationMs: resLocal.durationMs,
              realTokens: resLocal.evalCount,
              charCount: resLocal.contenido.length,
              tps: resLocal.tps,
              isExactTokens: resLocal.exactTokens,
              origenModel: resLocal.origenModel,
            },
          }));

          await logTelemetryEvent({
            moduleId: "khora-web",
            action: "LLM_KPI",
            severity: "INFO",
            payload: {
              perfil: "local",
              modelo: resLocal.origenModel,
              ttft_ms: resLocal.ttftMs,
              total_duration_ms: resLocal.durationMs,
              tps: resLocal.tps,
              is_exact_tokens: resLocal.exactTokens,
              total_tokens: resLocal.evalCount ?? Math.ceil(resLocal.contenido.length / 4),
            },
          });
        } catch (err: any) {
          setResultados((prev) => ({
            ...prev,
            local: {
              ...prev.local,
              estado: "error",
              errorMsg:
                err.message ||
                "No se pudo conectar con Ollama en http://localhost:11434.",
            },
          }));
        }
        return;
      }

      const t0 = performance.now();
      let firstTokenTime: number | null = null;
      let lastChunkTime: number | null = null;
      let realUsageTokens: number | null = null;
      let localContenido = "";
      let localCharCount = 0;
      let origenModel = `llm:${perfil}`;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            perfil,
            mensajes: [{ rol: "user", contenido: prompt }],
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const msgError =
            errData.detail?.mensaje ||
            errData.error ||
            `Error HTTP ${response.status}`;

          setResultados((prev) => ({
            ...prev,
            [perfil]: {
              ...prev[perfil],
              estado: "error",
              errorMsg: msgError,
            },
          }));
          return;
        }

        if (!response.body) {
          throw new Error("Respuesta sin cuerpo ejecutable");
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
                const now = performance.now();
                if (firstTokenTime === null) {
                  firstTokenTime = now;
                }
                lastChunkTime = now;

                const textoChunk = evento.texto || "";
                localContenido += textoChunk;
                localCharCount += textoChunk.length;
                if (evento.origen) {
                  origenModel = evento.origen;
                }

                const ttftActual = firstTokenTime
                  ? Math.round(firstTokenTime - t0)
                  : null;

                setResultados((prev) => ({
                  ...prev,
                  [perfil]: {
                    ...prev[perfil],
                    contenido: localContenido,
                    charCount: localCharCount,
                    ttftMs: ttftActual,
                    origenModel,
                  },
                }));
              } else if (evento.tipo === "usage" && evento.usage) {
                if (typeof evento.usage.completion_tokens === "number") {
                  realUsageTokens = evento.usage.completion_tokens;
                }
              } else if (evento.tipo === "error") {
                const errorStr =
                  evento.mensaje || evento.error || "Error durante el streaming";
                setResultados((prev) => ({
                  ...prev,
                  [perfil]: {
                    ...prev[perfil],
                    estado: "error",
                    errorMsg: errorStr,
                  },
                }));
              }
            } catch (pErr) {
              console.warn(`[KPIs] Error al parsear SSE para ${perfil}:`, pErr);
            }
          }
        }

        const tf = performance.now();
        const totalDurationMs = Math.round(tf - t0);
        const ttftMsFinal = firstTokenTime ? Math.round(firstTokenTime - t0) : totalDurationMs;

        // Fin de la ventana de generación: usar el timestamp del ÚLTIMO CHUNK de contenido
        // recibido para evitar inflar artificialmente el tiempo transcurrido por latencia posterior.
        const endGenTime = lastChunkTime ?? tf;
        const duracionGeneracionSec = (endGenTime - (firstTokenTime ?? t0)) / 1000;
        const duracionEfectivaSec = duracionGeneracionSec > 0 ? duracionGeneracionSec : totalDurationMs / 1000;

        // Conteo de tokens: únicamente completion_tokens como tokens exactos, o char_count/4 como estimado
        const isExactTokens = typeof realUsageTokens === "number";
        const tokensFinales = isExactTokens
          ? (realUsageTokens as number)
          : Math.ceil(localCharCount / 4);

        const tpsFinal = duracionEfectivaSec > 0 ? tokensFinales / duracionEfectivaSec : 0;

        setResultados((prev) => ({
          ...prev,
          [perfil]: {
            ...prev[perfil],
            estado: "exito",
            contenido: localContenido,
            ttftMs: ttftMsFinal,
            durationMs: totalDurationMs,
            realTokens: isExactTokens ? realUsageTokens : null,
            charCount: localCharCount,
            tps: tpsFinal,
            isExactTokens,
            origenModel,
          },
        }));

        // Registrar evento de telemetría de sesión activa
        await logTelemetryEvent({
          moduleId: "khora-web",
          action: "LLM_KPI",
          severity: "INFO",
          payload: {
            perfil,
            modelo: origenModel,
            ttft_ms: ttftMsFinal,
            total_duration_ms: totalDurationMs,
            tps: tpsFinal,
            is_exact_tokens: isExactTokens,
            total_tokens: tokensFinales,
          },
        });
      } catch (err: any) {
        setResultados((prev) => ({
          ...prev,
          [perfil]: {
            ...prev[perfil],
            estado: "error",
            errorMsg: err.message || "Error al conectar con el servidor",
          },
        }));
      }
    });

    await Promise.all(promesas);

    // Verificar si todos los perfiles seleccionados fallaron por falta de configuración
    setResultados((actual) => {
      const todosFallaron = perfiles.every(
        (p) => actual[p]?.estado === "error"
      );
      if (todosFallaron) {
        setSinPerfilesConfigurados(true);
      }
      return actual;
    });

    setGenerandoGlobal(false);
  };

  const state: KpiPanelViewState = {
    promptInput,
    selectedProfiles,
    resultados,
    generandoGlobal,
    sinPerfilesConfigurados,
  };

  return (
    <KpiPanelView
      state={state}
      actions={{
        onPromptInputChange: setPromptInput,
        onProfileToggle: handleProfileToggle,
        onEjecutarFanOut: ejecutarFanOut,
      }}
    />
  );
}
