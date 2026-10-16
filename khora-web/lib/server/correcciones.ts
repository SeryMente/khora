// @l0 L0-002-R · @req ING-03/REQ-1 · @acr ACR-1.2
import { randomUUID, createHash } from "crypto";
import { getDb } from "./neon";
import { asegurarTabla } from "./volcados";

const DDL = [
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS texto_original TEXT",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS editado_en TIMESTAMPTZ",
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS ediciones INTEGER DEFAULT 0",
  "CREATE TABLE IF NOT EXISTS correccion (id UUID PRIMARY KEY, volcado_id UUID, antes TEXT NOT NULL, despues TEXT NOT NULL, creado_en TIMESTAMPTZ NOT NULL DEFAULT now())",
  "ALTER TABLE correccion ADD COLUMN IF NOT EXISTS version_desde INTEGER",
  "ALTER TABLE correccion ADD COLUMN IF NOT EXISTS version_hasta INTEGER",
  "CREATE INDEX IF NOT EXISTS correccion_antes_idx ON correccion (antes)",
  "CREATE TABLE IF NOT EXISTS volcado_version (id UUID PRIMARY KEY, volcado_id UUID NOT NULL, version INTEGER NOT NULL, texto TEXT NOT NULL, sha256 CHAR(64) NOT NULL, chars INTEGER NOT NULL, motivo TEXT, creado_en TIMESTAMPTZ NOT NULL DEFAULT now())",
  "CREATE UNIQUE INDEX IF NOT EXISTS volcado_version_uniq ON volcado_version (volcado_id, version)",
  "CREATE TABLE IF NOT EXISTS volcado_revision_auditoria (id UUID PRIMARY KEY, volcado_id UUID NOT NULL, accion TEXT NOT NULL, estado_anterior TEXT, estado_nuevo TEXT, version INTEGER, sha256 TEXT, usuario TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())",
];

let listo = false;

export async function asegurarEsquema(): Promise<void> {
  if (listo) return;
  await asegurarTabla();
  const db = getDb();
  for (const sql of DDL) { await db.query(sql); }
  listo = true;
}

import { cifrarTexto, descifrarTexto } from "./cripto";

export function sha256de(t: string): string {
  return createHash("sha256").update(t, "utf8").digest("hex");
}

export type Par = { antes: string; despues: string };

