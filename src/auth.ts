import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { z } from "zod";
import { authConfig } from "./auth.config";
import clientPromise from "@/lib/db/mongo";
import { getUserByEmail } from "@/lib/db/users";
import { verifyPassword } from "@/lib/auth/password";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * Full Node-runtime auth: extends the edge-safe authConfig with the MongoDB
 * adapter and the providers that depend on Node APIs. Used by route handlers
 * and server actions (not the middleware).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: process.env.MONGODB_DB ?? "jobineurope",
  }),
  providers: [
    GitHub({
      authorization: { params: { scope: "read:user user:email" } },
    }),
    Google,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await getUserByEmail(parsed.data.email);
        if (!user?.passwordHash) return null;
        if (!verifyPassword(parsed.data.password, user.passwordHash)) {
          return null;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name ?? null,
        };
      },
    }),
  ],
});
