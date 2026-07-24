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
  secret: process.env.AUTH_SECRET,
  trustHost: true, // We trust the host where Next-Auth is running (especially in playwright and standard vercel deploys)
});

// Fail early if no AUTH_SECRET is provided (prevents production leaks)
if (!process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET is missing. Server startup aborted to prevent insecure fallback.");
}
