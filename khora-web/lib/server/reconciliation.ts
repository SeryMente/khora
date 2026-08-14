// @l0 L0-002-R · @req TRACE-SESSION/010 · @req FORENSIC-REC/01
import { list } from "@vercel/blob";
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

export type AuditSummary = {
  mode: "DRY_RUN" | "APPLY";
  timestamp: string;
  totalVolcados: number;
  totalSessions: number;
  totalBlobs: number;
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

  // 4. Listar Blobs físicos en Vercel Blob
  let blobsFisicos: { url: string; pathname: string; size: number; uploadedAt: Date }[] = [];
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blobResult = await list();
      blobsFisicos = blobResult.blobs.map((b) => ({
        url: b.url,
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt,
      }));
    }
  } catch (err) {
    console.warn("No se pudo listar Vercel Blob directamente (se utilizará la metadata registrada):", String(err));
  }

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

    // C. Volcado con duración de audio o bytes conocidos, pero sin URL ni sessionId
    if ((v.duracion_seg && v.duracion_seg > 0) || (v.audio_bytes && v.audio_bytes > 0)) {
      items.push({
        volcadoId: vId,
        folio,
        sessionId: null,
        candidateBlobs: [],
        classification: "MISSING",
        confidence: 0.8,
        evidence: `Volcado indica duracion_seg=${v.duracion_seg}s o bytes=${v.audio_bytes}, pero la referencia lógica al Blob fue perdiendo previo a la migración`,
        proposedAction: "Marcar como audio no recuperable salvo hallazgo forense adicional",
      });
      classifications.MISSING++;
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

  // Evaluar Blobs huérfanos en Vercel Blob que no pertenezcan a ningún volcado
  for (const [sId, blobList] of blobsPorSesion.entries()) {
    const yaEvaluado = items.some((it) => it.sessionId === sId);
    if (!yaEvaluado) {
      items.push({
        volcadoId: null,
        folio: null,
        sessionId: sId,
        candidateBlobs: blobList.map((b) => b.url),
        classification: "AMBIGUOUS",
        confidence: 0.5,
        evidence: `Blob físico con sessionId ${sId} no tiene volcado correspondiente registrado`,
        proposedAction: "Conservar blob huérfano sin asociar hasta revisión manual",
      });
      classifications.AMBIGUOUS++;
    }
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
    classifications,
    items,
    preStateReportFile,
  };
}
