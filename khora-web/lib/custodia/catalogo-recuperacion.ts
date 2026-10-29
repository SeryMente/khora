export type RecoveryCatalogEntry = {
  sessionId: string;
  revisionId: string | null;
  savedAt: string | number;
  local?: boolean;
  localVersions?: RecoveryCatalogEntry[];
  sourceVersions?: RecoveryCatalogEntry[];
  title?: string;
  chars?: number;
};

function timestamp(value: string | number): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function expand(item: RecoveryCatalogEntry): RecoveryCatalogEntry[] {
  if (Array.isArray(item.sourceVersions) && item.sourceVersions.length) {
    return item.sourceVersions.flatMap(expand);
  }
  if (Array.isArray(item.localVersions) && item.localVersions.length) {
    return item.localVersions.flatMap(expand);
  }
  return [item];
}

function identity(item: RecoveryCatalogEntry): string {
  const source = item.local ? "local" : "remote";
  if (item.revisionId) return `${item.sessionId}:${source}:revision:${item.revisionId}`;
  return `${item.sessionId}:${source}:snapshot:${timestamp(item.savedAt)}:${item.title || ""}:${item.chars ?? ""}`;
}

/**
 * Merge local snapshots and any number of remote catalog pages by session.
 * The selected top-level record is the newest variant, while sourceVersions
 * preserves every distinct local/remote recovery point for explicit recovery.
 */
export function reconciliarCatalogoRecuperacion<T extends RecoveryCatalogEntry>(
  ...collections: T[][]
): Array<T & { sourceVersions: T[]; localVersions?: undefined }> {
  const grouped = new Map<string, T[]>();

  for (const item of collections.flatMap((items) => items).flatMap(expand) as T[]) {
    const variants = grouped.get(item.sessionId) || [];
    const key = identity(item);
    const duplicateIndex = variants.findIndex((variant) => identity(variant) === key);
    if (duplicateIndex < 0) {
      variants.push(item);
    } else if (timestamp(item.savedAt) > timestamp(variants[duplicateIndex].savedAt)) {
      // A repeated revision can arrive from the initial catalog and the revision API.
      // Keep the most recent timestamp representation without dropping its source.
      variants[duplicateIndex] = item;
    }
    grouped.set(item.sessionId, variants);
  }

  return [...grouped.values()].map((variants) => {
    variants.sort((a, b) => timestamp(b.savedAt) - timestamp(a.savedAt));
    const primary = variants[0];
    return {
      ...primary,
      localVersions: undefined,
      sourceVersions: variants,
    } as T & { sourceVersions: T[]; localVersions?: undefined };
  }).sort((a, b) => timestamp(b.savedAt) - timestamp(a.savedAt));
}
