// @l0 L0-002-R · @req REVISION/REQ-1 · @acr ACR-1.2 · @req REVISION-COCKPIT/REQ-1
import { createHash } from "crypto";
import { z } from "zod";
import { obtenerGlosario } from "./pulido";
import { getDb } from "./neon";
import { reportarIncidente } from "./incidentes";

export type TipoFamiliaHallazgo = "correccion_aplicable" | "observacion_editorial";

export type TipoCategoriaSugerencia =
  | "ortografia"
  | "tildes"
  | "puntuacion"
  | "mayusculas"
  | "error_tipografico"
  | "lexico"
  | "semantico"
  | "sintaxis"
  | "discurso";

export type SeveridadSugerencia = "alta" | "media" | "baja";
export type EstadoHallazgo = "pendiente" | "aceptada" | "rechazada" | "resuelta";
export type OrigenSugerencia = "ortotipografico" | "llm" | "detector_khora";

export interface Hallazgo {
  id: string;
  volcado_id: string;
  version: number;
  sha256: string;
  fingerprint: string;
  familia: TipoFamiliaHallazgo;
  origen: OrigenSugerencia;
  posicion: { inicio: number; fin: number };
  texto_original: string;
  sugerencia: string;
  regla: string;
  tipo_categoria: TipoCategoriaSugerencia;
  severidad: SeveridadSugerencia;
  confianza: number;
  estado: EstadoHallazgo;
  explicacion?: string;
  codigo_resolucion?: string | null;
  resuelto_por?: string | null;
  resuelto_en?: string | null;
}

const HALLAZGO_DDL = `
CREATE TABLE IF NOT EXISTS volcado_hallazgo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volcado_id UUID NOT NULL REFERENCES volcado(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  familia TEXT NOT NULL DEFAULT 'correccion_aplicable',
  origen TEXT NOT NULL DEFAULT 'detector_khora',
  char_inicio INTEGER NOT NULL,
  char_fin INTEGER NOT NULL,
  texto_original TEXT NOT NULL,
  sugerencia TEXT NOT NULL,
  regla TEXT NOT NULL,
  tipo_categoria TEXT NOT NULL,
  severidad TEXT NOT NULL DEFAULT 'media',
  confianza REAL NOT NULL DEFAULT 0.90,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  explicacion TEXT,
  codigo_resolucion TEXT,
  resuelto_por TEXT,
  resuelto_en TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT volcado_hallazgo_fp_uniq UNIQUE (volcado_id, version, fingerprint)
);
CREATE INDEX IF NOT EXISTS volcado_hallazgo_volcado_ver_idx ON volcado_hallazgo(volcado_id, version);
`;

let hallazgoDdlListo = false;

export async function asegurarTablaHallazgos(): Promise<void> {
  if (hallazgoDdlListo) return;
  const db = getDb();
  await db.query(HALLAZGO_DDL);
  hallazgoDdlListo = true;
}

export function calcularFingerprint(
  volcadoId: string,
  version: number,
  regla: string,
  posInicio: number,
  posFin: number,
  textoOriginal: string
): string {
  const raw = `${volcadoId}:${version}:${regla}:${posInicio}:${posFin}:${textoOriginal}`;
  return createHash("sha256").update(raw, "utf8").digest("hex").slice(0, 16);
}

const PALABRAS_NEGACION = new Set([
  "no",
  "nunca",
  "jamas",
  "jamás",
  "sin",
  "tampoco",
  "ningun",
  "ningún",
  "ninguno",
  "ninguna",
  "nada",
  "nadie"
]);

const REGLAS_TILDES_COMUNES: Record<string, string> = {
  mas: "más",
  tambien: "también",
  segun: "según",
  seccion: "sección",
  cancion: "canción",
  version: "versión",
  ultima: "última",
  ultimo: "último",
  codigo: "código",
  numero: "número",
  pagina: "página",
  ademas: "además",
  despues: "después",
  esta: "está",
  estan: "están",
  habia: "había",
  tenia: "tenía",
  aqui: "aquí",
  asi: "así",
  arbol: "árbol",
  facil: "fácil",
  dificil: "difícil",
  caracter: "carácter"
};

