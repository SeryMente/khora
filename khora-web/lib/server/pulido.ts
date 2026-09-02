// @l0 L0-002-R · @req FIX-DICTADO/D1-D4
import glosarioJson from "../transcripcion/glosario.json";
import { aplicarGlosario } from "../transcripcion/ensamblar";
import { getDb } from "./neon";
import { asegurarTabla } from "./volcados";
import { descifrarTexto } from "./cripto";
import { registrarEvento } from "./eventos";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODELO = process.env.GROQ_PULIDO_MODEL ?? "llama-3.3-70b-versatile";

export type ResultadoPulido = {
  texto: string;
  aceptado: boolean;
  motivo: string;
  motivoRechazo: string | null;
};

export function normalizarSinEspacios(t: string): string {
  return (t || "").replace(/\s+/g, "");
}

export function palabrasNormalizadas(t: string): string[] {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length > 0);
}

export function obtenerGlosario(): Record<string, string> {
  const glosario: Record<string, string> = {};
  for (const [k, v] of Object.entries(glosarioJson)) {
    if (!k.startsWith("_") && typeof v === "string") {
      glosario[k] = v;
    }
  }
  return glosario;
}

export function construirInstruccion(glosario: Record<string, string>): string {
  const base = [
    "Eres un corrector ortotipografico estricto de transcripciones de dictado.",
    "Conserva exactamente el idioma y las palabras del texto de entrada; no traduzcas entre idiomas.",
    "Tu unica tarea es insertar puntuacion, tildes, mayusculas y saltos de parrafo.",
    "PROHIBIDO agregar palabras, quitar palabras, sustituir por sinonimos, traducir, reordenar, resumir o comentar.",
    "No uses vinetas ni listas ni titulos.",
    "Devuelve solo el texto corregido, sin comillas ni explicaciones.",
  ].join(" ");

  const entries = Object.entries(glosario);
  if (entries.length > 0) {
    const glosarioList = entries.map(([key, val]) => `"${key}" -> "${val}"`).join(", ");
    return `${base} Es obligatorio aplicar este glosario para la correccion de nombres propios o terminos tecnicos, reemplazando el termino crudo (a la izquierda) por su correspondiente corregido (a la derecha): ${glosarioList}.`;
  }
  return base;
}

export function guardian(
  crudo: string,
  pulido: string,
  glosario?: Record<string, string>
): ResultadoPulido {
  const g = glosario ?? obtenerGlosario();
  const crudoNormalizadoConGlosario = aplicarGlosario(crudo, g);

  const a = palabrasNormalizadas(crudoNormalizadoConGlosario);
  const b = palabrasNormalizadas(pulido);

  if (a.length !== b.length) {
    const msg = `Invariancia lexical violada: número de palabras difiere (${a.length} vs ${b.length}). Prohibido añadir, eliminar o resumir.`;
    return {
      texto: crudo,
      aceptado: false,
      motivo: msg,
      motivoRechazo: msg,
    };
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      const msg = `Invariancia lexical violada en la palabra ${i + 1}: esperada "${a[i]}", obtenida "${b[i]}". Prohibido parafrasear, reordenar o cambiar palabras.`;
      return {
        texto: crudo,
        aceptado: false,
        motivo: msg,
        motivoRechazo: msg,
      };
    }
  }

  return {
    texto: pulido,
    aceptado: true,
    motivo: "ok",
    motivoRechazo: null,
  };
}

