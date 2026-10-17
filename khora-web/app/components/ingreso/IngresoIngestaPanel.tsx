"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type IngestaProps = {
  volcadoId?: string | null;
  version?: number | null;
};

type ReadyVolcado = {
  id: string;
  folio?: number | null;
  titulo?: string | null;
  texto?: string | null;
  estado?: string | null;
  version_aprobada?: number | null;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["text/plain", "application/pdf", "image/png", "image/jpeg", "audio/mpeg", "audio/wav"];

export function IngresoIngestaPanel({ volcadoId: initialVolcadoId = null, version: initialVersion = null }: IngestaProps) {
  const [volcadoId, setVolcadoId] = useState(initialVolcadoId);
  const [version, setVersion] = useState<number | null>(initialVersion);
  const [volcados, setVolcados] = useState<ReadyVolcado[]>([]);
  const [texto, setTexto] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<any>(null);

  const cargarVolcadosListos = useCallback(async () => {
    setLoadingList(true);
    setError("");
    try {
      const res = await fetch("/api/volcado", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(String(data?.detail ?? "No se pudo cargar la cola de ingreso."));
      const items = Array.isArray(data?.items) ? data.items : [];
      setVolcados(items.filter((item: ReadyVolcado) => item.estado === "listo_ingesta" && Number(item.version_aprobada) >= 1));
    } catch (cause) {
      setError(String(cause));
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (!volcadoId || !version) void cargarVolcadosListos();
  }, [volcadoId, version, cargarVolcadosListos]);

  const seleccionarArchivo = useCallback((selected?: File | null) => {
    setError("");
    if (!selected) { setFile(null); return; }
    if (!ALLOWED_MIME_TYPES.includes(selected.type)) {
      setError("Invalid file type. Allowed: " + ALLOWED_MIME_TYPES.join(", "));
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError("File exceeds 10MB limit.");
      setFile(null);
      return;
    }
    setFile(selected);
    setTexto("");
  }, []);

  const ingestarAprobado = useCallback(async () => {
    if (!volcadoId || !version) {
      setError("Selecciona un registro con versión aprobada antes de ejecutar la ingesta.");
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    setResult(null);
    const formData = new FormData();
    formData.append("volcado_id", volcadoId);
    formData.append("version", String(version));
    try {
      const res = await fetch("/api/ingesta", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error((data?.detail ?? data?.error ?? "Falló la ingesta.") + (data?.causa ? " :: " + data.causa : ""));
      setResult(data);
      setNotice("Ingesta completada. El objeto aprobado quedó incorporado con su trazabilidad.");
    } catch (cause) {
      setError(String(cause));
    } finally {
      setLoading(false);
    }
  }, [volcadoId, version]);

  const ingestarDirecto = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!texto.trim() && !file) { setError("Provide either text or a file."); return; }
    setLoading(true);
    setError("");
    setNotice("");
    setResult(null);
    const formData = new FormData();
    if (file) formData.append("file", file);
    else formData.append("text", texto);
    try {
      const res = await fetch("/api/ingesta", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error((data?.detail ?? data?.error ?? "falló la ingesta") + (data?.causa ? " :: " + data.causa : ""));
      setResult(data);
      setNotice("Ingesta directa completada.");
    } catch (cause) {
      setError(String(cause));
    } finally {
      setLoading(false);
    }
  }, [file, texto]);

  return (
    <section data-ui-id="ingreso.ingesta" style={{ width: "100%", boxSizing: "border-box", maxWidth: 1200, margin: "0 auto", padding: 24, paddingBottom: "6rem" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Ingreso a memoria</h1>
        <p style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>La ingesta canónica prioriza objetos aprobados, sin eliminar la operación directa histórica de texto o archivo.</p>
      </header>

      {!volcadoId || !version ? (
        <div style={{ border: "1px solid var(--khora-border)", background: "var(--khora-surface)", padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
            <div><strong>Cola de registros de Custodia aprobados</strong><div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>Selecciona el objeto cuya versión aprobada quieres ingresar.</div></div>
            <button type="button" onClick={() => void cargarVolcadosListos()} disabled={loadingList} style={{ padding: "8px 12px", cursor: loadingList ? "wait" : "pointer" }}>{loadingList ? "Actualizando…" : "Actualizar"}</button>
          </div>
          {volcados.length === 0 ? <p style={{ opacity: 0.7, margin: 0 }}>No hay registros de Custodia aprobados disponibles.</p> : (
            <div style={{ display: "grid", gap: 8 }}>
              {volcados.map((item) => (
                <button key={item.id} type="button" onClick={() => { setVolcadoId(item.id); setVersion(Number(item.version_aprobada)); setError(""); setNotice(""); setResult(null); }}
                  style={{ textAlign: "left", padding: 12, border: "1px solid var(--khora-border)", background: "transparent", color: "inherit", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><strong>{item.titulo || String(item.texto ?? "").slice(0, 70) || ("Registro " + item.id.slice(0, 8))}</strong><span style={{ fontFamily: "monospace", fontSize: 11 }}>v{String(item.version_aprobada)}</span></div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>folio #{item.folio ?? item.id.slice(0, 8)} · listo para ingesta</div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ border: "1px solid var(--khora-border)", background: "var(--khora-surface)", padding: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <div><strong>Objeto aprobado</strong> · <code>{volcadoId}</code></div><div>versión <strong>{version}</strong></div>
            <Link href="/sistema/ingreso?modo=revision" style={{ marginLeft: "auto", color: "var(--khora-accent)" }}>Volver a revisión</Link>
          </div>
          <button type="button" onClick={() => void ingestarAprobado()} disabled={loading} style={{ marginTop: 16, padding: "10px 18px", background: "var(--khora-accent)", color: "var(--khora-bg)", border: "1px solid var(--khora-accent)", fontWeight: 700, cursor: loading ? "wait" : "pointer" }}>{loading ? "Ingresando a memoria…" : "Ingresar a memoria"}</button>
        </div>
      )}

      <form onSubmit={ingestarDirecto} style={{ marginTop: 20, border: "1px solid var(--khora-border)", background: "var(--khora-surface)", padding: 16 }}>
        <div style={{ marginBottom: 10 }}><strong>Ingreso directo compatible</strong><div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>Preserva la capacidad histórica de incorporar texto o un archivo, de forma mutuamente excluyente.</div></div>
        <textarea aria-label="Contenido directo" value={texto} onChange={(event) => { setTexto(event.target.value); if (event.target.value) setFile(null); setError(""); }} placeholder="Pega aquí contenido para ingreso directo…" disabled={Boolean(file)} style={{ width: "100%", minHeight: 120, boxSizing: "border-box", padding: 12, resize: "vertical", border: "1px solid var(--khora-border)", background: "transparent", color: "inherit" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginTop: 12 }}>
          <input aria-label="Seleccionar archivo para ingreso directo" type="file" disabled={Boolean(texto)} onChange={(event) => seleccionarArchivo(event.target.files?.[0] ?? null)} />
          <button type="submit" disabled={loading || (!texto.trim() && !file)} style={{ padding: "10px 18px", fontWeight: 700, cursor: loading ? "wait" : "pointer" }}>{loading ? "Procesando…" : "Ingresar directo"}</button>
          {file && <span style={{ fontSize: 12, opacity: 0.8 }}>Archivo: {file.name}</span>}
        </div>
      </form>

      {notice && <div style={{ marginTop: 16, padding: 12, border: "1px solid var(--khora-border)", background: "var(--khora-surface)" }}>{notice}</div>}
      {error && <div role="alert" style={{ marginTop: 16, padding: 12, border: "1px solid var(--khora-border)", background: "var(--khora-surface)" }}>{error}</div>}
      {result && <details open style={{ marginTop: 16, padding: 12, border: "1px solid var(--khora-border)", background: "var(--khora-surface)" }}><summary style={{ cursor: "pointer", fontWeight: 700 }}>Acta de ingesta</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12, marginTop: 8 }}>{JSON.stringify(result, null, 2)}</pre></details>}
    </section>
  );
}
