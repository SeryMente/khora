"use client";
import { useEffect, useMemo, useState } from "react";
type Criterion = { id: string; status: "resolved" | "active" | "pending"; label: string; detail: string; evidence?: string };
type Review = { criteria: Criterion[]; summary: string; moment?: { value: string; category: string; justification: string } | null };
type Metadata = { receivedAt: string; ipv4: string | null; city: string | null; region: string | null; country: string | null };
const BASE: Review = { criteria: [
 { id: "fecha_hora", status: "active", label: "Fecha y hora", detail: "Menciona fecha y hora exactas si no se pueden verificar." },
 { id: "lugar", status: "active", label: "Lugar", detail: "Incluye el lugar del suceso; la IP solo aproxima la conexión." },
 { id: "momento", status: "pending", label: "Momento", detail: "Mañana, madrugada, mediodía, tarde, atardecer, noche u otro término normalizado." },
 { id: "que_pasa", status: "pending", label: "Qué pasa", detail: "Describe lo que sucede, no necesariamente una acción." }
], summary: "Escribe o dicta para analizar el contenido en vivo." };
export function CronicaPersonalChecklist({ text, busy = false }: { text: string; busy?: boolean }) {
 const [review, setReview] = useState<Review>(BASE), [metadata, setMetadata] = useState<Metadata | null>(null), [source, setSource] = useState<"groq" | "fallback" | "idle">("idle"), [expanded, setExpanded] = useState(false);
 const normalized = useMemo(() => text.trim(), [text]);
 useEffect(() => {
  if (!normalized) { setReview(BASE); setSource("idle"); return; }
  const controller = new AbortController();
  const timer = window.setTimeout(async () => {
   try { const r = await fetch("/api/cronica/checklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: normalized.slice(-12000) }), signal: controller.signal }); const data = await r.json(); if (!controller.signal.aborted) { setReview(data.review || BASE); setMetadata(data.metadata || null); setSource(data.source === "groq" ? "groq" : "fallback"); } }
   catch { if (!controller.signal.aborted) setSource("fallback"); }
  }, 900);
  return () => { window.clearTimeout(timer); controller.abort(); };
 }, [normalized]);
 const resolved = review.criteria.filter(c => c.status === "resolved").length;
 return <section aria-label="Checklist de crónica personal" className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white/80 shadow-sm dark:border-stone-700 dark:bg-stone-900/60">
  <div className="flex items-center justify-between gap-3 px-4 py-3"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-stone-500">Crónica personal</p><h2 className="text-sm font-semibold">Dale forma a lo que pasó</h2></div><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs dark:bg-stone-800">{resolved}/{review.criteria.length} resueltos</span></div>
  <div className="h-1 bg-stone-100 dark:bg-stone-800"><div className="h-full bg-emerald-600 transition-[width] duration-500" style={{ width: `${resolved / Math.max(1, review.criteria.length) * 100}%` }} /></div>
  <ol className="space-y-1 p-3">{review.criteria.map(item => <li key={item.id} className={`flex gap-3 rounded-xl px-3 py-2.5 transition-all duration-500 ${item.status === "resolved" ? "animate-[u06-settle_.55s_ease-out] bg-emerald-50/70 text-stone-500 dark:bg-emerald-950/20" : item.status === "active" ? "bg-amber-50/70 dark:bg-amber-950/20" : "bg-stone-50/70 dark:bg-stone-800/40"}`}><span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${item.status === "resolved" ? "bg-emerald-600 text-white" : item.status === "active" ? "bg-amber-500 text-white" : "border border-stone-300 text-stone-400"}`}>{item.status === "resolved" ? "✓" : item.status === "active" ? "!" : "·"}</span><div className="min-w-0 flex-1"><p className={`text-sm font-medium ${item.status === "resolved" ? "line-through decoration-emerald-700/40" : ""}`}>{item.label}</p>{item.status !== "resolved" && <p className="mt-0.5 text-xs leading-relaxed text-stone-600 dark:text-stone-300">{item.detail}</p>}{item.status === "resolved" && item.evidence && <p className="mt-0.5 text-xs">{item.evidence}</p>}</div></li>)}</ol>
  <div className="px-4 pb-3"><p aria-live="polite" className="text-xs text-stone-500">{busy ? "La captura sigue activa; el análisis se actualiza al escribir." : review.summary} {source === "fallback" ? "· Análisis IA no disponible; checklist conservado." : source === "groq" ? "· Análisis actualizado." : ""}</p>
   {review.moment && <p className="mt-2 rounded-lg bg-violet-50 p-2 text-xs text-violet-900 dark:bg-violet-950/30 dark:text-violet-200">Momento sugerido: <strong>{review.moment.value}</strong> · {review.moment.category}. {review.moment.justification}</p>}
   <button type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded} className="mt-2 text-xs font-medium underline underline-offset-4">Contexto técnico y privacidad</button>
   {expanded && <div className="mt-2 space-y-2 rounded-lg bg-stone-50 p-3 text-xs leading-relaxed text-stone-600 dark:bg-stone-800 dark:text-stone-300"><p>El servidor intenta leer IPv4 y geolocalización aproximada expuesta por el alojamiento. Esto no demuestra dónde ocurrió el relato. No se obtiene GPS ni huella persistente del dispositivo.</p>{metadata && <p>Recepción del servidor: {new Date(metadata.receivedAt).toLocaleString()} · IPv4: {metadata.ipv4 || "no expuesta"} · Zona aproximada: {[metadata.city, metadata.region, metadata.country].filter(Boolean).join(", ") || "no disponible"}.</p>}<p>Esta versión no persiste metadatos ni recopila cookies, credenciales o identificadores de hardware.</p></div>}
  </div><style jsx>{`@keyframes u06-settle { 0% { opacity: .35; transform: translateY(3px) scale(.985); } 65% { opacity: 1; transform: translateY(-1px) scale(1.005); } 100% { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
 </section>;
}
