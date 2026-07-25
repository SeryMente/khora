// @l0 L0-002 §4 · @req AUTH-F1-01/REQ-1 · @acr ACR-1.3
import NextAuth from "next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
    {
      id: "oidc",
      name: "OIDC",
      type: "oidc",
      issuer: process.env.OIDC_ISSUER_URL || (process.env.PLAYWRIGHT_TEST_RUN === '1' ? 'http://localhost' : undefined),
      clientId: process.env.OIDC_CLIENT_ID || (process.env.PLAYWRIGHT_TEST_RUN === '1' ? 'mock' : undefined),
      clientSecret: process.env.OIDC_CLIENT_SECRET || (process.env.PLAYWRIGHT_TEST_RUN === '1' ? 'mock' : undefined),
    },
  ],
    secret: (() => {
    const s = process.env.AUTH_SECRET;
    if (process.env.PLAYWRIGHT_TEST_RUN === '1') return s || "mock-secret";
    if (!s) throw new Error("AUTH_SECRET env var is required — no fallback allowed");
    return s;
  })(),
  trustHost: true, // We trust the host where Next-Auth is running (especially in playwright and standard vercel deploys)
});
