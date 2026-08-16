// @l0 L0-002-R · @req ING-03/REQ-1 · @acr ACR-1.2
"use client";

import { useCallback, useEffect, useState } from "react";

type Fila = {
  id: string;
  folio?: number | null;
  titulo?: string | null;
  texto?: string | null;
  texto_original?: string | null;
  chars?: number | null;
  recibido_en?: string | null;
  audio_url?: string | null;
  audio_bytes?: number | null;
  duracion_seg?: number | null;
  ediciones?: number | null;
  fuente?: string | null;
  estado?: string | null;
  version_aprobada?: number | null;
};

type Par = { antes: string; despues: string };

type SugerenciaUI = {
  id: string;
  origen: "ortotipografico" | "llm";
  posicion: { inicio: number; fin: number };
  texto_original: string;
  sugerencia: string;
  regla: string;
  tipo_categoria: "ortografia" | "tildes" | "puntuacion" | "mayusculas" | "error_tipografico" | "lexico" | "semantico";
  severidad: "alta" | "media" | "baja";
  confianza: number;
  estado: "pendiente" | "aceptada" | "rechazada";
  explicacion?: string;
};

export default function EditarPage() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [sel, setSel] = useState<Fila | null>(null);
  const [texto, setTexto] = useState("");
  const [textoGuardado, setTextoGuardado] = useState("");
  const [pares, setPares] = useState<Par[]>([]);
  const [lexico, setLexico] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [cargando, setCargando] = useState(false);
  const [aprobando, setAprobando] = useState(false);
  const [generandoSugerencias, setGenerandoSugerencias] = useState(false);
  const [versiones, setVersiones] = useState<any[]>([]);
  const [sugerencias, setSugerencias] = useState<SugerenciaUI[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<Record<string, boolean>>({});

  const cargar = useCallback(async () => {
    setError("");
    try {
      const r = await fetch("/api/volcado");
      const d = await r.json();
      if (!r.ok) {
        setError(String(d?.detail) + " " + String(d?.causa ?? ""));
        return;
      }
      setFilas(Array.isArray(d?.items) ? d.items : []);
    } catch (e) {
      setError(String(e));
    }
    try {
      const rl = await fetch("/api/edicion");
      const dl = await rl.json();
      if (Array.isArray(dl?.lexico)) setLexico(dl.lexico);
    } catch (e) {
      setAviso("Léxico no disponible: " + String(e));
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const pedirSugerencias = useCallback(async (txtInput: string) => {
    if (!txtInput || txtInput.trim().length === 0) {
      setSugerencias([]);
      return;
    }
    setGenerandoSugerencias(true);
    try {
      const r = await fetch("/api/revision/sugerencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: txtInput })
      });
      const d = await r.json();
      if (r.ok && Array.isArray(d?.sugerencias)) {
        setSugerencias(d.sugerencias);
      }
    } catch (e) {
      console.error("Error al consultar sugerencias:", e);
    } finally {
      setGenerandoSugerencias(false);
    }
  }, []);

  const elegir = useCallback(async (f: Fila) => {
    setSel(f);
    const txtBase = typeof f.texto === "string" ? f.texto : "";
    setTexto(txtBase);
    setTextoGuardado(txtBase);
    setPares([]);
    setAviso("");
    setError("");
    setSugerencias([]);
    setSeleccionadas({});

    try {
      try {
        const rv = await fetch("/api/versiones?id=" + f.id);
        const dv = await rv.json();
        setVersiones(Array.isArray(dv?.versiones) ? dv.versiones : []);
      } catch {
        setVersiones([]);
      }

      const r = await fetch("/api/volcado/" + f.id);
      const d = await r.json();
      if (r.ok && d?.volcado) {
        const v = d.volcado as Fila;
        setSel(v);
        const txtCargado = typeof v.texto === "string" ? v.texto : "";
        setTexto(txtCargado);
        setTextoGuardado(txtCargado);
        void pedirSugerencias(txtCargado);
      } else {
        setAviso("No se pudo cargar el detalle: " + String(d?.detail ?? ""));
      }
    } catch (e) {
      setAviso("No se pudo cargar el detalle: " + String(e));
    }
  }, [pedirSugerencias]);

  const guardarNuevaVersion = useCallback(async () => {
    if (!sel) return;
    setCargando(true);
    setError("");
    setPares([]);
    try {
      const r = await fetch("/api/edicion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sel.id, texto })
      });
      const d = await r.json();
      if (!r.ok) {
        setError(String(d?.detail) + " " + String(d?.causa ?? ""));
      } else {
        setPares(Array.isArray(d?.pares) ? d.pares : []);
        setTextoGuardado(texto);
        setAviso(
          d?.sinCambios === true
            ? "Sin cambios con respecto a la versión actual."
            : `Guardado como versión ${String(d?.version)}. Correcciones registradas: ${String(d?.guardadas)}`
        );
        try {
          const rv2 = await fetch("/api/versiones?id=" + sel.id);
          const dv2 = await rv2.json();
          setVersiones(Array.isArray(dv2?.versiones) ? dv2.versiones : []);
        } catch {}
        void cargar();
        void pedirSugerencias(texto);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setCargando(false);
    }
  }, [sel, texto, cargar, pedirSugerencias]);

  const aprobarVersionVigente = useCallback(async () => {
    if (!sel) return;
    const ultima = versiones.reduce((max: number, v: any) => Math.max(max, Number(v.version)), 0);
    if (ultima < 1) {
      setError("Este volcado no tiene versiones registradas para aprobar");
      return;
    }
    if (texto !== textoGuardado) {
      setError("Existen cambios sin guardar en el editor. Guarda una nueva versión antes de aprobar.");
      return;
    }

    setAprobando(true);
    setError("");
    setAviso("");
    try {
      const r = await fetch(`/api/revision/${sel.id}/aprobar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: ultima })
      });
      const d = await r.json();
      if (!r.ok) {
        setError("Aprobación rechazada: " + String(d?.detail ?? d?.error ?? ""));
      } else {
        setAviso(`Versión ${String(d?.version ?? ultima)} aprobada exitosamente y lista para ingesta.`);
        void cargar();
        // Actualizar estado local
        setSel(prev => prev ? { ...prev, estado: "listo_ingesta", version_aprobada: d?.version ?? ultima } : null);
      }
    } catch (e) {
      setError("Error durante la aprobación: " + String(e));
    } finally {
      setAprobando(false);
    }
  }, [sel, versiones, texto, textoGuardado, cargar]);

  // Gestión de Sugerencias
  const aplicarSugerencia = useCallback((sug: SugerenciaUI) => {
    setTexto(prev => {
      const { inicio, fin } = sug.posicion;
      if (prev.substring(inicio, fin) === sug.texto_original) {
        return prev.substring(0, inicio) + sug.sugerencia + prev.substring(fin);
      }
      return prev.replace(sug.texto_original, sug.sugerencia);
    });
    setSugerencias(prev =>
      prev.map(s => (s.id === sug.id ? { ...s, estado: "aceptada" } : s))
    );
  }, []);

  const rechazarSugerencia = useCallback((id: string) => {
    setSugerencias(prev =>
      prev.map(s => (s.id === id ? { ...s, estado: "rechazada" } : s))
    );
  }, []);

  const toggleSeleccion = useCallback((id: string) => {
    setSeleccionadas(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const aceptarSeleccionadas = useCallback(() => {
    const ids = Object.keys(seleccionadas).filter(id => seleccionadas[id]);
    const aAplicar = sugerencias.filter(s => ids.includes(s.id) && s.estado === "pendiente");
    aAplicar.forEach(s => aplicarSugerencia(s));
    setSeleccionadas({});
  }, [seleccionadas, sugerencias, aplicarSugerencia]);

  const rechazarSeleccionadas = useCallback(() => {
    const ids = Object.keys(seleccionadas).filter(id => seleccionadas[id]);
    ids.forEach(id => rechazarSugerencia(id));
    setSeleccionadas({});
  }, [seleccionadas, rechazarSugerencia]);

  const palabrasCount = texto.trim() ? texto.trim().split(/\s+/).length : 0;
  const versionActual = versiones.reduce((max: number, v: any) => Math.max(max, Number(v.version)), 1);
  const pendientes = sugerencias.filter(s => s.estado === "pendiente");
  const aceptadas = sugerencias.filter(s => s.estado === "aceptada");
  const rechazadas = sugerencias.filter(s => s.estado === "rechazada");
  const tieneCambiosSinGuardar = texto !== textoGuardado;

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24, paddingBottom: "6rem" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Estación de Control de Calidad y Revisión</h1>
        <p style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
          Asistente de revisión manual asistida. La automatización sugiere; el operador decide. La transcripción original se conserva intacta.
        </p>
      </header>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* Lista de volcados a la izquierda */}
        <div style={{ flex: "0 0 280px", maxHeight: 600, overflowY: "auto", border: "1px solid #334155", borderRadius: 8, padding: 10, background: "#0f172a" }}>
          <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 10, opacity: 0.9 }}>Volcados registradas</h3>
          {filas.length === 0 && <p style={{ fontSize: 13, opacity: 0.6 }}>Sin volcados</p>}
          {filas.map(f => (
            <button
              key={f.id}
              onClick={() => void elegir(f)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                marginBottom: 8,
                padding: 8,
                background: sel?.id === f.id ? "#1e293b" : "transparent",
                border: sel?.id === f.id ? "1px solid #3b82f6" : "1px solid #334155",
                borderRadius: 6,
                color: "inherit",
                cursor: "pointer"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.75 }}>
                <span>Folio #{f.folio ?? f.id.slice(0, 6)}</span>
                <span style={{
                  padding: "1px 6px",
                  borderRadius: 4,
                  fontWeight: 600,
                  background: f.estado === "listo_ingesta" ? "#065f46" : f.estado === "en_revision" ? "#1e40af" : "#334155"
                }}>
                  {f.estado ?? "archivado"}
                </span>
              </div>
              <p style={{ fontSize: 12, margin: "6px 0 0", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.titulo && f.titulo.length > 0 ? f.titulo : String(f.texto ?? "").slice(0, 40)}
              </p>
            </button>
          ))}
        </div>

        {/* Zona Central / Editor y Asistente */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {!sel ? (
            <div style={{ padding: 40, textAlign: "center", border: "1px dashed #334155", borderRadius: 8, opacity: 0.7 }}>
              Selecciona un volcado de la lista para iniciar el control de calidad.
            </div>
          ) : (
            <>
              {/* Barra de Estado de la Estación */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#1e293b", borderRadius: 8, border: "1px solid #334155" }}>
                <div>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>Estado actual: </span>
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 700,
                    background: sel.estado === "listo_ingesta" ? "#059669" : sel.estado === "en_revision" ? "#2563eb" : "#475569"
                  }}>
                    {sel.estado ?? "archivado"}
                  </span>
                  <span style={{ marginLeft: 12, fontSize: 13, fontWeight: 600 }}>Versión {versionActual}</span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  {texto.length} caracteres / {palabrasCount} palabras
                  {tieneCambiosSinGuardar && (
                    <span style={{ marginLeft: 10, color: "#f59e0b", fontWeight: 600 }}>● Cambios no guardados</span>
                  )}
                </div>
              </div>

              {/* Reproductor de Audio si existe */}
              {sel.audio_url && (
                <div style={{ padding: 10, border: "1px solid #334155", borderRadius: 6, background: "#0f172a" }}>
                  <audio controls preload="metadata" src={`/api/audio/${sel.id}`} style={{ width: "100%" }} />
                </div>
              )}

              {/* Layout Editor + Panel Sugerencias */}
              <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
                {/* Editor de Texto Activo */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Borrador en Edición:</label>
                  <textarea
                    value={texto}
                    onChange={e => setTexto(e.target.value)}
                    rows={14}
                    style={{
                      width: "100%",
                      padding: 12,
                      fontFamily: "monospace",
                      lineHeight: 1.6,
                      background: "#090d16",
                      color: "#f8fafc",
                      border: "1px solid #334155",
                      borderRadius: 6,
                      fontSize: 14
                    }}
                  />
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => void pedirSugerencias(texto)}
                      disabled={generandoSugerencias}
                      style={{ padding: "6px 12px", borderRadius: 4, cursor: "pointer", background: "#334155", color: "#fff", border: "none", fontSize: 12 }}
                    >
                      {generandoSugerencias ? "Analizando..." : "🔍 Re-analizar con Asistente"}
                    </button>
                  </div>
                </div>

                {/* Panel Asistente KHORA */}
                <div style={{ flex: "0 0 340px", border: "1px solid #334155", borderRadius: 6, padding: 12, background: "#0f172a", display: "flex", flexDirection: "column", gap: 10, maxHeight: 420, overflowY: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontSize: 13, margin: 0, fontWeight: 700 }}>Asistente KHORA</h3>
                    <div style={{ fontSize: 11, display: "flex", gap: 6 }}>
                      <span style={{ color: "#f59e0b" }}>Pend: {pendientes.length}</span>
                      <span style={{ color: "#10b981" }}>Acep: {aceptadas.length}</span>
                      <span style={{ color: "#ef4444" }}>Rech: {rechazadas.length}</span>
                    </div>
                  </div>

                  {/* Acciones en lote */}
                  {pendientes.length > 0 && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={aceptarSeleccionadas} style={{ flex: 1, padding: "4px 8px", fontSize: 11, background: "#059669", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                        Aceptar selec.
                      </button>
                      <button onClick={rechazarSeleccionadas} style={{ flex: 1, padding: "4px 8px", fontSize: 11, background: "#dc2626", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                        Rechazar selec.
                      </button>
                    </div>
                  )}

                  {/* Lista de Sugerencias */}
                  {sugerencias.length === 0 ? (
                    <p style={{ fontSize: 12, opacity: 0.6, margin: "10px 0" }}>
                      {generandoSugerencias ? "Generando sugerencias ortotipográficas y lingüísticas..." : "No hay sugerencias pendientes para este texto."}
                    </p>
                  ) : (
                    sugerencias.map(s => {
                      const esAlta = s.severidad === "alta";
                      return (
                        <div
                          key={s.id}
                          style={{
                            padding: 8,
                            borderRadius: 6,
                            border: esAlta ? "1px solid #ef4444" : "1px solid #334155",
                            background: s.estado === "aceptada" ? "#064e3b" : s.estado === "rechazada" ? "#450a0a" : "#1e293b",
                            fontSize: 12
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                              {s.estado === "pendiente" && (
                                <input
                                  type="checkbox"
                                  checked={!!seleccionadas[s.id]}
                                  onChange={() => toggleSeleccion(s.id)}
                                />
                              )}
                              <span style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "1px 5px",
                                borderRadius: 3,
                                background: esAlta ? "#dc2626" : s.severidad === "media" ? "#d97706" : "#2563eb",
                                color: "#fff"
                              }}>
                                {esAlta ? "⚠️ ALTA" : s.severidad.toUpperCase()}
                              </span>
                            </label>
                            <span style={{ fontSize: 10, opacity: 0.7 }}>{s.tipo_categoria}</span>
                          </div>

                          <div style={{ margin: "4px 0" }}>
                            <span style={{ textDecoration: "line-through", color: "#f87171", marginRight: 6 }}>{s.texto_original}</span>
                            <span style={{ color: "#34d399", fontWeight: 600 }}>→ {s.sugerencia}</span>
                          </div>

                          <p style={{ margin: "2px 0 6px", fontSize: 11, opacity: 0.8 }}>{s.explicacion ?? s.regla}</p>

                          {s.estado === "pendiente" && (
                            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                              <button
                                onClick={() => aplicarSugerencia(s)}
                                style={{ flex: 1, padding: "3px 6px", fontSize: 11, background: "#059669", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}
                              >
                                Aceptar
                              </button>
                              <button
                                onClick={() => rechazarSugerencia(s.id)}
                                style={{ flex: 1, padding: "3px 6px", fontSize: 11, background: "#dc2626", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}
                              >
                                Rechazar
                              </button>
                            </div>
                          )}
                          {s.estado !== "pendiente" && (
                            <span style={{ fontSize: 10, fontStyle: "italic", opacity: 0.8 }}>
                              {s.estado === "aceptada" ? "✓ Aplicada al borrador" : "✗ Rechazada"}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Botones de Acción Explícita */}
              <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center", padding: 12, background: "#0f172a", borderRadius: 8, border: "1px solid #334155" }}>
                <button
                  onClick={guardarNuevaVersion}
                  disabled={cargando}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 6,
                    background: "#2563eb",
                    color: "#fff",
                    fontWeight: 600,
                    border: "none",
                    cursor: cargando ? "wait" : "pointer",
                    fontSize: 13
                  }}
                >
                  {cargando ? "Guardando..." : "💾 Guardar Nueva Versión"}
                </button>

                <button
                  onClick={aprobarVersionVigente}
                  disabled={aprobando || tieneCambiosSinGuardar || sel.estado === "listo_ingesta"}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 6,
                    background: tieneCambiosSinGuardar || sel.estado === "listo_ingesta" ? "#475569" : "#059669",
                    color: "#fff",
                    fontWeight: 600,
                    border: "none",
                    cursor: tieneCambiosSinGuardar || sel.estado === "listo_ingesta" ? "not-allowed" : "pointer",
                    fontSize: 13
                  }}
                >
                  {aprobando ? "Aprobando..." : "✓ Aprobar Versión"}
                </button>

                {tieneCambiosSinGuardar && (
                  <span style={{ fontSize: 12, color: "#f59e0b", fontStyle: "italic" }}>
                    Debes guardar la versión actual antes de poder aprobar.
                  </span>
                )}
                {sel.estado === "listo_ingesta" && (
                  <span style={{ fontSize: 12, color: "#34d399", fontWeight: 600 }}>
                    ✓ Esta versión ya ha sido aprobada y está lista para ingesta.
                  </span>
                )}
              </div>

              {/* Transcripción Original Intacta */}
              {sel.texto_original && (
                <details style={{ marginTop: 12, padding: 10, background: "#0f172a", borderRadius: 6, border: "1px solid #334155" }}>
                  <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                    📄 Transcripción Original Intacta (v1)
                  </summary>
                  <p style={{ whiteSpace: "pre-wrap", fontSize: 13, opacity: 0.85, marginTop: 8, fontFamily: "monospace" }}>
                    {sel.texto_original}
                  </p>
                </details>
              )}
            </>
          )}
        </div>
      </div>

      {/* Avisos y Errores */}
      {aviso.length > 0 && (
        <div style={{ marginTop: 16, padding: 12, background: "#064e3b", color: "#6ee7b7", borderRadius: 6, fontSize: 13 }}>
          {aviso}
        </div>
      )}
      {error.length > 0 && (
        <div style={{ marginTop: 16, padding: 12, background: "#7f1d1d", color: "#fca5a5", borderRadius: 6, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Historial de Versiones */}
      {versiones.length > 0 && (
        <div style={{ marginTop: 24, padding: 16, background: "#0f172a", borderRadius: 8, border: "1px solid #334155" }}>
          <h2 style={{ fontSize: 15, margin: "0 0 12px 0", fontWeight: 700 }}>Historial Inviolable de Versiones</h2>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155", textAlign: "left" }}>
                <th style={{ padding: 6 }}>v</th>
                <th style={{ padding: 6 }}>Fecha</th>
                <th style={{ padding: 6 }}>Caracteres</th>
                <th style={{ padding: 6 }}>SHA256</th>
                <th style={{ padding: 6 }}>Motivo</th>
                <th style={{ padding: 6 }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {versiones.map((v, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: 6, fontWeight: 700 }}>{String(v.version)}</td>
                  <td style={{ padding: 6, opacity: 0.8 }}>{String(v.creado_en ?? "").slice(0, 16)}</td>
                  <td style={{ padding: 6 }}>{String(v.chars)}</td>
                  <td style={{ padding: 6, fontFamily: "monospace", fontSize: 12, opacity: 0.8 }}>{String(v.sha256).slice(0, 10)}...</td>
                  <td style={{ padding: 6, opacity: 0.9 }}>{String(v.motivo ?? "")}</td>
                  <td style={{ padding: 6 }}>
                    <button
                      onClick={() => setTexto(String(v.texto))}
                      style={{ padding: "3px 8px", fontSize: 11, background: "#334155", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                    >
                      Cargar texto
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delta de la última edición */}
      {pares.length > 0 && (
        <div style={{ marginTop: 20, padding: 16, background: "#0f172a", borderRadius: 8, border: "1px solid #334155" }}>
          <h2 style={{ fontSize: 15, margin: "0 0 12px 0", fontWeight: 700 }}>Delta de la última edición</h2>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155", textAlign: "left" }}>
                <th style={{ padding: 6 }}>Antes (Transcrito)</th>
                <th style={{ padding: 6 }}>Después (Corregido)</th>
              </tr>
            </thead>
            <tbody>
              {pares.map((p, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: 6, color: "#f87171" }}>{p.antes.length > 0 ? p.antes : "(nada)"}</td>
                  <td style={{ padding: 6, color: "#34d399" }}>{p.despues.length > 0 ? p.despues : "(eliminado)"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Léxico aprendido */}
      {lexico.length > 0 && (
        <div style={{ marginTop: 20, padding: 16, background: "#0f172a", borderRadius: 8, border: "1px solid #334155" }}>
          <h2 style={{ fontSize: 15, margin: "0 0 12px 0", fontWeight: 700 }}>Glosario Aprendido de Correcciones</h2>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155", textAlign: "left" }}>
                <th style={{ padding: 6 }}>Error Frecuente</th>
                <th style={{ padding: 6 }}>Corrección Sugerida</th>
                <th style={{ padding: 6 }}>Frecuencia</th>
              </tr>
            </thead>
            <tbody>
              {lexico.slice(0, 20).map((l, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: 6 }}>{String(l.antes)}</td>
                  <td style={{ padding: 6, fontWeight: 600, color: "#38bdf8" }}>{String(l.despues)}</td>
                  <td style={{ padding: 6 }}>{String(l.veces)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
