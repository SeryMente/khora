// @l0 L0-002-R · @req ING-03/REQ-1 · @acr ACR-1.2
import { randomUUID, createHash } from "crypto";
import { getDb } from "./neon";
import { asegurarTabla } from "./volcados";

const DDL = [
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS texto_original TEXT",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS editado_en TIMESTAMPTZ",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS ediciones INTEGER DEFAULT 0",
  "CREATE TABLE IF NOT EXISTS correccion (id UUID PRIMARY KEY, volcado_id UUID, antes TEXT NOT NULL, despues TEXT NOT NULL, creado_en TIMESTAMPTZ NOT NULL DEFAULT now())",
  "CREATE INDEX IF NOT EXISTS correccion_antes_idx ON correccion (antes)",
];

let listo = false;

export async function asegurarEsquema(): Promise<void> {
  if (listo) return;
  await asegurarTabla();
  const db = getDb();
  for (const sql of DDL) { await db.query(sql); }
  listo = true;
}

export type Par = { antes: string; despues: string };

function normalizar(p: string): string {
  return p.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function tokenizar(t: string): { raw: string[]; norm: string[] } {
  const raw = t.split(/\s+/).filter((s) => s.length > 0);
  return { raw, norm: raw.map(normalizar) };
}

export function calcularDelta(original: string, editado: string): Par[] {
  const A = tokenizar(original);
  const B = tokenizar(editado);
  const n = A.norm.length;
  const m = B.norm.length;
  if (n === 0 || m === 0) return [];
  if (n * m > 4000000) return [{ antes: "(texto demasiado largo para el delta fino)", despues: "" }];
  const dp: number[][] = [];
  for (let i = 0; i <= n; i++) { dp.push(new Array(m + 1).fill(0)); }
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A.norm[i] === B.norm[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const pares: Par[] = [];
  let bufA: string[] = [];
  let bufB: string[] = [];
  const volcar = () => {
    const a = bufA.join(" ").trim();
    const b = bufB.join(" ").trim();
    if (a.length > 0 || b.length > 0) pares.push({ antes: a, despues: b });
    bufA = [];
    bufB = [];
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A.norm[i] === B.norm[j]) { volcar(); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { bufA.push(A.raw[i]); i++; }
    else { bufB.push(B.raw[j]); j++; }
  }
  while (i < n) { bufA.push(A.raw[i]); i++; }
  while (j < m) { bufB.push(B.raw[j]); j++; }
  volcar();
  return pares;
}

export async function guardarEdicion(volcadoId: string, textoEditado: string) {
  await asegurarEsquema();
  const db = getDb();
  const previo = await db.query("SELECT texto, texto_original FROM volcado WHERE id = $1", [volcadoId]);
  if (previo.rows.length === 0) throw new Error("volcado no encontrado");
  const fila: any = previo.rows[0];
  const base: string = fila.texto_original ?? fila.texto;
  const pares = calcularDelta(base, textoEditado);
  const sha = createHash("sha256").update(textoEditado, "utf8").digest("hex");
  await db.query("UPDATE volcado SET texto_original = COALESCE(texto_original, texto), texto = $2, sha256 = $3, chars = $4, editado_en = now(), ediciones = COALESCE(ediciones, 0) + 1 WHERE id = $1", [volcadoId, textoEditado, sha, textoEditado.length]);
  await db.query("DELETE FROM correccion WHERE volcado_id = $1", [volcadoId]);
  let guardadas = 0;
  for (const p of pares) {
    if (p.antes.length === 0 || p.despues.length === 0) continue;
    if (p.antes.length > 80 || p.despues.length > 80) continue;
    await db.query("INSERT INTO correccion (id, volcado_id, antes, despues) VALUES ($1,$2,$3,$4)", [randomUUID(), volcadoId, p.antes, p.despues]);
    guardadas++;
  }
  return { pares, guardadas, sha256: sha, chars: textoEditado.length };
}

export async function listarLexico(limite = 100) {
  await asegurarEsquema();
  const db = getDb();
  const r = await db.query("SELECT antes, despues, COUNT(*)::int AS veces FROM correccion GROUP BY antes, despues ORDER BY veces DESC, antes ASC LIMIT $1", [limite]);
  return r.rows;
}
