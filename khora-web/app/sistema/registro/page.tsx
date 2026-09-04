// @l0 L0-002-R · @req SISTEMA-MENU/E5
"use client";

import { useEffect, useState } from "react";
import { RegistroView, EventoSistema, RegistroViewState } from "../../components/shared/RegistroView";

export default function VisorRegistroPage() {
  const [eventos, setEventos] = useState<EventoSistema[]>([]);
  const [ndjsonRaw, setNdjsonRaw] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [faseFiltro, setFaseFiltro] = useState<string>("todas");
  const [agruparPorCorrelacion, setAgruparPorCorrelacion] = useState<boolean>(false);
  const [mensajeCopiar, setMensajeCopiar] = useState<string>("");
  const [expandedDetails, setExpandedDetails] = useState<Record<number, boolean>>({});

  async function cargarEventos() {
    setLoading(true);
    setError(null);
    try {
      const url = faseFiltro !== "todas"
        ? `/api/eventos?fase=${faseFiltro}&format=ndjson`
        : `/api/eventos?format=ndjson`;

      const res = await fetch(url, { cache: "no-store" });
      const text = await res.text();

      if (res.ok) {
        setNdjsonRaw(text.trim());
        const parsed: EventoSistema[] = text
          .trim()
          .split("\n")
          .filter((line) => line.trim().length > 0)
          .map((line) => JSON.parse(line));
        setEventos(parsed);
      } else {
        setNdjsonRaw(`Error ${res.status}: ${text}`);
        setError(`HTTP ${res.status}`);
        setEventos([]);
      }
    } catch (e: any) {
      setError(String(e));
      setNdjsonRaw("Error cargando registro: " + String(e));
      setEventos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarEventos();
  }, [faseFiltro]);

  async function copiarNdjson() {
    try {
      await navigator.clipboard.writeText(ndjsonRaw);
      setMensajeCopiar("NDJSON copiado al portapapeles");
      setTimeout(() => setMensajeCopiar(""), 3000);
    } catch {
      setMensajeCopiar("Error al copiar");
    }
  }

  const toggleDetail = (id: number) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const state: RegistroViewState = {
    eventos,
    ndjsonRaw,
    loading,
    error,
    faseFiltro,
    agruparPorCorrelacion,
    mensajeCopiar,
    expandedDetails,
  };

  return (
    <RegistroView
      state={state}
      actions={{
        onFaseFiltroChange: setFaseFiltro,
        onAgruparChange: setAgruparPorCorrelacion,
        onCopiarNdjson: copiarNdjson,
        onReload: cargarEventos,
        onToggleDetail: toggleDetail,
      }}
    />
  );
}
