import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { PasswordField } from "./PasswordField";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { error } = await searchParams;

  async function credentialsLogin(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/",
      });
    } catch (err) {
      // signIn throws a redirect on success; only swallow auth failures.
      if (err instanceof AuthError) {
        redirect("/login?error=CredentialsSignin");
      }
      throw err;
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-neutral-900">
        <h1 className="text-2xl font-semibold tracking-tight">jobineurope</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Sign in to build your profile and find sponsorship-friendly roles in
          Germany &amp; Romania.
        </p>

        <form action={credentialsLogin} className="mt-6 flex flex-col gap-3">
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            >
              Invalid email or password.
            </p>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-white/20 dark:bg-neutral-800 dark:focus:border-white"
            />
          </label>
          <PasswordField />
          <button
            type="submit"
            className="mt-1 w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
