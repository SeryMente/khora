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
import type { ConsultaViewState } from "@/app/components/shared/ConsultaView";
import type { KpiPanelViewState } from "@/app/components/shared/KpiPanelView";
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

export function buildConsultaState(
  scenario: string,
  fetchError: string | null = null
): ConsultaViewState {
  const msgUser = {
    id: "msg-001",
    rol: "user" as const,
    contenido: "¿Cómo opera la veracidad semántica en Khora?",
  };

  const msgAssistantStream = {
    id: "msg-002",
    rol: "assistant" as const,
    contenido:
      "La veracidad semántica se garantiza mediante auditorías léxicas y verbatims inmutables.",
    origen: "llm:groq:openai/gpt-oss-120b",
  };

  const msgAssistantGrafo = {
    id: "msg-003",
    rol: "assistant" as const,
    contenido:
      "El subgrafo recuperado confirma que el motor RAG conserva las tripletas originales.",
    origen: "grafo",
    fuentes: [
      {
        tripleta: "(Khora)-[:PRESERVA]->(VeracidadSemantica)",
        provenance: "volcado-sintetico-001",
        derived_from: "v1:sha256-sintetico",
      },
    ],
    suficiencia: true,
    no_anclada: false,
    degradacion_declarada: null,
  };

  return {
    mensajes:
      scenario === "empty"
        ? []
        : scenario === "grafo"
        ? [msgUser, msgAssistantGrafo]
        : [msgUser, msgAssistantStream],
    inputPregunta: scenario === "recording" ? "Pregunta sintética..." : "",
    perfil: "groq",
    modeloOverride: scenario === "override" ? "openai/gpt-oss-120b" : "",
    modoGrafo: scenario === "grafo",
    generando: scenario === "generating",
    error:
      scenario === "error"
        ? "Error sintético de conexión con el proveedor LLM"
        : fetchError || null,
  };
}

export function buildKpiState(
  scenario: string,
  fetchError: string | null = null
): KpiPanelViewState {
  const isComparando = scenario === "comparando";
  const isFalloParcial = scenario === "fallo-parcial";
  const isDegradadoTotal = scenario === "degradado-total";

  return {
    promptInput: isComparando || isFalloParcial ? "Explicación sintética de rendimiento Khora" : "",
    selectedProfiles: ["groq", "gemini", "open_source"],
    generandoGlobal: isComparando,
    sinPerfilesConfigurados: isDegradadoTotal,
    resultados: {
      groq: {
        perfil: "groq",
        estado: isComparando ? "generando" : "exito",
        contenido: "Groq LPU sintético: latencia mínima y alto rendimiento.",
        ttftMs: 180,
        durationMs: 1200,
        realTokens: 42,
        charCount: 168,
        tps: 35.0,
        isExactTokens: true,
        origenModel: "llm:groq:openai/gpt-oss-120b",
      },
      gemini: {
        perfil: "gemini",
        estado: isComparando ? "generando" : "exito",
        contenido: "Gemini sintético: respuesta analítica completada.",
        ttftMs: 320,
        durationMs: 2100,
        realTokens: null,
        charCount: 200,
        tps: 23.8,
        isExactTokens: false,
        origenModel: "llm:gemini:gemini-3.8-flash",
      },
      open_source: {
        perfil: "open_source",
        estado: isFalloParcial ? "error" : isComparando ? "generando" : "exito",
        contenido: isFalloParcial ? "" : "Respuesta de modelo Open Source local.",
        errorMsg: isFalloParcial ? "PERFIL_NO_CONFIGURADO: Faltan variables en el perfil 'open_source'" : fetchError || undefined,
        ttftMs: isFalloParcial ? null : 450,
        durationMs: isFalloParcial ? null : 3500,
        realTokens: null,
        charCount: isFalloParcial ? 0 : 150,
        tps: isFalloParcial ? null : 10.7,
        isExactTokens: false,
        origenModel: "llm:open_source:deepseek-v4-flash",
      },
      local: {
        perfil: "local",
        estado: "idle",
        contenido: "",
        ttftMs: null,
        durationMs: null,
        realTokens: null,
        charCount: 0,
        tps: null,
        isExactTokens: false,
      },
    },
  };
}

/** Pantallas que renderizan PipelineView. */
export const PANTALLAS_PIPELINE: ScreenId[] = [
  "archivo",
  "revision",
  "aprobacion",
  "ingesta",
];
