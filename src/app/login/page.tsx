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
      if (err instanceof AuthError) {
        redirect("/login?error=CredentialsSignin");
      }
      throw err;
    }
  }

  return (
    <main className="relative flex min-h-screen items-stretch">
      <div className="aurora" aria-hidden="true">
        <span />
      </div>

      {/* ── Left brand panel (desktop only) ── */}
      <div className="hidden flex-col justify-between p-10 lg:flex lg:w-[45%]">
        <div className="flex items-center gap-3">
          <Logo size={36} markOnly />
          <span className="text-lg font-semibold tracking-tight">jobineurope</span>
        </div>

        <div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            Your AI-powered<br />
            path to a job<br />
            in Europe.
          </h1>
          <p className="mt-4 max-w-sm text-base text-muted">
            Ranked matches, cover letters, and application tracking — built for
            developers targeting Germany &amp; Romania.
          </p>

          <ul className="mt-8 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--accent)]/15 text-sm text-[var(--accent)]">
                  {f.icon}
                </span>
                <div>
                  <p className="text-sm font-medium">{f.title}</p>
                  <p className="text-xs text-muted">{f.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-faint">Personal dashboard · not for resale</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <div className="glass-strong w-full max-w-sm rounded-3xl p-8 shadow-2xl">
          {/* Mobile-only logo */}
          <div className="mb-6 lg:hidden">
            <Logo size={36} />
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold">Sign in</h2>
            <p className="mt-1 text-sm text-muted">
              Welcome back — your job hunt awaits.
            </p>
          </div>

          <form action={credentialsLogin} className="flex flex-col gap-4">
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-500/15 px-3 py-2.5 text-sm text-red-600 dark:text-red-300"
              >
                Invalid email or password. Please try again.
              </p>
            )}

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Email</span>
              <input
                type="email"
                name="email"
                required
                autoFocus
                autoComplete="email"
                className="glass-input"
                placeholder="you@example.com"
              />
            </label>

            <PasswordField />

            <button type="submit" className="glass-btn glass-btn-primary mt-2 w-full py-2.5">
              Sign in →
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

const FEATURES = [
  {
    icon: "◆",
    title: "AI-ranked job matches",
    description: "Semantic search + LLM scoring against your CV across Arbeitnow & Adzuna.",
  },
  {
    icon: "◇",
    title: "One-click cover letters",
    description: "Generate tailored cover letters in your tone, grounded in your real profile.",
  },
  {
    icon: "●",
    title: "Application pipeline",
    description: "Track every application from saved → interview → offer in a Kanban board.",
  },
  {
    icon: "▲",
    title: "Visa-sponsorship filter",
    description: "First-class filter for roles that sponsor relocation from outside the EU.",
  },
];
