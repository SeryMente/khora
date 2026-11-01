// @l0 L0-002-R · @req TRACE-SESSION/010 · @req FORENSIC-REC/01
import { list } from "@vercel/blob";
import { listB2Objects } from "./object-storage";
import { getDb } from "./neon";
import { asegurarColumnasDictado } from "./dictado";
import * as fs from "fs";
import * as path from "path";

export type ClassificationType =
  | "EXACT_MATCH"
  | "PROBABLE_MATCH"
  | "AMBIGUOUS"
  | "NO_MATCH"
  | "CORRUPT"
  | "MISSING";

export type AuditItemResult = {
  volcadoId: string | null;
  folio: number | null;
  sessionId: string | null;
  candidateBlobs: string[];
  classification: ClassificationType;
  confidence: number; // 0 to 1
  evidence: string;
  proposedAction: string;
  applied?: boolean;
};

export type InventoryProviderState = "not_configured" | "complete" | "incomplete";

export type AuditInventory = {
  complete: boolean;
  checkedProviders: ("vercelBlob" | "backblazeB2")[];
  vercelBlob: { status: InventoryProviderState; objects: number };
  backblazeB2: { status: InventoryProviderState; objects: number };
  warnings: string[];
};

export type AuditSummary = {
  mode: "DRY_RUN" | "APPLY";
  timestamp: string;
  totalVolcados: number;
  totalSessions: number;
  totalBlobs: number;
  inventory: AuditInventory;
  classifications: Record<ClassificationType, number>;
  items: AuditItemResult[];
  preStateReportFile?: string;
};