export function clasificarCambioSemantico(
  original: string,
  sugerido: string
): {
  esCambioSemantico: boolean;
  severidad: SeveridadSugerencia;
  tipo_categoria: TipoCategoriaSugerencia;
  familia: TipoFamiliaHallazgo;
} {
  const origNorm = original.trim().toLowerCase();
  const sugNorm = sugerido.trim().toLowerCase();

  const esNegOrig = PALABRAS_NEGACION.has(origNorm);
  const esNegSug = PALABRAS_NEGACION.has(sugNorm);
  if (esNegOrig !== esNegSug) {
    return { esCambioSemantico: true, severidad: "alta", tipo_categoria: "semantico", familia: "observacion_editorial" };
  }

  const numOrig = original.match(/\d+/g);
  const numSug = sugerido.match(/\d+/g);
  if (JSON.stringify(numOrig) !== JSON.stringify(numSug)) {
    return { esCambioSemantico: true, severidad: "alta", tipo_categoria: "semantico", familia: "observacion_editorial" };
  }

  if (origNorm !== sugNorm) {
    const sinDiacriticoOrig = origNorm.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const sinDiacriticoSug = sugNorm.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (sinDiacriticoOrig === sinDiacriticoSug) {
      if (origNorm !== sugNorm) {
        return { esCambioSemantico: false, severidad: "baja", tipo_categoria: "tildes", familia: "correccion_aplicable" };
      }
      return { esCambioSemantico: false, severidad: "baja", tipo_categoria: "mayusculas", familia: "correccion_aplicable" };
    }

    if (original.length > 3 && sugerido.length > 3) {
      return { esCambioSemantico: true, severidad: "alta", tipo_categoria: "semantico", familia: "observacion_editorial" };
    }

    return { esCambioSemantico: false, severidad: "media", tipo_categoria: "lexico", familia: "correccion_aplicable" };
  }

  if (original.toLowerCase() === sugerido.toLowerCase()) {
    if (/[.,;:!?]/.test(original) || /[.,;:!?]/.test(sugerido)) {
      return { esCambioSemantico: false, severidad: "baja", tipo_categoria: "puntuacion", familia: "correccion_aplicable" };
    }
    return { esCambioSemantico: false, severidad: "baja", tipo_categoria: "mayusculas", familia: "correccion_aplicable" };
  }

  return { esCambioSemantico: false, severidad: "baja", tipo_categoria: "ortografia", familia: "correccion_aplicable" };
}

