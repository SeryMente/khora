import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

const correlationStorage = new AsyncLocalStorage<string>();

export function newServiceCorrelationId(): string {
  return randomUUID();
}

export function normalizeServiceCorrelationId(value?: string | null): string {
  if (typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim())) {
    return value.trim();
  }
  return randomUUID();
}

export function getServiceCorrelationId(): string | null {
  return correlationStorage.getStore() || null;
}

export async function runWithServiceCorrelation<T>(
  correlationId: string,
  work: () => Promise<T> | T,
): Promise<T> {
  return correlationStorage.run(correlationId, work);
}
