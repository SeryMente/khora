import { signIn } from "@/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.callbackUrl) ? params.callbackUrl[0] : params.callbackUrl;
  const callbackUrl = raw?.startsWith("/") ? raw : "/";

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        background: "var(--khora-absolute)",
        color: "var(--khora-ink)",
      }}
    >
      <section style={{ width: "100%", maxWidth: "22rem", textAlign: "center" }}>
        <div aria-hidden="true" style={{ width: "4.5rem", height: "4.5rem", margin: "0 auto 2rem", color: "var(--khora-ink)" }}>
          <svg viewBox="0 0 128 128" width="100%" height="100%" fill="none">
            <path d="M98 32A54 54 0 1 0 98 96" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
            <circle cx="64" cy="64" r="8" fill="currentColor" />
          </svg>
        </div>
        <p style={{ margin: 0, fontFamily: "var(--font-mono), monospace", fontSize: "0.625rem", letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--khora-accent)" }}>
          Khôra
        </p>
        <h1 style={{ margin: "0.7rem 0 0", fontSize: "1.45rem", fontWeight: 500, letterSpacing: "-0.02em" }}>
          Entrar
        </h1>
        <p style={{ margin: "0.8rem 0 2rem", fontSize: "0.8rem", lineHeight: 1.6, color: "var(--khora-muted)" }}>
          Un espacio para recibir memoria.
        </p>
        <form action={async () => {
          "use server";
          await signIn("oidc", { redirectTo: callbackUrl });
        }}>
          <button type="submit" style={{ width: "100%", border: "1px solid var(--khora-border)", borderRadius: "999px", padding: "0.8rem 1rem", background: "transparent", color: "var(--khora-ink)", font: "inherit", fontSize: "0.78rem", cursor: "pointer" }}>
            Continuar con OIDC
          </button>
        </form>
      </section>
    </main>
  );
}
