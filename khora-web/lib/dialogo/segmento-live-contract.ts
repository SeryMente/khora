import type { FuenteDialogo } from "./contrato";
export function validarVentanaLive(input: { sessionId: unknown; source: unknown; sequence: unknown; startMs: unknown; endMs: unknown; size: unknown }) {
  const uuid = typeof input.sessionId === "string" && /^[0-9a-f-]{36}$/i.test(input.sessionId);
  const source = input.source === "microphone" || input.source === "chrome_tab";
  const sequence = Number(input.sequence);
  const startMs = Number(input.startMs);
  const endMs = Number(input.endMs);
  const size = Number(input.size);
  const valid = uuid && source && Number.isSafeInteger(sequence) && sequence >= 1 && sequence <= 10000 &&
    Number.isFinite(startMs) && Math.abs(startMs - (sequence - 1) * 6000) <= 5 &&
    Number.isFinite(endMs) && endMs > startMs && endMs <= startMs + 6500.5 &&
    Number.isSafeInteger(size) && size === 208044;
  return valid ? { ok: true as const, sessionId: input.sessionId as string, source: input.source as FuenteDialogo, sequence, startMs, endMs, size } : { ok: false as const };
}
