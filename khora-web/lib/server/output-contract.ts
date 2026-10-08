import { createHash } from "crypto";

export const OUTPUT_FORMAT_VERSION = "v1.7.6" as const;

export const CI_STATES = ["✓", "?", "!"] as const;
export const RDC_STATES = ["SI", "NO", "PENDIENTE"] as const;
export const SESSION_STATES = ["ACTIVA", "INACTIVA", "NO VERIFICADA"] as const;
export const VERIFY_STATES = ["✓", "?", "!"] as const;
export const KHORA_STATES = ["✓", "OFF", "?", "!"] as const;
export const CYCLE_STATES = ["COMPLETADO", "BLOQUEADO", "PENDIENTE"] as const;
export const BLOCK_RDC_STATES = ["REQUERIDA", "NO VERIFICADA", "NO DISPONIBLE"] as const;

export type CanonicalCycleOutput = {
  cycle: string;
  siHeader: string;
  methodologyHeader: string;
  ci: (typeof CI_STATES)[number];
  ubic: string;
  rdc: (typeof RDC_STATES)[number];
  cuenta: string;
  usoUsado: string;
  usoRestante: string;
  sesion: (typeof SESSION_STATES)[number];
  frescura: (typeof VERIFY_STATES)[number];
  khora: (typeof KHORA_STATES)[number];
  thinking: (typeof VERIFY_STATES)[number];
  rdcCnx: string;
  usr: string;
  resultado: string;
  estado: (typeof CYCLE_STATES)[number];
  bloqueado?: {
    motivo: string;
    rdc: (typeof BLOCK_RDC_STATES)[number];
  };
};

function assertAllowed<T extends string>(value: T, allowed: readonly T[], field: string): void {
  if (!allowed.includes(value)) throw new Error("OUTPUT_" + field.toUpperCase() + "_STATE_INVALID");
}

function cleanSingleLine(value: string, field: string): string {
  if (typeof value !== "string" || value.length === 0 || /[\r\n|]/u.test(value)) {
    throw new Error("OUTPUT_" + field.toUpperCase() + "_INVALID");
  }
  return value;
}

function cleanHeader(value: string, field: string): string {
  if (typeof value !== "string" || value.length === 0 || /[\r\n]/u.test(value)) {
    throw new Error("OUTPUT_" + field.toUpperCase() + "_INVALID");
  }
  return value;
}

export function renderCanonicalCycleOutput(input: CanonicalCycleOutput): string {
  assertAllowed(input.ci, CI_STATES, "ci");
  assertAllowed(input.rdc, RDC_STATES, "rdc");
  assertAllowed(input.sesion, SESSION_STATES, "sesion");
  assertAllowed(input.frescura, VERIFY_STATES, "frescura");
  assertAllowed(input.khora, KHORA_STATES, "khora");
  assertAllowed(input.thinking, VERIFY_STATES, "thinking");
  assertAllowed(input.estado, CYCLE_STATES, "estado");

  const cycle = cleanSingleLine(input.cycle, "cycle");
  const siHeader = cleanHeader(input.siHeader, "si_header");
  const methodologyHeader = cleanHeader(input.methodologyHeader, "methodology_header");
  const ubic = cleanSingleLine(input.ubic, "ubic");
  const cuenta = cleanSingleLine(input.cuenta, "cuenta");
  const usoUsado = cleanSingleLine(input.usoUsado, "uso_usado").replace(/%$/u, "");
  const usoRestante = cleanSingleLine(input.usoRestante, "uso_restante").replace(/%$/u, "");
  const rdcCnx = cleanSingleLine(input.rdcCnx, "rdc_cnx");
  const usr = cleanSingleLine(input.usr, "usr");
  const resultado = cleanSingleLine(input.resultado, "resultado");

  if (!/^\d+(?:\.\d+)?$/u.test(usoUsado) || !/^\d+(?:\.\d+)?$/u.test(usoRestante)) {
    throw new Error("OUTPUT_USAGE_FORMAT_INVALID");
  }

  const body = [
    cycle,
    siHeader,
    methodologyHeader,
    "ChatGPT · CI: " + input.ci +
      " · UBIC: " + ubic +
      " · RDC: " + input.rdc +
      " · C: " + cuenta +
      " · RDC-USO: " + usoUsado + "% usado / " + usoRestante + "% restante" +
      " · S: " + input.sesion +
      " · F: " + input.frescura +
      " · K: " + input.khora +
      " · T: " + input.thinking +
      " · RDC-CNX: " + rdcCnx +
      " · USR: " + usr,
    "RESULTADO: " + resultado,
    "ESTADO: " + input.estado,
  ];

  if (input.estado !== "BLOQUEADO") {
    if (input.bloqueado) throw new Error("OUTPUT_BLOCK_METADATA_UNEXPECTED");
    return body.join("\n");
  }

  if (!input.bloqueado) throw new Error("OUTPUT_BLOCK_METADATA_MISSING");
  assertAllowed(input.bloqueado.rdc, BLOCK_RDC_STATES, "bloqueo_rdc");
  const motivo = cleanSingleLine(input.bloqueado.motivo, "bloqueo_motivo");
  if ([...motivo].length > 51) throw new Error("OUTPUT_BLOCK_REASON_TOO_LONG");

  const preamble = [
    "╔════════════════════════════════════════════════════════════╗",
    "║ ⛔⛔⛔  BLOQUEADO · EJECUCIÓN DETENIDA  ⛔⛔⛔              ║",
    "╠════════════════════════════════════════════════════════════╣",
    "║ MOTIVO: " + motivo.padEnd(51, " ").slice(0, 51) + "║",
    "║ RDC: " + input.bloqueado.rdc.padEnd(55, " ") + "║",
    "║ ESTADO DEL CICLO: BLOQUEADO                                ║",
    "║ CONVERSACIÓN: ABIERTA PARA RESOLUCIÓN                      ║",
    "╚════════════════════════════════════════════════════════════╝",
  ];

  return preamble.join("\n") + "\n" + body.join("\n");
}

