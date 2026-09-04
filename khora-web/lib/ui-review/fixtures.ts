// @l0 L0-002 · @req UI-REVIEW/FIXTURES · Fixtures sintéticos locales sin llamadas externas
export const FIXTURE_VOLCADOS = [
  {
    id: "v-sintetico-001-uuid-demostración",
    folio: 101,
    session_id: "sesion-sintetica-001",
    session_estado: "completo",
    audio_status: "disponible" as const,
    partes_count: 2,
    blob_paths: ["/api/audio/v-sintetico-001-uuid-demostración/parte/1"],
    titulo: "Sesión de Revisión Estructural Khora",
    recibido_en: "2026-08-20T10:00:00Z",
    estado: "en_revision",
    io_id: null,
    ultimo_error: null,
    chars: 420,
    audio_url: "/api/audio/v-sintetico-001-uuid-demostración/parte/1",
    audio_bytes: 1048576,
    duracion_seg: 120,
    version_aprobada: null,
    sha256_aprobado: null,
    aprobador: null,
    aprobado_en: null,
    total_versiones: 2,
    version_actual: 2,
    nodos_count: 5,
    aristas_count: 4,
    integrity: "sync",
    audioStatus: "disponible",
    audio: {
      present: true,
      complete: true,
      bytes: 1048576,
      duration_sec: 120,
    },
    texto: "El sistema Khora procesa las transcripciones manteniendo la veracidad semántica de los volcados orales. Cada versión editada recalcula su firma SHA-256 de forma transparente para garantizar la trazabilidad forense."
  },
  {
    id: "v-sintetico-002-uuid-aprobado",
    folio: 102,
    session_id: "sesion-sintetica-002",
    session_estado: "completo",
    audio_status: "disponible" as const,
    partes_count: 1,
    blob_paths: [],
    titulo: "Aprobación y Transición a Ingesta",
    recibido_en: "2026-08-20T11:30:00Z",
    estado: "listo_ingesta",
    io_id: null,
    ultimo_error: null,
    chars: 280,
    audio_url: "/api/audio/v-sintetico-002-uuid-aprobado/parte/1",
    audio_bytes: 524288,
    duracion_seg: 60,
    version_aprobada: 1,
    sha256_aprobado: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    aprobador: "operador.sintetico@khora.local",
    aprobado_en: "2026-08-20T12:00:00Z",
    total_versiones: 1,
    version_actual: 1,
    nodos_count: 3,
    aristas_count: 2,
    integrity: "sync",
    audioStatus: "disponible",
    audio: {
      present: true,
      complete: true,
      bytes: 524288,
      duration_sec: 60,
    },
    texto: "Documento aprobado y ratificado listo para ingesta en el grafo de conocimiento."
  },
  {
    id: "v-sintetico-003-uuid-incidente",
    folio: 103,
    session_id: null,
    session_estado: null,
    audio_status: "no_recuperable" as const,
    partes_count: 0,
    blob_paths: [],
    titulo: "Volcado con Incidente de Audio",
    recibido_en: "2026-08-20T13:15:00Z",
    estado: "en_revision",
    io_id: null,
    ultimo_error: "Audio no disponible en almacenamiento",
    chars: 310,
    audio_url: null,
    audio_bytes: 0,
    duracion_seg: 0,
    version_aprobada: null,
    sha256_aprobado: null,
    aprobador: null,
    aprobado_en: null,
    total_versiones: 1,
    version_actual: 1,
    nodos_count: 0,
    aristas_count: 0,
    integrity: "text_without_audio",
    audioStatus: "no_recuperable",
    audio: {
      present: false,
      complete: false,
      bytes: 0,
      duration_sec: 0,
    },
    texto: "Este volcado requiere resolución explícita de incidente de audio antes de ser aprobado."
  }
];

export const FIXTURE_HALLAZGOS = [
  {
    id: "hal-001",
    familia: "observacion_editorial" as const,
    posicion: { inicio: 11, fin: 16 },
    texto_original: "Khora",
    sugerencia: "KHORA",
    regla: "SISTEMA-MAYÚSCULAS",
    tipo_categoria: "Ortografía",
    severidad: "baja" as const,
    estado: "pendiente" as const,
    explicacion: "Alineación canónica de la marca del sistema."
  }
];

export const FIXTURE_INCIDENTES = [
  {
    id: "inc-sintetico-001",
    volcado_id: "v-sintetico-003-uuid-incidente",
    tipo: "audio_no_recuperable",
    severidad: "alta" as const,
    origen: "mesa_revision_ui",
    estado: "abierto" as const,
    primera_deteccion: "2026-08-20T13:15:00Z",
    ultima_deteccion: "2026-08-20T13:15:00Z",
    codigo_resolucion: null,
    evidencia: { motivo: "Audio ausente en prueba sintética" }
  }
];

export const FIXTURE_EVENTOS = [
  {
    id: 1,
    fase: "dictado",
    event_id: "DIC-001",
    estado: "OK" as const,
    mensaje: "Dictado iniciado exitosamente",
    detalle: { sesion_id: "sesion-sintetica-001" },
    volcado_id: "v-sintetico-001-uuid-demostración",
    version: 1,
    sha256: "a1b2c3d4e5f6...",
    correlacion_id: "corr-sintetica-1001",
    servidor_en: "2026-08-20T10:00:00Z",
    cliente_en: "2026-08-20T10:00:00Z",
    hash_anterior: "0000000000000000000000000000000000000000000000000000000000000000",
    event_hash: "f1e2d3c4b5a6..."
  },
  {
    id: 2,
    fase: "revision",
    event_id: "REV-002",
    estado: "OK" as const,
    mensaje: "Aprobación de versión efectuada",
    detalle: { version: 1 },
    volcado_id: "v-sintetico-002-uuid-aprobado",
    version: 1,
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    correlacion_id: "corr-sintetica-1002",
    servidor_en: "2026-08-20T12:00:00Z",
    cliente_en: "2026-08-20T12:00:00Z",
    hash_anterior: "f1e2d3c4b5a6...",
    event_hash: "9876543210ab..."
  }
];

export const FIXTURE_GRAFO_NODOS = [
  {
    id: "n1",
    summary: "Sistemas Inteligentes Organizados",
    community: 1,
    level: 1,
    centrality: 0.85,
    origen: "volcado-101",
    timestamp: "2026-08-20T10:00:00Z",
    verificacion: "verificado_ratificado"
  },
  {
    id: "n2",
    summary: "Procesamiento de Lenguaje Natural y Whisper",
    community: 1,
    level: 1,
    centrality: 0.65,
    origen: "volcado-101",
    timestamp: "2026-08-20T10:00:00Z",
    verificacion: "verificado_ratificado"
  },
  {
    id: "n3",
    summary: "Trazabilidad Forense y Memoria Inmutable",
    community: 2,
    level: 1,
    centrality: 0.75,
    origen: "volcado-102",
    timestamp: "2026-08-20T11:30:00Z",
    verificacion: "verificado_ratificado"
  }
];

export const FIXTURE_GRAFO_EDGES = [
  {
    id: "e1-2",
    source: "n1",
    target: "n2",
    weight: 0.9,
    origen: "volcado-101",
    timestamp: "2026-08-20T10:00:00Z",
    verificacion: "verificado_ratificado"
  },
  {
    id: "e1-3",
    source: "n1",
    target: "n3",
    weight: 0.7,
    origen: "volcado-102",
    timestamp: "2026-08-20T11:30:00Z",
    verificacion: "verificado_ratificado"
  }
];
