// @l0 L0-002 · @req AUTOOBS/UI · Shared by production and synthetic review. Stable legacy IDs retained.
"use client";
import { useEffect, useState } from "react";
import { Activity, RefreshCw, Clipboard, ChevronDown, ShieldCheck } from "lucide-react";
import type { IntegrityReport } from "@/lib/auto-observacion/integrity";
export type EventoSistema = {
  storageId?: string; id: number; fase: string; event_id: string; estado: "START" | "OK" | "FAIL" | "INFO" | "SKIP";
  mensaje: string; detalle: Record<string, unknown> | null; volcado_id: string | null; version: number | null;
  sha256: string | null; correlacion_id: string | null; servidor_en: string; cliente_en: string | null;
  hash_anterior: string | null; event_hash: string | null; source?: string; duration_ms?: number | null;
  outcome_discrepancy?: boolean; component?: string | null; reason_code?: string | null;
};
export type RegistroViewState = {
  eventos: EventoSistema[]; ndjsonRaw: string; loading: boolean; reintentando?: boolean; error: string | null;
  reasonCode?: string | null; correlationId?: string | null; faseFiltro: string; agruparPorCorrelacion: boolean;
  mensajeCopiar: string; expandedDetails: Record<number, boolean>; outbox?: { pending: number; failed: number; truncated: boolean } | null; observedAt?: string | null; hasMore?: boolean;
  integrityFor?: string | null; integrity?: IntegrityReport | null; checkingIntegrity?: boolean; initialView?: string;
};
export type RegistroViewActions = {
  onFaseFiltroChange?: (fase: string) => void; onAgruparChange?: (value: boolean) => void; onCopiarNdjson?: () => void;
  onReload?: () => void; onToggleDetail?: (id: number) => void; onMore?: () => void; onIntegrity?: (correlation: string) => void;
};
const tabs = ["Resumen", "Operaciones", "Eventos", "Integridad"] as const;
const statusNames: Record<string, string> = { OK: "Completado", FAIL: "Fallo", START: "Pendiente", INFO: "Información / parcial", SKIP: "Omitido" };
const tone: Record<string, string> = { OK: "var(--khora-accent)", FAIL: "#d45249", START: "#b27320", INFO: "var(--khora-ink)", SKIP: "var(--khora-ink)" };
const panel = { borderColor: "var(--khora-border)", background: "var(--khora-surface)" };
const control = "min-h-11 px-3 py-2 border rounded-lg text-sm focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50";
export function RegistroView({ state, actions = {}, isReviewMode = false }: { state: RegistroViewState; actions?: RegistroViewActions; isReviewMode?: boolean }) {
  const [tab, setTab] = useState<string>(tabs.find(t => t.toLocaleLowerCase("es") === state.initialView) || "Resumen");
  useEffect(() => { if (state.initialView) setTab(tabs.find(t => t.toLocaleLowerCase("es") === state.initialView) || "Resumen"); }, [state.initialView]);
  const [onlyFailures, setOnlyFailures] = useState(false);
  const [correlation, setCorrelation] = useState("");
  const [localExpanded, setLocalExpanded] = useState<Record<string, boolean>>({});
  const integrity = state.integrityFor === correlation ? state.integrity : null;
  const events = state.eventos.filter(e => (!onlyFailures || e.estado === "FAIL") && (!correlation || e.correlacion_id === correlation));
  const groups = new Map<string, EventoSistema[]>();
  for (const e of events) { const key = e.correlacion_id || `Sin correlación · ${e.id}`; groups.set(key, [...(groups.get(key) || []), e]); }
  const failures = state.eventos.filter(e => e.estado === "FAIL").length;
  const age = state.observedAt ? Date.now() - new Date(state.observedAt).getTime() : null;
  const freshness = state.loading ? "Consultando…" : state.error ? "Consulta no disponible" : !state.eventos.length ? "Sin evidencia" : age === null ? "Frescura no comprobada" : age > 60000 ? "Muestra desactualizada" : "Consulta reciente · no acredita salud global";
  return <main data-ui-id="registro.container" className="w-full min-w-0 p-4 md:p-8" style={{ color: "var(--khora-ink)", background: "var(--khora-bg)" }}>
    <div className="mx-auto max-w-6xl space-y-6 min-w-0">
      <header data-ui-id="registro.header" className="flex flex-wrap items-start justify-between gap-4 border-b pb-6" style={{ borderColor: "var(--khora-border)" }}>
        <div className="space-y-2 min-w-0"><p className="text-xs uppercase tracking-widest opacity-70">Sistema / Diagnóstico</p>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3"><Activity aria-hidden size={28} />Auto-observación</h1>
          <p className="text-sm opacity-75 max-w-xl">Entender qué ocurrió. Reconstruir una operación. Encontrar dónde falló.</p>
        </div>
        <div className="flex flex-wrap gap-2"><button data-ui-id="registro.btn-copiar" className={control} style={panel} disabled={!actions.onCopiarNdjson || !events.length || !!state.error || state.loading} onClick={actions.onCopiarNdjson}><Clipboard className="inline mr-2" size={15} aria-hidden />Copiar diagnóstico seguro</button>
          <button className={control} style={panel} disabled={!actions.onReload || state.loading} onClick={actions.onReload}><RefreshCw size={15} className="inline mr-2" aria-hidden />Actualizar</button></div>
      </header>
      <div className="flex flex-wrap justify-between gap-2 text-xs" role="status" aria-live="polite"><span>{isReviewMode ? "Escenario sintético · sin datos reales" : freshness}</span><span>Privacidad por defecto · sin textos ni credenciales</span></div>
      {state.mensajeCopiar && <p role="status" className="text-sm">{state.mensajeCopiar}</p>}
      <nav aria-label="Vistas de Auto-observación" className="flex flex-wrap gap-1 border-b pb-2" style={{ borderColor: "var(--khora-border)" }}>{tabs.map(t => <button key={t} type="button" aria-current={tab === t ? "page" : undefined} className={`${control} ${tab === t ? "font-semibold" : "opacity-70"}`} style={{ borderColor: tab === t ? "var(--khora-accent)" : "transparent" }} onClick={() => setTab(t)}>{t}</button>)}</nav>
      <div data-ui-id="registro.filter-bar" className="flex flex-wrap items-end gap-4 p-4 rounded-xl border" style={panel}>
        <label className="text-xs space-y-1"><span className="block">Fase del sistema</span><select id="fase-filtro-select" className={control} style={panel} value={state.faseFiltro} onChange={e => actions.onFaseFiltroChange?.(e.target.value)} disabled={!actions.onFaseFiltroChange}><option value="todas">Todas las fases</option>{["dictado", "transcripcion", "revision", "manejo", "autorizacion", "ingesta", "grafo", "captura"].map(f => <option key={f} value={f}>{f}</option>)}</select></label>
        <label className="text-xs space-y-1 min-w-0"><span className="block">Correlación exacta en esta muestra</span><input className={`${control} w-full max-w-72`} style={panel} value={correlation} maxLength={128} onChange={e => setCorrelation(e.target.value)} placeholder="Identificador de operación" /></label>
        <label className="text-sm min-h-11 flex gap-2 items-center"><input type="checkbox" checked={onlyFailures} onChange={e => setOnlyFailures(e.target.checked)} />Solo fallos</label>
        <label className="text-sm min-h-11 flex gap-2 items-center"><input type="checkbox" checked={state.agruparPorCorrelacion} disabled={!actions.onAgruparChange} onChange={e => actions.onAgruparChange?.(e.target.checked)} />Agrupar eventos</label>
      </div>
      {state.loading ? <div data-ui-id="registro.loading-state" className="p-8 border rounded-xl" style={panel} role="status">Consultando evidencia persistida…</div> : state.error ? <section data-ui-id="registro.error-state" className="p-6 border rounded-xl space-y-3" style={panel} role="alert"><h2 className="font-semibold">Auto-observación no disponible</h2><p className="text-sm">No se pudo comprobar el almacén. Esto no significa que el sistema esté sano ni que se hayan perdido los datos.</p><p className="text-xs font-mono">{state.reasonCode || "OBSERVATION_UNAVAILABLE"}</p><button data-ui-id="registro.btn-reintentar" className={control} style={panel} disabled={state.reintentando || !actions.onReload} onClick={actions.onReload}>Reintentar</button></section> : <>
        {tab === "Resumen" && <aside className="p-4 border rounded-xl text-sm space-y-1" style={panel}><strong>Recuperación del registro</strong><p>{state.outbox ? `${state.outbox.pending} pendientes · ${state.outbox.failed} agotadas o fallidas${state.outbox.truncated ? " · muestra truncada" : ""}` : "Cola de recuperación no comprobada"}</p><p className="text-xs opacity-70">La cola comparte base de datos: una caída total puede impedir registrar y recuperar. No es una garantía de durabilidad independiente.</p></aside>}
        {tab === "Resumen" && <section aria-label="Resumen de la muestra" className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[["Eventos", state.eventos.length], ["Fallos observados", failures], ["Inicios registrados", state.eventos.filter(e => e.estado === "START").length], ["Correlaciones", new Set(state.eventos.map(e => e.correlacion_id).filter(Boolean)).size]].map(([label, value]) => <div key={label} className="p-5 border rounded-xl" style={panel}><p className="text-xs opacity-70">{label}</p><p className="text-3xl font-semibold mt-2">{value}</p><p className="text-xs opacity-60 mt-2">En la muestra cargada</p></div>)}</section>}
        {tab === "Integridad" ? <section className="p-6 border rounded-xl space-y-4" style={panel}><h2 className="font-semibold text-lg flex gap-2 items-center"><ShieldCheck size={20} aria-hidden />Comprobar, no suponer</h2><p className="text-sm max-w-2xl">Selecciona una correlación para comprobar hasta 500 eventos de esa cadena. Los eventos históricos solo permiten comprobar enlaces; los nuevos incluyen una huella canónica de contenido.</p><label className="block text-sm">Cadena a comprobar<select className={`${control} block mt-2 w-full max-w-xl`} style={panel} value={correlation} onChange={e => setCorrelation(e.target.value)}><option value="">Seleccionar correlación</option>{[...new Set(state.eventos.map(e => e.correlacion_id).filter((v): v is string => !!v))].map(c => <option key={c} value={c}>{c}</option>)}</select></label><button className={control} style={panel} disabled={!correlation || state.checkingIntegrity || !actions.onIntegrity} onClick={() => actions.onIntegrity?.(correlation)}>{state.checkingIntegrity ? "Comprobando…" : "Verificar cadena"}</button>
          <div role="status" aria-live="polite" className="text-sm border-t pt-4 space-y-2" style={{ borderColor: "var(--khora-border)" }}><strong>{integrity ? ({ BROKEN: "Alteración o discontinuidad detectada", NO_EVIDENCE: "Sin evidencia", PARTIAL: "Comprobación parcial", VERIFIED_SCOPE: "Contenido y enlaces coinciden en el alcance comprobado" }[integrity.verdict]) : "Todavía no comprobada"}</strong>{integrity && <p>{integrity.checked} eventos · {integrity.verifiedPayloads} contenidos V2 · {integrity.legacy} históricos · {integrity.broken} discrepancias. {integrity.truncated ? "Cadena truncada por límite." : ""}</p>}<p className="opacity-70">Sin anclaje externo: no detecta una reescritura administrativa completa. No prueba autenticidad del emisor ni cobertura total.</p></div></section> : <>
          {tab === "Operaciones" && <p className="text-sm opacity-75">Agrupación de la muestra; un inicio sin cierre no demuestra una operación todavía activa. Un cierre no certifica toda la operación.</p>}
          {events.length === 0 ? <div data-ui-id="registro.empty-state" className="p-8 border rounded-xl text-sm" style={panel}>No hay eventos para estos filtros. Ausencia de eventos no significa ausencia de fallos.</div> : <div data-ui-id="registro.events-list" className="space-y-3">{(tab === "Operaciones" || state.agruparPorCorrelacion ? [...groups] : [["", events]] as [string, EventoSistema[]][]).map(([id, rows]) => <section key={id} className="space-y-2 min-w-0">{id && <h2 className="text-xs font-mono break-all pt-3">{id} · {rows.length} eventos · {rows.some(e => e.estado === "FAIL") ? "Fallo observado" : "Resultado no concluyente"}</h2>}{rows.map(e => { const detailKey = e.storageId || String(e.id); const expanded = state.expandedDetails[e.id] || localExpanded[detailKey]; return <article key={detailKey} data-ui-id="registro.event-item" className="rounded-xl border overflow-hidden min-w-0" style={panel}>
            <button className="w-full p-4 text-left flex gap-3 justify-between items-start focus-visible:outline-2 focus-visible:outline-offset-[-3px]" aria-expanded={!!expanded} onClick={() => { setLocalExpanded(x => ({ ...x, [detailKey]: !expanded })); actions.onToggleDetail?.(e.id); }}><div className="min-w-0 space-y-2"><div className="flex flex-wrap gap-3 text-xs items-center"><span className="font-semibold inline-flex items-center gap-2" style={{ color: "var(--khora-ink)" }}><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: tone[e.estado] }} />{statusNames[e.estado]}</span><span className="opacity-70">{e.fase}</span><code>{e.event_id}</code><span className="opacity-60">{e.servidor_en ? new Date(e.servidor_en).toLocaleString("es-MX") : "Hora desconocida"}</span></div><p className="text-sm">{e.estado === "FAIL" ? "La operación registró un fallo" : e.estado === "START" ? "Inicio de operación registrado" : "Evento persistido"}{e.component ? ` · ${e.component}` : ""}</p>{e.outcome_discrepancy && <p className="text-xs">Resultado histórico inconsistente: revisar estado y cobertura.</p>}</div><ChevronDown size={16} aria-hidden className="shrink-0" /></button>
            {expanded && <dl className="border-t p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs" style={{ borderColor: "var(--khora-border)" }}>{[["Correlación", e.correlacion_id || "No registrada"], ["Persistencia", "Leído del almacén del servidor"], ["Emisor", e.source === "browser_reported" ? "Declarado por navegador; no autenticidad acreditada" : "Origen histórico no atestiguado"], ["Duración", e.duration_ms == null ? "No registrada" : `${e.duration_ms} ms`], ["Código de causa", e.reason_code || "No registrado"], ["Integridad", "Usar la pestaña Integridad; persistir no significa verificar"]].map(([k, v]) => <div key={k} className="min-w-0"><dt className="opacity-60 mb-1">{k}</dt><dd className="break-all">{v}</dd></div>)}</dl>}
          </article>; })}</section>)}</div>}
          {state.hasMore && <button className={control} style={panel} disabled={!actions.onMore} onClick={actions.onMore}>Ver eventos anteriores</button>}
        </>}
        <p className="text-xs opacity-65 leading-relaxed">Lectura acotada de evidencia, no un semáforo global. Actualizar vuelve a consultar lo reciente. El diagnóstico exportado excluye mensajes, detalles libres y credenciales. No certifica que la instrumentación esté completa.</p>
      </>}
    </div>
  </main>;
}
