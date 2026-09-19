// @l0 L0-002 · @req KPI-01/MODEL_CATALOG · Catálogo de modelos de proveedores soportados por Khora
export interface LocalModelCatalogEntry {
  tag: string;
  vramAprox: string;
  contexto: string;
  benchmarkVerificado: string;
  usoRecomendado: string;
  advertenciaMxfp4?: boolean;
}

export interface CatalogModelEntry {
  perfilId: "open_source" | "gemini" | "groq" | "local";
  nombreProveedor: string;
  modeloDefecto: string;
  ventanaContextoTokens: number;
  capacidades: Record<string, boolean | string | number>;
  motor?: "ollama";
  requiereGPU?: boolean;
  sinCredencial?: boolean;
  modelosLocales?: LocalModelCatalogEntry[];
  notas?: string;
}

export interface ModelCatalogConfig {
  version: string;
  descripcion: string;
  perfiles: CatalogModelEntry[];
}

export const MODEL_CATALOG_CONFIG: ModelCatalogConfig = {
  version: "1.0.0",
  descripcion: "Catálogo estático de modelos y capacidades por perfil de proveedor en Khora.",
  perfiles: [
    {
      perfilId: "groq",
      nombreProveedor: "Groq Fast Inference",
      modeloDefecto: "openai/gpt-oss-120b",
      ventanaContextoTokens: 128000,
      capacidades: {
        streaming: true,
        usageMetrics: true,
        multiTurn: true,
        maxOutputTokens: 8192,
      },
      notas: "Inferencia ultra-rápida basada en LPU.",
    },
    {
      perfilId: "gemini",
      nombreProveedor: "Google Gemini",
      modeloDefecto: "gemini-3.8-flash",
      ventanaContextoTokens: 1000000,
      capacidades: {
        streaming: true,
        usageMetrics: true,
        multiTurn: true,
        multimodal: true,
      },
      notas: "Gran ventana de contexto y capacidad multimodal.",
    },
    {
      perfilId: "open_source",
      nombreProveedor: "Open Source / Cloud",
      modeloDefecto: "deepseek-v4-flash",
      ventanaContextoTokens: 1000000,
      capacidades: {
        streaming: true,
        usageMetrics: false,
        multiTurn: true,
        localExecution: false,
      },
      notas: "Acceso gratis vía OpenRouter (deepseek/deepseek-v4-flash:free) o API directa de DeepSeek con reasoning effort configurable.",
    },
    {
      perfilId: "local",
      nombreProveedor: "Local (Ollama)",
      modeloDefecto: "qwen3.8:27b",
      ventanaContextoTokens: 262144,
      motor: "ollama",
      requiereGPU: true,
      sinCredencial: true,
      capacidades: {
        streaming: true,
        usageMetrics: true,
        multiTurn: true,
        localExecution: true,
        directBrowserFetch: true,
      },
      modelosLocales: [
        {
          tag: "gpt-oss:20b",
          vramAprox: "~14–16 GB",
          contexto: "128K",
          benchmarkVerificado: "Nivel o3-mini (razonamiento ajustable)",
          usoRecomendado: "Equipo con 16GB, generalista",
          advertenciaMxfp4: true,
        },
        {
          tag: "devstral:24b",
          vramAprox: "14 GB",
          contexto: "—",
          benchmarkVerificado: "SWE-bench Verified 46.8%",
          usoRecomendado: "Mejor agente de código benchmarkeado en ese tamaño",
        },
        {
          tag: "qwen3-coder:30b",
          vramAprox: "19 GB",
          contexto: "256K",
          benchmarkVerificado: "Mejor calidad/GB en GPU de 24–32GB",
          usoRecomendado: "Codificación, mejor pick de consumo",
        },
        {
          tag: "qwen3.8:27b",
          vramAprox: "18 GB (o 24GB a Q4)",
          contexto: "256K",
          benchmarkVerificado: "SWE-bench 61.7%",
          usoRecomendado: "Mejor pick general en hardware de consumidor (publicado agosto 2026)",
        },
        {
          tag: "gpt-oss:120b",
          vramAprox: "~80 GB",
          contexto: "128K",
          benchmarkVerificado: "—",
          usoRecomendado: "Solo GPU de clase workstation/servidor",
          advertenciaMxfp4: true,
        },
      ],
      notas: "Inferencia en la máquina local vía Ollama. Llamada directa navegador → http://localhost:11434.",
    },
  ],
};
