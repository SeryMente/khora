"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock3, MapPin, Feather, Calendar } from "lucide-react";
import { analyzeCronicaCoverage, type CronicaCoverageId, type CronicaCoverageItem } from "../../../lib/ingreso/cronica-coverage";
import s from "./ingreso-studio.module.css";

const labels: Record<CronicaCoverageId, string> = {
  datetime: "Fecha y hora",
  when: "Momento",
  where: "Lugar",
  what: "Qué pasa",
};
const icons = { datetime: Calendar, when: Clock3, where: MapPin, what: Feather };

/** Optional textual cues only. Never a custody, truth or publication gate. */
export function CronicaCoverage({
  text,
  provisional = "",
  automaticDateTimeOk,
}: {
  text: string;
  provisional?: string;
  automaticDateTimeOk: boolean;
}) {
  const result = useMemo(
    () => analyzeCronicaCoverage([text, provisional].filter(Boolean).join("\n"), { automaticDateTimeOk }),
    [text, provisional, automaticDateTimeOk],
  );
  const pending = result.items.filter((item) => !item.covered);
  const explicitlyMentioned = result.items.filter(
    (item) => item.covered && !(item.id === "datetime" && item.evidence === "Fecha/hora disponible automáticamente"),
  );
  const [crumbling, setCrumbling] = useState<Partial<Record<CronicaCoverageId, CronicaCoverageItem>>>({});
  const previousCovered = useRef<Partial<Record<CronicaCoverageId, boolean>>>({});
  const timers = useRef(new Map<CronicaCoverageId, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const newlyResolved = result.items.filter(
      (item) => item.covered && previousCovered.current[item.id] === false,
    );
    const current = Object.fromEntries(result.items.map((item) => [item.id, item.covered])) as Record<CronicaCoverageId, boolean>;

    for (const item of result.items) {
      if (item.covered) continue;
      const timer = timers.current.get(item.id);
      if (timer) {
        clearTimeout(timer);
        timers.current.delete(item.id);
        setCrumbling((previous) => {
          const next = { ...previous };
          delete next[item.id];
          return next;
        });
      }
    }
    previousCovered.current = current;

    const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;
    for (const item of newlyResolved) {
      const previousTimer = timers.current.get(item.id);
      if (previousTimer) clearTimeout(previousTimer);
      setCrumbling((previous) => ({ ...previous, [item.id]: item }));
      const timer = setTimeout(() => {
        setCrumbling((previous) => {
          const next = { ...previous };
          delete next[item.id];
          return next;
        });
        timers.current.delete(item.id);
      }, 750);
      timers.current.set(item.id, timer);
    }
  }, [result.items]);

  useEffect(() => () => {
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
  }, []);

  const pendingIds = new Set(pending.map((item) => item.id));
  const leaving = Object.values(crumbling).filter(
    (item): item is CronicaCoverageItem => !!item && !pendingIds.has(item.id) && result.items.some((current) => current.id === item.id && current.covered),
  );
  const showCueList = pending.length > 0 || leaving.length > 0;

  return (
    <aside className={s.cronicaCoverage} aria-label="Pistas opcionales para tu crónica" data-ui-id="ingreso.cronica-pistas">
      <div className={s.cronicaCueRow}>
        {showCueList ? (
          <>
            {pending.length > 0 && <span className={s.cronicaCueLabel}>Pistas opcionales</span>}
            <ul className={s.cronicaCueList} aria-label="Por mencionar, solo si quieres">
              {pending.map((item) => {
                const Icon = icons[item.id];
                return <li key={item.id} data-cue={item.id} className={s.cronicaCueListItem}><Icon size={14} aria-hidden="true" />{labels[item.id]}</li>;
              })}
              {leaving.map((item) => {
                const Icon = icons[item.id];
                return <li key={item.id} data-cue={item.id} className={`${s.cronicaCueListItem} ${s.cronicaCueCrumble}`} aria-hidden="true"><Icon size={14} aria-hidden="true" />{labels[item.id]}</li>;
              })}
            </ul>
            {explicitlyMentioned.length > 0 && pending.length > 0 && <span className={s.cronicaMentioned} aria-hidden="true"><Check size={14} />{explicitlyMentioned.length} {explicitlyMentioned.length === 1 ? "mención" : "menciones"}</span>}
          </>
        ) : (
          <span className={s.cronicaAllMentioned}><Check size={16} aria-hidden="true" />Tu relato ya sitúa momento, lugar y actividad.</span>
        )}
      </div>
      <span className={s.srOnly} role="status" aria-live="polite" aria-atomic="true">
        {explicitlyMentioned.length === 0
          ? "Puedes dictar libremente. Las pistas no son obligatorias."
          : `${explicitlyMentioned.map((item) => labels[item.id]).join(", ")}: mención encontrada en el texto. ${pending.length > 0 ? "Puedes continuar a tu ritmo." : "Puedes seguir contando lo que quieras."}`}
      </span>
    </aside>
  );
}
