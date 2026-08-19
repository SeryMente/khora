// @l0 L0-002-R · @req REVISION-COCKPIT/REQ-1
import { createHash } from "crypto";
import { getDb } from "./neon";
import { descifrarTexto } from "./cripto";
import { listarIncidentesAbiertos } from "./incidentes";
import { listarHallazgos } from "./asistenteRevision";

export interface Blocker {
  code: string;
  message: string;
  count?: number;
  details?: Record<string, any>;
}

export interface Warning {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface GateDecision {
  canApprove: boolean;
  version: number;
  sha256: string;
  gate_hash: string;
  blockers: Blocker[];
  warnings: Warning[];
  counts: {
    errores_tipograficos_pendientes: number;
    correcciones_lingüisticas_pendientes: number;
    observaciones_sintacticas_pendientes: number;
    incidentes_operativos_abiertos: number;
  };
}

export async function evaluarCompuertaAprobacion(
  volcadoId: string,
  solicitante?: string | null
): Promise<GateDecision> {
  const db = getDb();

  // 1. Obtener volcado
  const vRes = await db.query(
    "SELECT id, estado, texto, sha256, version_aprobada, session_id, audio_url, audio_partes FROM volcado WHERE id = $1",
    [volcadoId]
  );
  if (vRes.rows.length === 0) {
    throw new Error("Volcado no encontrado");
  }
  const volcado = vRes.rows[0];

  // 2. Obtener versión vigente más reciente
  const verRes = await db.query(
    "SELECT version, sha256, texto FROM volcado_version WHERE volcado_id = $1 ORDER BY version DESC LIMIT 1",
    [volcadoId]
  );
  if (verRes.rows.length === 0) {
    throw new Error("El volcado no posee versiones creadas.");
  }

  const versionVigente = Number(verRes.rows[0].version);
  const sha256Vigente = verRes.rows[0].sha256;
  const textoVigente = descifrarTexto(verRes.rows[0].texto || "");

  const blockers: Blocker[] = [];
  const warnings: Warning[] = [];

  // Regla A: Estado debe ser exactamente 'en_revision'
  if (volcado.estado !== "en_revision") {
    blockers.push({
      code: "ESTADO_INVALIDO",
      message: `El volcado debe estar en estado 'en_revision'. Estado actual: '${volcado.estado}'`,
    });
  }

  // Regla B: Transcripción no vacía
  if (!textoVigente || textoVigente.trim().length === 0) {
    blockers.push({
      code: "TRANSCRIPCION_VACIA",
      message: "La transcripción del volcado está totalmente vacía.",
    });
  }

  // Regla C: Incidentes abiertos
  const incidentesAbiertos = await listarIncidentesAbiertos(volcadoId);
  const incidentesBloqueantes = incidentesAbiertos.filter((inc) => {
    // Si es audio_no_recuperable y fue resuelto previamente o aceptado sin audio, no bloquea
    return true;
  });

  if (incidentesBloqueantes.length > 0) {
    blockers.push({
      code: "INCIDENTES_OPERATIVOS_ABIERTOS",
      message: `Existen ${incidentesBloqueantes.length} incidentes operativos abiertos o reconocidos sin resolver.`,
      count: incidentesBloqueantes.length,
      details: {
        tipos: incidentesBloqueantes.map((i) => i.tipo),
      },
    });
  }

  // Regla D: Hallazgos pendientes de la versión vigente
  const hallazgos = await listarHallazgos(volcadoId, versionVigente);
  const hallazgosPendientes = hallazgos.filter((h) => h.estado === "pendiente");

  let tipograficosCount = 0;
  let correccionesCount = 0;
  let observacionesCount = 0;

  for (const h of hallazgosPendientes) {
    if (h.tipo_categoria === "error_tipografico" || h.tipo_categoria === "puntuacion") {
      tipograficosCount++;
    } else if (h.familia === "correccion_aplicable") {
      correccionesCount++;
    } else {
      observacionesCount++;
    }
  }

  if (hallazgosPendientes.length > 0) {
    blockers.push({
      code: "HALLAZGOS_PENDIENTES",
      message: `Existen ${hallazgosPendientes.length} hallazgos lingüísticos o tipográficos pendientes de revisión.`,
      count: hallazgosPendientes.length,
    });
  }

  // Excepción explicita para audio
  const resueltoSinAudio = incidentesAbiertos.some(
    (i) => i.tipo === "audio_no_recuperable" && i.codigo_resolucion === "aceptado_sin_audio"
  );
  if (resueltoSinAudio) {
    warnings.push({
      code: "AUDIO_ACEPTADO_SIN_REPRODUCCION",
      message: "El operador ha aceptado explícitamente procesar el volcado sin audio disponible.",
    });
  }

  const canApprove = blockers.length === 0;

  // Derivar gate_hash estable de la evaluación
  const gatePayload = JSON.stringify({
    volcadoId,
    version: versionVigente,
    sha256: sha256Vigente,
    canApprove,
    blockersCount: blockers.length,
    blockerCodes: blockers.map((b) => b.code),
  });

  const gateHash = createHash("sha256").update(gatePayload, "utf8").digest("hex");

  return {
    canApprove,
    version: versionVigente,
    sha256: sha256Vigente,
    gate_hash: gateHash,
    blockers,
    warnings,
    counts: {
      errores_tipograficos_pendientes: tipograficosCount,
      correcciones_lingüisticas_pendientes: correccionesCount,
      observaciones_sintacticas_pendientes: observacionesCount,
      incidentes_operativos_abiertos: incidentesBloqueantes.length,
    },
  };
}
