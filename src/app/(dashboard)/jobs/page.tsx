import { PageHeading } from "@/components/glass";
import { JobsPanel } from "../JobsPanel";
import { MatchesPanel } from "../MatchesPanel";

export default function JobsPage() {
  return (
    <>
      <PageHeading
        title="Jobs"
        description="Fetch sponsorship-friendly roles, then rank them against your profile."
      />
      <MatchesPanel />
      <JobsPanel />
    </>
  );
}
