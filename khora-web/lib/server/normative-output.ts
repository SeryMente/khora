import { BOUND_OUTPUT_FORMAT_VERSION, type ClientPlatform } from "./mcp-client-identity";
import { createHash } from "crypto";
import contract from "../../contracts/FORMATO-REGISTRO-VERIFICACION-CICLO.schema.json";

export const CANONICAL_OUTPUT_FORMAT_VERSION = contract.version;

type CiState = "✓" | "?" | "!";
type RaState = "INICIAL" | "✓" | "CORRECTIVO" | "!";
type RdcState = "SI" | "NO" | "PENDIENTE";
type SessionState = "ACTIVA" | "INACTIVA" | "NO VERIFICADA";
type KState = "✓" | "OFF" | "?" | "!";
type TState = "✓" | "?" | "!";
type CycleState = "COMPLETADO" | "BLOQUEADO" | "PENDIENTE";

export type CanonicalCycleOutputData = {
  platform?: ClientPlatform;
  output_format_version?: string;
  cycle: string;
  si_header: string;
  methodology_header: string;
  ci: CiState;
  ra: RaState;
  ubic: string;
  rdc: RdcState;
  account: string;
  rdc_use: string;
  session: SessionState;
  f: CiState;
  k: KState;
  t: TState;
  rdc_cnx: string;
  usr: string;
  result: string;
  state: CycleState;
};

export type CanonicalOutputValidation = {
  ok: boolean;
  reasons: string[];
  data?: CanonicalCycleOutputData;
};

const HUD_PATTERN = /^ChatGPT · CI: (✓|\?|!) · RA: (INICIAL|✓|CORRECTIVO|!) · UBIC: (.*?) · RDC: (SI|NO|PENDIENTE) · C: (.*?) · RDC-USO: ([0-9]+(?:\.[0-9]+)?% usado \/ [0-9]+(?:\.[0-9]+)?% restante) · S: (ACTIVA|INACTIVA|NO VERIFICADA) · F: (✓|\?|!) · K: (✓|OFF|\?|!) · T: (✓|\?|!) · RDC-CNX: (.*?) · USR: (.*?)$/;
const CYCLE_PATTERN = /^.+ \/ CONV-[0-9]+ \/ C[0-9]+$/;

export function hashCanonicalCycleOutput(output: string): string {
  return createHash("sha256").update(output, "utf8").digest("hex");
}

export function renderCanonicalCycleOutput(data: CanonicalCycleOutputData): string {
  const hud = [
    data.output_format_version === BOUND_OUTPUT_FORMAT_VERSION ? data.platform ?? "ChatGPT" : "ChatGPT",
    "CI: " + data.ci,
    "RA: " + data.ra,
    "UBIC: " + data.ubic,
    "RDC: " + data.rdc,
    "C: " + data.account,
    "RDC-USO: " + data.rdc_use,
    "S: " + data.session,
    "F: " + data.f,
    "K: " + data.k,
    "T: " + data.t,
    "RDC-CNX: " + data.rdc_cnx,
    "USR: " + data.usr,
  ].join(" · ");

  return [
    data.cycle,
    data.si_header,
    data.methodology_header,
    hud,
    "RESULTADO: " + data.result,
    "ESTADO: " + data.state,
  ].join("\n");
}

export function validateCanonicalCycleOutput(
  output: unknown,
  expected: { expectedSiHeader: string; expectedMethodologyHeader: string; platform?: ClientPlatform; output_format_version?: string },
): CanonicalOutputValidation {
  if (typeof output !== "string") return { ok: false, reasons: ["NOT_TEXT"] };
  if (output.includes("\r")) return { ok: false, reasons: ["CRLF_FORBIDDEN"] };
  if (output.trim() !== output) return { ok: false, reasons: ["OUTER_WHITESPACE"] };

  const lines = output.split("\n");
  if (lines.length !== 6) return { ok: false, reasons: ["LINE_COUNT"] };

  const reasons: string[] = [];
  const cycle = lines[0];
  const siHeader = lines[1];
  const methodologyHeader = lines[2];
  const hud = lines[3];
  const resultLine = lines[4];
  const stateLine = lines[5];

  if (!CYCLE_PATTERN.test(cycle)) reasons.push("CYCLE");
  if (siHeader !== expected.expectedSiHeader) reasons.push("SI_HEADER");
  if (methodologyHeader !== expected.expectedMethodologyHeader) reasons.push("METHODOLOGY_HEADER");

  const bound = expected.output_format_version === BOUND_OUTPUT_FORMAT_VERSION;
  if (bound && expected.platform !== "ChatGPT" && expected.platform !== "Notion") return {ok:false,reasons:["PLATFORM"]};
  const prefix = (bound ? expected.platform : "ChatGPT") + " · ";
  const hudMatch = hud.startsWith(prefix) ? ("ChatGPT · " + hud.slice(prefix.length)).match(HUD_PATTERN) : null;
  if (!hudMatch) reasons.push("HUD");

  const resultMatch = resultLine.match(/^RESULTADO: (.+)$/);
  if (!resultMatch) reasons.push("RESULT");
  const stateMatch = stateLine.match(/^ESTADO: (COMPLETADO|BLOQUEADO|PENDIENTE)$/);
  if (!stateMatch) reasons.push("STATE");

  if (reasons.length > 0) return { ok: false, reasons };

  const data: CanonicalCycleOutputData = {
    ...(bound ? {platform: expected.platform, output_format_version: BOUND_OUTPUT_FORMAT_VERSION} : {}),
    cycle,
    si_header: siHeader,
    methodology_header: methodologyHeader,
    ci: hudMatch![1] as CiState,
    ra: hudMatch![2] as RaState,
    ubic: hudMatch![3],
    rdc: hudMatch![4] as RdcState,
    account: hudMatch![5],
    rdc_use: hudMatch![6],
    session: hudMatch![7] as SessionState,
    f: hudMatch![8] as CiState,
    k: hudMatch![9] as KState,
    t: hudMatch![10] as TState,
    rdc_cnx: hudMatch![11],
    usr: hudMatch![12],
    result: resultMatch![1],
    state: stateMatch![1] as CycleState,
  };

  if (renderCanonicalCycleOutput(data) !== output) return { ok: false, reasons: ["RENDER_MISMATCH"] };
  return { ok: true, reasons: [], data };
}
