// @l0 L0-002-R · @req PROMPT-3A/PROPUESTAS
import { createHash, randomUUID } from "crypto";
import { getDb } from "./neon";
import { asegurarTabla } from "./volcados";
import { cifrarTexto, descifrarTexto } from "./cripto";
import { crearVersion } from "./correcciones";
import { autoaplicarTildesSeguras } from "./tildesSeguras";
import { obtenerGlosario } from "./pulido";
import { registrarEvento } from "./eventos";

export type EstadoPropuesta = "pendiente" | "aceptada" | "rechazada" | "pendiente_revision";

export interface PropuestaCorreccion {
  id: string;
  volcado_id: string;
  version: number;
  sha256: string;
  terna: string;
  start: number;
  end: number;
  texto_original_exacto: string;
  reemplazo: string;
  categoria: string;
  regla: string;
  explicacion: string;
  confianza: number;
  proveedor: string;
  modelo: string;
  sello: string;
  estado: EstadoPropuesta;
  created_at?: string;
  updated_at?: string;
}

const PROPUESTA_DDL = `
CREATE TABLE IF NOT EXISTS volcado_propuesta_correccion (
  id UUID PRIMARY KEY,
  volcado_id UUID NOT NULL REFERENCES volcado(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  terna TEXT NOT NULL,
  start_pos INTEGER NOT NULL,
  end_pos INTEGER NOT NULL,
  texto_original_exacto TEXT NOT NULL,
  reemplazo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  regla TEXT NOT NULL,
  explicacion TEXT NOT NULL,
  confianza REAL NOT NULL DEFAULT 1.0,
  proveedor TEXT NOT NULL,
  modelo TEXT NOT NULL,
  sello TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS volcado_propuesta_correccion_volcado_ver_idx ON volcado_propuesta_correccion(volcado_id, version);
CREATE INDEX IF NOT EXISTS volcado_propuesta_correccion_terna_idx ON volcado_propuesta_correccion(terna);
CREATE INDEX IF NOT EXISTS volcado_propuesta_correccion_estado_idx ON volcado_propuesta_correccion(estado);
`;

let esquemaListo = false;

export async function asegurarEsquemaPropuestas(): Promise<void> {
  if (esquemaListo) return;
  await asegurarTabla();
  const db = getDb();
  await db.query(PROPUESTA_DDL);
  esquemaListo = true;
}

export function construirTerna(volcadoId: string, version: number, sha256: string): string {
  return `(${volcadoId},${version},${sha256})`;
}

