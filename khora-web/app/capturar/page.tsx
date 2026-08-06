"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Mic, MicOff, Save } from "lucide-react";

const ORIGEN_TECLADO = "web_ui";
const ORIGEN_VOZ = "dictado";

export default function CapturarPage() {
    return (
        <Suspense fallback={<p style={{ padding: "2rem", color: "var(--khora-accent)" }}>Cargando…</p>}>
            <CapturarContenido />
        </Suspense>
    );
}

function CapturarContenido() {
    const [texto, setTexto] = useState("");
    const [origen, setOrigen] = useState(ORIGEN_TECLADO);
    const [enviando, setEnviando] = useState(false);
    const [resultado, setResultado] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [escuchando, setEscuchando] = useState(false);
    const [hayVoz, setHayVoz] = useState(true);
    const reconocimiento = useRef<any>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) { setHayVoz(false); return; }
        const r = new SR();
        r.continuous = true;
        r.interimResults = true;
        r.lang = "es-ES";
        r.onstart = () => setEscuchando(true);
        r.onend = () => setEscuchando(false);
        r.onerror = () => setEscuchando(false);
        r.onresult = (e: any) => {
            let definitivo = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) definitivo += e.results[i][0].transcript + " ";
            }
            if (definitivo) setTexto((prev) => prev + (prev === "" || prev.endsWith(" ") ? "" : " ") + definitivo);
        };
        reconocimiento.current = r;
    }, []);

    const alternarVoz = () => {
        if (escuchando) { reconocimiento.current?.stop(); return; }
        setOrigen(ORIGEN_VOZ);
        reconocimiento.current?.start();
    };

    const enviar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!texto.trim()) return;
        setEnviando(true);
        setError(null);
        setResultado(null);
        try {
            const guardado = await fetch("/api/volcado", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ texto: texto, titulo: "Captura", origen: origen }),
            });
            const datos = await guardado.json();
            if (!guardado.ok) throw new Error(datos.detail || "Error al guardar el volcado.");
            const identificador = datos.id;
            const version = await fetch(`/api/versiones?id=${identificador}`);
            if (!version.ok) throw new Error("Error al inicializar versión.");
            const cuerpo = new FormData();
            cuerpo.append("text", texto);
            cuerpo.append("volcado_id", identificador);
            cuerpo.append("version", "1");
            const ingesta = await fetch("/api/ingesta", { method: "POST", body: cuerpo });
            const datosIngesta = await ingesta.json();
            if (!ingesta.ok) throw new Error(datosIngesta.error || "Hubo un error al procesar la información.");
            setResultado({ volcado: datos, ingesta: datosIngesta });
            setTexto("");
            setOrigen(ORIGEN_TECLADO);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setEnviando(false);
        }
    };

    return (
        <section data-testid="captura" style={{ maxWidth: "42rem", margin: "0 auto", padding: "1.5rem 1.5rem 0" }}>
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
                <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--khora-accent)" }}>
                    <ArrowLeft size={18} strokeWidth={1.75} />
                    <span>Escritorio</span>
                </Link>
                <h1 style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.28em", color: "var(--khora-accent)" }}>Captura</h1>
            </header>

            <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <textarea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    required
                    placeholder="Escribe, pega o dicta…"
                    data-testid="captura-texto"
                    style={{ width: "100%", minHeight: "16rem", resize: "none", borderRadius: "0.75rem", padding: "1rem", outline: "none", backgroundColor: "var(--khora-surface)", border: "1px solid var(--khora-border)", color: "var(--khora-ink)", lineHeight: 1.6 }}
                />
                <p data-testid="captura-procedencia" style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: "0.7rem", color: "var(--khora-accent)" }}>
                    {texto.trim().length} caracteres · procedencia {origen}
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                    {hayVoz ? (
                        <button
                            type="button"
                            onClick={alternarVoz}
                            aria-label={escuchando ? "Detener dictado" : "Iniciar dictado"}
                            data-testid="captura-voz"
                            style={{ height: "3.5rem", width: "3.5rem", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "9999px", border: "1px solid var(--khora-border)", backgroundColor: escuchando ? "var(--khora-ink)" : "var(--khora-surface)", color: escuchando ? "var(--khora-absolute)" : "var(--khora-ink)" }}
                        >
                            {escuchando ? <MicOff size={24} strokeWidth={1.75} /> : <Mic size={24} strokeWidth={1.75} />}
                        </button>
                    ) : <span />}
                    <button
                        type="submit"
                        disabled={enviando || !texto.trim()}
                        data-testid="captura-guardar"
                        style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderRadius: "0.75rem", padding: "0.75rem 1.5rem", fontSize: "0.875rem", backgroundColor: "var(--khora-ink)", color: "var(--khora-absolute)", opacity: enviando || !texto.trim() ? 0.4 : 1 }}
                    >
                        <Save size={18} strokeWidth={1.75} />
                        <span>{enviando ? "Guardando…" : "Guardar en memoria"}</span>
                    </button>
                </div>
            </form>

            {error && (
                <p data-testid="captura-error" style={{ marginTop: "1.5rem", padding: "1rem", borderRadius: "0.75rem", border: "1px solid var(--khora-border)", backgroundColor: "var(--khora-surface)", color: "var(--khora-ink)" }}>
                    {error}
                </p>
            )}

            {resultado && (
                <div data-testid="captura-acta" style={{ marginTop: "1.5rem", padding: "1rem", borderRadius: "0.75rem", border: "1px solid var(--khora-border)", backgroundColor: "var(--khora-surface)" }}>
                    <p style={{ color: "var(--khora-ink)", marginBottom: "0.5rem" }}>A salvo</p>
                    <ul style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: "0.7rem", color: "var(--khora-accent)", listStyle: "none", padding: 0, margin: 0 }}>
                        <li>id · {resultado.volcado?.id}</li>
                        {resultado.ingesta?.acta && (
                            <>
                                <li>ideas novedosas · {resultado.ingesta.acta.ideas_novedosas}</li>
                                <li>triples escritos · {resultado.ingesta.acta.triples_escritos}</li>
                            </>
                        )}
                    </ul>
                </div>
            )}
        </section>
    );
}