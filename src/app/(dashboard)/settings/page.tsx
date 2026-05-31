import { auth } from "@/auth";
import { getSettings, DEFAULT_SETTINGS } from "@/lib/settings/store";
import { PageHeading } from "@/components/glass";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  const settings = session?.user?.id ? await getSettings(session.user.id) : DEFAULT_SETTINGS;

  return (
    <>
      <PageHeading title="Settings" description="Tune how jobs are sourced and scored for you." />
      <SettingsForm initial={settings} />
    </>
  );
}
