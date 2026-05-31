import { auth } from "@/auth";
import { getSettings, DEFAULT_SETTINGS } from "@/lib/settings/store";
import { getConnectors } from "@/lib/connectors/status";
import { PageHeading } from "@/components/glass";
import { SettingsPanel } from "./SettingsPanel";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  const { tab } = await searchParams;

  const [settings, connectors] = await Promise.all([
    userId ? getSettings(userId) : Promise.resolve(DEFAULT_SETTINGS),
    userId ? getConnectors(userId) : Promise.resolve([]),
  ]);

  const validTabs = ["preferences", "apikeys", "services"] as const;
  type Tab = (typeof validTabs)[number];
  const defaultTab: Tab = validTabs.includes(tab as Tab) ? (tab as Tab) : "preferences";

  return (
    <>
      <PageHeading
        title="Settings"
        description="Configure your job search preferences, API keys, and connected services — all in one place."
      />
      <SettingsPanel initial={settings} connectors={connectors} defaultTab={defaultTab} />
    </>
  );
}
