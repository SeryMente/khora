// @l0 L0-002-R · @req ING-03/REQ-1 · @acr ACR-1.2
import { randomUUID, createHash } from "crypto";
import { getDb } from "./neon";
import { asegurarTabla } from "./volcados";
import { crearVersion } from "./correcciones";

const ALTERS = [
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS audio_url TEXT",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS audio_bytes INTEGER",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS duracion_seg INTEGER",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS fuente TEXT DEFAULT $$texto$$",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS pulido_aplicado BOOLEAN DEFAULT false",
];

let columnasListas = false;

export async function asegurarColumnasDictado(): Promise<void> {
  if (columnasListas) return;
  await asegurarTabla();
  const db = getDb();
  for (const sql of ALTERS) {
    await db.query(sql);
  }
  columnasListas = true;
}

export type EntradaDictado = {
  texto: string;
  titulo?: string | null;
  audioUrl?: string | null;
  audioBytes?: number | null;
  duracionSeg?: number | null;
  pulidoAplicado?: boolean;
  usuario?: string | null;
};

export async function guardarDictado(entrada: EntradaDictado) {
  await asegurarColumnasDictado();
  const db = getDb();
  const id = randomUUID();
  const sha = createHash("sha256").update(entrada.texto, "utf8").digest("hex");
  await db.query(
    "INSERT INTO volcado (id, texto, sha256, chars, titulo, origen, driver, usuario, estado, fuente, audio_url, audio_bytes, duracion_seg, pulido_aplicado) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
    [
      id,
      entrada.texto,
      sha,
      entrada.texto.length,
      entrada.titulo ?? null,
      "web",
      "dictado",
      entrada.usuario ?? null,
      "archivado",
      "dictado",
      entrada.audioUrl ?? null,
      entrada.audioBytes ?? null,
      entrada.duracionSeg ?? null,
      entrada.pulidoAplicado === true,
    ]
  );
  await crearVersion(id, entrada.texto, "transcripcion original del dictado");
  return { id, sha256: sha, chars: entrada.texto.length };
}
