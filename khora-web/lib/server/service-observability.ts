import { finiteDuration, redact } from "../auto-observacion/model";
import {
  getServiceCorrelationId,
  newServiceCorrelationId,
  normalizeServiceCorrelationId,
  runWithServiceCorrelation,
} from "./service-context";
import { registrarEvento, type EstadoEvento, type FaseEvento } from "./eventos";

export type ServiceOutcome = "SUCCESS" | "FAILURE" | "PARTIAL" | "SKIPPED" | "PENDING";
export type ServiceSeverity = "INFO" | "WARN" | "ERROR" | "CRITICAL";

export interface ServiceObservationInput {
  service: string;
  operation: string;
  route?: string | null;
  method?: string | null;
  statusCode?: number | null;
  outcome?: ServiceOutcome;
  severity?: ServiceSeverity;
  phase?: FaseEvento;
  eventId?: string;
  correlationId?: string | null;
  causationId?: string | null;
  attemptId?: string | null;
  sessionId?: string | null;
  durationMs?: number | null;
  reasonCode?: string | null;
  authMode?: "session" | "oauth" | "manual_bearer" | "server_key" | "ep_bearer" | "none" | "unknown";
  provider?: string | null;
  dependency?: string | null;
  metadata?: Record<string, unknown> | null;
}

function outcomeToState(outcome: ServiceOutcome): EstadoEvento {
  switch (outcome) {
    case "FAILURE": return "FAIL";
    case "PENDING": return "START";
    case "SKIPPED": return "SKIP";
    case "PARTIAL": return "INFO";
    default: return "OK";
  }
}

function phaseFor(input: ServiceObservationInput): FaseEvento {
  if (input.phase) return input.phase;
  if (/auth|oauth|security|manual-token|revocacion|ep\/(?:bootstrap|token)/i.test(input.route || "")) {
    return "autorizacion";
  }
  return "manejo";
}

function eventIdFor(phase: FaseEvento, input: ServiceObservationInput): string {
  if (input.eventId) return input.eventId;
  return phase === "autorizacion" ? "AUT-900" : "MAN-900";
}

function clampText(value: unknown, max: number): string | null {
  if (value === undefined || value === null) return null;
  return String(value).slice(0, max);
}

export async function registrarEventoServicio(input: ServiceObservationInput): Promise<boolean> {
  const outcome = input.outcome || (
    input.statusCode !== undefined && input.statusCode !== null && input.statusCode >= 400
      ? "FAILURE"
      : "SUCCESS"
  );
  const phase = phaseFor(input);
  const status = input.statusCode ?? null;
  const correlationId = normalizeServiceCorrelationId(input.correlationId || getServiceCorrelationId());

  return registrarEvento({
    fase: phase,
    eventId: eventIdFor(phase, input),
    estado: outcomeToState(outcome),
    mensaje: "SERVICE " + clampText(input.service, 120) + "." + clampText(input.operation, 160),
    outcome,
    component: input.service,
    detalle: {
      metadata: redact(Object.fromEntries(Object.entries(input.metadata || {}).filter(([, value]) => typeof value === "number" || typeof value === "boolean"))),
      severity: input.severity || (outcome === "FAILURE" ? "ERROR" : outcome === "PARTIAL" ? "WARN" : "INFO"),
      boundary: "service",
      service: clampText(input.service, 120),
      operation: clampText(input.operation, 160),
      route: clampText(input.route?.split(/[?#]/)[0], 240),
      method: clampText(input.method, 16),
      auth_mode: input.authMode || null,
      provider: clampText(input.provider, 120),
      dependency: clampText(input.dependency, 120),
    },
    correlacionId: correlationId,
    causationId: input.causationId || null,
    attemptId: input.attemptId || null,
    sessionId: input.sessionId || null,
    releaseSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    durationMs: input.durationMs == null ? null : finiteDuration(input.durationMs),
    metrics: {
      status_code: status,
      outcome,
    },
    reasonCode: input.reasonCode || (status && status >= 400 ? "HTTP_" + status : null),
    privacyClass: "SYSTEM_AUDIT",
  });
}

export function emitirEventoServicio(input: ServiceObservationInput): void {
  void registrarEventoServicio(input).catch((error) => {
    console.warn(
      "[service-observability] No se pudo persistir evento:",
      "EVENT_PERSISTENCE_FAILED",
    );
  });
}

export async function withServiceObservation<T>(
  input: Omit<ServiceObservationInput, "correlationId" | "durationMs" | "statusCode" | "outcome"> & {
    correlationId?: string | null;
  },
  work: () => Promise<T> | T,
): Promise<T> {
  const correlationId = normalizeServiceCorrelationId(input.correlationId || getServiceCorrelationId() || newServiceCorrelationId());
  const startedAt = Date.now();

  return runWithServiceCorrelation(correlationId, async () => {
    try {
      const result = await work();
      const statusCode = result instanceof Response ? result.status : 200;
      const outcome: ServiceOutcome = statusCode >= 400 ? "FAILURE" : "SUCCESS";
      await registrarEventoServicioWithinBudget({
        ...input,
        correlationId,
        statusCode,
        outcome,
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      await registrarEventoServicioWithinBudget({
        ...input,
        correlationId,
        statusCode: 500,
        outcome: "FAILURE",
        severity: "ERROR",
        durationMs: Date.now() - startedAt,
        reasonCode: error instanceof Error ? error.name.slice(0, 64) : "UNHANDLED_ERROR",
        metadata: {
              error_type: error instanceof Error ? error.name : "unknown",
        },
      });
      throw error;
    }
  });
}

async function registrarEventoServicioWithinBudget(input: ServiceObservationInput): Promise<void> {
  const work = registrarEventoServicio(input).catch(() => false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([work, new Promise<boolean>((resolve) => { timer = setTimeout(() => resolve(false), 750); })]);
  } finally { if (timer) clearTimeout(timer); }
  // Timeout is a response budget, not cancellation or a durable-write acknowledgement.
}

export function correlationIdFromRequest(request?: Request): string {
  return normalizeServiceCorrelationId(
    request?.headers?.get("x-khora-correlation-id") || newServiceCorrelationId(),
  );
}