export async function generarYPersistirHallazgos(
  volcadoId: string,
  version: number,
  sha256: string,
  texto: string
): Promise<Hallazgo[]> {
  await asegurarTablaHallazgos();
  const db = getDb();

  if (!texto || texto.trim().length === 0) {
    return [];
  }

  const borradorHallazgos: Array<{
    origen: OrigenSugerencia;
    posicion: { inicio: number; fin: number };
    texto_original: string;
    sugerencia: string;
    regla: string;
    tipo_categoria: TipoCategoriaSugerencia;
    severidad: SeveridadSugerencia;
    confianza: number;
    familia: TipoFamiliaHallazgo;
    explicacion?: string;
  }> = [];

  // Regla 1: Múltiples espacios
  const regexEspacios = / {2,}/g;
  let match: RegExpExecArray | null;
  while ((match = regexEspacios.exec(texto)) !== null) {
    borradorHallazgos.push({
      origen: "ortotipografico",
      posicion: { inicio: match.index, fin: match.index + match[0].length },
      texto_original: match[0],
      sugerencia: " ",
      regla: "Espacios múltiples duplicados",
      tipo_categoria: "puntuacion",
      severidad: "baja",
      confianza: 0.99,
      familia: "correccion_aplicable",
      explicacion: "Eliminar espacios consecutivos innecesarios"
    });
  }

  // Regla 2: Puntuación pegada
  const regexPuntuacionEspacio = /([a-záéíóúñA-ZÁÉÍÓÚÑ0-9])([.,;:!?])([a-záéíóúñA-ZÁÉÍÓÚÑ0-9])/g;
  while ((match = regexPuntuacionEspacio.exec(texto)) !== null) {
    const orig = match[0];
    const sug = `${match[1]}${match[2]} ${match[3]}`;
    borradorHallazgos.push({
      origen: "ortotipografico",
      posicion: { inicio: match.index, fin: match.index + orig.length },
      texto_original: orig,
      sugerencia: sug,
      regla: "Puntuación seguida de palabra sin espacio",
      tipo_categoria: "puntuacion",
      severidad: "baja",
      confianza: 0.95,
      familia: "correccion_aplicable",
      explicacion: `Insertar espacio tras '${match[2]}'`
    });
  }

  // Regla 3: Tildes
  const palabras = texto.split(/(\s+|[.,;:!?()]+)/);
  let idx = 0;
  for (const token of palabras) {
    const tokenNorm = token.toLowerCase();
    if (REGLAS_TILDES_COMUNES[tokenNorm] && token !== REGLAS_TILDES_COMUNES[tokenNorm]) {
      const sugerido = REGLAS_TILDES_COMUNES[tokenNorm];
      const sugFinal = token[0] === token[0].toUpperCase() ? sugerido[0].toUpperCase() + sugerido.slice(1) : sugerido;
      borradorHallazgos.push({
        origen: "ortotipografico",
        posicion: { inicio: idx, fin: idx + token.length },
        texto_original: token,
        sugerencia: sugFinal,
        regla: `Acentuación/Tilde ortográfica para '${tokenNorm}'`,
        tipo_categoria: "tildes",
        severidad: "baja",
        confianza: 0.92,
        familia: "correccion_aplicable",
        explicacion: `Acentuar '${token}' como '${sugFinal}'`
      });
    }
    idx += token.length;
  }

  // Regla 4: Glosario
  const glosario = obtenerGlosario();
  for (const [clave, valor] of Object.entries(glosario)) {
    if (!clave || !valor || clave === valor) continue;
    const regex = new RegExp(`\\b${clave.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    let matchGl: RegExpExecArray | null;
    while ((matchGl = regex.exec(texto)) !== null) {
      const orig = matchGl[0];
      if (orig !== valor) {
        const clasif = clasificarCambioSemantico(orig, valor);
        borradorHallazgos.push({
          origen: "llm",
          posicion: { inicio: matchGl.index, fin: matchGl.index + orig.length },
          texto_original: orig,
          sugerencia: valor,
          regla: "Término de Glosario KHORA",
          tipo_categoria: clasif.tipo_categoria,
          severidad: clasif.severidad,
          confianza: 0.96,
          familia: clasif.familia,
          explicacion: `Glosario canónico: '${valor}'`
        });
      }
    }
  }

  // Regla 5: Groq LLM hallazgos de sentido
  const sugerenciasLLM = await obtenerSugerenciasLLM(texto, volcadoId);
  for (const sug of sugerenciasLLM) {
    borradorHallazgos.push({
      origen: "llm",
      posicion: sug.posicion,
      texto_original: sug.texto_original,
      sugerencia: sug.sugerencia,
      regla: sug.regla,
      tipo_categoria: sug.tipo_categoria,
      severidad: sug.severidad,
      confianza: sug.confianza,
      familia: "observacion_editorial",
      explicacion: sug.explicacion,
    });
  }

  // Persistir idempotentemente hallazgos para esta versión
  const hallazgosPersistidos: Hallazgo[] = [];

  for (const item of borradorHallazgos) {
    const fp = calcularFingerprint(
      volcadoId,
      version,
      item.regla,
      item.posicion.inicio,
      item.posicion.fin,
      item.texto_original
    );

    const res = await db.query(
      `INSERT INTO volcado_hallazgo
       (volcado_id, version, sha256, fingerprint, familia, origen, char_inicio, char_fin, texto_original, sugerencia, regla, tipo_categoria, severidad, confianza, estado, explicacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pendiente', $15)
       ON CONFLICT (volcado_id, version, fingerprint) DO UPDATE SET
         sha256 = EXCLUDED.sha256
       RETURNING id, volcado_id, version, sha256, fingerprint, familia, origen, char_inicio, char_fin, texto_original, sugerencia, regla, tipo_categoria, severidad, confianza, estado, explicacion, codigo_resolucion, resuelto_por, resuelto_en;`,
      [
        volcadoId,
        version,
        sha256,
        fp,
        item.familia,
        item.origen,
        item.posicion.inicio,
        item.posicion.fin,
        item.texto_original,
        item.sugerencia,
        item.regla,
        item.tipo_categoria,
        item.severidad,
        item.confianza,
        item.explicacion ?? null,
      ]
    );

    const r = res.rows[0];
    hallazgosPersistidos.push({
      id: r.id,
      volcado_id: r.volcado_id,
      version: Number(r.version),
      sha256: r.sha256,
      fingerprint: r.fingerprint,
      familia: r.familia as TipoFamiliaHallazgo,
      origen: r.origen as OrigenSugerencia,
      posicion: { inicio: Number(r.char_inicio), fin: Number(r.char_fin) },
      texto_original: r.texto_original,
      sugerencia: r.sugerencia,
      regla: r.regla,
      tipo_categoria: r.tipo_categoria as TipoCategoriaSugerencia,
      severidad: r.severidad as SeveridadSugerencia,
      confianza: Number(r.confianza),
      estado: r.estado as EstadoHallazgo,
      explicacion: r.explicacion,
      codigo_resolucion: r.codigo_resolucion,
      resuelto_por: r.resuelto_por,
      resuelto_en: r.resuelto_en,
    });
  }

  return hallazgosPersistidos;
}

export async function listarHallazgos(volcadoId: string, version: number): Promise<Hallazgo[]> {
  await asegurarTablaHallazgos();
  const db = getDb();
  const res = await db.query(
    `SELECT id, volcado_id, version, sha256, fingerprint, familia, origen, char_inicio, char_fin, texto_original, sugerencia, regla, tipo_categoria, severidad, confianza, estado, explicacion, codigo_resolucion, resuelto_por, resuelto_en
     FROM volcado_hallazgo
     WHERE volcado_id = $1 AND version = $2
     ORDER BY char_inicio ASC`,
    [volcadoId, version]
  );

  return res.rows.map((r: any) => ({
    id: r.id,
    volcado_id: r.volcado_id,
    version: Number(r.version),
    sha256: r.sha256,
    fingerprint: r.fingerprint,
    familia: r.familia as TipoFamiliaHallazgo,
    origen: r.origen as OrigenSugerencia,
    posicion: { inicio: Number(r.char_inicio), fin: Number(r.char_fin) },
    texto_original: r.texto_original,
    sugerencia: r.sugerencia,
    regla: r.regla,
    tipo_categoria: r.tipo_categoria as TipoCategoriaSugerencia,
    severidad: r.severidad as SeveridadSugerencia,
    confianza: Number(r.confianza),
    estado: r.estado as EstadoHallazgo,
    explicacion: r.explicacion,
    codigo_resolucion: r.codigo_resolucion,
    resuelto_por: r.resuelto_por,
    resuelto_en: r.resuelto_en,
  }));
}

export async function resolverHallazgo(params: {
  hallazgoId: string;
  estado: EstadoHallazgo;
  usuario: string;
  codigoResolucion?: string;
}): Promise<Hallazgo> {
  await asegurarTablaHallazgos();
  const db = getDb();

  const res = await db.query(
    `UPDATE volcado_hallazgo
     SET estado = $2, resuelto_por = $3, resuelto_en = NOW(), codigo_resolucion = $4
     WHERE id = $1
     RETURNING id, volcado_id, version, sha256, fingerprint, familia, origen, char_inicio, char_fin, texto_original, sugerencia, regla, tipo_categoria, severidad, confianza, estado, explicacion, codigo_resolucion, resuelto_por, resuelto_en;`,
    [params.hallazgoId, params.estado, params.usuario, params.codigoResolucion ?? null]
  );

  if (res.rows.length === 0) throw new Error("Hallazgo no encontrado");

  const r = res.rows[0];
  return {
    id: r.id,
    volcado_id: r.volcado_id,
    version: Number(r.version),
    sha256: r.sha256,
    fingerprint: r.fingerprint,
    familia: r.familia as TipoFamiliaHallazgo,
    origen: r.origen as OrigenSugerencia,
    posicion: { inicio: Number(r.char_inicio), fin: Number(r.char_fin) },
    texto_original: r.texto_original,
    sugerencia: r.sugerencia,
    regla: r.regla,
    tipo_categoria: r.tipo_categoria as TipoCategoriaSugerencia,
    severidad: r.severidad as SeveridadSugerencia,
    confianza: Number(r.confianza),
    estado: r.estado as EstadoHallazgo,
    explicacion: r.explicacion,
    codigo_resolucion: r.codigo_resolucion,
    resuelto_por: r.resuelto_por,
    resuelto_en: r.resuelto_en,
  };
}

export async function obtenerSugerenciasOrtotipograficas(texto: string) {
  return [];
}

const ObservacionesLLMSchema = z.object({
  observaciones: z.array(
    z.object({
      cita: z.string(),
      sugerencia: z.string(),
      regla: z.string().default("Observación editorial de sentido"),
      categoria: z.enum(["ortografia", "tildes", "puntuacion", "mayusculas", "error_tipografico", "lexico", "semantico", "sintaxis", "discurso"]).default("sintaxis"),
      severidad: z.enum(["alta", "media", "baja"]).default("media"),
      explicacion: z.string().default("Observación de coherencia local"),
    })
  )
});

export async function obtenerSugerenciasLLM(
  texto: string,
  volcadoId?: string
): Promise<Array<{
  posicion: { inicio: number; fin: number };
  texto_original: string;
  sugerencia: string;
  regla: string;
  tipo_categoria: TipoCategoriaSugerencia;
  severidad: SeveridadSugerencia;
  confianza: number;
  explicacion: string;
}>> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !texto || texto.trim().length === 0) {
    return [];
  }

  const prompt = `Analiza el siguiente texto en español y detecta únicamente observaciones de sentido u oraciones inconclusas/ambiguas.
Reglas:
1. "cita" DEBE ser una cita literal de palabras contiguas que existan exactas en el texto.
2. Devuelve un JSON en este formato:
{
  "observaciones": [
    {
      "cita": "texto literal exacto",
      "sugerencia": "sugerencia o aclaración",
      "regla": "Oración incompleta o incoherencia local",
      "categoria": "sintaxis",
      "severidad": "media",
      "explicacion": "Explicación breve"
    }
  ]
}

Texto:
"""
${texto.slice(0, 3000)}
"""`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      if (volcadoId) {
        await reportarIncidente({
          volcadoId,
          tipo: "analisis_llm_fallido",
          severidad: "baja",
          origen: "asistenteRevision",
          evidencia: { status: res.status, motivo: "Groq respondió con error HTTP al analizar sugerencias." },
        });
      }
      return [];
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) return [];

    const parsed = ObservacionesLLMSchema.safeParse(JSON.parse(content));
    if (!parsed.success) {
      if (volcadoId) {
        await reportarIncidente({
          volcadoId,
          tipo: "analisis_llm_fallido",
          severidad: "baja",
          origen: "asistenteRevision",
          evidencia: { motivo: "Respuesta de Groq no superó la validación Zod." },
        });
      }
      return [];
    }

    const obsList = parsed.data.observaciones;
    const sugerencias = [];

    for (const obs of obsList) {
      if (!obs.cita) continue;
      const idx = texto.indexOf(obs.cita);
      // Validar grounding verificable sobre el texto completo
      if (idx !== -1) {
        sugerencias.push({
          posicion: { inicio: idx, fin: idx + obs.cita.length },
          texto_original: obs.cita,
          sugerencia: obs.sugerencia,
          regla: obs.regla,
          tipo_categoria: obs.categoria as TipoCategoriaSugerencia,
          severidad: obs.severidad as SeveridadSugerencia,
          confianza: 0.88,
          explicacion: obs.explicacion,
        });
      }
    }

    return sugerencias;
  } catch (err) {
    if (volcadoId) {
      await reportarIncidente({
        volcadoId,
        tipo: "analisis_llm_fallido",
        severidad: "baja",
        origen: "asistenteRevision",
        evidencia: { error: String(err) },
      });
    }
    return [];
  }
}

export async function obtenerTodasSugerencias(texto: string) {
  return await obtenerSugerenciasLLM(texto);
}
