// @l0 L0-002 · @req UI-REVIEW/STATES · Fuente única tipada de estados sintéticos
//
// CONTRATO DE CERO DERIVA
// Cada constructor devuelve el tipo de estado REAL que exige el componente
// compartido de producción. Si las props de IngresoView, PipelineView,
// RegistroView o GrafoView cambian, este archivo deja de compilar y el
// typecheck detiene el build antes del merge. El compilador es el guardián.
//
// Tanto el harness interactivo (/ui-review) como el prerender semántico
// (/ui-review/[screen]/estatico) consumen ESTOS constructores. No existe una
// segunda definición de estado en ningún otro lugar.

import type { IngresoViewState } from "@/app/components/shared/IngresoView";
import type { PipelineViewState } from "@/app/components/shared/PipelineView";
import type { RegistroViewState } from "@/app/components/shared/RegistroView";
import type { GrafoViewState } from "@/app/components/shared/GrafoView";
import {
  FIXTURE_VOLCADOS,
  FIXTURE_HALLAZGOS,
  FIXTURE_INCIDENTES,
  FIXTURE_EVENTOS,
  FIXTURE_GRAFO_NODOS,
  FIXTURE_GRAFO_EDGES,
} from "./fixtures";
import type { ScreenId } from "./types";

export function buildIngresoState(
  scenario: string,
  fetchError: string | null = null
): IngresoViewState {
  return {
    titulo:
      scenario === "recording"
        ? "Dictado de prueba en curso"
        : "Título sintético para revisión",
    texto:
      scenario === "error"
        ? ""
        : "El sistema Khora procesa las transcripciones manteniendo la veracidad semántica de los volcados orales.",
    estado: scenario === "recording" ? "dictando" : "inactivo",
    editando: scenario === "paused_editing",
    soportado: true,
    escuchando: scenario === "recording",
    guardando: false,
    generandoTitulo: false,
    retranscribiendo: scenario === "finalizing",
    adjuntandoAudio: false,
    conAudio: true,
    partesContador: 1,
    bytesAcumulados: 524288,
    reconexiones: 0,
    pulidosOk: 2,
    pulidosNo: 0,
    reconciliacionMensaje:
      scenario === "degraded"
        ? "Posible omisión detectada · se conservó lo capturado"
        : "",
    aviso: scenario === "degraded" ? "Fallo de conexión autoritativa" : "",
    error:
      scenario === "error"
        ? "Permiso de micrófono denegado para el reconocimiento de voz"
        : fetchError || "",
    resultado: "",
  };
}

