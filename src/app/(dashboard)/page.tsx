import Link from "next/link";
import { auth } from "@/auth";
import { getOverview } from "@/lib/overview/summary";
import { PageHeading, StatCard, GlassCard } from "@/components/glass";

export default async function OverviewPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const data = userId ? await getOverview(userId) : null;

  const checklist = [
    { label: "Upload your CV", done: data?.profile.hasCv, href: "/profile", icon: "📄" },
    { label: "Connect GitHub", done: data?.profile.hasGithub, href: "/profile", icon: "⌥" },
    { label: "Add your website", done: data?.profile.hasWebsite, href: "/profile", icon: "◎" },
    { label: "Draft apply answers", done: data?.profile.hasAnswers, href: "/profile", icon: "✏" },
  ];

  const allDone = checklist.every((s) => s.done);
  const completeness = data?.profile.completeness ?? 0;

  return (
    <>
      <PageHeading
        title={`Welcome back${session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}`}
        description="Your job hunt across Germany & Romania at a glance."
      />

      {/* Onboarding banner — shown until profile is complete */}
      {!allDone && (
        <div className="glass mb-6 overflow-hidden p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                Complete your profile to unlock better matches
              </p>
              <p className="text-xs text-muted">
                {4 - checklist.filter((s) => s.done).length} steps remaining
              </p>
            </div>
            <span className="shrink-0 text-2xl font-semibold text-[var(--accent)]">
              {completeness}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--accent-2)] to-[var(--accent)] transition-all duration-700"
              style={{ width: `${completeness}%` }}
            />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {checklist.map((step) => (
              <Link
                key={step.label}
                href={step.href}
                className={[
                  "step-item rounded-xl transition-all",
                  step.done ? "opacity-50" : "",
                ].join(" ")}
              >
                <span
                  className={[
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                    step.done
                      ? "bg-emerald-500 text-white"
                      : "border-2 border-[var(--glass-border)] text-faint",
                  ].join(" ")}
                >
                  {step.done ? "✓" : ""}
                </span>
                <span
                  className={[
                    "text-sm",
                    step.done ? "line-through text-muted" : "font-medium",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Jobs tracked"
          value={data?.jobs.total ?? 0}
          hint={`${data?.jobs.sponsorship ?? 0} with sponsorship signal`}
          accent
          icon="◆"
        />
        <StatCard
          label="Ranked matches"
          value={data?.matches.total ?? 0}
          hint={`${data?.matches.strong ?? 0} strong (75+)`}
          icon="◇"
        />
        <StatCard
          label="Top fit score"
          value={data?.matches.topScore ?? 0}
          hint="best match so far"
          icon="▲"
        />
        <StatCard
          label="Applications"
          value={data?.applications.total ?? 0}
          hint={`${data?.applications.byStatus.interview ?? 0} in interview`}
          icon="●"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Profile completeness (only shown when done) */}
        {allDone && (
          <GlassCard className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Profile completeness</h2>
              <span className="text-2xl font-semibold text-[var(--accent)]">
                {completeness}%
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--accent-2)] to-[var(--accent)] transition-all"
                style={{ width: `${completeness}%` }}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {checklist.map((step) => (
                <span
                  key={step.label}
                  className="glass-chip text-emerald-600 dark:text-emerald-300"
                >
                  {step.icon} {step.label}
                </span>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Quick actions when profile incomplete */}
        {!allDone && (
          <GlassCard className="lg:col-span-2">
            <h2 className="text-lg font-semibold">Quick actions</h2>
            <p className="mt-1 text-sm text-muted">Jump straight to the next step.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {!data?.profile.hasCv && (
                <Link href="/profile" className="glass-btn glass-btn-primary">
                  Upload CV →
                </Link>
              )}
              {data?.profile.hasCv && !data.jobs.total && (
                <Link href="/jobs" className="glass-btn glass-btn-primary">
                  Fetch jobs →
                </Link>
              )}
              {data?.profile.hasCv && !!data.jobs.total && !data.matches.total && (
                <Link href="/jobs" className="glass-btn glass-btn-primary">
                  Rank matches →
                </Link>
              )}
              <Link href="/settings" className="glass-btn">
                Configure settings →
              </Link>
            </div>
          </GlassCard>
        )}

        {/* Pipeline snapshot */}
        <GlassCard>
          <h2 className="text-lg font-semibold">Pipeline</h2>
          <ul className="mt-4 space-y-2">
            {(["saved", "applied", "screening", "interview", "offer", "rejected"] as const).map(
              (status) => {
                const count = data?.applications.byStatus[status] ?? 0;
                return (
                  <li key={status} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-muted">{status}</span>
                    <span
                      className={[
                        "min-w-[1.5rem] rounded-full px-2 py-0.5 text-center text-xs font-semibold",
                        count > 0
                          ? status === "offer"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                            : status === "interview"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                              : "glass-soft text-[var(--fg)]"
                          : "text-faint",
                      ].join(" ")}
                    >
                      {count}
                    </span>
                  </li>
                );
              },
            )}
          </ul>
          <Link href="/applied" className="glass-btn mt-5 w-full">
            Open tracker →
          </Link>
        </GlassCard>
      </div>
    </>
  );
}
