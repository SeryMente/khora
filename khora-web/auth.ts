// @l0 L0-002 §4 · @req AUTH-F1-01/REQ-1 · @acr ACR-1.3
import NextAuth from "next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    {
      id: "oidc",
      name: "OIDC",
      type: "oidc",
      issuer: process.env.OIDC_ISSUER_URL,
      clientId: process.env.OIDC_CLIENT_ID,
      clientSecret: process.env.OIDC_CLIENT_SECRET,
    },
  ],
  secret: process.env.AUTH_SECRET || "fallback-secret-for-dev",
  trustHost: true, // We trust the host where Next-Auth is running (especially in playwright and standard vercel deploys)
});
