import { PageHeading } from "@/components/glass";
import { TrackerPanel } from "../TrackerPanel";

export default function AppliedPage() {
  return (
    <>
      <PageHeading
        title="Applied jobs"
        description="Move applications across the pipeline — saved through offer."
      />
      <TrackerPanel />
    </>
  );
}
