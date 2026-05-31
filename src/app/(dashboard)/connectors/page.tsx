import { auth } from "@/auth";
import { getConnectors, type ConnectorState } from "@/lib/connectors/status";
import { PageHeading, GlassCard, StatusBadge } from "@/components/glass";

const STATE_LABEL: Record<ConnectorState, { label: string; tone: "ok" | "warn" | "bad" | "idle" }> = {
  connected: { label: "Connected", tone: "ok" },
  configured: { label: "Configured", tone: "ok" },
  available: { label: "Available", tone: "warn" },
  missing: { label: "Not set", tone: "bad" },
};

const CATEGORIES = ["Identity", "Job sources", "Data & AI"] as const;

export default async function ConnectorsPage() {
  const session = await auth();
  const connectors = session?.user?.id ? await getConnectors(session.user.id) : [];

  return (
    <>
      <PageHeading
        title="Connectors"
        description="Every external service this dashboard can talk to, and whether it's wired up."
      />

      <div className="space-y-8">
        {CATEGORIES.map((category) => {
          const items = connectors.filter((c) => c.category === category);
          if (items.length === 0) return null;
          return (
            <section key={category}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-faint">
                {category}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((c) => {
                  const meta = STATE_LABEL[c.state];
                  return (
                    <GlassCard key={c.id} interactive className="flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold">{c.name}</h3>
                        <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                      </div>
                      <p className="mt-2 text-sm text-muted">{c.description}</p>
                      <p className="mt-auto pt-3 text-xs text-faint">{c.detail}</p>
                    </GlassCard>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
