"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, FileCheck2, RefreshCw, ShieldCheck } from "lucide-react";

type ReceiptRow = {
  id: string;
  cycle_id: string;
  attempt: number;
  protocol_version: string;
  si_version: string;
  si_git_blob_sha: string;
  manifest_sha256: string;
  status: "VERIFIED" | "INVALID" | "INCOMPLETE";
  integrity: "PASS" | "FAIL";
  coverage_expected: number;
  coverage_evaluated: number;
  coverage_missing: number;
  coverage_duplicates: number;
  coverage_unknown: number;
  reasons: string[];
  verifier_version: string;
  created_at: string;
};

type DetailRow = ReceiptRow & {
  receipt: Record<string, unknown>;
  si_sha256: string;
  input_sha256: string;
  nonce: string;
  output_sha256: string;
  evidence_sha256: string;
};

export default function OtrosPage() {
  const [items, setItems] = useState<ReceiptRow[]>([]);
  const [totals, setTotals] = useState({ total: 0, verified: 0, invalid: 0, incomplete: 0 });
  const [selected, setSelected] = useState<DetailRow | null>(null);
  const [receiptText, setReceiptText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/norm-check", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(String(data?.error || "HTTP " + response.status));
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotals(data?.totals || { total: 0, verified: 0, invalid: 0, incomplete: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const verDetalle = useCallback(async (id: string) => {
    setError("");
    try {
      const response = await fetch("/api/norm-check?id=" + encodeURIComponent(id), { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(String(data?.error || "HTTP " + response.status));
      setSelected(data.receipt as DetailRow);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const verificarReceipt = useCallback(async () => {
    if (!receiptText.trim() || verifying) return;
    setVerifying(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/norm-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: receiptText,
      });
      const data = await response.json();
      const result = data?.result;
      if (result?.status === "VERIFIED") {
        setMessage("Comprobante verificado y persistido.");
      } else {
        setMessage(
          "Resultado: " + String(result?.status || "INVALID") +
          (Array.isArray(result?.reasons) && result.reasons.length ? " · " + result.reasons.join(", ") : "")
        );
      }
      await cargar();
      if (data?.id) await verDetalle(String(data.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setVerifying(false);
    }
  }, [receiptText, verifying, cargar, verDetalle]);

  const badgeStyle = (status: ReceiptRow["status"]) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "1px solid var(--khora-border)",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: status === "VERIFIED" ? "#34d399" : status === "INVALID" ? "#f87171" : "#fbbf24",
  });

  return (
    <main className="w-full max-w-6xl mx-auto px-4 py-10 pb-28 font-mono sm:px-8">
      <header className="space-y-3 border-b pb-6" style={{ borderColor: "var(--khora-border)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border" style={{ borderColor: "var(--khora-border)", background: "var(--khora-surface)" }}>
            <ShieldCheck size={26} style={{ color: "var(--khora-accent)" }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">Otros</p>
            <h1 className="text-2xl font-bold uppercase tracking-[0.08em]">Evidencia normativa</h1>
          </div>
        </div>
        <p className="max-w-3xl text-sm leading-relaxed opacity-70">
          Consola de revisión de comprobantes NORM-CHECK. KHORA valida dinámicamente la totalidad de los principios del SI asociado al ciclo.
        </p>
      </header>

      <section className="grid gap-3 py-6 md:grid-cols-4">
        {[
          ["Total", totals.total, FileCheck2],
          ["Verified", totals.verified, CheckCircle2],
          ["Invalid", totals.invalid, CircleAlert],
          ["Incomplete", totals.incomplete, CircleAlert],
        ].map(([label, value, Icon]) => {
          const I = Icon as typeof FileCheck2;
          return (
            <div key={String(label)} className="rounded-xl border p-4" style={{ borderColor: "var(--khora-border)", background: "var(--khora-surface)" }}>
              <div className="flex items-center gap-2 opacity-60"><I size={16} /><span className="text-[10px] font-bold uppercase tracking-[0.16em]">{String(label)}</span></div>
              <p className="mt-2 text-2xl font-bold">{String(value)}</p>
            </div>
          );
        })}
      </section>

      <section className="space-y-3 rounded-xl border p-4" style={{ borderColor: "var(--khora-border)", background: "var(--khora-surface)" }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold uppercase tracking-[0.12em]">Comprobar un receipt</h2>
            <p className="text-xs opacity-60">Pegue aquí el JSON enviado al endpoint de KHORA.</p>
          </div>
          <button type="button" onClick={() => void cargar()} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold" style={{ borderColor: "var(--khora-border)" }}>
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>
        <textarea
          value={receiptText}
          onChange={(event) => setReceiptText(event.target.value)}
          placeholder='{"protocol":"NORM-CHECK", ...}'
          className="min-h-44 w-full rounded-lg border bg-transparent p-3 font-mono text-xs outline-none"
          style={{ borderColor: "var(--khora-border)" }}
          spellCheck={false}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <code className="text-[11px] opacity-55">POST /api/norm-check · X-KHORA-KEY para clientes máquina</code>
          <button type="button" disabled={verifying || !receiptText.trim()} onClick={() => void verificarReceipt()} className="rounded-lg border px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40" style={{ borderColor: "var(--khora-accent)", color: "var(--khora-accent)" }}>
            {verifying ? "Verificando..." : "Verificar"}
          </button>
        </div>
      </section>

      {message && <div className="mt-4 rounded-lg border p-3 text-sm" style={{ borderColor: "var(--khora-border)" }}>{message}</div>}
      {error && <div className="mt-4 rounded-lg border p-3 text-sm" style={{ borderColor: "var(--khora-border)", color: "#f87171" }}>{error}</div>}

      <section className="mt-6 overflow-hidden rounded-xl border" style={{ borderColor: "var(--khora-border)" }}>
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "var(--khora-border)", background: "var(--khora-surface)" }}>
          <div>
            <h2 className="font-bold uppercase tracking-[0.12em]">Historial</h2>
            <p className="text-xs opacity-60">Últimos 50 comprobantes, sin sobrescritura de intentos.</p>
          </div>
          {loading && <span className="text-xs opacity-60">Cargando...</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead style={{ background: "var(--khora-surface)" }}>
              <tr className="border-b" style={{ borderColor: "var(--khora-border)" }}>
                {["Ciclo", "Intento", "SI", "Cobertura", "Estado", "Integridad", "Fecha"].map((head) => <th key={head} className="px-4 py-3 font-bold uppercase tracking-[0.12em] opacity-60">{head}</th>)}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b last:border-0" style={{ borderColor: "var(--khora-border)" }}>
                  <td className="px-4 py-3"><button type="button" onClick={() => void verDetalle(item.id)} className="text-left font-bold hover:underline">{item.cycle_id}</button></td>
                  <td className="px-4 py-3">{item.attempt}</td>
                  <td className="px-4 py-3 font-mono">{item.si_version}</td>
                  <td className="px-4 py-3">{item.coverage_evaluated}/{item.coverage_expected} ({item.coverage_expected ? Math.round((item.coverage_evaluated / item.coverage_expected) * 100) : 0}%)</td>
                  <td className="px-4 py-3"><span style={badgeStyle(item.status)}>{item.status}</span></td>
                  <td className="px-4 py-3">{item.integrity}</td>
                  <td className="px-4 py-3 opacity-60">{new Date(item.created_at).toLocaleString("es-MX")}</td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm opacity-55">No hay comprobantes persistidos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <section className="mt-6 space-y-4 rounded-xl border p-4" style={{ borderColor: "var(--khora-border)", background: "var(--khora-surface)" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-50">Detalle seleccionado</p>
              <h2 className="mt-1 text-lg font-bold">{selected.cycle_id} · intento {selected.attempt}</h2>
            </div>
            <span style={badgeStyle(selected.status)}>{selected.status}</span>
          </div>
          <div className="grid gap-3 text-xs md:grid-cols-2">
            <div><span className="opacity-50">SI blob:</span> <code>{selected.si_git_blob_sha}</code></div>
            <div><span className="opacity-50">SI SHA256:</span> <code>{selected.si_sha256}</code></div>
            <div><span className="opacity-50">Manifest SHA256:</span> <code>{selected.manifest_sha256}</code></div>
            <div><span className="opacity-50">Evidence SHA256:</span> <code>{selected.evidence_sha256}</code></div>
            <div><span className="opacity-50">Nonce:</span> <code>{selected.nonce}</code></div>
            <div><span className="opacity-50">Verifier:</span> <code>{selected.verifier_version}</code></div>
          </div>
          {selected.reasons?.length > 0 && (
            <div className="rounded-lg border p-3 text-xs" style={{ borderColor: "var(--khora-border)", color: "#fbbf24" }}>
              <strong>Motivos:</strong> {selected.reasons.join(", ")}
            </div>
          )}
          <pre className="max-h-[32rem] overflow-auto rounded-lg border p-3 text-[11px] leading-relaxed" style={{ borderColor: "var(--khora-border)" }}>
            {JSON.stringify(selected.receipt, null, 2)}
          </pre>
        </section>
      )}
    </main>
  );
}
