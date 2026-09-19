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
  modeloDefecto?: string;
  ventanaContextoTokens?: number;
  capacidades: Record<string, boolean | string | number>;
  motor?: "ollama";
  requiereGPU?: boolean;
  sinCredencial?: boolean;
  modelosLocales?: LocalModelCatalogEntry[];
  notas?: string;
}

export type FuenteResolucionLocal = "override" | "detectado" | "recomendado_no_instalado";

export interface ModeloLocalResueltoResult {
  modeloResuelto: string;
  ventanaContextoTokens: number | null;
  fuenteResolucion: FuenteResolucionLocal;
  descripcionFuente: string;
  tagCatalogo?: LocalModelCatalogEntry;
}

/**
 * Parsea el string de contexto de la tabla de modelos locales a tokens binarios reales
 * (ej. "128K" -> 131072, "256K" -> 262144, "—" -> null).
 */
export function parsearContextoTokensBinario(contextoStr?: string | null): number | null {
  if (!contextoStr || contextoStr.trim() === "—") {
    return null;
  }
  const match = contextoStr.trim().match(/^(\d+(?:\.\d+)?)\s*([KMGT])?$/i);
  if (!match) return null;

  const num = parseFloat(match[1]);
  const unit = (match[2] || "").toUpperCase();

  switch (unit) {
    case "K":
      return Math.round(num * 1024);
    case "M":
      return Math.round(num * 1024 * 1024);
    case "G":
      return Math.round(num * 1024 * 1024 * 1024);
    default:
      return Math.round(num);
  }
}

/**
 * Resuelve dinámicamente el modelo activo y la ventana de contexto para el perfil local
 * siguiendo el orden estricto de resolución:
 * 1. modeloOverride (si existe y no está vacío) -> fuente: "override"
 * 2. Cruce entre modelosInstalados y los tags de modelosLocales en el ORDEN del catálogo -> fuente: "detectado"
 * 3. Fallback explícito a qwen3.8:27b -> fuente: "recomendado_no_instalado"
 */
export function resolverModeloYVentanaLocal(
  modeloOverride?: string | null,
  modelosInstalados: string[] = [],
  modelosLocales: LocalModelCatalogEntry[] = MODEL_CATALOG_CONFIG.perfiles.find((p) => p.perfilId === "local")?.modelosLocales || []
): ModeloLocalResueltoResult {
  if (modeloOverride && modeloOverride.trim() !== "") {
    const overrideLimpio = modeloOverride.trim();
    const coincideCatalogo = modelosLocales.find(
      (m) => m.tag.toLowerCase() === overrideLimpio.toLowerCase() || overrideLimpio.toLowerCase().startsWith(m.tag.toLowerCase())
    );
    const ventana = coincideCatalogo ? parsearContextoTokensBinario(coincideCatalogo.contexto) : null;

    return {
      modeloResuelto: overrideLimpio,
      ventanaContextoTokens: ventana,
      fuenteResolucion: "override",
      descripcionFuente: "Modelo fijado por override manual",
      tagCatalogo: coincideCatalogo,
    };
  }

  for (const itemCatalogo of modelosLocales) {
    const instaladoCoincidente = modelosInstalados.find((inst) =>
      inst.toLowerCase().startsWith(itemCatalogo.tag.toLowerCase()) ||
      itemCatalogo.tag.toLowerCase().startsWith(inst.toLowerCase())
    );
    if (instaladoCoincidente) {
      return {
        modeloResuelto: instaladoCoincidente,
        ventanaContextoTokens: parsearContextoTokensBinario(itemCatalogo.contexto),
        fuenteResolucion: "detectado",
        descripcionFuente: `Modelo detectado en sistema ('${instaladoCoincidente}')`,
        tagCatalogo: itemCatalogo,
      };
    }
  }

  const recomendado = modelosLocales.find((m) => m.tag === "qwen3.8:27b") || modelosLocales[0];
  const tagRecomendado = recomendado ? recomendado.tag : "qwen3.8:27b";
  const contextoRecomendado = recomendado ? parsearContextoTokensBinario(recomendado.contexto) : 262144;

  return {
    modeloResuelto: tagRecomendado,
    ventanaContextoTokens: contextoRecomendado,
    fuenteResolucion: "recomendado_no_instalado",
    descripcionFuente: `Modelo recomendado (no instalado) ('${tagRecomendado}')`,
    tagCatalogo: recomendado,
  };
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
