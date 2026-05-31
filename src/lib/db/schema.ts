import type { ObjectId } from "mongodb";

/**
 * MongoDB collection document shapes.
 * Sensitive PII (CV contents) lives under `profile` scoped to a userId.
 */

export interface UserDoc {
  _id: ObjectId;
  email: string;
  name?: string;
  image?: string;
  /** scrypt hash (`salt:derivedKey`) for credentials login; absent for OAuth-only users. */
  passwordHash?: string;
  createdAt: Date;
  settings?: {
    targetCountries: string[]; // e.g. ["DE", "RO"]
    englishOnly: boolean;
    needsVisaSponsorship: boolean;
  };
}

export interface StructuredCv {
  fullName?: string;
  headline?: string;
  skills: string[];
  experience: Array<{
    title: string;
    company?: string;
    startDate?: string;
    endDate?: string;
    summary?: string;
  }>;
  titles: string[];
  yearsTotal?: number;
  languages: string[];
  locationsOpenTo: string[];
  needsVisaSponsorship: boolean;
  education?: Array<{ degree?: string; institution?: string; year?: string }>;
  contact?: { email?: string; phone?: string; website?: string; location?: string };
}

export interface ProfileDoc {
  _id: ObjectId;
  userId: ObjectId;
  structuredCv?: StructuredCv;
  rawCvText?: string;
  github?: {
    username: string;
    topLanguages: string[];
    repos: Array<{ name: string; description?: string; language?: string; stars?: number; url: string }>;
  };
  website?: { url: string; summary?: string };
  profileEmbedding?: number[];
  updatedAt: Date;
}

export interface JobDoc {
  _id: ObjectId;
  source: "adzuna" | "arbeitnow" | string;
  externalId: string;
  title: string;
  company?: string;
  location?: string;
  country?: string; // ISO-2, e.g. "DE"
  remote?: boolean;
  descriptionText: string;
  applyUrl: string;
  salary?: { min?: number; max?: number; currency?: string };
  tags: string[];
  mentionsVisaSponsorship: boolean;
  postedAt?: Date;
  jobEmbedding?: number[];
  fetchedAt: Date;
}

export interface MatchDoc {
  _id: ObjectId;
  userId: ObjectId;
  jobId: ObjectId;
  fitScore: number; // 0-100
  rationale?: string;
  skillGaps: string[];
  sponsorshipFit?: string;
  scoredAt: Date;
}

export type ApplicationStatus =
  | "saved"
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected";

export interface ApplicationDoc {
  _id: ObjectId;
  userId: ObjectId;
  jobId: ObjectId;
  status: ApplicationStatus;
  coverLetterId?: ObjectId;
  appliedAt?: Date;
  notes?: string;
  reminders: Array<{ at: Date; note: string; done: boolean }>;
  history: Array<{ status: ApplicationStatus; at: Date }>;
}

export interface CoverLetterDoc {
  _id: ObjectId;
  userId: ObjectId;
  jobId: ObjectId;
  version: number;
  body: string;
  tone?: string;
  createdAt: Date;
}

export interface AnswerProfileDoc {
  _id: ObjectId;
  userId: ObjectId;
  fields: Record<string, string>;
  updatedAt: Date;
}

/** Per-user encrypted API key storage. */
export interface UserApiKeyDoc {
  _id: ObjectId;
  userId: ObjectId;
  keyName: string;
  ciphertext: string;
  iv: string;
  updatedAt: Date;
}

export const COLLECTIONS = {
  users: "users",
  accounts: "accounts", // managed by @auth/mongodb-adapter; stores OAuth tokens
  profile: "profile",
  jobs: "jobs",
  matches: "matches",
  applications: "applications",
  coverLetters: "coverLetters",
  answerProfile: "answerProfile",
  userApiKeys: "userApiKeys",
} as const;
