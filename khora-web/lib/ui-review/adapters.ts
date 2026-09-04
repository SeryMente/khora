// @l0 L0-002 · @req UI-REVIEW/ADAPTERS · Adaptadores sintéticos de solo lectura para el Harness UI
import {
  FIXTURE_VOLCADOS,
  FIXTURE_HALLAZGOS,
  FIXTURE_INCIDENTES,
  FIXTURE_EVENTOS,
  FIXTURE_GRAFO_NODOS,
  FIXTURE_GRAFO_EDGES,
} from "./fixtures";

export interface ReviewAdapter {
  getVolcados(scenario?: string): Promise<any[]>;
  getVolcadoById(id: string, scenario?: string): Promise<any | null>;
  getAudioManifest(id: string, scenario?: string): Promise<any>;
  getGateDecision(id: string, scenario?: string): Promise<any>;
  getIncidentes(id: string, scenario?: string): Promise<any[]>;
  getHallazgos(id: string, scenario?: string): Promise<any[]>;
  getEventos(scenario?: string): Promise<any[]>;
  getGrafoData(scenario?: string): Promise<{ nodes: any[]; edges: any[] }>;
}

export class ReviewFixtureAdapter implements ReviewAdapter {
  async getVolcados(scenario?: string): Promise<any[]> {
    if (scenario === "empty") return [];
    if (scenario === "error") throw new Error("Error sintético de simulación de red");
    return FIXTURE_VOLCADOS;
  }

  async getVolcadoById(id: string, scenario?: string): Promise<any | null> {
    if (scenario === "error") throw new Error("Error sintético de simulación de v-item");
    const v = FIXTURE_VOLCADOS.find((item) => item.id === id) ?? FIXTURE_VOLCADOS[0];
    return v;
  }

  async getAudioManifest(id: string, scenario?: string): Promise<any> {
    if (scenario === "incident" || scenario === "gate_blocked") {
      return { partes: [] };
    }
    return {
      partes: [
        {
          part_index: 1,
          start_ms: 0,
          end_ms: 60000,
          duracion_ms: 60000,
          bytes: 524288,
          sha256: "synthetic-part-1-sha",
          verificado: true,
          download_path: "/api/audio/sintetico/parte/1",
        },
        {
          part_index: 2,
          start_ms: 60000,
          end_ms: 120000,
          duracion_ms: 60000,
          bytes: 524288,
          sha256: "synthetic-part-2-sha",
          verificado: true,
          download_path: "/api/audio/sintetico/parte/2",
        },
      ],
    };
  }

  async getGateDecision(id: string, scenario?: string): Promise<any> {
    if (scenario === "blocked" || scenario === "gate_blocked" || scenario === "incident") {
      return {
        canApprove: false,
        version: 1,
        sha256: "sintetico-sha256-bloqueado",
        gate_hash: "hash-compuerta-bloqueado-1234",
        blockers: [
          { code: "INCIDENTE_ABIERTO", message: "Incidente de audio pendiente de resolución explícita" },
        ],
        warnings: [],
        counts: {
          errores_tipograficos_pendientes: 0,
          correcciones_lingüisticas_pendientes: 1,
          observaciones_sintacticas_pendientes: 0,
          incidentes_operativos_abiertos: 1,
        },
      };
    }

    return {
      canApprove: true,
      version: 1,
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      gate_hash: "hash-compuerta-habilitado-5678",
      blockers: [],
      warnings: [],
      counts: {
        errores_tipograficos_pendientes: 0,
        correcciones_lingüisticas_pendientes: 0,
        observaciones_sintacticas_pendientes: 0,
        incidentes_operativos_abiertos: 0,
      },
    };
  }

  async getIncidentes(id: string, scenario?: string): Promise<any[]> {
    if (scenario === "incident" || scenario === "gate_blocked") {
      return FIXTURE_INCIDENTES;
    }
    return [];
  }

  async getHallazgos(id: string, scenario?: string): Promise<any[]> {
    if (scenario === "suggestions") {
      return FIXTURE_HALLAZGOS;
    }
    return [];
  }

  async getEventos(scenario?: string): Promise<any[]> {
    if (scenario === "empty") return [];
    if (scenario === "error") throw new Error("Error sintético consultando registro");
    return FIXTURE_EVENTOS;
  }

  async getGrafoData(scenario?: string): Promise<{ nodes: any[]; edges: any[] }> {
    if (scenario === "empty") return { nodes: [], edges: [] };
    if (scenario === "error") throw new Error("Error sintético al proyectar el grafo");
    return {
      nodes: FIXTURE_GRAFO_NODOS,
      edges: FIXTURE_GRAFO_EDGES,
    };
  }
}
