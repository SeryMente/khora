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
  "ALTER TABLE volcado ADD COLUMN IF NOT EXISTS version_aprobada INTEGER",
"ALTER TABLE volcado ADD COLUMN IF NOT EXISTS sha256_aprobado CHAR(64)",
"ALTER TABLE volcado ADD COLUMN IF NOT EXISTS aprobado_en TIMESTAMPTZ",
"ALTER TABLE volcado ADD COLUMN IF NOT EXISTS aprobador TEXT",
"CREATE TABLE IF NOT EXISTS volcado_revision_auditoria (id UUID PRIMARY KEY, volcado_id UUID NOT NULL, accion TEXT NOT NULL, estado_anterior TEXT, estado_nuevo TEXT, version INTEGER, sha256 CHAR(64), usuario TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())",
"CREATE INDEX IF NOT EXISTS volcado_revision_auditoria_volcado_idx ON volcado_revision_auditoria (volcado_id)"
];

let listo = false;

export async function asegurarEsquema(): Promise<void> {
  if (listo) return;
  await asegurarTabla();
  const db = getDb();
  for (const sql of DDL) {
    await db.query(sql);
  }
  listo = true;
}
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
  const raw = t.split(/\s+/).filter((s) => s.length > 0);
  return { raw, norm: raw.map(normalizar) };
}