export async function pulir(crudo: string): Promise<ResultadoPulido> {
  const clave = process.env.GROQ_API_KEY;
  if (!clave) {
    return {
      texto: crudo,
      aceptado: false,
      motivo: "GROQ_API_KEY no esta configurada",
      motivoRechazo: "GROQ_API_KEY no esta configurada",
    };
  }

  const glosario = obtenerGlosario();
  const instruccion = construirInstruccion(glosario);

  const cuerpo = {
    model: MODELO,
    temperature: 0,
    max_tokens: 2048,
    messages: [
      { role: "system", content: instruccion },
      { role: "user", content: crudo },
    ],
  };

  const r = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + clave },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(25000),
  });

  if (!r.ok) {
    const t = await r.text();
    const msg = "Groq HTTP " + r.status + ": " + t.slice(0, 200);
    return {
      texto: crudo,
      aceptado: false,
      motivo: msg,
      motivoRechazo: msg,
    };
  }

  const data = await r.json();
  const salida = data?.choices?.[0]?.message?.content;
  if (typeof salida !== "string" || salida.trim().length === 0) {
    return {
      texto: crudo,
      aceptado: false,
      motivo: "respuesta vacia de Groq",
      motivoRechazo: "respuesta vacia de Groq",
    };
  }

  const salidaLimpia = salida.trim();
  const salidaPostGlosario = aplicarGlosario(salidaLimpia, glosario);

  return guardian(crudo, salidaPostGlosario, glosario);
}

export type MockLLMFunction = (verbatim: string) => Promise<string>;

export async function segmentarEnParrafos(
  volcadoId: string,
  options?: { mockLLM?: MockLLMFunction; actor?: string | null }
): Promise<{ texto_estructurado: string; volcado_id: string; version?: number | null; sha256?: string | null }> {
  await asegurarTabla();
  const db = getDb();

  const vRes = await db.query(
    "SELECT id, texto, sha256, estado, version_aprobada FROM volcado WHERE id = $1",
    [volcadoId]
  );

  if (vRes.rows.length === 0) {
    throw new Error(`Volcado no encontrado: ${volcadoId}`);
  }

  const row = vRes.rows[0];
  if (row.estado !== "en_revision") {
    throw new Error(`Solo se puede segmentar un volcado en estado 'en_revision'. Estado actual: '${row.estado}'`);
  }

  const verbatim = descifrarTexto(String(row.texto ?? ""));
  const verbatimSha = String(row.sha256 ?? "");

  // Consultar versión más reciente si existe
  const verRes = await db.query(
    "SELECT COALESCE(MAX(version), 1)::int AS ultima FROM volcado_version WHERE volcado_id = $1",
    [volcadoId]
  );
  const versionActual = Number(verRes.rows[0]?.ultima ?? 1);

  let propuesta: string;

  if (options?.mockLLM) {
    propuesta = await options.mockLLM(verbatim);
  } else {
    const clave = process.env.GROQ_API_KEY;
    if (!clave) {
      throw new Error("GROQ_API_KEY no está configurada");
    }

    const sysPrompt = [
      "Eres un editor especializado en estructuración de texto en párrafos.",
      "Tu ÚNICA tarea es insertar saltos de línea dobles (\\n\\n) o sencillos para organizar el texto en párrafos de alta calidad de lectura.",
      "REGLA DE ORO PROHIBIDO ABSOLUTO: NO agregues, elimines, cambies, corrijas ortografía, sustituyas ni reordenes NINGUNA palabra ni carácter.",
      "CADA carácter de palabra, puntuación, mayúscula o acento DEBE ser EXACTAMENTE IDÉNTICO al texto de entrada.",
      "Devuelve ÚNICAMENTE el texto reorganizado en párrafos, sin comillas ni explicaciones.",
    ].join(" ");

    const cuerpo = {
      model: MODELO,
      temperature: 0,
      max_tokens: 4096,
      messages: [
        { role: "system", content: sysPrompt },
        { role: "user", content: verbatim },
      ],
    };

    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + clave },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(30000),
    });

    if (!r.ok) {
      const t = await r.text();
      throw new Error("Groq HTTP " + r.status + ": " + t.slice(0, 200));
    }

    const data = await r.json();
    const salida = data?.choices?.[0]?.message?.content;
    if (typeof salida !== "string" || salida.trim().length === 0) {
      throw new Error("Respuesta vacía de Groq durante segmentación");
    }
    propuesta = salida.trim();
  }

  // GUARDIÁN DURO DE IDENTIDAD (Invariancia exacta de caracteres no-blancos sin normalización Unicode)
  const normVerbatim = normalizarSinEspacios(verbatim);
  const normPropuesta = normalizarSinEspacios(propuesta);

  if (normVerbatim !== normPropuesta) {
    const errorMsg = `Guardián duro violado: los caracteres no-blancos difieren entre el verbatim y la propuesta. No se modificó la base de datos.`;

    await registrarEvento({
      fase: "revision",
      eventId: "REV-002",
      estado: "FAIL",
      mensaje: `Segmentación rechazada por el guardián duro de identidad`,
      detalle: {
        error: errorMsg,
        lenVerbatim: normVerbatim.length,
        lenPropuesta: normPropuesta.length,
        actor: options?.actor ?? null,
      },
      volcadoId,
      version: versionActual,
      sha256: verbatimSha,
      correlacionId: volcadoId,
    });

    throw new Error(errorMsg);
  }

  // Guardián superado: persistir propuesta (limpiando ratificación previa si existía)
  await db.query(
    "UPDATE volcado SET texto_estructurado = $2, estructura_ratificada_en = NULL WHERE id = $1",
    [volcadoId, propuesta]
  );

  await registrarEvento({
    fase: "revision",
    eventId: "REV-002",
    estado: "OK",
    mensaje: "Propuesta de segmentación en párrafos generada y guardada exitosamente",
    detalle: { actor: options?.actor ?? null },
    volcadoId,
    version: versionActual,
    sha256: verbatimSha,
    correlacionId: volcadoId,
  });

  return {
    texto_estructurado: propuesta,
    volcado_id: volcadoId,
    version: versionActual,
    sha256: verbatimSha,
  };
}

