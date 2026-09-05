// @l0 L0-002 · @req UI-REVIEW/REGISTRY · Registro canónico de escenarios y sincronización
import { ScenarioDefinition, ScreenId } from "./types";

export const UI_REVIEW_SCENARIOS: Record<string, ScenarioDefinition> = {
  // 1. Ingreso
  "ingreso:idle": {
    screen: "ingreso",
    scenario: "idle",
    title: "Ingreso · Estado Inactivo",
    description: "Formulario de ingreso listo para dictar, escribir o adjuntar audio.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "ingreso.container",
      "ingreso.titulo-input",
      "ingreso.btn-titulo-ia",
      "ingreso.btn-iniciar",
      "ingreso.btn-archivar",
      "ingreso.btn-retranscribir",
      "ingreso.btn-adjuntar",
      "ingreso.btn-limpiar",
      "ingreso.textarea",
      "ingreso.stats"
    ]
  },
  "ingreso:recording": {
    screen: "ingreso",
    scenario: "recording",
    title: "Ingreso · Grabando Dictado",
    description: "Dictado en vivo activo con reconocimiento escuchando y trozos procesando.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "ingreso.container",
      "ingreso.btn-detener",
      "ingreso.status-listening",
      "ingreso.textarea",
      "ingreso.stats"
    ]
  },
  "ingreso:paused_editing": {
    screen: "ingreso",
    scenario: "paused_editing",
    title: "Ingreso · Edición In-Situ Pausada",
    description: "Edición activa del texto con banner de advertencia y botón de confirmación.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "ingreso.container",
      "ingreso.banner-edicion",
      "ingreso.btn-confirmar-edicion",
      "ingreso.textarea"
    ]
  },
  "ingreso:resuming": {
    screen: "ingreso",
    scenario: "resuming",
    title: "Ingreso · Reanudando Dictado",
    description: "Reconexión del servicio de dictado tras confirmar edición.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "ingreso.container",
      "ingreso.status-listening",
      "ingreso.textarea"
    ]
  },
  "ingreso:finalizing": {
    screen: "ingreso",
    scenario: "finalizing",
    title: "Ingreso · Finalizando Transcripción Autoritativa",
    description: "Procesamiento autoritativo con Groq Whisper en curso.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "ingreso.container",
      "ingreso.msg-reconciliacion",
      "ingreso.textarea"
    ]
  },
  "ingreso:degraded": {
    screen: "ingreso",
    scenario: "degraded",
    title: "Ingreso · Modo Degradado (Fallback Preview)",
    description: "Reconciliación degradada conservando previsualización ASR en vivo.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "ingreso.container",
      "ingreso.aviso-degradado",
      "ingreso.textarea"
    ]
  },
  "ingreso:error": {
    screen: "ingreso",
    scenario: "error",
    title: "Ingreso · Error de Captura/Micrófono",
    description: "Mensaje de error visible cuando el permiso o el servicio de audio falla.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "ingreso.container",
      "ingreso.msg-error",
      "ingreso.textarea"
    ]
  },

  // 2. Archivo
  "archivo:list": {
    screen: "archivo",
    scenario: "list",
    title: "Archivo · Lista de Volcados",
    description: "Índice de volcados archivados en el sistema.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "pipeline.container",
      "pipeline.summary",
      "pipeline.filters",
      "pipeline.list"
    ]
  },
  "archivo:selected": {
    screen: "archivo",
    scenario: "selected",
    title: "Archivo · Volcado Seleccionado",
    description: "Volcado archivado seleccionado con panel lateral de traza.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "pipeline.container",
      "pipeline.list",
      "pipeline.item-card",
      "pipeline.drawer"
    ]
  },
  "archivo:empty": {
    screen: "archivo",
    scenario: "empty",
    title: "Archivo · Sin Volcados",
    description: "Estado vacío de la lista de volcados.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "pipeline.container",
      "pipeline.empty-state"
    ]
  },
  "archivo:loading": {
    screen: "archivo",
    scenario: "loading",
    title: "Archivo · Cargando Lista",
    description: "Indicador de carga de la lista de volcados.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "pipeline.container",
      "pipeline.loading-state"
    ]
  },
  "archivo:error": {
    screen: "archivo",
    scenario: "error",
    title: "Archivo · Error de Carga",
    description: "Error al recuperar la lista de volcados.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "pipeline.container",
      "pipeline.empty-state"
    ]
  },

  // 3. Revisión
  "revision:reading": {
    screen: "revision",
    scenario: "reading",
    title: "Revisión · Modo Lectura",
    description: "Mesa de revisión en modo lectura con prosa resaltada.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "pipeline.container",
      "revision.cockpit-header",
      "revision.reading-prose",
      "revision.audio-player"
    ]
  },
  "revision:editing": {
    screen: "revision",
    scenario: "editing",
    title: "Revisión · Modo Edición",
    description: "Mesa de revisión con textarea activo para editar la versión.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "pipeline.container",
      "revision.textarea-editor",
      "revision.btn-guardar-version"
    ]
  },
  "revision:suggestions": {
    screen: "revision",
    scenario: "suggestions",
    title: "Revisión · Navegador de Hallazgos",
    description: "Navegador interactivo de sugerencias y hallazgos lingüísticos.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "pipeline.container",
      "revision.hallazgos-nav",
      "revision.btn-aceptar-hallazgo",
      "revision.btn-rechazar-hallazgo"
    ]
  },
  "revision:audio_multipart": {
    screen: "revision",
    scenario: "audio_multipart",
    title: "Revisión · Reproductor Multipart de Audio",
    description: "Reproducción continua de audio sincronizado con marcas de tiempo.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "pipeline.container",
      "revision.audio-player",
      "revision.btn-play-pause",
      "revision.audio-seek-slider"
    ]
  },
  "revision:incident": {
    screen: "revision",
    scenario: "incident",
    title: "Revisión · Banner de Incidente Operativo",
    description: "Incidente de audio detectado con opción de resolución explícita.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "pipeline.container",
      "revision.banner-incidente",
      "revision.btn-resolver-incidente"
    ]
  },
  "revision:gate_blocked": {
    screen: "revision",
    scenario: "gate_blocked",
    title: "Revisión · Compuerta Bloqueada",
    description: "Compuerta de aprobación en estado bloqueado por reglas u observaciones pendientes.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "pipeline.container",
      "approval.gate",
      "approval.blockers-list"
    ]
  },
  "revision:gate_ready": {
    screen: "revision",
    scenario: "gate_ready",
    title: "Revisión · Compuerta Habilitada",
    description: "Compuerta de aprobación lista para autorización del operador.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "pipeline.container",
      "approval.gate",
      "approval.hold-button",
      "approval.keyboard-btn"
    ]
  },

  // 4. Aprobación
  "aprobacion:blocked": {
    screen: "aprobacion",
    scenario: "blocked",
    title: "Aprobación · Estado Bloqueado",
    description: "Compuerta de aprobación con impedimentos ativos.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "approval.gate",
      "approval.blockers-list"
    ]
  },
  "aprobacion:ready": {
    screen: "aprobacion",
    scenario: "ready",
    title: "Aprobación · Lista para Firmar",
    description: "Compuerta habilitada con botón de fricción (mantener 2s).",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "approval.gate",
      "approval.hold-button",
      "approval.keyboard-btn"
    ]
  },
  "aprobacion:approved": {
    screen: "aprobacion",
    scenario: "approved",
    title: "Aprobación · Versión Aprobada",
    description: "Badge e indicador de versión aprobada lista para ingesta.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "approval.gate",
      "approval.badge-approved",
      "ingesta.btn-ingerir"
    ]
  },

  // 5. Ingesta
  "ingesta:idle": {
    screen: "ingesta",
    scenario: "idle",
    title: "Ingesta · Lista para Ingerir",
    description: "Volcado aprobado con botón de ingesta en el grafo activo.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "ingesta.container",
      "ingesta.btn-ingerir"
    ]
  },
  "ingesta:running": {
    screen: "ingesta",
    scenario: "running",
    title: "Ingesta · Ingesta en Curso",
    description: "Estado de procesamiento al enviar la propuesta al kernel.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "ingesta.container",
      "ingesta.status-running"
    ]
  },
  "ingesta:success": {
    screen: "ingesta",
    scenario: "success",
    title: "Ingesta · Ingesta Exitosa",
    description: "Resultado exitoso con io_id retornado por la ingesta.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "ingesta.container",
      "ingesta.result-success"
    ]
  },
  "ingesta:failure": {
    screen: "ingesta",
    scenario: "failure",
    title: "Ingesta · Fallo de Ingesta",
    description: "Mensaje de error presentado ante fallo en el pipeline de ingesta.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "ingesta.container",
      "ingesta.result-failure"
    ]
  },

  // 6. Registro
  "registro:timeline": {
    screen: "registro",
    scenario: "timeline",
    title: "Registro · Línea de Tiempo",
    description: "Visor de eventos de sistema con semáforos de estado y filtros por fase.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "registro.container",
      "registro.header",
      "registro.filter-bar",
      "registro.events-list",
      "registro.event-item"
    ]
  },
  "registro:empty": {
    screen: "registro",
    scenario: "empty",
    title: "Registro · Lista Vacía",
    description: "Estado sin eventos registrados.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "registro.container",
      "registro.empty-state"
    ]
  },
  "registro:loading": {
    screen: "registro",
    scenario: "loading",
    title: "Registro · Cargando Eventos",
    description: "Estado de carga inicial de la bitácora de eventos.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "registro.container",
      "registro.loading-state"
    ]
  },
  "registro:error": {
    screen: "registro",
    scenario: "error",
    title: "Registro · Error de Carga",
    description: "Error al consultar la API de eventos de sistema.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "registro.container",
      "registro.error-state",
      "registro.btn-reintentar"
    ]
  },

  // 7. Grafo
  "grafo:populated": {
    screen: "grafo",
    scenario: "populated",
    title: "Grafo · Proyección Leiden Poblada",
    description: "Visualización de entidades y comunidades Leiden en lista o diagrama.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "grafo.container",
      "grafo.header",
      "grafo.view-toggle",
      "grafo.node-list",
      "grafo.panel-inspection"
    ]
  },
  "grafo:dense": {
    screen: "grafo",
    scenario: "dense",
    title: "Grafo · Densidad Elevada",
    description: "Visualización de grafo denso con codificación visual activa.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "grafo.container",
      "grafo.header",
      "grafo.flow-view"
    ]
  },
  "grafo:empty": {
    screen: "grafo",
    scenario: "empty",
    title: "Grafo · Grafo Vacío",
    description: "Estado inicial sin nodos o relaciones proyectadas.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "grafo.container",
      "grafo.empty-state"
    ]
  },
  "grafo:loading": {
    screen: "grafo",
    scenario: "loading",
    title: "Grafo · Cargando Proyecciones",
    description: "Indicador de carga durante la proyección del grafo.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "grafo.container",
      "grafo.loading-state"
    ]
  },
  "grafo:error": {
    screen: "grafo",
    scenario: "error",
    title: "Grafo · Error de Proyección",
    description: "Error al recuperar la proyecciones del grafo.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: [
      "grafo.container",
      "grafo.error-state"
    ]
  },

  // ── ESCENARIOS DE FALLO ──────────────────────────────────────────────
  // Casos derivados de incidentes reales observados en produccion.
  "ingreso:boveda_bloqueada": {
    screen: "ingreso",
    scenario: "boveda_bloqueada",
    title: "Ingreso · Boveda Bloqueada",
    description: "La boveda esta cerrada (HTTP 423). El audio no puede cifrarse ni custodiarse; el sistema debe declarar la causa real, no un error de codec.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: ["ingreso.container", "ingreso.msg-error", "ingreso.btn-archivar", "ingreso.textarea"]
  },
  "ingreso:audio_grande": {
    screen: "ingreso",
    scenario: "audio_grande",
    title: "Ingreso · Adjunto de 13.97 MB",
    description: "Archivo MP3 de 19 minutos que excede el limite de 4.5 MB de una funcion serverless. Debe subirse por carga directa cifrada, nunca por la funcion.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: ["ingreso.container", "ingreso.btn-adjuntar", "ingreso.stats", "ingreso.msg-resultado"]
  },
  "ingreso:timeout_archivado": {
    screen: "ingreso",
    scenario: "timeout_archivado",
    title: "Ingreso · Timeout al Archivar",
    description: "FUNCTION_INVOCATION_TIMEOUT: la ruta critica excedio su limite. El texto no debe perderse y el volcado debe quedar recuperable.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: ["ingreso.container", "ingreso.msg-error", "ingreso.btn-archivar", "ingreso.textarea"]
  },
  "ingreso:red_perdida": {
    screen: "ingreso",
    scenario: "red_perdida",
    title: "Ingreso · Red Perdida Durante el Dictado",
    description: "Reconexiones acumuladas y partes de audio pendientes de subir. El dictado continua; nada de lo capturado se descarta.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: ["ingreso.container", "ingreso.status-listening", "ingreso.aviso-degradado", "ingreso.stats", "ingreso.textarea"]
  },
  "ingreso:texto_contaminado": {
    screen: "ingreso",
    scenario: "texto_contaminado",
    title: "Ingreso · Texto Contaminado por el ASR",
    description: "La transcripcion contiene fuga del prompt del motor y una alucinacion de cierre. Viola F2 Ninguna Palabra Ajena y debe senalarse antes de archivar.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: ["ingreso.container", "ingreso.textarea", "ingreso.msg-reconciliacion", "ingreso.btn-retranscribir"]
  },
  "ingreso:truncamiento_utf8": {
    screen: "ingreso",
    scenario: "truncamiento_utf8",
    title: "Ingreso · Palabras Truncadas en la Tilde",
    description: "Ocho palabras cortadas exactamente en la primera tilde por truncamiento UTF-8 multibyte, con perdida de puntuacion. Viola F3 Integridad de Caracteres.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: ["ingreso.container", "ingreso.textarea", "ingreso.msg-error", "ingreso.btn-retranscribir"]
  },
  "ingreso:sin_titulo": {
    screen: "ingreso",
    scenario: "sin_titulo",
    title: "Ingreso · Titulacion Fallida",
    description: "El generador de titulos no respondio. Legibilidad es degradable: el volcado avanza pero el fallo queda visible y reintentable.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: ["ingreso.container", "ingreso.titulo-input", "ingreso.btn-titulo-ia", "ingreso.msg-reconciliacion"]
  },
  "archivo:sin_titulo": {
    screen: "archivo",
    scenario: "sin_titulo",
    title: "Archivo · Volcados sin Titulo",
    description: "Volcados que superaron Custodia y Fidelidad pero no Legibilidad. Aparecen sin nombre y requieren titulacion manual o reintento.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: ["pipeline.container", "pipeline.list", "pipeline.item-card", "pipeline.summary"]
  },
  "archivo:carga_completa": {
    screen: "archivo",
    scenario: "carga_completa",
    title: "Archivo · Bandeja Densa",
    description: "Bandeja con muchos volcados, titulos largos y descripciones de un parrafo. Verifica densidad, desbordamiento y jerarquia visual.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: ["pipeline.container", "pipeline.list", "pipeline.item-card", "pipeline.filters", "pipeline.summary"]
  },
  "archivo:preparacion_fallida": {
    screen: "archivo",
    scenario: "preparacion_fallida",
    title: "Archivo · Preparacion Fallida",
    description: "Volcados detenidos por fallo de protocolo, con la causa exacta visible. Nunca deben aparentar normalidad ni mostrar error desconocido.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: ["pipeline.container", "pipeline.list", "pipeline.item-card", "pipeline.summary"]
  },
  "revision:texto_largo": {
    screen: "revision",
    scenario: "texto_largo",
    title: "Revision · Dictado Extenso",
    description: "Transcripcion de 19 minutos en lectura continua. Verifica ancho de columna, ritmo tipografico y comodidad de lectura prolongada.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: ["pipeline.container", "pipeline.drawer", "revision.reading-prose", "revision.cockpit-header", "revision.audio-player"]
  },
  "revision:audio_ausente": {
    screen: "revision",
    scenario: "audio_ausente",
    title: "Revision · Audio No Vinculado",
    description: "Incidente audio_no_vinculado: el volcado carece de audio custodiado. Viola C2 y no puede contrastarse contra la fuente.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: ["pipeline.container", "pipeline.drawer", "revision.banner-incidente", "revision.btn-resolver-incidente", "revision.reading-prose"]
  },
  "revision:integridad_violada": {
    screen: "revision",
    scenario: "integridad_violada",
    title: "Revision · Barrera de Integridad Violada",
    description: "El SHA-256 del verbatim no coincide con el sellado. Fallo bloqueante de C3: el volcado no puede avanzar bajo ninguna circunstancia.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: ["pipeline.container", "pipeline.drawer", "revision.banner-incidente", "revision.cockpit-header", "revision.reading-prose"]
  },
  "registro:errores": {
    screen: "registro",
    scenario: "errores",
    title: "Registro · Eventos Fallidos",
    description: "Log con eventos FAIL de titulacion, transcripcion y archivado. Cada fallo debe declarar causa aprovechable, nunca un catch vacio.",
    status: "active",
    recommended_viewport: "desktop",
    ui_ids: ["registro.container", "registro.events-list", "registro.event-item", "registro.filter-bar", "registro.btn-copiar"]
  }
};

export const SCREENS: ScreenId[] = [
  "ingreso",
  "archivo",
  "revision",
  "aprobacion",
  "ingesta",
  "registro",
  "grafo"
];

export function getScenario(screen: ScreenId, scenarioName: string): ScenarioDefinition | null {
  const key = `${screen}:${scenarioName}`;
  return UI_REVIEW_SCENARIOS[key] ?? null;
}

export function getAllScenariosForScreen(screen: ScreenId): ScenarioDefinition[] {
  return Object.values(UI_REVIEW_SCENARIOS).filter((s) => s.screen === screen);
}
