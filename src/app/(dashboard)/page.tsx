import Link from "next/link";
import { auth } from "@/auth";
import { getOverview } from "@/lib/overview/summary";
import { PageHeading, StatCard, GlassCard } from "@/components/glass";

export default async function OverviewPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const data = userId ? await getOverview(userId) : null;

  const checklist = [
    { label: "Upload your CV", done: data?.profile.hasCv, href: "/profile" },
    { label: "Connect GitHub", done: data?.profile.hasGithub, href: "/connectors" },
    { label: "Add your website", done: data?.profile.hasWebsite, href: "/profile" },
    { label: "Draft apply answers", done: data?.profile.hasAnswers, href: "/profile" },
  ];

  return (
    <>
      <PageHeading
        title={`Welcome back${session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}`}
        description="A snapshot of your job hunt across Germany & Romania."
      />

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
        {/* Profile completeness */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Profile completeness</h2>
            <span className="text-2xl font-semibold text-[var(--accent)]">
              {data?.profile.completeness ?? 0}%
            </span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--accent-2)] to-[var(--accent)] transition-all"
              style={{ width: `${data?.profile.completeness ?? 0}%` }}
            />
          </div>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {checklist.map((step) => (
              <li key={step.label}>
                <Link
                  href={step.href}
                  className="glass-soft glass-interactive flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm"
                >
                  <span
                    className={[
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs",
                      step.done
                        ? "bg-emerald-500 text-white"
                        : "border border-current text-faint",
                    ].join(" ")}
                  >
                    {step.done ? "✓" : ""}
                  </span>
                  <span className={step.done ? "text-muted line-through" : ""}>{step.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </GlassCard>

        {/* Pipeline snapshot */}
        <GlassCard>
          <h2 className="text-lg font-semibold">Pipeline</h2>
          <ul className="mt-4 space-y-2.5">
            {(["saved", "applied", "screening", "interview", "offer", "rejected"] as const).map(
              (status) => (
                <li key={status} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-muted">{status}</span>
                  <span className="font-semibold">
                    {data?.applications.byStatus[status] ?? 0}
                  </span>
                </li>
              ),
            )}
          </ul>
          <Link href="/applied" className="glass-btn mt-5 w-full">
            Open tracker
          </Link>
        </GlassCard>
      </div>
    </>
  );
}