function normalizar(p: string): string {
  return p.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function tokenizar(t: string): { raw: string[]; norm: string[] } {
  const raw = t.match(/\s+|[^\s]+/g) || [];
  return { raw, norm: raw };
}

export function calcularDelta(original: string, editado: string): Par[] {
  const A = tokenizar(original);
  const B = tokenizar(editado);
  const n = A.norm.length;
  const m = B.norm.length;
  if (n === 0 && m === 0) return [];
  if (n * m > 4000000) return original === editado ? [] : [{ antes: original, despues: editado }];
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
    const a = bufA.join("");
    const b = bufB.join("");
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

type QueryClient = { query: (sql: string, params?: any[]) => Promise<any> };
export async function crearVersion(volcadoId: string, texto: string, motivo: string, transaction?: QueryClient) {
  if (!transaction) await asegurarEsquema();
  const owned = transaction ? null : await getDb().connect();
  const c = transaction || owned!;
  try {
    if (owned) { await c.query("BEGIN"); await c.query("SELECT id FROM volcado WHERE id=$1 FOR UPDATE", [volcadoId]); }
    const r = await c.query("SELECT COALESCE(MAX(version), 0)::int AS ultima FROM volcado_version WHERE volcado_id = $1", [volcadoId]);
    const version = Number(r.rows[0].ultima) + 1; const sha = sha256de(texto);
    await c.query("INSERT INTO volcado_version (id, volcado_id, version, texto, sha256, chars, motivo) VALUES ($1,$2,$3,$4,$5,$6,$7)", [randomUUID(),volcadoId,version,cifrarTexto(texto),sha,texto.length,motivo]);
    if (owned) await c.query("COMMIT");
    return { version, sha256: sha, chars: texto.length };
  } catch(e) { if(owned) await c.query("ROLLBACK").catch(()=>undefined); throw e; }
  finally { owned?.release(); }
}
export async function asegurarVersionInicial(volcadoId: string) {
  await asegurarEsquema(); const c=await getDb().connect();
  try {
    await c.query("BEGIN");
    const v=await c.query("SELECT texto,texto_original FROM volcado WHERE id=$1 FOR UPDATE",[volcadoId]);
    if(!v.rows.length)throw new Error("volcado no encontrado");
    const count=await c.query("SELECT COUNT(*)::int AS n FROM volcado_version WHERE volcado_id=$1",[volcadoId]);
    const base=descifrarTexto(String(v.rows[0].texto_original??v.rows[0].texto??""));
    if(!Number(count.rows[0].n)&&base.length)await crearVersion(volcadoId,base,"transcripcion original del dictado",c);
    await c.query("COMMIT");
  }catch(e){await c.query("ROLLBACK").catch(()=>undefined);throw e;}finally{c.release();}
}

export async function listarVersiones(volcadoId: string) {
  await asegurarEsquema();
  const db = getDb();
  const r = await db.query("SELECT version, texto, sha256, chars, motivo, creado_en FROM volcado_version WHERE volcado_id = $1 ORDER BY version ASC", [volcadoId]); r.rows = r.rows.map((f: any) => ({ ...f, texto: descifrarTexto(String(f.texto ?? "")) }));
  return r.rows;
}

export async function guardarEdicion(volcadoId: string, textoEditado: string, usuario?: string | null, expected?: { version?: number; sha256?: string; motivo?: string }) {
  await asegurarEsquema(); await asegurarVersionInicial(volcadoId); const c=await getDb().connect();
  try {
    await c.query("BEGIN");
    const state=await c.query("SELECT estado,texto,sha256 FROM volcado WHERE id=$1 FOR UPDATE",[volcadoId]);
    if(!state.rows.length)throw new Error("volcado no encontrado");
    const u=await c.query("SELECT version,texto,sha256 FROM volcado_version WHERE volcado_id=$1 ORDER BY version DESC LIMIT 1",[volcadoId]);
    const last=u.rows[0]; const base=descifrarTexto(String(last?.texto??state.rows[0].texto??""));const from=Number(last?.version??0);
    if(expected?.version!==undefined&&expected.version!==from)throw new Error("conflicto_version_base");
    if(expected?.sha256&&expected.sha256!==sha256de(base))throw new Error("conflicto_huella_base");
    if(base===textoEditado){await c.query("COMMIT");return {pares:[] as Par[],guardadas:0,version:from,sinCambios:true,sha256:sha256de(base),chars:base.length};}
    const pares=calcularDelta(base,textoEditado);const reason=expected?.motivo||"enmienda_contenido";
    const nueva=await crearVersion(volcadoId,textoEditado,reason,c);
    await c.query("UPDATE volcado SET texto_original=COALESCE(texto_original,texto),texto=$2,sha256=$3,chars=$4,estado='en_revision',version_aprobada=NULL,sha256_aprobado=NULL,aprobado_en=NULL,aprobador=NULL,editado_en=now(),ediciones=COALESCE(ediciones,0)+1 WHERE id=$1",[volcadoId,cifrarTexto(textoEditado),nueva.sha256,textoEditado.length]);
    await c.query("INSERT INTO volcado_revision_auditoria(id,volcado_id,accion,estado_anterior,estado_nuevo,version,sha256,usuario) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",[randomUUID(),volcadoId,"version_guardada:"+reason,state.rows[0].estado,"en_revision",nueva.version,nueva.sha256,usuario??null]);
    for(const p of pares)await c.query("INSERT INTO correccion(id,volcado_id,antes,despues,version_desde,version_hasta) VALUES($1,$2,$3,$4,$5,$6)",[randomUUID(),volcadoId,cifrarTexto(p.antes),cifrarTexto(p.despues),from,nueva.version]);
    await c.query("COMMIT");return {pares,guardadas:pares.length,version:nueva.version,versionDesde:from,sinCambios:false,sha256:nueva.sha256,chars:nueva.chars};
  }catch(e){await c.query("ROLLBACK").catch(()=>undefined);throw e;}finally{c.release();}
}

export async function listarLexico(limite = 200) {
  await asegurarEsquema();
  const db = getDb();
  // Randomized encryption cannot be grouped by ciphertext. Aggregate decoded pairs.
  const maximo = Math.max(1, Math.min(1000, Math.floor(limite) || 200));
  const r = await db.query("SELECT antes, despues, COUNT(*)::int AS veces FROM correccion GROUP BY antes, despues");
  const grupos = new Map<string, { antes: string; despues: string; veces: number }>();
  for (const row of r.rows) {
    const antes = descifrarTexto(row.antes), despues = descifrarTexto(row.despues);
    const key = JSON.stringify([antes, despues]), previo = grupos.get(key);
    grupos.set(key, { antes, despues, veces: (previo?.veces || 0) + Number(row.veces) });
  }
  return [...grupos.values()].sort((a,b) => b.veces-a.veces || a.antes.localeCompare(b.antes)).slice(0,maximo);
}

export { marcarPendienteRevision, iniciarRevision, aprobarVersion, reabrirRevision } from "./volcados";