const CYCLE_RE = /^.+ \/ CONV-[0-9]+ \/ C[0-9]+$/u;
const HUD_RE = /^ChatGPT · CI: (✓|\?|!) · UBIC: ([^|\r\n]+) · RDC: (SI|NO|PENDIENTE) · C: ([^|\r\n]+) · RDC-USO: ([0-9]+(?:\.[0-9]+)?)% usado \/ ([0-9]+(?:\.[0-9]+)?)% restante · S: (ACTIVA|INACTIVA|NO VERIFICADA) · F: (✓|\?|!) · K: (✓|OFF|\?|!) · T: (✓|\?|!) · RDC-CNX: ([^|\r\n]+) · USR: ([^|\r\n]+)$/u;

function parseStandard(
  lines: string[],
  expectedSiHeader: string,
  expectedMethodologyHeader: string,
  allowBlocked: boolean,
): CanonicalCycleOutput {
  if (lines.length !== 6) throw new Error("OUTPUT_LINE_COUNT_INVALID");
  if (!CYCLE_RE.test(lines[0])) throw new Error("OUTPUT_CYCLE_FORMAT_INVALID");
  if (lines[1] !== expectedSiHeader) throw new Error("OUTPUT_SI_HEADER_MISMATCH");
  if (lines[2] !== expectedMethodologyHeader) throw new Error("OUTPUT_METHODOLOGY_HEADER_MISMATCH");

  const hud = lines[3].match(HUD_RE);
  if (!hud) throw new Error("OUTPUT_HUD_FORMAT_INVALID");
  if (!/^RESULTADO: .+$/u.test(lines[4])) throw new Error("OUTPUT_RESULT_INVALID");
  const stateMatch = lines[5].match(/^ESTADO: (COMPLETADO|BLOQUEADO|PENDIENTE)$/u);
  if (!stateMatch) throw new Error("OUTPUT_STATE_INVALID");

  const estado = stateMatch[1] as CanonicalCycleOutput["estado"];
  if (estado === "BLOQUEADO" && !allowBlocked) throw new Error("OUTPUT_BLOCK_PREAMBLE_MISSING");
  if (estado !== "BLOQUEADO" && allowBlocked) throw new Error("OUTPUT_BLOCK_STATE_MISMATCH");

  return {
    cycle: lines[0],
    siHeader: lines[1],
    methodologyHeader: lines[2],
    ci: hud[1] as CanonicalCycleOutput["ci"],
    ubic: hud[2],
    rdc: hud[3] as CanonicalCycleOutput["rdc"],
    cuenta: hud[4],
    usoUsado: hud[5],
    usoRestante: hud[6],
    sesion: hud[7] as CanonicalCycleOutput["sesion"],
    frescura: hud[8] as CanonicalCycleOutput["frescura"],
    khora: hud[9] as CanonicalCycleOutput["khora"],
    thinking: hud[10] as CanonicalCycleOutput["thinking"],
    rdcCnx: hud[11],
    usr: hud[12],
    resultado: lines[4].slice("RESULTADO: ".length),
    estado,
  };
}

export function parseCanonicalCycleOutput(
  text: string,
  expectedSiHeader: string,
  expectedMethodologyHeader: string,
): CanonicalCycleOutput {
  if (typeof text !== "string" || text.length === 0) throw new Error("OUTPUT_TEXT_MISSING");
  if (text.includes("\r") || text.endsWith("\n") || text.startsWith("\n")) {
    throw new Error("OUTPUT_LINE_TERMINATOR_INVALID");
  }

  const lines = text.split("\n");

  if (lines[0]?.startsWith("╔════════════════════════════════════════════════════════════╗")) {
    if (lines.length !== 14) throw new Error("OUTPUT_BLOCKED_LINE_COUNT_INVALID");

    const motivoMatch = lines[3]?.match(/^║ MOTIVO: (.*)║$/u);
    const blockRdcMatch = lines[4]?.match(/^║ RDC: (REQUERIDA|NO VERIFICADA|NO DISPONIBLE)\s+║$/u);

    if (
      lines[0] !== "╔════════════════════════════════════════════════════════════╗" ||
      lines[1] !== "║ ⛔⛔⛔  BLOQUEADO · EJECUCIÓN DETENIDA  ⛔⛔⛔              ║" ||
      lines[2] !== "╠════════════════════════════════════════════════════════════╣" ||
      lines[5] !== "║ ESTADO DEL CICLO: BLOQUEADO                                ║" ||
      lines[6] !== "║ CONVERSACIÓN: ABIERTA PARA RESOLUCIÓN                      ║" ||
      lines[7] !== "╚════════════════════════════════════════════════════════════╝" ||
      !motivoMatch ||
      !blockRdcMatch ||
      motivoMatch[1].trim().length === 0
    ) {
      throw new Error("OUTPUT_BLOCK_PREAMBLE_INVALID");
    }

    const parsed = parseStandard(lines.slice(8), expectedSiHeader, expectedMethodologyHeader, true);
    return {
      ...parsed,
      estado: "BLOQUEADO",
      bloqueado: {
        motivo: motivoMatch[1].trimEnd(),
        rdc: blockRdcMatch[1] as CanonicalCycleOutput["bloqueado"]["rdc"],
      },
    };
  }

  return parseStandard(lines, expectedSiHeader, expectedMethodologyHeader, false);
}

export function sha256Output(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