export function calcularSelloPropuesta(p: {
  terna: string;
  start: number;
  end: number;
  texto_original_exacto: string;
  reemplazo: string;
  categoria: string;
  regla: string;
}): string {
  const payload = `${p.terna}:${p.start}:${p.end}:${p.texto_original_exacto}:${p.reemplazo}:${p.categoria}:${p.regla}`;
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function validarSpanExacto(source: string, start: number, end: number, textoOriginalExacto: string): boolean {
  if (start < 0 || end > source.length || start > end) return false;
  return source.slice(start, end) === textoOriginalExacto;
}

export function haySolapamiento(propuestas: Array<{ start: number; end: number }>): boolean {
  const ordenadas = [...propuestas].sort((a, b) => a.start - b.start);
  for (let i = 0; i < ordenadas.length - 1; i++) {
    if (ordenadas[i].end > ordenadas[i + 1].start) {
      return true;
    }
  }
  return false;
}

export function obtenerSolapados(propuestas: Array<{ id: string; start: number; end: number }>): Set<string> {
  const solapados = new Set<string>();
  const ordenadas = [...propuestas].sort((a, b) => a.start - b.start);
  for (let i = 0; i < ordenadas.length; i++) {
    for (let j = i + 1; j < ordenadas.length; j++) {
      if (ordenadas[i].end > ordenadas[j].start) {
        solapados.add(ordenadas[i].id);
        solapados.add(ordenadas[j].id);
      } else {
        break;
      }
    }
  }
  return solapados;
}

/**
 * Genera propuestas basadas en reglas ortotipográficas deterministas (Capas 1 y 2).
 */
export function generarPropuestasReglas(
  texto: string,
  terna: string
): Omit<PropuestaCorreccion, "id" | "volcado_id" | "version" | "sha256" | "estado">[] {
  const propuestas: Omit<PropuestaCorreccion, "id" | "volcado_id" | "version" | "sha256" | "estado">[] = [];

  // Regla 1: Tildes seguras e inequívocas
  const tildesRes = autoaplicarTildesSeguras(texto);
  for (const subst of tildesRes.sustituciones) {
    const [start, end] = subst.rango;
    const sello = calcularSelloPropuesta({
      terna,
      start,
      end,
      texto_original_exacto: subst.textoOriginal,
      reemplazo: subst.sugerencia,
      categoria: "tildes",
      regla: subst.regla,
    });

    propuestas.push({
      terna,
      start,
      end,
      texto_original_exacto: subst.textoOriginal,
      reemplazo: subst.sugerencia,
      categoria: "tildes",
      regla: subst.regla,
      explicacion: `Acentuación obligatoria de '${subst.textoOriginal}' a '${subst.sugerencia}'`,
      confianza: 0.99,
      proveedor: "khora_rules",
      modelo: "v1",
      sello,
    });
  }

  // Regla 2: Espacios múltiples consecutivos
  const regexEspacios = / {2,}/g;
  let matchEsp: RegExpExecArray | null;
  while ((matchEsp = regexEspacios.exec(texto)) !== null) {
    const start = matchEsp.index;
    const end = start + matchEsp[0].length;
    const orig = matchEsp[0];
    const sug = " ";
    const regla = "Espacios múltiples duplicados";
    const categoria = "espacios";
    const sello = calcularSelloPropuesta({
      terna,
      start,
      end,
      texto_original_exacto: orig,
      reemplazo: sug,
      categoria,
      regla,
    });

    propuestas.push({
      terna,
      start,
      end,
      texto_original_exacto: orig,
      reemplazo: sug,
      categoria,
      regla,
      explicacion: "Normalizar espacios múltiples a un solo espacio",
      confianza: 0.99,
      proveedor: "khora_rules",
      modelo: "v1",
      sello,
    });
  }

  // Regla 3: Signo de puntuación seguido inmediatamente por letra/número sin espacio
  const regexPunctNoSpace = /([a-záéíóúñA-ZÁÉÍÓÚÑ0-9])([.,;:!?])([a-záéíóúñA-ZÁÉÍÓÚÑ0-9])/g;
  let matchPunct: RegExpExecArray | null;
  while ((matchPunct = regexPunctNoSpace.exec(texto)) !== null) {
    const start = matchPunct.index;
    const end = start + matchPunct[0].length;
    const orig = matchPunct[0];
    const sug = `${matchPunct[1]}${matchPunct[2]} ${matchPunct[3]}`;
    const regla = "Espacio faltante tras signo de puntuación";
    const categoria = "puntuacion";
    const sello = calcularSelloPropuesta({
      terna,
      start,
      end,
      texto_original_exacto: orig,
      reemplazo: sug,
      categoria,
      regla,
    });

    propuestas.push({
      terna,
      start,
      end,
      texto_original_exacto: orig,
      reemplazo: sug,
      categoria,
      regla,
      explicacion: `Insertar espacio tras '${matchPunct[2]}'`,
      confianza: 0.95,
      proveedor: "khora_rules",
      modelo: "v1",
      sello,
    });
  }

  // Regla 4: Signos de apertura faltantes (¿ / ¡)
  const regexInterrogacionSinApertura = /(^|[.!?]\s+)([A-ZÁÉÍÓÚÑa-záéíóúñ0-9\s]+?\?)/g;
  let matchInt: RegExpExecArray | null;
  while ((matchInt = regexInterrogacionSinApertura.exec(texto)) !== null) {
    const prefix = matchInt[1];
    const frase = matchInt[2];
    if (!frase.startsWith("¿")) {
      const start = matchInt.index + prefix.length;
      const end = start + frase.length;
      const orig = frase;
      const sug = `¿${frase}`;
      const regla = "Insertar signo de apertura de interrogación";
      const categoria = "signos_apertura";
      const sello = calcularSelloPropuesta({
        terna,
        start,
        end,
        texto_original_exacto: orig,
        reemplazo: sug,
        categoria,
        regla,
      });

      propuestas.push({
        terna,
        start,
        end,
        texto_original_exacto: orig,
        reemplazo: sug,
        categoria,
        regla,
        explicacion: "Añadir '¿' al inicio de la oración interrogativa",
        confianza: 0.90,
        proveedor: "khora_rules",
        modelo: "v1",
        sello,
      });
    }
  }

  // Regla 5: Mayúscula inicial tras punto seguido
  const regexMayusTrasPunto = /(\.\s+)([a-zñáéíóú])/g;
  let matchMayus: RegExpExecArray | null;
  while ((matchMayus = regexMayusTrasPunto.exec(texto)) !== null) {
    const prefix = matchMayus[1];
    const char = matchMayus[2];
    const start = matchMayus.index + prefix.length;
    const end = start + char.length;
    const orig = char;
    const sug = char.toUpperCase();
    const regla = "Mayúscula inicial tras punto";
    const categoria = "mayusculas";
    const sello = calcularSelloPropuesta({
      terna,
      start,
      end,
      texto_original_exacto: orig,
      reemplazo: sug,
      categoria,
      regla,
    });

    propuestas.push({
      terna,
      start,
      end,
      texto_original_exacto: orig,
      reemplazo: sug,
      categoria,
      regla,
      explicacion: `Convertir '${orig}' a mayúscula '${sug}' tras punto`,
      confianza: 0.98,
      proveedor: "khora_rules",
      modelo: "v1",
      sello,
    });
  }

  // Regla 6: Léxico / Glosario KHORA
  const glosario = obtenerGlosario();
  for (const [clave, valor] of Object.entries(glosario)) {
    if (!clave || !valor || clave === valor) continue;
    const regex = new RegExp(`\\b${clave.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    let matchGl: RegExpExecArray | null;
    while ((matchGl = regex.exec(texto)) !== null) {
      const orig = matchGl[0];
      if (orig !== valor) {
        const start = matchGl.index;
        const end = start + orig.length;
        const regla = "Sustitución de Léxico / Glosario";
        const categoria = "lexico";
        const sello = calcularSelloPropuesta({
          terna,
          start,
          end,
          texto_original_exacto: orig,
          reemplazo: valor,
          categoria,
          regla,
        });

        propuestas.push({
          terna,
          start,
          end,
          texto_original_exacto: orig,
          reemplazo: valor,
          categoria,
          regla,
          explicacion: `Glosario canónico: '${valor}'`,
          confianza: 0.96,
          proveedor: "khora_rules",
          modelo: "v1",
          sello,
        });
      }
    }
  }

  return propuestas;
}

/**
 * Genera parches estructurados mediante LLM (Capa 3).
 */
export async function generarPropuestasLLM(
  texto: string,
  terna: string
): Promise<Omit<PropuestaCorreccion, "id" | "volcado_id" | "version" | "sha256" | "estado">[]> {
  const clave = process.env.GROQ_API_KEY;
  const modelo = process.env.GROQ_PULIDO_MODEL ?? "llama-3.3-70b-versatile";
  if (!clave || !texto || texto.trim().length === 0) {
    return [];
  }

  const systemPrompt = [
    "Eres un generador de parches de corrección ortotipográfica para transcripciones en español.",
    "Analiza el texto y genera sugerencias de parches puntualizados estrictos.",
    "Reglas de oro:",
    "1. CADA propuesta DEBE ser un parche con el texto original exacto (cita literal contigua).",
    "2. NO modifiques nombres propios, siglas, axiomas, citas literales ni marcas registradas.",
    "3. Devuelve únicamente un objeto JSON con este formato exacto:",
    '{"parches": [{"texto_original_exacto": "string", "reemplazo": "string", "categoria": "tildes|n_tilde|mayusculas|espacios|puntuacion|signos_apertura|llm_patch", "regla": "string", "explicacion": "string", "confianza": 0.90}]}',
  ].join(" ");

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clave}`,
      },
      body: JSON.stringify({
        model: modelo,
        temperature: 0,
        max_tokens: 2048,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: texto },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) return [];

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return [];
    }

    const parches = Array.isArray(parsed?.parches) ? parsed.parches : [];
    const resultado: Omit<PropuestaCorreccion, "id" | "volcado_id" | "version" | "sha256" | "estado">[] = [];

    for (const p of parches) {
      if (
        typeof p.texto_original_exacto !== "string" ||
        typeof p.reemplazo !== "string" ||
        p.texto_original_exacto.length === 0 ||
        p.texto_original_exacto === p.reemplazo
      ) {
        continue;
      }

      // Localizar offset en el texto fuente
      const start = texto.indexOf(p.texto_original_exacto);
      if (start === -1) continue; // Grounding fallido en el texto original
      const end = start + p.texto_original_exacto.length;

      // Guardián de span: validar slice idéntico
      if (!validarSpanExacto(texto, start, end, p.texto_original_exacto)) {
        continue;
      }

      const categoria = typeof p.categoria === "string" ? p.categoria : "llm_patch";
      const regla = typeof p.regla === "string" ? p.regla : "Corrección LLM de ortotipografía";
      const explicacion = typeof p.explicacion === "string" ? p.explicacion : "Parche de corrección estructurada";
      const confianza = typeof p.confianza === "number" && p.confianza >= 0 && p.confianza <= 1 ? p.confianza : 0.85;

      const sello = calcularSelloPropuesta({
        terna,
        start,
        end,
        texto_original_exacto: p.texto_original_exacto,
        reemplazo: p.reemplazo,
        categoria,
        regla,
      });

      resultado.push({
        terna,
        start,
        end,
        texto_original_exacto: p.texto_original_exacto,
        reemplazo: p.reemplazo,
        categoria,
        regla,
        explicacion,
        confianza,
        proveedor: "groq",
        modelo,
        sello,
      });
    }

    return resultado;
  } catch {
    return [];
  }
}

