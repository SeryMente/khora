"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DisparadorTituloAutomatico } from "@/lib/client/titulo-automatico";

type OrigenTitulo = "ninguno" | "ia" | "manual" | "persistido";

export function useTituloAutomatico({
  texto,
  titulo,
  onTitulo,
  onGenerado,
  enabled = true,
  initialTitle = "",
}: {
  texto: string;
  titulo: string;
  onTitulo: (value: string) => void;
  onGenerado?: (generated: boolean) => void;
  enabled?: boolean;
  initialTitle?: string;
}) {
  const origenRef = useRef<OrigenTitulo>(
    titulo.trim() && titulo.trim() !== initialTitle ? "persistido" : "ninguno",
  );
  const setterRef = useRef(onTitulo);
  setterRef.current = onTitulo;
  const generatedRef = useRef(onGenerado);
  generatedRef.current = onGenerado;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const [generando, setGenerando] = useState(false);
  const schedulerRef = useRef<DisparadorTituloAutomatico | null>(null);

  if (!schedulerRef.current) {
    schedulerRef.current = new DisparadorTituloAutomatico({
      requestTitle: async (confirmedText, signal) => {
        const response = await fetch("/api/dictado-archivo/titulo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texto: confirmedText }),
          signal,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.detail || "No se pudo generar el título.");
        return {
          title: typeof data.title === "string" ? data.title : "",
          nivel: typeof data.nivel === "string" ? data.nivel : "",
        };
      },
      canApply: () => enabledRef.current && (origenRef.current === "ninguno" || origenRef.current === "ia"),
      onTitle: (value) => {
        origenRef.current = "ia";
        setterRef.current(value);
        generatedRef.current?.(true);
      },
      onBusy: setGenerando,
    });
  }

  useEffect(() => {
    schedulerRef.current?.observe(
      texto,
      enabled && (origenRef.current === "ninguno" || origenRef.current === "ia"),
    );
  }, [texto, enabled]);

  useEffect(() => () => schedulerRef.current?.destroy(), []);

  const setManualTitle = useCallback((value: string) => {
    origenRef.current = "manual";
    schedulerRef.current?.cancel();
    generatedRef.current?.(false);
    setterRef.current(value);
  }, []);

  const setRestoredTitle = useCallback((value: string) => {
    origenRef.current = value.trim() ? "persistido" : "ninguno";
    schedulerRef.current?.reset();
    generatedRef.current?.(false);
    setterRef.current(value);
  }, []);

  const setGeneratedTitle = useCallback((value: string) => {
    origenRef.current = "ia";
    schedulerRef.current?.cancel();
    setterRef.current(value);
    generatedRef.current?.(true);
  }, []);

  const resetTitle = useCallback(() => {
    origenRef.current = "ninguno";
    schedulerRef.current?.reset();
    generatedRef.current?.(false);
    setterRef.current("");
  }, []);

  return { generando, setManualTitle, setRestoredTitle, setGeneratedTitle, resetTitle };
}