export function buildPipelineState(
  scenario: string,
  fetchError: string | null = null
): PipelineViewState {
  const volcados = scenario === "empty" ? [] : FIXTURE_VOLCADOS;
  const volcado = volcados.length > 0 ? volcados[0] : null;

  const gateAprobado = {
    canApprove: true,
    version: 1,
    sha256: "sha-aprobado",
    gate_hash: "hash-ready",
    blockers: [],
    warnings: [],
    counts: {
      errores_tipograficos_pendientes: 0,
      correcciones_lingüisticas_pendientes: 0,
      observaciones_sintacticas_pendientes: 0,
      incidentes_operativos_abiertos: 0,
    },
  };

  const gateBloqueado = {
    canApprove: false,
    version: 1,
    sha256: "sha-bloqueado",
    gate_hash: "hash-blocked",
    blockers: [
      { code: "INCIDENTE_ABIERTO", message: "Incidente de audio pendiente" },
    ],
    warnings: [],
    counts: {
      errores_tipograficos_pendientes: 0,
      correcciones_lingüisticas_pendientes: 1,
      observaciones_sintacticas_pendientes: 0,
      incidentes_operativos_abiertos: 1,
    },
  };

  const gateNeutro = {
    canApprove: false,
    version: 1,
    sha256: "sha-neutro",
    gate_hash: "hash-neutro",
    blockers: [],
    warnings: [],
    counts: {
      errores_tipograficos_pendientes: 0,
      correcciones_lingüisticas_pendientes: 0,
      observaciones_sintacticas_pendientes: 0,
      incidentes_operativos_abiertos: 0,
    },
  };

  const gateDecision =
    scenario === "approved"
      ? gateAprobado
      : scenario === "blocked" ||
        scenario === "gate_blocked" ||
        scenario === "incident"
      ? gateBloqueado
      : gateNeutro;

  return {
    pipelineItems: volcados,
    resumen: {
      total: volcados.length,
      en_revision: 1,
      pendiente_revision: 0,
      listo_ingesta: 1,
      ingerido: 0,
      anomalies: scenario === "incident" ? 1 : 0,
      sin_audio: scenario === "incident" ? 1 : 0,
    },
    loadingPipeline: scenario === "loading",
    filter: "todos",
    searchQuery: "",
    selectedId:
      scenario === "empty"
        ? null
        : volcado?.id ?? "v-sintetico-001-uuid-demostración",
    selectedItem: scenario === "empty" ? null : volcado,
    drawerSubTab: "cockpit",
    viewMode: scenario === "editing" ? "edicion" : "lectura",
    editableTexto:
      "El sistema Khora procesa las transcripciones manteniendo la veracidad semántica de los volcados orales.",
    generatingTitle: false,
    titleError: scenario === "error" ? fetchError : null,
    manifiestoPartes: [
      {
        part_index: 1,
        start_ms: 0,
        end_ms: 60000,
        duracion_ms: 60000,
        bytes: 524288,
        download_path: "",
      },
    ],
    currentPartIndex: 1,
    audioSourceUrl: "",
    currentTimeMs: 15000,
    duracionTotalMs: 60000,
    isPlaying: scenario === "audio_multipart",
    audioError: scenario === "incident" ? "Audio no disponible" : null,
    hallazgos: scenario === "suggestions" ? FIXTURE_HALLAZGOS : [],
    activeHallazgoIndex: 0,
    incidentes: scenario === "incident" ? FIXTURE_INCIDENTES : [],
    gateDecision,
    loadingGate: false,
    holdProgress: 0,
    isHolding: false,
    showAccessibleModal: false,
    accessibleConfirmText: "",
    approvingVersion: false,
    showAudioResolveModal: scenario === "incident",
    selectedAudioResolveCode: "aceptado_sin_audio",
    ingesting: scenario === "running",
    ingestaResult:
      scenario === "success"
        ? { success: true, io_id: "io-sintetico-999" }
        : scenario === "failure"
        ? { success: false, error: "Error de conexión con el kernel" }
        : null,
  };
}

export function buildRegistroState(
  scenario: string,
  fetchError: string | null = null
): RegistroViewState {
  return {
    eventos: scenario === "empty" ? [] : FIXTURE_EVENTOS,
    ndjsonRaw: "",
    loading: scenario === "loading",
    error:
      scenario === "error"
        ? "Error al consultar la API de eventos"
        : fetchError,
    faseFiltro: "todas",
    agruparPorCorrelacion: false,
    mensajeCopiar: "",
    expandedDetails: {},
  };
}

export function buildGrafoState(
  scenario: string,
  fetchError: string | null = null
): GrafoViewState {
  return {
    nodes: scenario === "empty" ? [] : FIXTURE_GRAFO_NODOS,
    edges: scenario === "empty" ? [] : FIXTURE_GRAFO_EDGES,
    loading: scenario === "loading",
    error:
      scenario === "error"
        ? "Error al recuperar proyecciones del grafo"
        : fetchError,
    viewMode: scenario === "dense" ? "graph" : "list",
    layer2Active: scenario === "dense",
    selectedElement: null,
  };
}

/** Pantallas que renderizan PipelineView. */
export const PANTALLAS_PIPELINE: ScreenId[] = [
  "archivo",
  "revision",
  "aprobacion",
  "ingesta",
];