/**
 * Genera, valida con guardián duro y almacena propuestas para la versión actual de un volcado.
 */
export async function generarYPersistirPropuestas(
  volcadoId: string,
  options?: { mockLLMParches?: Array<Omit<PropuestaCorreccion, "id" | "volcado_id" | "version" | "sha256" | "estado">> }
): Promise<PropuestaCorreccion[]> {
  await asegurarEsquemaPropuestas();
  const db = getDb();

  const vRes = await db.query(
    "SELECT id, texto, sha256, estado FROM volcado WHERE id = $1",
    [volcadoId]
  );
  if (vRes.rows.length === 0) {
    throw new Error(`Volcado no encontrado: ${volcadoId}`);
  }

  const volcadoRow = vRes.rows[0];
  const textoFuente = descifrarTexto(String(volcadoRow.texto ?? ""));
  const sha256Fuente = String(volcadoRow.sha256 ?? "");

  const verRes = await db.query(
    "SELECT COALESCE(MAX(version), 1)::int AS ultima FROM volcado_version WHERE volcado_id = $1",
    [volcadoId]
  );
  const versionActual = Number(verRes.rows[0]?.ultima ?? 1);
  const terna = construirTerna(volcadoId, versionActual, sha256Fuente);

  // 1. Capa de Reglas
  const propuestasReglas = generarPropuestasReglas(textoFuente, terna);

  // 2. Capa LLM
  let propuestasLLM: Omit<PropuestaCorreccion, "id" | "volcado_id" | "version" | "sha256" | "estado">[] = [];
  if (options?.mockLLMParches) {
    propuestasLLM = options.mockLLMParches;
  } else {
    propuestasLLM = await generarPropuestasLLM(textoFuente, terna);
  }

  const borradorCombinado = [...propuestasReglas, ...propuestasLLM];

  // 3. Aplicar Guardián Duro de Span e Identidad
  const candidatosConId: Array<PropuestaCorreccion> = [];
  for (const b of borradorCombinado) {
    // Validar slice exacto
    if (!validarSpanExacto(textoFuente, b.start, b.end, b.texto_original_exacto)) {
      continue; // Descartar si el span no es idéntico
    }

    candidatosConId.push({
      id: randomUUID(),
      volcado_id: volcadoId,
      version: versionActual,
      sha256: sha256Fuente,
      terna: b.terna,
      start: b.start,
      end: b.end,
      texto_original_exacto: b.texto_original_exacto,
      reemplazo: b.reemplazo,
      categoria: b.categoria,
      regla: b.regla,
      explicacion: b.explicacion,
      confianza: b.confianza,
      proveedor: b.proveedor,
      modelo: b.modelo,
      sello: b.sello,
      estado: "pendiente",
    });
  }

  // 4. Marcar solapamientos como 'pendiente_revision'
  const idsSolapados = obtenerSolapados(candidatosConId);
  for (const item of candidatosConId) {
    if (idsSolapados.has(item.id)) {
      item.estado = "pendiente_revision";
    }
  }

  // 5. Persistir en BD
  const result: PropuestaCorreccion[] = [];
  for (const p of candidatosConId) {
    const res = await db.query(
      `INSERT INTO volcado_propuesta_correccion
       (id, volcado_id, version, sha256, terna, start_pos, end_pos, texto_original_exacto, reemplazo, categoria, regla, explicacion, confianza, proveedor, modelo, sello, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING id, volcado_id, version, sha256, terna, start_pos, end_pos, texto_original_exacto, reemplazo, categoria, regla, explicacion, confianza, proveedor, modelo, sello, estado, created_at, updated_at`,
      [
        p.id,
        p.volcado_id,
        p.version,
        p.sha256,
        p.terna,
        p.start,
        p.end,
        p.texto_original_exacto,
        p.reemplazo,
        p.categoria,
        p.regla,
        p.explicacion,
        p.confianza,
        p.proveedor,
        p.modelo,
        p.sello,
        p.estado,
      ]
    );

    const r = res.rows[0];
    result.push({
      id: r.id,
      volcado_id: r.volcado_id,
      version: Number(r.version),
      sha256: r.sha256,
      terna: r.terna,
      start: Number(r.start_pos),
      end: Number(r.end_pos),
      texto_original_exacto: r.texto_original_exacto,
      reemplazo: r.reemplazo,
      categoria: r.categoria,
      regla: r.regla,
      explicacion: r.explicacion,
      confianza: Number(r.confianza),
      proveedor: r.proveedor,
      modelo: r.modelo,
      sello: r.sello,
      estado: r.estado as EstadoPropuesta,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : undefined,
      updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
    });
  }

  await registrarEvento({
    fase: "revision",
    eventId: "REV-004",
    estado: "OK",
    mensaje: "Propuestas de corrección generadas y persistidas bajo guardián",
    detalle: { total: result.length, solapadas: idsSolapados.size },
    volcadoId,
    version: versionActual,
    sha256: sha256Fuente,
    correlacionId: volcadoId,
  });

  return result;
}

