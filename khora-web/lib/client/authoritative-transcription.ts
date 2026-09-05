export type AuthoritativeTranscriptionResult = {
  ok: boolean;
  status: number;
  data: Record<string, any>;
};

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

function nonJsonDetail(status: number, raw: string): string {
  const summary = raw.replace(/\s+/g, " ").trim().slice(0, 180);
  if (status === 413 || /^Request Ent/i.test(summary)) {
    return "La solicitud excedió el límite del servidor. El audio permanece almacenado y puede reintentarse por sesión.";
  }
  return summary
    ? `La API de transcripción respondió HTTP ${status}: ${summary}`
    : `La API de transcripción respondió HTTP ${status} sin contenido JSON.`;
}

export async function transcribeStoredSession(
  sessionId: string,
  previewText: string,
  fetchImpl: FetchLike = fetch,
): Promise<AuthoritativeTranscriptionResult> {
  const response = await fetchImpl("/api/transcribir/sesion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, previewText }),
  });

  const raw = await response.text();
  let data: Record<string, any>;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { detail: nonJsonDetail(response.status, raw) };
  }

  return { ok: response.ok, status: response.status, data };
}
