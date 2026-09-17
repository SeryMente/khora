// @l0 L0-002 · @req KPI-01/FRONTIER_BENCHMARKS · Configuración estática de referencia de modelos de frontera
export interface BenchmarkMetricInfo {
  nombre: string;
  descripcion: string;
  unidad: string;
  maxScore?: number;
}

export interface FrontierModelMetrics {
  nombreModelo: string;
  proveedor: string;
  esFrontera: boolean;
  puntuaciones: Record<string, number>;
}

export interface FrontierBenchmarkConfig {
  version: string;
  descripcion: string;
  definicionMetricas: Record<string, BenchmarkMetricInfo>;
  modelosFrontera: FrontierModelMetrics[];
}

export const FRONTIER_BENCHMARKS_CONFIG: FrontierBenchmarkConfig = {
  version: "1.0.0",
  descripcion: "Tabla de referencia estática de benchmarks de modelos de frontera para contraste comparativo de Khora.",
  definicionMetricas: {
    MMLU: {
      nombre: "MMLU",
      descripcion: "Measuring Massive Multitask Language Understanding (0-100%)",
      unidad: "%",
      maxScore: 100,
    },
    HumanEval: {
      nombre: "HumanEval",
      descripcion: "Evaluación de generación de código Python (0-100%)",
      unidad: "%",
      maxScore: 100,
    },
    TTFT_ms: {
      nombre: "TTFT",
      descripcion: "Time To First Token objetivo en milisegundos",
      unidad: "ms",
    },
    TPS: {
      nombre: "TPS",
      descripcion: "Tokens Per Second objetivo",
      unidad: "tok/s",
    },
  },
  modelosFrontera: [
    {
      nombreModelo: "GPT-4o",
      proveedor: "OpenAI",
      esFrontera: true,
      puntuaciones: {
        MMLU: 88.7,
        HumanEval: 90.2,
        TTFT_ms: 300,
        TPS: 110,
      },
    },
    {
      nombreModelo: "Claude 3.5 Sonnet",
      proveedor: "Anthropic",
      esFrontera: true,
      puntuaciones: {
        MMLU: 88.3,
        HumanEval: 92.0,
        TTFT_ms: 350,
        TPS: 95,
      },
    },
    {
      nombreModelo: "Gemini 1.5 Pro",
      proveedor: "Google",
      esFrontera: true,
      puntuaciones: {
        MMLU: 85.9,
        HumanEval: 84.1,
        TTFT_ms: 400,
        TPS: 85,
      },
    },
  ],
};
