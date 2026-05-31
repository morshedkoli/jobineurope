import { auth } from "@/auth";
import { availableProviders, PROVIDERS } from "@/lib/ai";
import { PageHeading, GlassCard, StatCard, StatusBadge } from "@/components/glass";

export default async function AiPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const available = availableProviders();
  const selectedChat = process.env.AI_CHAT_PROVIDER ?? "openrouter";
  const selectedEmbed = process.env.AI_EMBED_PROVIDER ?? "cloudflare";
  const embedDimensions = Number(process.env.EMBED_DIMENSIONS ?? 1024);

  const keyed = new Set<string>([...available.chat, ...available.embed]);

  const rows = [
    ...Object.values(PROVIDERS).map((p) => ({
      id: p.id,
      label: p.label,
      chat: Boolean(p.chatModel),
      embed: Boolean(p.embedModel),
      hasKey: keyed.has(p.id),
    })),
    {
      id: "cloudflare",
      label: "Cloudflare Workers AI",
      chat: true,
      embed: true,
      hasKey: available.cloudflare,
    },
  ];

  return (
    <>
      <PageHeading
        title="AI configuration"
        description="Providers route via environment variables, so chat and embeddings can use different backends."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Chat provider" value={selectedChat} hint="AI_CHAT_PROVIDER" accent icon="✦" />
        <StatCard label="Embeddings" value={selectedEmbed} hint="AI_EMBED_PROVIDER" icon="✧" />
        <StatCard label="Embed dims" value={embedDimensions} hint="Atlas vector index size" icon="▦" />
      </div>

      <GlassCard className="mt-6">
        <h2 className="text-lg font-semibold">Available providers</h2>
        <p className="mt-1 text-sm text-muted">
          A provider is usable once its API key is present in <code className="rounded bg-black/10 px-1 dark:bg-white/10">.env.local</code>.
          The active chat / embedding providers are highlighted.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-faint">
                <th className="px-3 py-2 font-medium">Provider</th>
                <th className="px-3 py-2 font-medium">Chat</th>
                <th className="px-3 py-2 font-medium">Embed</th>
                <th className="px-3 py-2 font-medium">Key</th>
                <th className="px-3 py-2 font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const active =
                  (r.id === selectedChat ? "chat" : "") +
                  (r.id === selectedEmbed ? " embed" : "");
                return (
                  <tr key={r.id} className="border-t border-white/10">
                    <td className="px-3 py-2.5 font-medium">{r.label}</td>
                    <td className="px-3 py-2.5 text-muted">{r.chat ? "✓" : "—"}</td>
                    <td className="px-3 py-2.5 text-muted">{r.embed ? "✓" : "—"}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge tone={r.hasKey ? "ok" : "idle"}>
                        {r.hasKey ? "set" : "none"}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2.5">
                      {active.trim() ? (
                        <span className="glass-chip text-[var(--accent)]">{active.trim()}</span>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </>
  );
}