export async function ejecutarReconciliacionForense(modo: "DRY_RUN" | "APPLY" = "DRY_RUN"): Promise<AuditSummary> {
  await asegurarColumnasDictado();
  const db = getDb();

  // 1. Cargar Volcados
  const volcadosRes = await db.query(
    "SELECT id, folio, recibido_en, session_id, audio_url, audio_bytes, duracion_seg, audio_partes, texto, sha256 FROM volcado ORDER BY recibido_en DESC"
  );
  const volcados = volcadosRes.rows;

  // 2. Cargar Sesiones
  const sesionesRes = await db.query(
    "SELECT session_id, volcado_id, estado, total_partes, duracion_seg, creado_en FROM dictado_session"
  );
  const sesionesMap = new Map<string, any>();
  for (const s of sesionesRes.rows) {
    sesionesMap.set(s.session_id, s);
  }

  // 3. Cargar Partes de Audio
  const partesRes = await db.query(
    "SELECT id, session_id, volcado_id, part_index, blob_url, blob_path, bytes, sha256, estado FROM dictado_audio_parte"
  );
  const partesList = partesRes.rows;

  // 4. Enumerar todos los proveedores configurados y exponer cualquier inventario incompleto.
  // Una lista fallida o no disponible nunca debe convertirse en evidencia de ausencia física.
  let blobsFisicos: { url: string; pathname: string; size: number; uploadedAt: Date }[] = [];
  const physicalUrls = new Set<string>();
  const inventory: AuditInventory = {
    complete: false,
    checkedProviders: [],
    vercelBlob: { status: "not_configured", objects: 0 },
    backblazeB2: { status: "not_configured", objects: 0 },
    warnings: [],
  };
  const providerErrorCode = (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    const match = message.match(/[a-z][a-z0-9_]{2,63}/i);
    return match?.[0] || "provider_inventory_failed";
  };

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    inventory.checkedProviders.push("vercelBlob");
    inventory.vercelBlob.status = "incomplete";
    try {
      let cursor: string | undefined;
      let hasMore = true;
      let pages = 0;
      while (hasMore) {
        const page = await list({ cursor, limit: 1000 });
        for (const b of page.blobs) {
          if (!physicalUrls.has(b.url)) {
            physicalUrls.add(b.url);
            blobsFisicos.push({ url: b.url, pathname: b.pathname, size: b.size, uploadedAt: b.uploadedAt });
            inventory.vercelBlob.objects += 1;
          }
        }
        pages += 1;
        if (pages > 100 || (page.hasMore && (!page.cursor || page.cursor === cursor))) {
          throw new Error("vercel_blob_listing_incomplete");
        }
        hasMore = page.hasMore;
        cursor = page.hasMore ? page.cursor : undefined;
      }
      inventory.vercelBlob.status = "complete";
    } catch (err) {
      const code = providerErrorCode(err);
      inventory.warnings.push("vercel_blob_inventory_failed:" + code);
      console.warn("No se pudo completar el inventario Vercel Blob:", code);
    }
  } else {
    inventory.warnings.push("vercel_blob_not_configured");
  }

  const b2VariableNames = ["KHORA_B2_BUCKET_NAME", "KHORA_B2_KEY_ID", "KHORA_B2_APPLICATION_KEY"];
  const b2ConfiguredCount = b2VariableNames.filter((name) => Boolean(process.env[name])).length;
  if (b2ConfiguredCount > 0) {
    inventory.checkedProviders.push("backblazeB2");
    inventory.backblazeB2.status = "incomplete";
    if (b2ConfiguredCount !== b2VariableNames.length) {
      inventory.warnings.push("backblaze_b2_configuration_incomplete");
    } else {
      try {
        const b2Objects = await listB2Objects("khora/dictado/");
        for (const b of b2Objects) {
          if (!physicalUrls.has(b.url)) {
            physicalUrls.add(b.url);
            blobsFisicos.push(b);
            inventory.backblazeB2.objects += 1;
          }
        }
        inventory.backblazeB2.status = "complete";
      } catch (err) {
        const code = providerErrorCode(err);
        inventory.warnings.push("backblaze_b2_inventory_failed:" + code);
        console.warn("No se pudo completar el inventario Backblaze B2:", code);
      }
    }
  } else {
    inventory.warnings.push("backblaze_b2_not_configured");
  }

  // Para esta auditoría de migración deben estar enumerados ambos lados del traslado.
  inventory.complete = inventory.vercelBlob.status === "complete"
    && inventory.backblazeB2.status === "complete";

  // Indexar blobs por sessionId extraído del pathname (e.g., dictado/<sessionId>/<parte>.webm...)
  const blobsPorSesion = new Map<string, { url: string; pathname: string; size: number }[]>();
  for (const b of blobsFisicos) {
    const match = b.pathname.match(/^dictado\/([a-f0-9-]+)\/(\d+)\.webm/i);
    if (match) {
      const sId = match[1];
      const listSesion = blobsPorSesion.get(sId) || [];
      listSesion.push(b);
      blobsPorSesion.set(sId, listSesion);
    }
  }

  let logicalReferencesComplete = true;
  const items: AuditItemResult[] = [];
  const classifications: Record<ClassificationType, number> = {
    EXACT_MATCH: 0,
    PROBABLE_MATCH: 0,
    AMBIGUOUS: 0,
    NO_MATCH: 0,
    CORRUPT: 0,
    MISSING: 0,
  };

  // Evaluar cada volcado
  for (const v of volcados) {
    const vId = v.id;
    const folio = v.folio;
    const sId = v.session_id;

    // A. Tiene session_id explícito
    if (sId) {
      const sesionDb = sesionesMap.get(sId);
      const partesDb = partesList.filter((p) => p.session_id === sId);
      const blobsSesion = blobsPorSesion.get(sId) || [];

      if (partesDb.length > 0 || blobsSesion.length > 0 || v.audio_url || v.audio_partes) {
        const candidateUrls = Array.from(new Set([
          ...partesDb.map((p) => p.blob_url),
          ...blobsSesion.map((b) => b.url),
          ...(v.audio_url ? [v.audio_url] : []),
        ]));

        items.push({
          volcadoId: vId,
          folio,
          sessionId: sId,
          candidateBlobs: candidateUrls,
          classification: "EXACT_MATCH",
          confidence: 1.0,
          evidence: `Vínculo determinista mediante session_id ${sId}`,
          proposedAction: "Verificar y mantener vinculación relacional 1:1",
        });
        classifications.EXACT_MATCH++;
        continue;
      }
    }

    // B. No tiene session_id, pero tiene audio_partes o audio_url con sessionId incrustado
    let sessionEncontrada: string | null = null;
    let urlCandidata: string | null = v.audio_url || null;

    if (v.audio_partes) {
      try {
        const partesJson = typeof v.audio_partes === "string" ? JSON.parse(v.audio_partes) : v.audio_partes;
        if (Array.isArray(partesJson) && partesJson.length > 0 && partesJson[0]?.url) {
          urlCandidata = partesJson[0].url;
        }
      } catch (e) {}
    }

    if (urlCandidata) {
      const matchUrl = urlCandidata.match(/dictado\/([a-f0-9-]+)\/(\d+)\.webm/i);
      if (matchUrl) {
        sessionEncontrada = matchUrl[1];
      }
    }

    if (sessionEncontrada) {
      const candidateBlobs = blobsPorSesion.get(sessionEncontrada)?.map((b) => b.url) || (urlCandidata ? [urlCandidata] : []);
      items.push({
        volcadoId: vId,
        folio,
        sessionId: sessionEncontrada,
        candidateBlobs,
        classification: "EXACT_MATCH",
        confidence: 1.0,
        evidence: `Session ID ${sessionEncontrada} derivado deterministamente de URL/Pathname de audio`,
        proposedAction: "Vincular session_id a volcado y registrar partes en dictado_audio_parte",
      });
      classifications.EXACT_MATCH++;
      continue;
    }

    // C. Volcado con duración de audio o bytes conocidos, pero sin URL ni sessionId.
    // Si el inventario de proveedores no es completo, no se puede afirmar que el objeto esté ausente.
    if ((v.duracion_seg && v.duracion_seg > 0) || (v.audio_bytes && v.audio_bytes > 0)) {
      const evidenceComplete = inventory.complete && logicalReferencesComplete;
      const classification: ClassificationType = evidenceComplete ? "MISSING" : "AMBIGUOUS";
      items.push({
        volcadoId: vId,
        folio,
        sessionId: null,
        candidateBlobs: [],
        classification,
        confidence: evidenceComplete ? 0.8 : 0.5,
        evidence: evidenceComplete
          ? `Volcado indica duracion_seg=${v.duracion_seg}s o bytes=${v.audio_bytes}, sin referencia lógica ni objeto localizado en los proveedores enumerados`
          : `Volcado indica duracion_seg=${v.duracion_seg}s o bytes=${v.audio_bytes}, pero no hay evidencia suficiente de ausencia física: ${inventory.warnings.join(", ")}`,
        proposedAction: evidenceComplete
          ? "Marcar como audio no recuperable salvo hallazgo forense adicional"
          : "No declarar el audio perdido; completar inventario y referencias lógicas y repetir la reconciliación",
      });
      classifications[classification]++;
      continue;
    }

    // D. Volcado de solo texto (sin audio previsto)
    items.push({
      volcadoId: vId,
      folio,
      sessionId: null,
      candidateBlobs: [],
      classification: "NO_MATCH",
      confidence: 1.0,
      evidence: "Volcado creado como texto puro sin componente de grabación de voz",
      proposedAction: "Sin acción requerida (Texto puro)",
    });
    classifications.NO_MATCH++;
  }

  // Detectar objetos físicos sin referencia lógica. Incluye claves B2 migradas que no contienen sessionId.
  const referencedPhysicalUrls = new Set<string>();
  const referencedPhysicalPaths = new Set<string>();
  const addPhysicalReference = (value: unknown) => {
    if (typeof value !== "string" || !value.trim()) return;
    referencedPhysicalUrls.add(value);
    try {
      const parsed = new URL(value);
      referencedPhysicalPaths.add(parsed.pathname.replace(/^\/+/, ""));
    } catch {
      referencedPhysicalPaths.add(value.replace(/^\/+/, ""));
    }
  };

  for (const part of partesList) {
    addPhysicalReference(part.blob_url);
    addPhysicalReference(part.blob_path);
  }
  for (const v of volcados) {
    addPhysicalReference(v.audio_url);
    if (v.audio_partes) {
      try {
        const audioParts = typeof v.audio_partes === "string" ? JSON.parse(v.audio_partes) : v.audio_partes;
        if (Array.isArray(audioParts)) {
          for (const part of audioParts) {
            addPhysicalReference(part?.url);
            addPhysicalReference(part?.pathname);
            addPhysicalReference(part?.path);
          }
        }
      } catch {
        logicalReferencesComplete = false;
        inventory.warnings.push("volcado_audio_partes_unreadable");
      }
    }
  }

  const orphanBySession = new Map<string, typeof blobsFisicos>();
  for (const blob of blobsFisicos) {
    const key = blob.pathname.replace(/^\/+/, "");
    const keyWithRoot = key.startsWith("khora/") ? key : `khora/${key}`;
    if (referencedPhysicalUrls.has(blob.url)
      || referencedPhysicalPaths.has(key)
      || referencedPhysicalPaths.has(keyWithRoot)) continue;

    const match = key.match(/^dictado\/([a-f0-9-]+)\/(\d+)\.webm/i);
    if (match) {
      const sId = match[1];
      const group = orphanBySession.get(sId) || [];
      group.push(blob);
      orphanBySession.set(sId, group);
      continue;
    }

    items.push({
      volcadoId: null,
      folio: null,
      sessionId: null,
      candidateBlobs: [blob.url],
      classification: "AMBIGUOUS",
      confidence: 0.5,
      evidence: `Objeto físico de dictado sin referencia lógica detectada (pathname=${key})`,
      proposedAction: "Conservar el objeto sin asociar ni eliminar hasta revisión manual",
    });
    classifications.AMBIGUOUS++;
  }

  for (const [sId, blobList] of orphanBySession.entries()) {
    items.push({
      volcadoId: null,
      folio: null,
      sessionId: sId,
      candidateBlobs: blobList.map((b) => b.url),
      classification: "AMBIGUOUS",
      confidence: 0.5,
      evidence: `Objeto(s) físico(s) de la sesión ${sId} sin referencia lógica detectada`,
      proposedAction: "Conservar blob(s) huérfano(s) sin asociar hasta revisión manual",
    });
    classifications.AMBIGUOUS++;
  }

  // Si modo es APPLY, guardar reporte de pre-estado e impactar únicamente los EXACT_MATCH
  let preStateReportFile: string | undefined;

  if (modo === "APPLY") {
    const reportDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    const reportName = `forensic_prestate_${Date.now()}.json`;
    preStateReportFile = path.join(reportDir, reportName);

    const preStateData = {
      timestamp: new Date().toISOString(),
      modo,
      inventory,
      volcadosCount: volcados.length,
      sesionesCount: sesionesMap.size,
      items,
    };
    fs.writeFileSync(preStateReportFile, JSON.stringify(preStateData, null, 2), "utf8");

    // Aplicar restauraciones estrictamente para EXACT_MATCH
    for (const item of items) {
      if (item.classification === "EXACT_MATCH" && item.volcadoId && item.sessionId) {
        // 1. Vincular session_id en volcado
        await db.query("UPDATE volcado SET session_id = $1 WHERE id = $2 AND session_id IS NULL", [
          item.sessionId,
          item.volcadoId,
        ]);

        // 2. Vincular volcado_id en dictado_session
        await db.query(
          `INSERT INTO dictado_session (session_id, volcado_id, estado, cerrado_en, actualizado_en)
           VALUES ($1, $2, 'complete', NOW(), NOW())
           ON CONFLICT (session_id) DO UPDATE SET
             volcado_id = EXCLUDED.volcado_id,
             estado = 'complete',
             actualizado_en = NOW()`,
          [item.sessionId, item.volcadoId]
        );

        // 3. Vincular partes de audio en dictado_audio_parte si existen
        await db.query("UPDATE dictado_audio_parte SET volcado_id = $1 WHERE session_id = $2", [
          item.volcadoId,
          item.sessionId,
        ]);

        item.applied = true;
      }
    }
  }

  return {
    mode: modo,
    timestamp: new Date().toISOString(),
    totalVolcados: volcados.length,
    totalSessions: sesionesMap.size,
    totalBlobs: blobsFisicos.length,
    inventory,
    classifications,
    items,
    preStateReportFile,
  };
}
