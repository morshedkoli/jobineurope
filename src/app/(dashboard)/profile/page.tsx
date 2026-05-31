import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getCollection } from "@/lib/db/mongo";
import type { ProfileDoc } from "@/lib/db/schema";
import { PageHeading } from "@/components/glass";
import { CvUpload } from "../CvUpload";
import { EnrichPanel } from "../EnrichPanel";
import { AnswerProfile } from "../AnswerProfile";

export default async function ProfilePage() {
  const session = await auth();
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
    <>
      <PageHeading
        title="Profile"
        description="The richer your profile, the better your matches and cover letters."
      />
      <CvUpload initialCv={cv ?? null} />
      <EnrichPanel initialGithub={github ?? null} initialWebsite={website ?? null} />
      <AnswerProfile />
    </>
  );
}
