import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config shared by the middleware (proxy.ts) and the full
 * Node-runtime auth (auth.ts). It must NOT import the MongoDB adapter,
 * the `mongodb` driver, or any `node:*` modules, so the middleware bundle
 * stays free of Node-only dependencies.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Providers that need Node APIs (Credentials/scrypt, OAuth) are added in
  // auth.ts. The middleware only verifies the JWT, so it needs none here.
  providers: [],
  callbacks: {
    async jwt({ token, account }) {
      // Persist the GitHub access token so server code can call the GitHub API.
      if (account?.provider === "github" && account.access_token) {
        token.githubAccessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
