import "server-only";
import { ObjectId } from "mongodb";
import { chatProvider, type ChatProvider } from "@/lib/ai";
import { getCollection } from "@/lib/db/mongo";
import type { CoverLetterDoc, JobDoc, ProfileDoc, StructuredCv } from "@/lib/db/schema";

/**
 * On-demand cover-letter generation. Each call appends a new version for the
 * (user, job) pair so earlier drafts are never overwritten.
 */

export const TONES = ["professional", "enthusiastic", "concise", "formal"] as const;
export type Tone = (typeof TONES)[number];

export function isTone(value: unknown): value is Tone {
  return typeof value === "string" && (TONES as readonly string[]).includes(value);
}

export class ProfileMissingError extends Error {
  constructor() {
    super("Upload your CV before generating a cover letter.");
    this.name = "ProfileMissingError";
  }
}

export class JobNotFoundError extends Error {
  constructor() {
    super("That job could not be found.");
    this.name = "JobNotFoundError";
  }
}

const TONE_GUIDANCE: Record<Tone, string> = {
  professional: "Warm but professional. Confident, not boastful.",
  enthusiastic: "Energetic and genuinely excited about the role and company.",
  concise: "Tight and to the point — no filler, every sentence earns its place.",
  formal: "Formal and traditional in register, suitable for conservative employers.",
};

const SYSTEM_PROMPT = `You write tailored cover letters for a software engineer
applying to jobs in Europe (target markets: Germany and Romania). The candidate
is applying from outside the EU and generally needs visa sponsorship.

Rules:
- 3-4 short paragraphs, ~250-320 words. No address blocks, no date, no "Dear Hiring Manager"
  placeholder if the company name is known — open naturally.
- Ground every claim in the candidate's real skills and experience. Never invent
  employers, titles, or achievements not present in the profile.
- Connect the candidate's concrete skills to the job's stated needs.
- If the role mentions sponsorship/relocation, acknowledge fit briefly. If the
  candidate needs sponsorship and the job is silent, do NOT over-promise — stay neutral.
- Return ONLY the letter body as plain text. No markdown, no preamble, no sign-off name placeholder like "[Your Name]".`;

function candidateBrief(cv: StructuredCv, profile: ProfileDoc): string {
  const parts: string[] = [];
  if (cv.fullName) parts.push(`Name: ${cv.fullName}`);
  if (cv.headline) parts.push(`Headline: ${cv.headline}`);
  if (cv.titles?.length) parts.push(`Titles: ${cv.titles.join(", ")}`);
  if (cv.skills?.length) parts.push(`Skills: ${cv.skills.join(", ")}`);
  if (cv.yearsTotal != null) parts.push(`Experience: ${cv.yearsTotal} years`);
  if (cv.languages?.length) parts.push(`Languages: ${cv.languages.join(", ")}`);
  for (const e of cv.experience ?? []) {
    const line = [e.title, e.company, e.summary].filter(Boolean).join(" — ");
    if (line) parts.push(`Experience: ${line}`);
  }
  if (profile.github?.topLanguages?.length) {
    parts.push(`GitHub languages: ${profile.github.topLanguages.join(", ")}`);
  }
  if (profile.website?.summary) parts.push(`Web summary: ${profile.website.summary}`);
  parts.push(`Needs visa sponsorship: ${cv.needsVisaSponsorship ? "yes" : "no"}`);
  return parts.join("\n");
}

function jobBrief(job: JobDoc): string {
  return [
    `Title: ${job.title}`,
    job.company && `Company: ${job.company}`,
    job.location && `Location: ${job.location}`,
    job.country && `Country: ${job.country}`,
    `Mentions sponsorship/relocation: ${job.mentionsVisaSponsorship ? "yes" : "no"}`,
    `Description: ${job.descriptionText.slice(0, 4000)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Generate a cover letter for (user, job) and persist it as the next version. */
export async function generateCoverLetter(
  userIdStr: string,
  jobIdStr: string,
  tone: Tone,
  chat: ChatProvider = chatProvider(),
): Promise<CoverLetterDoc> {
  const userId = new ObjectId(userIdStr);
  const jobId = new ObjectId(jobIdStr);

  const [profiles, jobs, coverLetters] = await Promise.all([
    getCollection<ProfileDoc>("profile"),
    getCollection<JobDoc>("jobs"),
    getCollection<CoverLetterDoc>("coverLetters"),
  ]);

  const profile = await profiles.findOne({ userId });
  if (!profile?.structuredCv) throw new ProfileMissingError();

  const job = await jobs.findOne({ _id: jobId });
  if (!job) throw new JobNotFoundError();

  const body = (
    await chat.chat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `TONE: ${TONE_GUIDANCE[tone]}\n\nCANDIDATE:\n${candidateBrief(
            profile.structuredCv,
            profile,
          )}\n\nJOB:\n${jobBrief(job)}`,
        },
      ],
      { temperature: 0.6, maxTokens: 900 },
    )
  ).trim();

  const last = await coverLetters
    .find({ userId, jobId })
    .sort({ version: -1 })
    .limit(1)
    .next();
  const version = (last?.version ?? 0) + 1;

  const doc: CoverLetterDoc = {
    _id: new ObjectId(),
    userId,
    jobId,
    version,
    body,
    tone,
    createdAt: new Date(),
  };
  await coverLetters.insertOne(doc);
  return doc;
}
