import type { ProfileDoc, JobDoc } from "@/lib/db/schema";

const MAX = 8000; // keep embedding inputs within model limits

/** Compact text representation of a candidate profile for embedding. */
export function profileToText(
  profile: Pick<ProfileDoc, "structuredCv" | "github" | "website">,
): string {
  const cv = profile.structuredCv;
  const parts: string[] = [];

  if (cv) {
    if (cv.headline) parts.push(cv.headline);
    if (cv.titles?.length) parts.push(`Titles: ${cv.titles.join(", ")}`);
    if (cv.skills?.length) parts.push(`Skills: ${cv.skills.join(", ")}`);
    if (cv.yearsTotal != null) parts.push(`${cv.yearsTotal} years experience`);
    if (cv.languages?.length) parts.push(`Languages: ${cv.languages.join(", ")}`);
    for (const e of cv.experience ?? []) {
      const line = [e.title, e.company, e.summary].filter(Boolean).join(" — ");
      if (line) parts.push(line);
    }
  }
  if (profile.github?.topLanguages?.length) {
    parts.push(`GitHub languages: ${profile.github.topLanguages.join(", ")}`);
  }
  if (profile.website?.summary) parts.push(profile.website.summary);

  return parts.join("\n").slice(0, MAX);
}

/** Compact text representation of a job for embedding. */
export function jobToText(
  job: Pick<JobDoc, "title" | "company" | "location" | "descriptionText" | "tags">,
): string {
  return [
    job.title,
    job.company ? `Company: ${job.company}` : "",
    job.location ? `Location: ${job.location}` : "",
    job.tags?.length ? `Tags: ${job.tags.join(", ")}` : "",
    job.descriptionText,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX);
}