export async function ratificarEstructura(
  volcadoId: string,
  options?: { actor?: string | null }
): Promise<{ volcado_id: string; estructura_ratificada_en: string; version: number; sha256: string }> {
  await asegurarTabla();
  const db = getDb();

  const vRes = await db.query(
    "SELECT id, sha256, estado, texto_estructurado FROM volcado WHERE id = $1",
    [volcadoId]
  );

  if (vRes.rows.length === 0) {
    throw new Error(`Volcado no encontrado: ${volcadoId}`);
  }

  const row = vRes.rows[0];
  if (row.estado !== "en_revision") {
    throw new Error(`Solo se puede ratificar la estructura de un volcado en estado 'en_revision'. Estado actual: '${row.estado}'`);
  }

  if (!row.texto_estructurado) {
    throw new Error("No existe una propuesta de texto estructurado para ratificar");
  }

  const verRes = await db.query(
    "SELECT COALESCE(MAX(version), 1)::int AS ultima FROM volcado_version WHERE volcado_id = $1",
    [volcadoId]
  );
  const versionActual = Number(verRes.rows[0]?.ultima ?? 1);
  const verbatimSha = String(row.sha256 ?? "");

  const updRes = await db.query(
    "UPDATE volcado SET estructura_ratificada_en = NOW() WHERE id = $1 RETURNING estructura_ratificada_en",
    [volcadoId]
  );

  const ratificadaEn = updRes.rows[0]?.estructura_ratificada_en ? new Date(updRes.rows[0].estructura_ratificada_en).toISOString() : new Date().toISOString();

  await registrarEvento({
    fase: "revision",
    eventId: "REV-003",
    estado: "OK",
    mensaje: "Estructura de párrafos derivada ratificada oficialmente por el operador",
    detalle: { actor: options?.actor ?? null, ratificada_en: ratificadaEn },
    volcadoId,
    version: versionActual,
    sha256: verbatimSha,
    correlacionId: volcadoId,
  });

  return {
    volcado_id: volcadoId,
    estructura_ratificada_en: ratificadaEn,
    version: versionActual,
    sha256: verbatimSha,
  };
}
