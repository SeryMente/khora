"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin })
      });

      if (res.ok) {
        setMessage({ type: "success", text: "PIN actualizado correctamente." });
        setCurrentPin("");
        setNewPin("");
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Error al actualizar PIN." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Error de conexión." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">Configuración</h1>

      <div className="bg-[var(--surface-secondary)] p-6 rounded-lg border border-[var(--border-subtle)]">
        <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Cambiar PIN</h2>

        {message.text && (
          <div className={`mb-4 p-3 rounded text-sm ${
            message.type === "success"
              ? "bg-green-900/20 border border-green-500/50 text-green-200"
              : "bg-red-900/20 border border-red-500/50 text-red-200"
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">PIN Actual</label>
            <input
              type="password"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              className="w-full max-w-xs bg-[var(--surface-tertiary)] border border-[var(--border-strong)] rounded px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nuevo PIN</label>
            <input
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="w-full max-w-xs bg-[var(--surface-tertiary)] border border-[var(--border-strong)] rounded px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !currentPin || !newPin}
            className="w-max bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? "Guardando..." : "Actualizar PIN"}
          </button>
        </form>
      </div>
    </div>
  );
}
