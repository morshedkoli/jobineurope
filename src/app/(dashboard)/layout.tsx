import type { ReactNode } from "react";
import { auth, signOut } from "@/auth";
import { Sidebar } from "./_components/Sidebar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const name = session?.user?.name ?? session?.user?.email ?? "You";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="relative min-h-screen">
      {/* Aurora light source behind the glass */}
      <div className="aurora" aria-hidden="true">
        <span />
      </div>

      <Sidebar />

      <div className="md:pl-64">
        {/* Desktop top bar */}
        <header className="sticky top-0 z-20 hidden px-6 py-3 md:block">
          <div className="glass flex items-center justify-between rounded-2xl px-4 py-2">
            <p className="text-xs text-faint">DE · RO · sponsorship-friendly roles</p>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[var(--accent-2)] to-[var(--accent)] text-xs font-bold text-white">
                  {initial}
                </span>
                <span className="text-sm font-medium text-muted">{name}</span>
              </div>
              <SignOutButton />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-2 md:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button type="submit" className="glass-btn">
        Sign out
      </button>
    </form>
  );
}
