export function NotesReviewView({ scenario }: { scenario: string }) {
  if (scenario === "empty") {
    return (
      <section data-ui-id="notas.container" className="mx-auto max-w-4xl p-8">
        <div data-ui-id="notas.empty" className="rounded-2xl border p-10 text-center" style={{ borderColor: "var(--khora-border)", background: "var(--khora-surface)" }}>
          <h2 className="font-semibold">No hay notas todavía</h2>
          <p className="mt-1 text-sm opacity-60">Captura una idea sin título obligatorio.</p>
        </div>
      </section>
    );
  }

  if (scenario === "error") {
    return (
      <section data-ui-id="notas.container" className="mx-auto max-w-4xl p-8">
        <div data-ui-id="notas.error" role="alert" className="rounded-xl border border-red-500/40 p-5 text-sm text-red-600">No se pudieron cargar las notas. Reintenta.</div>
      </section>
    );
  }

  return (
    <section data-ui-id="notas.container" className="mx-auto max-w-5xl space-y-4 p-6" style={{ color: "var(--khora-ink)" }}>
      <header data-ui-id="notas.toolbar" className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs uppercase tracking-wider opacity-50">Captura personal</p><h2 className="text-2xl font-bold">Notas rápidas</h2></div>
        <button type="button" className="min-h-11 rounded-xl px-4" style={{ background: "var(--khora-accent)", color: "var(--khora-surface)" }}>Nueva nota</button>
      </header>
      <div className="grid gap-4 md:grid-cols-[15rem_1fr]">
        <aside className="space-y-3 rounded-xl border p-3" style={{ borderColor: "var(--khora-border)" }}>
          <input data-ui-id="notas.search" aria-label="Buscar notas" placeholder="Buscar notas" className="min-h-11 w-full rounded-lg border bg-transparent px-3" style={{ borderColor: "var(--khora-border)" }} />
          <nav data-ui-id="notas.status" aria-label="Estado de notas" className="flex flex-wrap gap-2 text-sm"><span>Activas</span><span>Archivadas</span><span>Papelera</span></nav>
        </aside>
        <div data-ui-id="notas.cards" className="grid gap-3 sm:grid-cols-2">
          <article data-ui-id="notas.card" className="rounded-2xl border p-4" style={{ borderColor: "var(--khora-border)", background: "var(--khora-surface)" }}>
            <h3 className="font-semibold">Preparar revisión de producto</h3>
            <p className="mt-2 text-sm opacity-75">Revisar **contrato R1–R14** y #proyecto/khora/notas.</p>
            <div className="mt-3 flex gap-2 text-xs opacity-60"><span>#proyecto/khora/notas</span><span>Fijada</span></div>
          </article>
          {scenario === "checklist" && (
            <article data-ui-id="notas.checklist" className="rounded-2xl border p-4" style={{ borderColor: "var(--khora-border)", background: "var(--khora-surface)" }}>
              <h3 className="font-semibold">Validación de checklist</h3>
              <p className="mt-2 text-sm">○ Verificar aislamiento</p><p className="text-sm line-through opacity-50">✓ Validar etiquetas</p>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
