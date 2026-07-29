"use client";

import { useEffect, useState } from "react";

type Estado = { configurado?: boolean; abierta?: boolean; minutos?: number; error?: string };

export default function PaginaBoveda() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [pin, setPin] = useState("");
  const [aviso, setAviso] = useState("");

  async function consultar() {
    try {
      const r = await fetch("/api/boveda", { cache: "no-store" });
      setEstado(await r.json());
    } catch (e) {
      setEstado({ error: String(e) });
    }
  }

  useEffect(() => { consultar(); }, []);

  async function enviar() {
    setAviso("procesando...");
    try {
      const r = await fetch("/api/boveda", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pin }) });
      const d = await r.json();
      if (!r.ok) { setAviso("error: " + String(d?.error ?? r.status)); return; }
      setAviso(d?.recienCreado === true ? "pin creado y boveda abierta" : "boveda abierta");
      setPin("");
      consultar();
    } catch (e) {
      setAviso("error: " + String(e));
    }
  }

  const configurado = estado?.configurado === true;
  const abierta = estado?.abierta === true;

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: 24, fontFamily: "ui-monospace, monospace" }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Boveda</h1>
      <p style={{ opacity: 0.7, marginTop: 0 }}>Tus grabaciones y volcados estan cifrados. El pin abre la boveda por {String(estado?.minutos ?? 30)} minutos.</p>
      <p>estado: {configurado ? (abierta ? "abierta" : "cerrada") : "sin pin definido"}</p>
      {!configurado ? (<p style={{ opacity: 0.7 }}>El primer pin que escribas queda registrado como el pin de la boveda. De 4 a 12 digitos.</p>) : null}
      <input value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" type="password" placeholder="pin" style={{ width: "100%", padding: 10, fontSize: 18, letterSpacing: 4 }} />
      <button onClick={enviar} disabled={pin.length < 4} style={{ marginTop: 10, padding: "10px 16px", fontSize: 15 }}>{configurado ? "Abrir boveda" : "Definir pin"}</button>
      {aviso ? (<p style={{ marginTop: 12 }}>{aviso}</p>) : null}
      <p style={{ marginTop: 24 }}><a href="/sistema/editar">volver a la edicion de volcados</a></p>
    </main>
  );
}