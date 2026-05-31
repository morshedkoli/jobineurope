import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { Logo } from "@/components/Logo";
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
    <main className="relative flex flex-1 items-center justify-center p-6">
      {/* Aurora light source behind the glass — same as the dashboard. */}
      <div className="aurora" aria-hidden="true">
        <span />
      </div>

      <div className="glass-strong w-full max-w-sm p-8">
        <Logo size={40} />
        <p className="mt-3 text-sm text-muted">
          Sign in to build your profile and find sponsorship-friendly roles in
          Germany &amp; Romania.
        </p>

        <form action={credentialsLogin} className="mt-6 flex flex-col gap-3">
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-600 dark:text-red-300"
            >
              Invalid email or password.
            </p>
          )}
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="glass-input"
            />
          </label>
          <PasswordField />
          <button type="submit" className="glass-btn glass-btn-primary mt-1 w-full">
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
