// @l0 L0-002-R · @req REVISION-COCKPIT/REQ-1
import { randomUUID } from "crypto";
import { getDb } from "./neon";

export type EstadoIncidente = "abierto" | "reconocido" | "resuelto" | "reabierto";
export type SeveridadIncidente = "alta" | "media" | "baja";

export type TipoIncidente =
  | "audio_no_recuperable"
  | "audio_parcial"
  | "audio_no_vinculado"
  | "blob_inaccesible"
  | "checksum_audio_invalido"
  | "transcripcion_ausente"
  | "chunk_pendiente_error"
  | "preparacion_revision_fallida"
  | "integridad_procedencia_rota"
  | "ingesta_fallida";

export type CodigoResolucionAudio =
  | "audio_recuperado"
  | "aceptado_sin_audio"
  | "captura_irrecuperable_confirmada"
  | "falso_positivo";

export interface Incidente {
  id: string;
  volcado_id: string;
  tipo: TipoIncidente;
  severidad: SeveridadIncidente;
  origen: string;
  estado: EstadoIncidente;
  primera_deteccion: string;
  ultima_deteccion: string;
  reconocido_por: string | null;
  reconocido_en: string | null;
  resuelto_por: string | null;
  resuelto_en: string | null;
  codigo_resolucion: string | null;
  evidencia: Record<string, any>;
  version_afectada?: number | null;
  sha256_afectado?: string | null;
}

const INCIDENTE_DDL = [
  `CREATE TABLE IF NOT EXISTS volcado_incidente (
    id UUID PRIMARY KEY,
    volcado_id UUID NOT NULL REFERENCES volcado(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    severidad TEXT NOT NULL DEFAULT 'media',
    origen TEXT NOT NULL DEFAULT 'detector_sistema',
    estado TEXT NOT NULL DEFAULT 'abierto',
    primera_deteccion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ultima_deteccion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reconocido_por TEXT,
    reconocido_en TIMESTAMPTZ,
    resuelto_por TEXT,
    resuelto_en TIMESTAMPTZ,
    codigo_resolucion TEXT,
    evidencia JSONB DEFAULT '{}'::jsonb,
    version_afectada INTEGER,
    sha256_afectado TEXT,
    CONSTRAINT volcado_incidente_tipo_uniq UNIQUE (volcado_id, tipo)
  );`,
  `CREATE INDEX IF NOT EXISTS volcado_incidente_volcado_idx ON volcado_incidente(volcado_id);`,
  `CREATE INDEX IF NOT EXISTS volcado_incidente_estado_idx ON volcado_incidente(estado);`,
  `CREATE TABLE IF NOT EXISTS volcado_incidente_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incidente_id UUID NOT NULL REFERENCES volcado_incidente(id) ON DELETE CASCADE,
    volcado_id UUID NOT NULL REFERENCES volcado(id) ON DELETE CASCADE,
    accion TEXT NOT NULL,
    estado_anterior TEXT,
    estado_nuevo TEXT,
    usuario TEXT,
    codigo_resolucion TEXT,
    evidencia JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`
];

let tablaIncidenteLista = false;

export async function asegurarTablaIncidentes(): Promise<void> {
  if (tablaIncidenteLista) return;
  const db = getDb();
  for (const sql of INCIDENTE_DDL) {
    await db.query(sql);
  }
  tablaIncidenteLista = true;
}

/**
 * Reporta o reabre de forma idempotente un incidente para un volcado.
 */
export async function reportarIncidente(params: {
  volcadoId: string;
  tipo: TipoIncidente;
  severidad?: SeveridadIncidente;
  origen?: string;
  evidencia?: Record<string, any>;
  versionAfectada?: number;
  sha256Afectado?: string;
}): Promise<Incidente> {
  await asegurarTablaIncidentes();
  const db = getDb();
  const id = randomUUID();
  const severidad = params.severidad ?? "media";
  const origen = params.origen ?? "detector_sistema";
  const evidenciaJson = JSON.stringify(params.evidencia ?? {});

  const res = await db.query(
    `INSERT INTO volcado_incidente
     (id, volcado_id, tipo, severidad, origen, estado, primera_deteccion, ultima_deteccion, evidencia, version_afectada, sha256_afectado)
     VALUES ($1, $2, $3, $4, $5, 'abierto', NOW(), NOW(), $6, $7, $8)
     ON CONFLICT (volcado_id, tipo) DO UPDATE SET
       ultima_deteccion = NOW(),
       severidad = EXCLUDED.severidad,
       evidencia = EXCLUDED.evidencia,
       version_afectada = COALESCE(EXCLUDED.version_afectada, volcado_incidente.version_afectada),
       sha256_afectado = COALESCE(EXCLUDED.sha256_afectado, volcado_incidente.sha256_afectado),
       estado = CASE WHEN volcado_incidente.estado = 'resuelto' THEN 'reabierto' ELSE volcado_incidente.estado END
     RETURNING id, volcado_id, tipo, severidad, origen, estado, primera_deteccion, ultima_deteccion, reconocido_por, reconocido_en, resuelto_por, resuelto_en, codigo_resolucion, evidencia, version_afectada, sha256_afectado;`,
    [
      id,
      params.volcadoId,
      params.tipo,
      severidad,
      origen,
      evidenciaJson,
      params.versionAfectada ?? null,
      params.sha256Afectado ?? null,
    ]
  );

  const inc = res.rows[0] as Incidente;

  await db.query(
    `INSERT INTO volcado_incidente_auditoria (incidente_id, volcado_id, accion, estado_nuevo, evidencia)
     VALUES ($1, $2, 'reportado_o_reabierto', $3, $4);`,
    [inc.id, inc.volcado_id, inc.estado, evidenciaJson]
  );

  return inc;
}

