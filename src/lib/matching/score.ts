import "server-only";
import { chatProvider, extractJson, type ChatProvider } from "@/lib/ai";
import type { StructuredCv, JobDoc } from "@/lib/db/schema";

export interface FitScore {
  fitScore: number; // 0-100
  rationale: string;
  skillGaps: string[];
  sponsorshipFit: string;
}

const SYSTEM_PROMPT = `You evaluate how well a candidate fits a job. The candidate
is applying to Europe (target markets: Germany and Romania) and generally needs
visa sponsorship. Score realistically — do not inflate.

Return ONLY a JSON object:
{
  "fitScore": number,        // 0-100 overall fit
  "rationale": string,       // 1-3 sentences: why this score
  "skillGaps": string[],     // skills/requirements the candidate is missing
  "sponsorshipFit": string   // one of: "sponsors", "likely", "unclear", "no" — re: visa/relocation
}

Scoring guidance:
- Weight matching skills, seniority, and stack alignment heavily.
- If the candidate needs sponsorship and the role clearly won't sponsor, cap fitScore at 40.
- Roles in or remote-friendly to Germany/Romania score higher for this candidate.
- English-language workplaces are strongly preferred.`;

function candidateSummary(cv: StructuredCv): string {
  return [
    cv.headline && `Headline: ${cv.headline}`,
    cv.titles?.length && `Titles: ${cv.titles.join(", ")}`,
    cv.skills?.length && `Skills: ${cv.skills.join(", ")}`,
    cv.yearsTotal != null && `Experience: ${cv.yearsTotal} years`,
    cv.languages?.length && `Languages: ${cv.languages.join(", ")}`,
    `Needs visa sponsorship: ${cv.needsVisaSponsorship ? "yes" : "no"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function jobSummary(job: Pick<JobDoc, "title" | "company" | "location" | "country" | "remote" | "descriptionText" | "mentionsVisaSponsorship">): string {
  return [
    `Title: ${job.title}`,
    job.company && `Company: ${job.company}`,
    job.location && `Location: ${job.location}`,
    job.country && `Country: ${job.country}`,
    job.remote != null && `Remote: ${job.remote ? "yes" : "no"}`,
    `Mentions sponsorship/relocation: ${job.mentionsVisaSponsorship ? "yes" : "no"}`,
    `Description: ${job.descriptionText.slice(0, 4000)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function scoreJob(
  cv: StructuredCv,
  job: Pick<JobDoc, "title" | "company" | "location" | "country" | "remote" | "descriptionText" | "mentionsVisaSponsorship">,
  chat: ChatProvider = chatProvider(),
): Promise<FitScore> {
  const response = await chat.chat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `CANDIDATE:\n${candidateSummary(cv)}\n\nJOB:\n${jobSummary(job)}`,
      },
    ],
    { json: true, temperature: 0.2, maxTokens: 600 },
  );

  const parsed = extractJson<Partial<FitScore>>(response);
  const fitScore = Math.max(0, Math.min(100, Math.round(Number(parsed.fitScore ?? 0))));
  return {
    fitScore,
    rationale: parsed.rationale ?? "",
    skillGaps: parsed.skillGaps ?? [],
    sponsorshipFit: parsed.sponsorshipFit ?? "unclear",
  };
}