export function calcularDelta(original: string, editado: string): Par[] {
  const A = tokenizar(original);
  const B = tokenizar(editado);
  const n = A.norm.length;
  const m = B.norm.length;
  if (n === 0 && m === 0) return [];
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

export async function crearVersion(volcadoId: string, texto: string, motivo: string) {
  await asegurarEsquema();
  const db = getDb();
  const r = await db.query("SELECT COALESCE(MAX(version), 0)::int AS ultima FROM volcado_version WHERE volcado_id = $1", [volcadoId]);
  const version = Number((r.rows[0] as any).ultima) + 1;
  const sha = sha256de(texto);
  await db.query("INSERT INTO volcado_version (id, volcado_id, version, texto, sha256, chars, motivo) VALUES ($1,$2,$3,$4,$5,$6,$7)", [randomUUID(), volcadoId, version, cifrarTexto(texto), sha, texto.length, motivo]);
  return { version, sha256: sha, chars: texto.length };
}

export async function asegurarVersionInicial(volcadoId: string) {
  await asegurarEsquema();
  const db = getDb();
  const c = await db.query("SELECT COUNT(*)::int AS n FROM volcado_version WHERE volcado_id = $1", [volcadoId]);
  if (Number((c.rows[0] as any).n) > 0) return;
  const v = await db.query("SELECT texto, texto_original FROM volcado WHERE id = $1", [volcadoId]);
  if (v.rows.length === 0) throw new Error("volcado no encontrado");
  const fila: any = v.rows[0];
  const base: string = descifrarTexto(String(fila.texto_original ?? fila.texto ?? ""));
  await crearVersion(volcadoId, base, "transcripcion original del dictado");
}

export async function listarVersiones(volcadoId: string) {
  await asegurarEsquema();
  const db = getDb();
  const r = await db.query("SELECT version, texto, sha256, chars, motivo, creado_en FROM volcado_version WHERE volcado_id = $1 ORDER BY version ASC", [volcadoId]); r.rows = r.rows.map((f: any) => ({ ...f, texto: descifrarTexto(String(f.texto ?? "")) }));
  return r.rows;
}

export async function guardarEdicion(volcadoId: string, textoEditado: string, usuario: string | null = null) {
  await asegurarEsquema();
  await asegurarVersionInicial(volcadoId);
  const db = getDb();

  // Obtener estado actual
  const cur = await db.query("SELECT estado FROM volcado WHERE id = $1", [volcadoId]);
  const estadoAnterior = cur.rows.length > 0 ? cur.rows[0].estado : "archivado";

  const u = await db.query("SELECT version, texto FROM volcado_version WHERE volcado_id = $1 ORDER BY version DESC LIMIT 1", [volcadoId]);
  const ultima: any = u.rows[0];
  const base: string = descifrarTexto(String(ultima.texto ?? ""));
  const versionDesde = Number(ultima.version);
  if (base === textoEditado) {
    return { pares: [] as Par[], guardadas: 0, version: versionDesde, sinCambios: true, sha256: sha256de(textoEditado), chars: textoEditado.length };
  }
  const pares = calcularDelta(base, textoEditado);
  const nueva = await crearVersion(volcadoId, textoEditado, "edicion manual del operador");

  // Al guardar edición el estado pasa a 'en_revision' e invalidamos aprobaciones anteriores
  const estadoNuevo = "en_revision";
  await db.query(
    "UPDATE volcado SET texto_original = COALESCE(texto_original, texto), texto = $2, sha256 = $3, chars = $4, editado_en = now(), ediciones = COALESCE(ediciones, 0) + 1, estado = $5, version_aprobada = NULL, sha256_aprobado = NULL, aprobado_en = NULL, aprobador = NULL WHERE id = $1",
    [volcadoId, cifrarTexto(textoEditado), nueva.sha256, textoEditado.length, estadoNuevo]
  );

  // Registrar auditoría de versión guardada
  await registrarAuditoria(volcadoId, "version_guardada", estadoAnterior, estadoNuevo, nueva.version, nueva.sha256, usuario);

  let guardadas = 0;
  for (const p of pares) {
    if (p.antes.length === 0 || p.despues.length === 0) continue;
    if (p.antes.length > 80 || p.despues.length > 80) continue;
    await db.query("INSERT INTO correccion (id, volcado_id, antes, despues, version_desde, version_hasta) VALUES ($1,$2,$3,$4,$5,$6)", [randomUUID(), volcadoId, p.antes, p.despues, versionDesde, nueva.version]);
    guardadas++;
  }
  return { pares, guardadas, version: nueva.version, versionDesde, sinCambios: false, sha256: nueva.sha256, chars: nueva.chars };
}

export async function listarLexico(limite = 200) {
  await asegurarEsquema();
  const db = getDb();
  const r = await db.query("SELECT antes, despues, COUNT(*)::int AS veces FROM correccion GROUP BY antes, despues ORDER BY veces DESC, antes ASC LIMIT $1", [limite]);
  return r.rows;
}

export async function registrarAuditoria(
  volcadoId: string,
  accion: string,
  estadoAnterior: string | null,
  estadoNuevo: string | null,
  version: number | null,
  sha256: string | null,
  usuario: string | null
) {
  await asegurarEsquema();
  const db = getDb();
  await db.query(
    "INSERT INTO volcado_revision_auditoria (id, volcado_id, accion, estado_anterior, estado_nuevo, version, sha256, usuario) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
    [randomUUID(), volcadoId, accion, estadoAnterior, estadoNuevo, version, sha256, usuario]
  );
}

export async function marcarPendienteRevision(volcadoId: string, usuario: string | null = null) {
  await asegurarEsquema();
  await asegurarVersionInicial(volcadoId);
  const db = getDb();
  const v = await db.query("SELECT estado FROM volcado WHERE id = $1", [volcadoId]);
  if (v.rows.length === 0) throw new Error("volcado no encontrado");
  const estadoAnterior = v.rows[0].estado;
  if (estadoAnterior === "archivado") {
    await db.query("UPDATE volcado SET estado = 'pendiente_revision' WHERE id = $1", [volcadoId]);
    await registrarAuditoria(volcadoId, "material_listo", estadoAnterior, "pendiente_revision", null, null, usuario);
  }
}

export async function iniciarRevision(volcadoId: string, usuario: string | null = null) {
  await asegurarEsquema();
  const db = getDb();
  const v = await db.query("SELECT estado FROM volcado WHERE id = $1", [volcadoId]);
  if (v.rows.length === 0) throw new Error("volcado no encontrado");
  const estadoAnterior = v.rows[0].estado;
  if (estadoAnterior === "pendiente_revision" || estadoAnterior === "archivado") {
    // Si viene de archivado, nos aseguramos de que pase por pendiente_revision primero, o directo a en_revision
    const actualEstado = "en_revision";
    await db.query("UPDATE volcado SET estado = $2 WHERE id = $1", [volcadoId, actualEstado]);
    await registrarAuditoria(volcadoId, "revision_iniciada", estadoAnterior, actualEstado, null, null, usuario);
  }
}

export async function aprobarVersion(volcadoId: string, version: number, usuario: string | null = null) {
  await asegurarEsquema();
  const db = getDb();
  const v = await db.query("SELECT estado FROM volcado WHERE id = $1", [volcadoId]);
  if (v.rows.length === 0) throw new Error("volcado no encontrado");
  const estadoAnterior = v.rows[0].estado;

  // Comprobar que la versión pertenece al volcado
  const ver = await db.query("SELECT texto, sha256 FROM volcado_version WHERE volcado_id = $1 AND version = $2", [volcadoId, version]);
  if (ver.rows.length === 0) throw new Error("La versión solicitada no existe para este volcado");

  const textoPlano = descifrarTexto(String(ver.rows[0].texto ?? ""));
  const shaRecalculado = sha256de(textoPlano);
  const shaAlmacenado = String(ver.rows[0].sha256).trim().toLowerCase();
  if (shaRecalculado !== shaAlmacenado) {
    throw new Error("Integridad rota: el SHA256 de la versión no coincide con el contenido almacenado");
  }

  await db.query(
    "UPDATE volcado SET estado = 'listo_ingesta', version_aprobada = $2, sha256_aprobado = $3, aprobado_en = now(), aprobador = $4 WHERE id = $1",
    [volcadoId, version, shaAlmacenado, usuario]
  );

  await registrarAuditoria(volcadoId, "version_aprobada", estadoAnterior, "listo_ingesta", version, shaAlmacenado, usuario);
  return { version, sha256: shaAlmacenado };
}

export async function reabrirRevision(volcadoId: string, usuario: string | null = null) {
  await asegurarEsquema();
  const db = getDb();
  const v = await db.query("SELECT estado FROM volcado WHERE id = $1", [volcadoId]);
  if (v.rows.length === 0) throw new Error("volcado no encontrado");
  const estadoAnterior = v.rows[0].estado;

  await db.query(
    "UPDATE volcado SET estado = 'en_revision', version_aprobada = NULL, sha256_aprobado = NULL, aprobado_en = NULL, aprobador = NULL WHERE id = $1",
    [volcadoId]
  );

  await registrarAuditoria(volcadoId, "revision_reabierta", estadoAnterior, "en_revision", null, null, usuario);
}