export async function listarIncidentes(volcadoId: string): Promise<Incidente[]> {
  await asegurarTablaIncidentes();
  const db = getDb();
  const res = await db.query(
    `SELECT id, volcado_id, tipo, severidad, origen, estado, primera_deteccion, ultima_deteccion, reconocido_por, reconocido_en, resuelto_por, resuelto_en, codigo_resolucion, evidencia, version_afectada, sha256_afectado
     FROM volcado_incidente
     WHERE volcado_id = $1
     ORDER BY primera_deteccion DESC`,
    [volcadoId]
  );
  return res.rows as Incidente[];
}

export async function listarIncidentesAbiertos(volcadoId: string): Promise<Incidente[]> {
  await asegurarTablaIncidentes();
  const db = getDb();
  const res = await db.query(
    `SELECT id, volcado_id, tipo, severidad, origen, estado, primera_deteccion, ultima_deteccion, reconocido_por, reconocido_en, resuelto_por, resuelto_en, codigo_resolucion, evidencia, version_afectada, sha256_afectado
     FROM volcado_incidente
     WHERE volcado_id = $1 AND estado IN ('abierto', 'reconocido', 'reabierto')
     ORDER BY primera_deteccion DESC`,
    [volcadoId]
  );
  return res.rows as Incidente[];
}

export async function reconocerIncidente(incidenteId: string, usuario: string): Promise<Incidente> {
  await asegurarTablaIncidentes();
  const db = getDb();

  const prev = await db.query(`SELECT id, volcado_id, estado FROM volcado_incidente WHERE id = $1`, [incidenteId]);
  if (prev.rows.length === 0) throw new Error("Incidente no encontrado");

  const estadoAnterior = prev.rows[0].estado;

  const res = await db.query(
    `UPDATE volcado_incidente
     SET estado = 'reconocido', reconocido_por = $2, reconocido_en = NOW()
     WHERE id = $1
     RETURNING id, volcado_id, tipo, severidad, origen, estado, primera_deteccion, ultima_deteccion, reconocido_por, reconocido_en, resuelto_por, resuelto_en, codigo_resolucion, evidencia, version_afectada, sha256_afectado;`,
    [incidenteId, usuario]
  );

  const inc = res.rows[0] as Incidente;

  await db.query(
    `INSERT INTO volcado_incidente_auditoria (incidente_id, volcado_id, accion, estado_anterior, estado_nuevo, usuario)
     VALUES ($1, $2, 'reconocido', $3, 'reconocido', $4);`,
    [inc.id, inc.volcado_id, estadoAnterior, usuario]
  );

  return inc;
}

export async function resolverIncidente(params: {
  incidenteId: string;
  usuario: string;
  codigoResolucion: string;
  evidenciaResolucion?: Record<string, any>;
}): Promise<Incidente> {
  await asegurarTablaIncidentes();
  const db = getDb();

  const prev = await db.query(`SELECT id, volcado_id, tipo, estado, evidencia FROM volcado_incidente WHERE id = $1`, [params.incidenteId]);
  if (prev.rows.length === 0) throw new Error("Incidente no encontrado");

  const rowPrev = prev.rows[0];
  const estadoAnterior = rowPrev.estado;

  if (rowPrev.tipo === "audio_no_recuperable") {
    const codigosValidos: CodigoResolucionAudio[] = [
      "audio_recuperado",
      "aceptado_sin_audio",
      "captura_irrecuperable_confirmada",
      "falso_positivo",
    ];
    if (!codigosValidos.includes(params.codigoResolucion as CodigoResolucionAudio)) {
      throw new Error(`Código de resolución inválido para audio_no_recuperable: '${params.codigoResolucion}'`);
    }
  }

  const evidenciaCombinada = {
    ...(rowPrev.evidencia || {}),
    resolucion: params.evidenciaResolucion ?? {},
  };

  const res = await db.query(
    `UPDATE volcado_incidente
     SET estado = 'resuelto', resuelto_por = $2, resuelto_en = NOW(), codigo_resolucion = $3, evidencia = $4
     WHERE id = $1
     RETURNING id, volcado_id, tipo, severidad, origen, estado, primera_deteccion, ultima_deteccion, reconocido_por, reconocido_en, resuelto_por, resuelto_en, codigo_resolucion, evidencia, version_afectada, sha256_afectado;`,
    [params.incidenteId, params.usuario, params.codigoResolucion, JSON.stringify(evidenciaCombinada)]
  );

  const inc = res.rows[0] as Incidente;

  await db.query(
    `INSERT INTO volcado_incidente_auditoria (incidente_id, volcado_id, accion, estado_anterior, estado_nuevo, usuario, codigo_resolucion, evidencia)
     VALUES ($1, $2, 'resuelto', $3, 'resuelto', $4, $5, $6);`,
    [inc.id, inc.volcado_id, estadoAnterior, params.usuario, params.codigoResolucion, JSON.stringify(params.evidenciaResolucion ?? {})]
  );

  return inc;
}
