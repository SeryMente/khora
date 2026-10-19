/** Source attribution is not speaker diarization. No role/identity is inferred from language. */
export type FuenteDialogo = "microphone" | "chrome_tab";
export type TurnoDialogo = { fuente: FuenteDialogo; start_ms: number; end_ms: number; texto: string; solapado?: boolean };
export type ManifiestoDialogo = {
  version: 1;
  /** Presentation only; undefined preserves legacy dialogue formatting. */
  organizarComoDialogo?: boolean;
  estado: "preparando" | "grabando" | "detenido" | "interrumpido";
  etiquetas: Record<FuenteDialogo, string>;
  partesEsperadas: number;
  turnos: TurnoDialogo[];
};
export function ordenarTurnos(turnos: TurnoDialogo[]): TurnoDialogo[] {
  const sorted = turnos.map(t => ({ ...t, solapado: false })).sort((a,b) => a.start_ms-b.start_ms || a.end_ms-b.end_ms || a.fuente.localeCompare(b.fuente));
  for (let i=0;i<sorted.length;i++) {
    const a=sorted[i];
    if (!Number.isFinite(a.start_ms)||!Number.isFinite(a.end_ms)||a.start_ms<0||a.end_ms<a.start_ms) throw Error("dialogo_timing_invalido");
    for(let j=i+1;j<sorted.length&&sorted[j].start_ms<a.end_ms;j++) {
      const b=sorted[j]; if(a.fuente!==b.fuente&&b.end_ms>a.start_ms) a.solapado=b.solapado=true;
    }
  }
  return sorted;
}
export function formatearDialogo(turnos: TurnoDialogo[], etiquetas: Record<FuenteDialogo,string>): string {
  const time=(ms:number)=>`${Math.floor(ms/60000).toString().padStart(2,"0")}:${(Math.floor(ms/1000)%60).toString().padStart(2,"0")}`;
  return ordenarTurnos(turnos).map(t=>`[${time(t.start_ms)}–${time(t.end_ms)}] ${etiquetas[t.fuente]}${t.solapado?" [solapamiento]":""}: ${t.texto}`).join("\n\n");
}

export function formatearCaptura(turnos: TurnoDialogo[], etiquetas: Record<FuenteDialogo,string>, organizarComoDialogo = true): string {
  return organizarComoDialogo ? formatearDialogo(turnos, etiquetas) : ordenarTurnos(turnos).map(t=>t.texto).join("\n\n");
}
