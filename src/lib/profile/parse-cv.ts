import "server-only";
import { extractText, getDocumentProxy } from "unpdf";
import { chatProvider, extractJson } from "@/lib/ai";
import type { StructuredCv } from "@/lib/db/schema";

/** Extract plain text from a PDF buffer (serverless-friendly via unpdf). */
export async function pdfToText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return text.trim();
}

const SYSTEM_PROMPT = `You are a precise CV parser. Extract the candidate's
information from the CV text into a strict JSON object. Return ONLY JSON, no prose.

Schema:
{
  "fullName": string,
  "headline": string,
  "skills": string[],
  "experience": [{"title": string, "company": string, "startDate": string, "endDate": string, "summary": string}],
  "titles": string[],
  "yearsTotal": number,
  "languages": string[],
  "locationsOpenTo": string[],
  "needsVisaSponsorship": boolean,
  "education": [{"degree": string, "institution": string, "year": string}],
  "contact": {"email": string, "phone": string, "website": string, "location": string}
}

Rules:
- "titles" = distinct job titles held, most senior/recent first.
- "yearsTotal" = best estimate of total years of professional experience.
- "languages" = spoken/written human languages (not programming languages).
- If the CV does not state visa needs, default needsVisaSponsorship to true
  (the candidate is applying to Europe from outside the EU).
- Omit unknown optional fields rather than inventing values.`;

export async function parseCvText(rawText: string): Promise<StructuredCv> {
  const truncated = rawText.slice(0, 24_000); // keep prompt within model limits
  const response = await chatProvider().chat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `CV TEXT:\n\n${truncated}` },
    ],
    { json: true, temperature: 0.1, maxTokens: 2000 },
  );

  const parsed = extractJson<Partial<StructuredCv>>(response);

  // Normalize to guarantee required array fields exist.
  return {
    fullName: parsed.fullName,
    headline: parsed.headline,
    skills: parsed.skills ?? [],
    experience: parsed.experience ?? [],
    titles: parsed.titles ?? [],
    yearsTotal: parsed.yearsTotal,
    languages: parsed.languages ?? [],
    locationsOpenTo: parsed.locationsOpenTo ?? [],
    needsVisaSponsorship: parsed.needsVisaSponsorship ?? true,
    education: parsed.education ?? [],
    contact: parsed.contact ?? {},
  };
}
