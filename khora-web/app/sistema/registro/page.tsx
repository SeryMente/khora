// @l0 L0-002-R · @req SISTEMA-MENU/E5
"use client";

import { useEffect, useState } from "react";
import { RegistroView, EventoSistema, RegistroViewState } from "../../components/shared/RegistroView";

export default function VisorRegistroPage() {
  const [eventos, setEventos] = useState<EventoSistema[]>([]);
  const [ndjsonRaw, setNdjsonRaw] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [reintentando, setReintentando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reasonCode, setReasonCode] = useState<string | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [faseFiltro, setFaseFiltro] = useState<string>("todas");
  const [agruparPorCorrelacion, setAgruparPorCorrelacion] = useState<boolean>(false);
  const [mensajeCopiar, setMensajeCopiar] = useState<string>("");
  const [expandedDetails, setExpandedDetails] = useState<Record<number, boolean>>({});

  async function cargarEventos(isRetry = false) {
    if (isRetry) {
      setReintentando(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setReasonCode(null);
    setCorrelationId(null);

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
        let jsonPayload: any = null;
        try {
          jsonPayload = JSON.parse(text);
        } catch {
          // Response was plain text
        }

        const reason = jsonPayload?.reason_code || (res.status === 401 || res.status === 403 ? "EVENT_STORE_FORBIDDEN" : "UNKNOWN");
        const corrId = jsonPayload?.correlation_id || null;

        setReasonCode(reason);
        setCorrelationId(corrId);
        setError(`HTTP ${res.status}`);
        setNdjsonRaw(`Error ${res.status}: ${jsonPayload?.error || text}`);
        setEventos([]);
      }
    } catch (e: any) {
      setError(String(e));
      setReasonCode("DB_UNREACHABLE");
      setNdjsonRaw("Error cargando registro: " + String(e));
      setEventos([]);
    } finally {
      setLoading(false);
      setReintentando(false);
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
    reintentando,
    error,
    reasonCode,
    correlationId,
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
        onReload: () => cargarEventos(true),
        onToggleDetail: toggleDetail,
      }}
    />
  );
}