/**
 * Lista las propuestas almacenadas para un volcado y versión activa.
 */
export async function listarPropuestasCorreccion(volcadoId: string, version?: number): Promise<PropuestaCorreccion[]> {
  await asegurarEsquemaPropuestas();
  const db = getDb();

  let targetVersion = version;
  if (!targetVersion) {
    const verRes = await db.query(
      "SELECT COALESCE(MAX(version), 1)::int AS ultima FROM volcado_version WHERE volcado_id = $1",
      [volcadoId]
    );
    targetVersion = Number(verRes.rows[0]?.ultima ?? 1);
  }

  const res = await db.query(
    `SELECT id, volcado_id, version, sha256, terna, start_pos, end_pos, texto_original_exacto, reemplazo, categoria, regla, explicacion, confianza, proveedor, modelo, sello, estado, created_at, updated_at
     FROM volcado_propuesta_correccion
     WHERE volcado_id = $1 AND version = $2
     ORDER BY start_pos ASC`,
    [volcadoId, targetVersion]
  );

  return res.rows.map((r: any) => ({
    id: r.id,
    volcado_id: r.volcado_id,
    version: Number(r.version),
    sha256: r.sha256,
    terna: r.terna,
    start: Number(r.start_pos),
    end: Number(r.end_pos),
    texto_original_exacto: r.texto_original_exacto,
    reemplazo: r.reemplazo,
    categoria: r.categoria,
    regla: r.regla,
    explicacion: r.explicacion,
    confianza: Number(r.confianza),
    proveedor: r.proveedor,
    modelo: r.modelo,
    sello: r.sello,
    estado: r.estado as EstadoPropuesta,
    created_at: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
  }));
}

