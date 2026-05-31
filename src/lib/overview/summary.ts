import "server-only";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db/mongo";
import type {
  ProfileDoc,
  JobDoc,
  MatchDoc,
  ApplicationDoc,
  AnswerProfileDoc,
  ApplicationStatus,
} from "@/lib/db/schema";

export interface OverviewSummary {
  jobs: { total: number; sponsorship: number };
  matches: { total: number; topScore: number; strong: number };
  applications: { total: number; byStatus: Record<ApplicationStatus, number> };
  profile: {
    completeness: number; // 0-100
    hasCv: boolean;
    hasGithub: boolean;
    hasWebsite: boolean;
    hasAnswers: boolean;
  };
}

const EMPTY_STATUS: Record<ApplicationStatus, number> = {
  saved: 0,
  applied: 0,
  screening: 0,
  interview: 0,
  offer: 0,
  rejected: 0,
};

export async function getOverview(userId: string): Promise<OverviewSummary> {
  const uid = new ObjectId(userId);

  const [jobs, matches, applications, profiles, answers] = await Promise.all([
    getCollection<JobDoc>("jobs"),
    getCollection<MatchDoc>("matches"),
    getCollection<ApplicationDoc>("applications"),
    getCollection<ProfileDoc>("profile"),
    getCollection<AnswerProfileDoc>("answerProfile"),
  ]);

  const [
    jobsTotal,
    jobsSponsorship,
    matchDocs,
    appDocs,
    profile,
    answerDoc,
  ] = await Promise.all([
    jobs.countDocuments({}),
    jobs.countDocuments({ mentionsVisaSponsorship: true }),
    matches
      .find({ userId: uid }, { projection: { fitScore: 1 } })
      .toArray(),
    applications.find({ userId: uid }, { projection: { status: 1 } }).toArray(),
    profiles.findOne({ userId: uid }, { projection: { structuredCv: 1, github: 1, website: 1 } }),
    answers.findOne({ userId: uid }, { projection: { fields: 1 } }),
  ]);

  const scores = matchDocs.map((m) => m.fitScore ?? 0);
  const byStatus = { ...EMPTY_STATUS };
  for (const app of appDocs) byStatus[app.status] = (byStatus[app.status] ?? 0) + 1;

  const hasCv = Boolean(profile?.structuredCv);
  const hasGithub = Boolean(profile?.github);
  const hasWebsite = Boolean(profile?.website);
  const hasAnswers = Boolean(answerDoc?.fields && Object.keys(answerDoc.fields).length > 0);
  const steps = [hasCv, hasGithub, hasWebsite, hasAnswers];
  const completeness = Math.round((steps.filter(Boolean).length / steps.length) * 100);

  return {
    jobs: { total: jobsTotal, sponsorship: jobsSponsorship },
    matches: {
      total: matchDocs.length,
      topScore: scores.length ? Math.max(...scores) : 0,
      strong: scores.filter((s) => s >= 75).length,
    },
    applications: { total: appDocs.length, byStatus },
    profile: { completeness, hasCv, hasGithub, hasWebsite, hasAnswers },
  };
}
