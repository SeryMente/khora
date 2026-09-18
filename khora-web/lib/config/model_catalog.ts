// @l0 L0-002 · @req KPI-01/MODEL_CATALOG · Catálogo de modelos de proveedores soportados por Khora
export interface CatalogModelEntry {
  perfilId: "open_source" | "gemini" | "groq";
  nombreProveedor: string;
  modeloDefecto: string;
  ventanaContextoTokens: number;
  capacidades: Record<string, boolean | string | number>;
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
      nombreProveedor: "Open Source / Local",
      modeloDefecto: "deepseek-v4-flash",
      ventanaContextoTokens: 1000000,
      capacidades: {
        streaming: true,
        usageMetrics: false,
        multiTurn: true,
        localExecution: true,
      },
      notas: "Acceso gratis vía OpenRouter (deepseek/deepseek-v4-flash:free) o API directa de DeepSeek con reasoning effort configurable.",
    },
  ],
};