export type ResultadoAplicacionPropuestas = {
  exito: boolean;
  motivo?: string;
  nuevaVersion?: number;
  nuevoSha256?: string;
  propuestasAplicadas?: number;
};

/**
 * Ratifica un lote de propuestas aceptadas, validando el guardián de span, SHA no vencido y cero solapamientos.
 * Crea una NUEVA volcado_version sin modificar jamás la versión fuente.
 */
export async function aplicarPropuestasCorreccion(
  volcadoId: string,
  propuestaIds: string[],
  options?: { actor?: string | null }
): Promise<ResultadoAplicacionPropuestas> {
  await asegurarEsquemaPropuestas();
  const db = getDb();

  if (!propuestaIds || propuestaIds.length === 0) {
    return { exito: false, motivo: "Lista de propuestaIds vacía" };
  }

  // Consultar volcado activo
  const vRes = await db.query("SELECT id, texto, sha256, estado FROM volcado WHERE id = $1", [volcadoId]);
  if (vRes.rows.length === 0) {
    return { exito: false, motivo: `Volcado no encontrado: ${volcadoId}` };
  }

  const volcadoRow = vRes.rows[0];
  const textoFuente = descifrarTexto(String(volcadoRow.texto ?? ""));
  const sha256Fuente = String(volcadoRow.sha256 ?? "");

  const verRes = await db.query(
    "SELECT COALESCE(MAX(version), 1)::int AS ultima FROM volcado_version WHERE volcado_id = $1",
    [volcadoId]
  );
  const versionActual = Number(verRes.rows[0]?.ultima ?? 1);

  // Consultar propuestas solicitadas
  const propsRes = await db.query(
    `SELECT id, volcado_id, version, sha256, terna, start_pos, end_pos, texto_original_exacto, reemplazo, categoria, regla, explicacion, confianza, proveedor, modelo, sello, estado
     FROM volcado_propuesta_correccion
     WHERE id = ANY($1::uuid[]) AND volcado_id = $2`,
    [propuestaIds, volcadoId]
  );

  if (propsRes.rows.length !== propuestaIds.length) {
    return { exito: false, motivo: "Una o más propuestas no fueron encontradas para este volcado" };
  }

  const propuestas = propsRes.rows.map((r: any) => ({
    id: r.id as string,
    volcado_id: r.volcado_id as string,
    version: Number(r.version),
    sha256: r.sha256 as string,
    terna: r.terna as string,
    start: Number(r.start_pos),
    end: Number(r.end_pos),
    texto_original_exacto: r.texto_original_exacto as string,
    reemplazo: r.reemplazo as string,
    categoria: r.categoria as string,
    regla: r.regla as string,
    explicacion: r.explicacion as string,
    confianza: Number(r.confianza),
    proveedor: r.proveedor as string,
    modelo: r.modelo as string,
    sello: r.sello as string,
    estado: r.estado as EstadoPropuesta,
  }));

  // 1. Verificar SHA no vencido y versión coincidente
  for (const p of propuestas) {
    if (p.sha256 !== sha256Fuente || p.version !== versionActual) {
      return {
        exito: false,
        motivo: `SHA o versión vencida para la propuesta ${p.id}. La versión fuente ha cambiado.`,
      };
    }
  }

  // 2. Verificar exactitud de span sobre el texto fuente actual
  for (const p of propuestas) {
    if (!validarSpanExacto(textoFuente, p.start, p.end, p.texto_original_exacto)) {
      return {
        exito: false,
        motivo: `El texto fuente en el span [${p.start}, ${p.end}] no coincide exactamente con '${p.texto_original_exacto}' para la propuesta ${p.id}`,
      };
    }
  }

  // 3. Verificar CERO solapamientos en el lote
  if (haySolapamiento(propuestas)) {
    const solapadasIds = Array.from(obtenerSolapados(propuestas));
    if (solapadasIds.length > 0) {
      await db.query(
        `UPDATE volcado_propuesta_correccion SET estado = 'pendiente_revision', updated_at = NOW() WHERE id = ANY($1::uuid[])`,
        [solapadasIds]
      );
    }
    return {
      exito: false,
      motivo: "Solapamiento detectado en el lote de propuestas. Las propuestas en conflicto fueron marcadas como 'pendiente_revision'.",
    };
  }

  // 4. Aplicar reemplazos deterministas de derecha a izquierda (mayor start a menor start)
  const propuestasOrdenadas = [...propuestas].sort((a, b) => b.start - a.start);
  let textoEditado = textoFuente;

  for (const p of propuestasOrdenadas) {
    textoEditado = textoEditado.slice(0, p.start) + p.reemplazo + textoEditado.slice(p.end);
  }

  // 5. Crear NUEVA versión mediante `crearVersion`
  const nueva = await crearVersion(volcadoId, textoEditado, "ratificación de propuestas de corrección aceptadas");

  // Actualizar la tabla volcado principal
  await db.query(
    "UPDATE volcado SET texto_original = COALESCE(texto_original, texto), texto = $2, sha256 = $3, chars = $4, estado = $5, version_aprobada = NULL, sha256_aprobado = NULL, aprobado_en = NULL, aprobador = NULL, editado_en = NOW(), ediciones = COALESCE(ediciones, 0) + 1 WHERE id = $1",
    [volcadoId, cifrarTexto(textoEditado), nueva.sha256, textoEditado.length, "en_revision"]
  );

  // Marcar propuestas como 'aceptadas'
  await db.query(
    `UPDATE volcado_propuesta_correccion SET estado = 'aceptada', updated_at = NOW() WHERE id = ANY($1::uuid[])`,
    [propuestaIds]
  );

  await registrarEvento({
    fase: "revision",
    eventId: "REV-005",
    estado: "OK",
    mensaje: "Lote de propuestas de corrección aplicado exitosamente creando nueva versión",
    detalle: {
      propuestasAplicadas: propuestaIds.length,
      versionAnterior: versionActual,
      nuevaVersion: nueva.version,
      actor: options?.actor ?? null,
    },
    volcadoId,
    version: nueva.version,
    sha256: nueva.sha256,
    correlacionId: volcadoId,
  });

  return {
    exito: true,
    nuevaVersion: nueva.version,
    nuevoSha256: nueva.sha256,
    propuestasAplicadas: propuestaIds.length,
  };
}

