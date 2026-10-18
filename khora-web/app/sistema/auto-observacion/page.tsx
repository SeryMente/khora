"use client";
import { useEffect, useRef, useState } from "react";
import { RegistroView, type EventoSistema, type RegistroViewState } from "../../components/shared/RegistroView";
import type { SafeEvent } from "@/lib/auto-observacion/model";
import type { IntegrityReport } from "@/lib/auto-observacion/integrity";
function viewEvent(event: SafeEvent): EventoSistema {
  return { ...event, storageId: event.id, id: Number(event.id), estado: event.estado as EventoSistema["estado"], servidor_en: event.servidor_en || "",
    mensaje: "", detalle: null, volcado_id: null, version: null, sha256: null, cliente_en: null, hash_anterior: null, event_hash: null };
}
export default function AutoObservacionPage() {
  const [state, setState] = useState<RegistroViewState>({ eventos: [], ndjsonRaw: "", loading: true, error: null, faseFiltro: "todas", agruparPorCorrelacion: false, mensajeCopiar: "", expandedDetails: {} });
  const [cursor, setCursor] = useState<string | null>(null);
  const request = useRef(0);
  const active = useRef<AbortController | null>(null);
  const integrityRequest = useRef(0);
  const integrityAbort = useRef<AbortController | null>(null);
  async function load(phase: string, before?: string) {
    active.current?.abort(); const controller = new AbortController(); active.current = controller;
    const sequence = ++request.current;
    setState(s => ({ ...s, loading: true, error: null, integrity: null, checkingIntegrity: false }));
    integrityAbort.current?.abort(); integrityRequest.current++;
    try {
      const params = new URLSearchParams({ limite: "100" });
      if (phase !== "todas") params.set("fase", phase);
      if (before) params.set("antes", before);
      const response = await fetch(`/api/auto-observacion?${params}`, { signal: controller.signal, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.reason_code || "OBSERVATION_UNAVAILABLE");
      if (sequence !== request.current) return;
      setCursor(data.next_cursor);
      setState(s => ({ ...s, eventos: data.events.map(viewEvent), loading: false, hasMore: data.has_more, outbox: data.outbox, observedAt: data.observed_at, reasonCode: null }));
    } catch (error) { if (controller.signal.aborted || sequence !== request.current) return;
      setState(s => ({ ...s, loading: false, error: "Consulta no disponible", reasonCode: error instanceof Error && /^[A-Z_]{1,64}$/.test(error.message) ? error.message : "OBSERVATION_UNAVAILABLE", eventos: [], hasMore: false })); }
  }
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const phase = params.get("fase") || "todas";
    setState(s => ({ ...s, faseFiltro: phase, initialView: params.get("vista") || undefined }));
    void load(phase);
    // Update freshness without polling the database or generating self-observation recursion.
    const tick = setInterval(() => setState(s => ({ ...s })), 15000);
    return () => { active.current?.abort(); integrityAbort.current?.abort(); clearInterval(tick); };
  }, []);
  async function integrity(correlation: string) {
    integrityAbort.current?.abort(); const controller = new AbortController(); integrityAbort.current = controller;
    const sequence = ++integrityRequest.current;
    setState(s => ({ ...s, integrity: null, checkingIntegrity: true }));
    try {
      const res = await fetch(`/api/auto-observacion?${new URLSearchParams({ correlacion_id: correlation, integridad: "1" })}`, { signal: controller.signal, cache: "no-store" });
      const data = await res.json(); if (!res.ok) throw new Error("INTEGRITY_UNAVAILABLE");
      if (sequence === integrityRequest.current) setState(s => ({ ...s, integrityFor: correlation, integrity: data.integrity as IntegrityReport, checkingIntegrity: false }));
    } catch { if (!controller.signal.aborted && sequence === integrityRequest.current) setState(s => ({ ...s, checkingIntegrity: false, mensajeCopiar: "No se pudo verificar la cadena. No se declara íntegra." })); }
  }
  return <RegistroView state={state} actions={{
    onFaseFiltroChange: phase => { setState(s => ({ ...s, faseFiltro: phase })); void load(phase); },
    onAgruparChange: value => setState(s => ({ ...s, agruparPorCorrelacion: value })),
    onReload: () => { void load(state.faseFiltro); }, onMore: () => { if (cursor) void load(state.faseFiltro, cursor); }, onIntegrity: integrity,
    onCopiarNdjson: async () => {
      // Explicit projection again: do not export the legacy view shape or free-form content.
      const diagnostic = { schema: "khora-diagnostic-1", observed_at: state.observedAt, scope: "Loaded sample only; no user content", events: state.eventos.map(e => ({ id: e.storageId || String(e.id), fase: e.fase, event_id: e.event_id, estado: e.estado, correlacion_id: e.correlacion_id, servidor_en: e.servidor_en, source: e.source, duration_ms: e.duration_ms })) };
      try { await navigator.clipboard.writeText(JSON.stringify(diagnostic, null, 2)); setState(s => ({ ...s, mensajeCopiar: "Diagnóstico seguro copiado." })); }
      catch { setState(s => ({ ...s, mensajeCopiar: "No se pudo copiar. No se exportó ningún dato." })); }
    },
  }} />;
}
