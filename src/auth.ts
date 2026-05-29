import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/db/mongo";

/**
 * Auth.js v5. GitHub login doubles as the GitHub data connection:
 * we request `read:user` so profile ingestion can read public repos/langs.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise, { databaseName: process.env.MONGODB_DB ?? "jobineurope" }),
  session: { strategy: "jwt" },
  providers: [
    GitHub({
      authorization: { params: { scope: "read:user user:email" } },
    }),
    Google,
  ],
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
  pages: {
    signIn: "/login",
  },
});