/**
 * Actualiza el estado de una propuesta individual (p. ej. rechazar manualmente).
 */
export async function actualizarEstadoPropuesta(
  propuestaId: string,
  nuevoEstado: EstadoPropuesta
): Promise<PropuestaCorreccion> {
  await asegurarEsquemaPropuestas();
  const db = getDb();

  const res = await db.query(
    `UPDATE volcado_propuesta_correccion
     SET estado = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id, volcado_id, version, sha256, terna, start_pos, end_pos, texto_original_exacto, reemplazo, categoria, regla, explicacion, confianza, proveedor, modelo, sello, estado, created_at, updated_at`,
    [propuestaId, nuevoEstado]
  );

  if (res.rows.length === 0) {
    throw new Error(`Propuesta de corrección no encontrada: ${propuestaId}`);
  }

  const r = res.rows[0];
  return {
    id: r.id,
    volcado_id: r.volcado_id,
    version: Number(r.version),
    sha256: r.sha256,
    terna: r.terna,
    start: Number(r.start_pos),
    end: Number(r.end_pos),
    texto_original_exacto: r.texto_original_exacto,
    reemplazo: r.reemplazo,
    categoria: r.categoria,
    regla: r.regla,
    explicacion: r.explicacion,
    confianza: Number(r.confianza),
    proveedor: r.proveedor,
    modelo: r.modelo,
    sello: r.sello,
    estado: r.estado as EstadoPropuesta,
    created_at: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
  };
}
