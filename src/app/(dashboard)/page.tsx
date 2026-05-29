import { ObjectId } from "mongodb";
import { auth, signOut } from "@/auth";
import { getCollection } from "@/lib/db/mongo";
import type { ProfileDoc } from "@/lib/db/schema";
import { CvUpload } from "./CvUpload";
import { EnrichPanel } from "./EnrichPanel";
import { MatchesPanel } from "./MatchesPanel";
import { TrackerPanel } from "./TrackerPanel";
import { AnswerProfile } from "./AnswerProfile";
import { JobsPanel } from "./JobsPanel";

export default async function DashboardPage() {
  const session = await auth();
  // middleware guarantees a session, but narrow for types.
  const userId = session?.user?.id;

  let cv: ProfileDoc["structuredCv"] = undefined;
  let github: ProfileDoc["github"] = undefined;
  let website: ProfileDoc["website"] = undefined;
  if (userId) {
    const profiles = await getCollection<ProfileDoc>("profile");
    const profile = await profiles.findOne({ userId: new ObjectId(userId) });
    cv = profile?.structuredCv;
    github = profile?.github;
    website = profile?.website;
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-neutral-500">
            {session?.user?.name ?? session?.user?.email}
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="rounded-lg border border-black/15 px-3 py-1.5 text-sm dark:border-white/20"
          >
            Sign out
          </button>
        </form>
      </header>

      <CvUpload initialCv={cv ?? null} />

      <EnrichPanel initialGithub={github ?? null} initialWebsite={website ?? null} />

      <MatchesPanel />

      <TrackerPanel />

      <AnswerProfile />

      <JobsPanel />

      <section className="mt-6 rounded-2xl border border-dashed border-black/15 p-6 text-sm text-neutral-500 dark:border-white/15">
        <p className="font-medium text-neutral-700 dark:text-neutral-300">
          Coming next
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Job alerts &amp; saved searches</li>
          <li>Romania job source &amp; GDPR export/delete</li>
        </ul>
      </section>
    </div>
  );
}
