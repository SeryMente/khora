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
  puntuaciones: Record<string, number | null>;
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
    "SWE-bench_Verified": {
      nombre: "SWE-bench Verified",
      descripcion: "Resolución de issues reales de GitHub",
      unidad: "%",
      maxScore: 100,
    },
    GPQA_Diamond: {
      nombre: "GPQA Diamond",
      descripcion: "Preguntas de ciencia nivel doctorado",
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
      nombreModelo: "GPT-5.5",
      proveedor: "OpenAI",
      esFrontera: true,
      puntuaciones: {
        MMLU: 92.4,
        "SWE-bench_Verified": 88.6,
        GPQA_Diamond: 94.0,
        TTFT_ms: 300,
        TPS: 110,
      },
    },
    {
      nombreModelo: "Claude Opus 4.8",
      proveedor: "Anthropic",
      esFrontera: true,
      puntuaciones: {
        MMLU: null,
        "SWE-bench_Verified": 88.6,
        GPQA_Diamond: 93.6,
        TTFT_ms: 350,
        TPS: 95,
      },
    },
    {
      nombreModelo: "Gemini 3.1 Pro",
      proveedor: "Google",
      esFrontera: true,
      puntuaciones: {
        MMLU: null,
        "SWE-bench_Verified": 80.6,
        GPQA_Diamond: 94.3,
        TTFT_ms: 400,
        TPS: 85,
      },
    },
    {
      nombreModelo: "GPT-OSS-120B",
      proveedor: "OpenAI (vía Groq)",
      esFrontera: false,
      puntuaciones: {
        MMLU: 90.0,
        "SWE-bench_Verified": 62.4,
        GPQA_Diamond: 80.9,
      },
    },
    {
      nombreModelo: "DeepSeek V4 Flash",
      proveedor: "DeepSeek (perfil open_source)",
      esFrontera: false,
      puntuaciones: {},
    },
    {
      nombreModelo: "Gemini 3.8 Flash",
      proveedor: "Google (perfil gemini)",
      esFrontera: false,
      puntuaciones: {},
    },
  ],
};
