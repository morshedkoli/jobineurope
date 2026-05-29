import "server-only";
import { ObjectId } from "mongodb";
import { chatProvider, extractJson } from "@/lib/ai";
import { getCollection } from "@/lib/db/mongo";
import type { AnswerProfileDoc, ProfileDoc, StructuredCv } from "@/lib/db/schema";

/**
 * Assisted-apply answer profile: reusable answers to common application-form
 * questions, drafted from the candidate's profile and edited by the user. The
 * user copies these into real forms — we never auto-submit (ToS + ban risk).
 */

export interface AnswerField {
  key: string;
  label: string;
  hint: string;
}

/** Canonical, broadly-reusable application questions. */
export const ANSWER_FIELDS: readonly AnswerField[] = [
  { key: "summary", label: "Professional summary", hint: "2-3 sentence elevator pitch." },
  { key: "yearsExperience", label: "Years of experience", hint: "Total professional years." },
  { key: "coreSkills", label: "Core skills", hint: "Comma-separated top skills." },
  { key: "strengths", label: "Key strengths", hint: "What sets the candidate apart." },
  { key: "availability", label: "Notice period / availability", hint: "When they can start." },
  { key: "salaryExpectation", label: "Salary expectation", hint: "Range or 'open / negotiable'." },
  { key: "visaSponsorship", label: "Visa sponsorship", hint: "Whether sponsorship is required." },
  { key: "relocation", label: "Relocation", hint: "Willingness to relocate to DE/RO." },
  { key: "workLocation", label: "Location / work authorization", hint: "Current location & status." },
];

const MAX_VALUE_CHARS = 2000;

export class ProfileMissingError extends Error {
  constructor() {
    super("Upload your CV before drafting application answers.");
    this.name = "ProfileMissingError";
  }
}

function candidateBrief(cv: StructuredCv, profile: ProfileDoc): string {
  const parts: string[] = [];
  if (cv.fullName) parts.push(`Name: ${cv.fullName}`);
  if (cv.headline) parts.push(`Headline: ${cv.headline}`);
  if (cv.titles?.length) parts.push(`Titles: ${cv.titles.join(", ")}`);
  if (cv.skills?.length) parts.push(`Skills: ${cv.skills.join(", ")}`);
  if (cv.yearsTotal != null) parts.push(`Years experience: ${cv.yearsTotal}`);
  if (cv.languages?.length) parts.push(`Languages: ${cv.languages.join(", ")}`);
  if (cv.locationsOpenTo?.length) parts.push(`Open to: ${cv.locationsOpenTo.join(", ")}`);
  if (cv.contact?.location) parts.push(`Current location: ${cv.contact.location}`);
  parts.push(`Needs visa sponsorship: ${cv.needsVisaSponsorship ? "yes" : "no"}`);
  for (const e of cv.experience ?? []) {
    const line = [e.title, e.company, e.summary].filter(Boolean).join(" — ");
    if (line) parts.push(`Experience: ${line}`);
  }
  if (profile.github?.topLanguages?.length) {
    parts.push(`GitHub languages: ${profile.github.topLanguages.join(", ")}`);
  }
  if (profile.website?.summary) parts.push(`Web summary: ${profile.website.summary}`);
  return parts.join("\n");
}

const SYSTEM_PROMPT = `You prepare reusable answers to common job-application
questions for a software engineer applying to Europe (Germany & Romania) from
outside the EU. Answer ONLY from the provided profile — never invent facts.

Return ONLY a JSON object with exactly these string keys:
${ANSWER_FIELDS.map((f) => `  "${f.key}": ${f.hint}`).join("\n")}

Rules:
- Keep each value short and form-ready (1-2 sentences, or a phrase where natural).
- "yearsExperience" = a number followed by " years" if known, else "".
- "visaSponsorship": if the profile says sponsorship is needed, state that clearly
  but positively; otherwise say no sponsorship is required.
- "salaryExpectation": if unknown, write "Open / negotiable".
- If a field cannot be grounded in the profile, return an empty string for it.`;

/** Draft answers from the profile via the LLM (does not persist). */
export async function draftAnswers(userIdStr: string): Promise<Record<string, string>> {
  const userId = new ObjectId(userIdStr);
  const profiles = await getCollection<ProfileDoc>("profile");
  const profile = await profiles.findOne({ userId });
  if (!profile?.structuredCv) throw new ProfileMissingError();

  const response = await chatProvider().chat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `PROFILE:\n${candidateBrief(profile.structuredCv, profile)}` },
    ],
    { json: true, temperature: 0.3, maxTokens: 800 },
  );

  const parsed = extractJson<Record<string, unknown>>(response);
  return sanitizeFields(parsed);
}

/** Keep only known keys; coerce to trimmed, length-capped strings. */
export function sanitizeFields(input: Record<string, unknown>): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const field of ANSWER_FIELDS) {
    const raw = input[field.key];
    if (typeof raw === "string") fields[field.key] = raw.trim().slice(0, MAX_VALUE_CHARS);
  }
  return fields;
}

export async function getAnswers(userIdStr: string): Promise<Record<string, string>> {
  const answers = await getCollection<AnswerProfileDoc>("answerProfile");
  const doc = await answers.findOne({ userId: new ObjectId(userIdStr) });
  return doc?.fields ?? {};
}

/** Persist edited answers (replacing the stored set). */
export async function saveAnswers(
  userIdStr: string,
  fields: Record<string, string>,
): Promise<Record<string, string>> {
  const clean = sanitizeFields(fields);
  const userId = new ObjectId(userIdStr);
  const answers = await getCollection<AnswerProfileDoc>("answerProfile");
  await answers.updateOne(
    { userId },
    { $set: { fields: clean, updatedAt: new Date() }, $setOnInsert: { userId } },
    { upsert: true },
  );
  return clean;
}
