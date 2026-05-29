import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-neutral-900">
        <h1 className="text-2xl font-semibold tracking-tight">jobineurope</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Sign in to build your profile and find sponsorship-friendly roles in
          Germany &amp; Romania.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Continue with GitHub
            </button>
          </form>

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="w-full rounded-lg border border-black/15 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
            >
              Continue with Google
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
