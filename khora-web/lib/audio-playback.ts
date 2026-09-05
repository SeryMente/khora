export type AudioManifestPart = {
  part_index: number;
  start_ms?: number | null;
  end_ms?: number | null;
  duracion_ms?: number | null;
  download_path: string;
};

export function clampPlaybackPosition(
  parts: AudioManifestPart[],
  position: number,
): number {
  if (parts.length === 0) return 1;
  return Math.min(Math.max(Math.trunc(position) || 1, 1), parts.length);
}

export function globalTimeForPart(
  parts: AudioManifestPart[],
  position: number,
  localSeconds: number,
): number {
  const safePosition = clampPlaybackPosition(parts, position);
  const part = parts[safePosition - 1];
  const startMs = Number(part?.start_ms || 0);
  return Math.max(0, startMs + Math.max(0, localSeconds) * 1000);
}

export function resolveGlobalSeek(
  parts: AudioManifestPart[],
  targetMs: number,
) {
  if (parts.length === 0) return { position: 1, localSeconds: 0 };

  const safeTarget = Math.max(0, targetMs);
  let position = parts.findIndex((part) => {
    const start = Number(part.start_ms || 0);
    const duration = Number(part.duracion_ms || 0);
    const end = Number(part.end_ms ?? start + duration);
    return safeTarget >= start && safeTarget <= end;
  });

  if (position < 0) {
    position =
      safeTarget < Number(parts[0].start_ms || 0) ? 0 : parts.length - 1;
  }

  const part = parts[position];
  const startMs = Number(part.start_ms || 0);
  const durationMs = Number(part.duracion_ms || 0);
  const localMs = Math.max(
    0,
    Math.min(safeTarget - startMs, durationMs || safeTarget - startMs),
  );
  return { position: position + 1, localSeconds: localMs / 1000 };
}
