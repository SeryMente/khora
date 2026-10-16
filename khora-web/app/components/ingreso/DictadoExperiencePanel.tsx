"use client";
import { useEffect, useRef, useState } from "react";
import { POLICY, sampleSession, normalizedPrefix, preservesPrefix, type Usage, type ExperienceRecord, type SamplingState, summarize } from "../../../lib/contracts/dictado-experience";
import benchmark from "../../../lib/generated/dictado-benchmark.json";

const button = "px-3 py-2 border text-sm focus-visible:outline focus-visible:outline-2 disabled:opacity-40";
const initialUsage = (): Usage => ({ duration_ms: 0, first_result_ms: null, resume_ready_ms: null, result_to_paint_ms: [], final_results: 0, reconnects: 0, protected_checks: 0, protected_changes: 0, visual_jumps: null, fidelity_error_rate: null, ended: false });
type Settings = { enabled: boolean; sampling: SamplingState };
type Report = { records: ExperienceRecord[]; summary: ReturnType<typeof summarize>; profileKey: string; truncated: boolean; retentionDays: number };
export function DictadoExperiencePanel({ busy, texto }: { busy: boolean; texto: string }) {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [settings, setSettings] = useState<Settings>({ enabled: false, sampling: { day: "", count: 0, last: 0 } });
  const [status, setStatus] = useState("");
  const [form, setForm] = useState<"sampled" | "voluntary" | null>(null);
  const [rating, setRating] = useState<"pleasant" | "neutral" | "aversive" | "">("");
  const [reason, setReason] = useState<"rhythm" | "jumps" | "conservation" | "recognition" | "other" | "">("");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [survey, setSurvey] = useState<string | null>(null);
  const refs = useRef({ busy, texto, settings, profile: "", release: null as string | null });
  refs.current.busy = busy; refs.current.texto = texto; refs.current.settings = settings;
  const meter = useRef({ session: "", start: 0, resume: 0, prefix: "", usage: initialUsage() });
  const pending = useRef<ExperienceRecord[]>([]);
  const feedbackId = useRef<string | null>(null);
  const formSession = useRef<string>("");
  const storageKey = (profile: string) => "khora:experience:v1:" + profile;
  const load = async () => {
    try {
      const r = await fetch("/api/dictado-experience", { cache: "no-store" });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Lectura no disponible.");
      if (refs.current.profile !== d.profileKey) {
        refs.current.profile = d.profileKey; pending.current = []; setComment(""); setForm(null);
        try { const s = JSON.parse(localStorage.getItem(storageKey(d.profileKey)) || "null"); if (s && typeof s.enabled === "boolean" && s.sampling) { setSettings(s); refs.current.settings = s; } } catch {}
      }
      setReport(d); return true;
    } catch (e) { setStatus(e instanceof Error ? e.message : "No se pudieron leer las mediciones."); return false; }
  };
  const remember = (next: Settings) => {
    setSettings(next); refs.current.settings = next;
    try { if (refs.current.profile) localStorage.setItem(storageKey(refs.current.profile), JSON.stringify(next)); }
    catch { setStatus("No se pudo conservar la preferencia. Las encuestas automáticas quedan desactivadas."); next.enabled = false; }
  };
  const record = (sessionId: string, data: ExperienceRecord["data"]): ExperienceRecord => ({ id: crypto.randomUUID(), sessionId, functionId: "dictado", clientRelease: refs.current.release, policyVersion: POLICY.version, data });
  const send = async (item: ExperienceRecord) => {
    const r = await fetch("/api/dictado-experience", { method: "POST", headers: { "Content-Type": "application/json", "X-Khora-Experience-Profile": refs.current.profile }, body: JSON.stringify(item) });
    const d = await r.json(); if (!r.ok || !d.ok || d.id !== item.id) throw new Error(d.error || "No se pudo confirmar el envío.");
  };
  const flush = async () => {
    if (refs.current.busy || !refs.current.profile) return;
    while (pending.current.length) {
      const item = pending.current[0];
      try { await send(item); pending.current = pending.current.filter(x => x.id !== item.id); }
      catch { setStatus("Hay mediciones pendientes; no se han dado por guardadas. Puedes reintentar aquí."); return; }
    }
  };
  useEffect(() => {
    void load();
    void fetch("/ep-main-live.json", { cache: "no-store" }).then(r => r.json()).then(d => {
      if (/^[a-f0-9]{40}$/.test(d.commitSha || "")) refs.current.release = d.commitSha;
    }).catch(() => {});
    // Metadata-only event bus. The transcript never enters a network/telemetry payload.
    const listener = (event: Event) => {
      if (!refs.current.settings.enabled || !refs.current.profile) return;
      const { sessionId, eventName, options } = (event as CustomEvent).detail;
      if (!/^[a-f0-9-]{36}$/i.test(sessionId)) return;
      const now = performance.now();
      if (eventName === "DICTADO_INICIO_SOLICITADO" || meter.current.session !== sessionId) meter.current = { session: sessionId, start: now, resume: 0, prefix: "", usage: initialUsage() };
      const m = meter.current;
      if (eventName === "EDICION_IN_SITU_CIERRE_INICIADO") m.resume = now;
      if (eventName === "RECONOCEDOR_INICIADO" && m.resume) { m.usage.resume_ready_ms = Math.max(0, now - m.resume); m.resume = 0; }
      if (eventName === "EDICION_IN_SITU_CONFIRMADA" || eventName === "EDICION_IN_SITU_CANCELADA") m.prefix = normalizedPrefix(refs.current.texto);
      if (eventName === "RECONOCEDOR_REARME_SOLICITADO") m.usage.reconnects++;
      if (eventName === "RESULTADO_FINAL_RECIBIDO" || eventName === "RESULTADO_PARCIAL_RECIBIDO") {
        if (m.usage.first_result_ms === null) m.usage.first_result_ms = Math.max(0, now - m.start);
        if (eventName === "RESULTADO_FINAL_RECIBIDO") m.usage.final_results++;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (meter.current !== m || m.usage.ended || document.visibilityState !== "visible") return;
          if (m.usage.result_to_paint_ms.length < 100) m.usage.result_to_paint_ms.push(Math.max(0, performance.now() - now));
          if (m.prefix) { m.usage.protected_checks++; if (!preservesPrefix(m.prefix, refs.current.texto)) m.usage.protected_changes++; }
        }));
      }
      if (eventName === "DICTADO_DETENIDO" && !m.usage.ended) {
        m.usage.duration_ms = Math.max(0, now - m.start); m.usage.ended = true;
        pending.current.push(record(sessionId, { kind: "session", metrics: { ...m.usage, result_to_paint_ms: [...m.usage.result_to_paint_ms] } }));
        const time = Date.now(); const day = new Date(time).toLocaleDateString("en-CA");
        const random = crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
        const choice = sampleSession(m.usage.duration_ms, refs.current.settings.sampling, time, day, random);
        pending.current.push(record(sessionId, { kind: "invitation", ...choice }));
        if (choice.outcome === "selected") setSurvey(sessionId);
      }
      void options; // Reserved metadata; no user content accepted.
    };
    window.addEventListener("khora:dictado:observation", listener);
    return () => window.removeEventListener("khora:dictado:observation", listener);
    // Deliberately mount once: transcript and settings are read from refs, not retained in payloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (busy) return;
    void flush();
    if (survey && settings.enabled && !form) {
      const time = Date.now(); const day = new Date(time).toLocaleDateString("en-CA");
      const s = settings.sampling;
      remember({ ...settings, sampling: { day, count: (s.day === day ? s.count : 0) + 1, last: time } });
      formSession.current = survey; feedbackId.current = null; setRating(""); setReason(""); setComment(""); setForm("sampled"); setSurvey(null);
      pending.current.push(record(survey, { kind: "invitation", outcome: "shown", probability: POLICY.probability }));
      void flush();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, survey]);
  const begin = () => {
    formSession.current = meter.current.session || crypto.randomUUID(); feedbackId.current = null;
    setRating(""); setReason(""); setComment(""); setStatus(""); setForm("voluntary");
  };
  const submit = async () => {
    if (!form || busy || sending) return;
    setSending(true); setStatus("");
    const item = record(formSession.current, { kind: "feedback", source: form, rating: rating || null, reason: reason || null, comment: comment.trim() });
    item.id = feedbackId.current || (feedbackId.current = item.id);
    try { await send(item); setForm(null); setComment(""); feedbackId.current = null; setStatus("Opinión guardada."); await load(); }
    catch (e) { setStatus(e instanceof Error ? e.message : "No se guardó la opinión. Reintenta sin cerrar esta pantalla."); }
    finally { setSending(false); }
  };
  const invalidateId = () => { feedbackId.current = null; };
  const exportData = () => {
    if (!report) return; const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "khora-mis-mediciones-y-opiniones.json"; a.click(); URL.revokeObjectURL(url);
  };
  const remove = async () => {
    if (busy || sending) return; setSending(true);
    try { const r = await fetch("/api/dictado-experience", { method: "DELETE", headers: { "X-Khora-Experience-Profile": refs.current.profile } }); if (!r.ok) throw new Error(); pending.current = []; remember({ enabled: false, sampling: { day: "", count: 0, last: 0 } }); setForm(null); setComment(""); setSurvey(null); setConfirmDelete(false); await load(); setStatus("Tus mediciones y opiniones se borraron; la recopilación queda desactivada."); }
    catch { setStatus("No se pudo confirmar el borrado."); } finally { setSending(false); }
  };
  const summary = report?.summary;
  return <section aria-label="Calidad del dictado" className="max-w-4xl mx-auto px-6 pb-6 space-y-3" style={{ color: "var(--khora-ink)" }}>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={button} onClick={() => { setOpen(!open); if (!open) void load(); }}>Calidad del dictado</button>
      <button type="button" className={button} disabled={busy || !report || sending} onClick={begin}>Dar opinión</button>
    </div>
    {form && !busy && <form className="border p-4 space-y-3" onSubmit={e => { e.preventDefault(); void submit(); }}>
      <p>En la sesión que estás valorando, ¿cómo se sintió ver aparecer la transcripción?</p>
      <fieldset disabled={sending} className="flex flex-wrap gap-3"><legend className="sr-only">Experiencia de esta sesión</legend>
        {([["pleasant", "Agradable / estimulante"], ["neutral", "Neutra"], ["aversive", "Molesta / distractora"]] as const).map(([v, label]) => <label key={v}><input type="radio" name="dictado-experience" value={v} checked={rating === v} onChange={() => { setRating(v); invalidateId(); }} /> {label}</label>)}
      </fieldset>
      <label className="block">¿Qué influyó más? (opcional) <select value={reason} disabled={sending} onChange={e => { setReason(e.target.value as typeof reason); invalidateId(); }}>
        <option value="">Sin especificar</option><option value="rhythm">Ritmo</option><option value="jumps">Saltos o cambios visuales</option><option value="conservation">Conservación del texto</option><option value="recognition">Reconocimiento</option><option value="other">Otro</option>
      </select></label>
      <label className="block">Comentario adicional (opcional, hasta 1000 caracteres)
        <textarea aria-label="Comentario adicional" className="block w-full border p-2 min-h-24" maxLength={1000} value={comment} disabled={sending} onChange={e => { setComment(e.target.value); invalidateId(); }} />
      </label>
      <p className="text-xs">Puedes enviar solo el comentario. Se guarda cifrado y de forma privada, separado de los eventos técnicos. No incluyas contraseñas ni información que no quieras guardar. El borrador permanece solo en esta pantalla hasta enviarlo.</p>
      <div className="flex gap-2"><button type="submit" className={button} disabled={sending || (!rating && !comment.trim())}>{sending ? "Guardando…" : "Enviar opinión"}</button>
        <button type="button" className={button} disabled={sending} onClick={() => { if (form === "sampled") pending.current.push(record(formSession.current, { kind: "invitation", outcome: "dismissed", probability: POLICY.probability })); setForm(null); setComment(""); void flush(); }}>Omitir</button></div>
    </form>}
    {open && <div className="border p-4 space-y-3">
      <h2 className="font-semibold">Benchmark reproducible más reciente</h2>
      <p className="text-sm">{benchmark.status === "not_run" ? "Sin ejecución acreditada para esta actualización." : `Ejecutado: ${benchmark.testedAt}. Versión probada: ${benchmark.sourceSha}.`}</p>
      <ul className="text-sm">{benchmark.checks.map((c: { name: string; status: string }) => <li key={c.name}>{c.name}: {c.status}</li>)}</ul>
      <p className="text-xs">La versión probada se muestra por separado de la publicada. Un benchmark controlado no acredita voz real, comodidad ni almacenamiento productivo.</p>
      <h2 className="font-semibold">Uso real y opinión: tus datos</h2>
      {!report ? <p>Datos no disponibles; no equivale a cero fallos.</p> : <>
        <label className="block"><input type="checkbox" checked={settings.enabled} disabled={busy || sending} onChange={e => { remember({ ...settings, enabled: e.target.checked }); if (!e.target.checked) { meter.current.usage.ended = true; setSurvey(null); } }} /> Activar mediciones y encuestas breves del dictado</label>
        <p className="text-xs">Opcional. No se recopila texto dictado ni audio en estas mediciones. Invitación aleatoria tras algunas sesiones de un minuto o más; máximo dos al día, separadas por dos horas. Nunca durante la captura o edición. Datos consultables durante 90 días; eliminación al acceder después del plazo. Las opiniones voluntarias se analizan aparte.</p>
        <dl className="text-sm space-y-1">
          <div><dt className="inline font-semibold">Conservación: </dt><dd className="inline">{summary?.protectedChecks ? `${summary.protectedChanges} alteraciones detectadas / ${summary.protectedChecks} comprobaciones del prefijo confirmado` : "Sin comprobaciones suficientes"}. Cobertura parcial, no garantía de cero pérdidas.</dd></div>
          <div><dt className="inline font-semibold">Fidelidad: </dt><dd className="inline">No medida automáticamente sin referencia de lo dicho. Editar no equivale a corregir al reconocedor.</dd></div>
          <div><dt className="inline font-semibold">Respuesta: </dt><dd className="inline">{summary?.paintSamples ? `recepción a oportunidad de pintado: mediana ${Math.round(summary.paintP50!)} ms, percentil 95 ${Math.round(summary.paintP95!)} ms (${summary.paintSamples} muestras)` : "Sin muestras de recepción a pintado"}. No es tiempo desde que hablaste.</dd></div>
          <div><dt className="inline font-semibold">Estabilidad visual: </dt><dd className="inline">Sin medición automática completa de cursor y desplazamiento; se recoge también mediante tu opinión.</dd></div>
          <div><dt className="inline font-semibold">Experiencia: </dt><dd className="inline">encuesta: {summary?.sampled.pleasant} agradables, {summary?.sampled.neutral} neutras, {summary?.sampled.aversive} molestas; {summary?.shown} invitaciones mostradas. Voluntarias: {summary?.voluntary.total}; no se mezclan con la muestra.</dd></div>
        </dl>
        <p className="text-xs">{summary?.ended} sesiones terminadas registradas. {report.truncated ? "Lectura parcial: se alcanzó el límite de 5000 registros." : "Ventana: últimos 90 días."} Los comentarios no se envían automáticamente a modelos ni se usan para cambiar el producto sin revisión.</p>
        <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={busy || sending} onClick={() => { void flush().then(load); }}>Actualizar / reintentar pendientes</button><button type="button" className={button} disabled={busy} onClick={exportData}>Exportar mis datos</button><button type="button" className={button} disabled={busy || sending} onClick={() => setConfirmDelete(true)}>Borrar mis datos</button></div>
        {confirmDelete && <div><p>¿Borrar tus mediciones y opiniones del dictado? No borra tus capturas ni el registro de auditoría.</p><button type="button" className={button} disabled={busy || sending} onClick={() => void remove()}>Confirmar borrado</button><button type="button" className={button} onClick={() => setConfirmDelete(false)}>Conservar</button></div>}
        <details><summary>Mis comentarios enviados</summary>{report.records.filter(r => r.data.kind === "feedback" && r.data.comment).map(r => <p className="whitespace-pre-wrap text-sm" key={r.id}>{r.data.kind === "feedback" ? r.data.comment : ""}</p>)}</details>
      </>}
    </div>}
    {status && <p role="status" className="text-sm">{status}</p>}
  </section>;
}
