"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6" style={{ background: "var(--khora-bg)", color: "var(--khora-ink)" }}>
      <section className="w-full max-w-md rounded-xl border p-8 text-center" style={{ background: "var(--khora-surface)", borderColor: "var(--khora-border)" }}>
        <h1 className="text-xl font-bold uppercase tracking-[0.14em]">Se produjo un error</h1>
        <p className="mt-3 text-sm opacity-70">Khora no pudo completar esta operación. Puedes reintentar sin abandonar la sesión.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-md px-4 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--khora-accent)]"
          style={{ background: "var(--khora-accent)", color: "var(--khora-bg)" }}
        >
          Reintentar
        </button>
      </section>
    </main>
  );
}
