/**
 * Telemetry Schema Canonical Interface (Fase C)
 * https://app.notion.com/p/37a05ba4eb3a41a8879797d33691aaac
 *
 * Contrato canónico para eventos de telemetría emitidos por
 * módulos de la sombrilla (Harmonia/Aisthesis).
 */

export type TelemetrySeverity = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface ITelemetryEvent {
  /**
   * El ID del módulo que emite el evento (ej. "globo", "caza").
   */
  moduleId: string;

  /**
   * Identificador único de la sesión o ejecución para trazar flujos.
   */
  sessionId: string;

  /**
   * Timestamp de la emisión (ISO 8601).
   */
  timestamp: string;

  /**
   * Acción que generó la telemetría (ej. "SYNC_START", "DATA_EXTRACTED").
   */
  action: string;

  /**
   * Severidad del evento.
   */
  severity: TelemetrySeverity;

  /**
   * Carga útil arbitraria de contexto del evento.
   * NO debe contener PII (Identificación Personal) ni Secretos.
   */
  payload?: Record<string, unknown>;

  /**
   * Información sobre errores, si severity es ERROR o CRITICAL.
   */
  errorDetails?: {
    message: string;
    stack?: string;
    code?: string;
  };
}
