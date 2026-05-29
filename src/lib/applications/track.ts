import "server-only";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db/mongo";
import type { ApplicationDoc, ApplicationStatus } from "@/lib/db/schema";

/**
 * Application tracker repository. All operations are scoped to userId so a
 * caller can never touch another user's applications.
 */

export const STATUSES: readonly ApplicationStatus[] = [
  "saved",
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
];

export function isStatus(value: unknown): value is ApplicationStatus {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

const MAX_NOTES_CHARS = 4000;

export interface ApplicationWithJob extends Omit<ApplicationDoc, "jobId"> {
  jobId: ObjectId;
  job: {
    _id: ObjectId;
    title: string;
    company?: string;
    location?: string;
    country?: string;
    remote?: boolean;
    applyUrl: string;
    source: string;
    mentionsVisaSponsorship: boolean;
  } | null;
}

/** List a user's applications, newest history first, with job details joined. */
export async function listApplications(userIdStr: string): Promise<ApplicationWithJob[]> {
  const applications = await getCollection<ApplicationDoc>("applications");
  return applications
    .aggregate<ApplicationWithJob>([
      { $match: { userId: new ObjectId(userIdStr) } },
      { $lookup: { from: "jobs", localField: "jobId", foreignField: "_id", as: "job" } },
      { $addFields: { job: { $arrayElemAt: ["$job", 0] } } },
      { $sort: { "job.title": 1 } },
    ])
    .toArray();
}

/**
 * Save a job to the tracker. Idempotent: if an application already exists for
 * (user, job) it is returned unchanged rather than duplicated.
 */
export async function saveApplication(
  userIdStr: string,
  jobIdStr: string,
): Promise<ApplicationDoc> {
  const userId = new ObjectId(userIdStr);
  const jobId = new ObjectId(jobIdStr);
  const applications = await getCollection<ApplicationDoc>("applications");

  const existing = await applications.findOne({ userId, jobId });
  if (existing) return existing;

  const now = new Date();
  const doc: ApplicationDoc = {
    _id: new ObjectId(),
    userId,
    jobId,
    status: "saved",
    reminders: [],
    history: [{ status: "saved", at: now }],
  };
  await applications.insertOne(doc);
  return doc;
}

export class ApplicationNotFoundError extends Error {
  constructor() {
    super("Application not found.");
    this.name = "ApplicationNotFoundError";
  }
}

interface UpdateFields {
  status?: ApplicationStatus;
  notes?: string;
}

/** Update an application's status and/or notes; status changes append history. */
export async function updateApplication(
  userIdStr: string,
  appIdStr: string,
  fields: UpdateFields,
): Promise<ApplicationDoc> {
  const userId = new ObjectId(userIdStr);
  const _id = new ObjectId(appIdStr);
  const applications = await getCollection<ApplicationDoc>("applications");

  const current = await applications.findOne({ _id, userId });
  if (!current) throw new ApplicationNotFoundError();

  const set: Partial<ApplicationDoc> = {};
  const push: Record<string, unknown> = {};

  if (fields.status && fields.status !== current.status) {
    const now = new Date();
    set.status = fields.status;
    if (fields.status === "applied" && !current.appliedAt) set.appliedAt = now;
    push.history = { status: fields.status, at: now };
  }
  if (fields.notes !== undefined) {
    set.notes = fields.notes.slice(0, MAX_NOTES_CHARS);
  }

  if (Object.keys(set).length === 0 && Object.keys(push).length === 0) {
    return current;
  }

  const update: Record<string, unknown> = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(push).length) update.$push = push;

  const updated = await applications.findOneAndUpdate({ _id, userId }, update, {
    returnDocument: "after",
  });
  if (!updated) throw new ApplicationNotFoundError();
  return updated;
}

/** Remove an application from the tracker. */
export async function deleteApplication(userIdStr: string, appIdStr: string): Promise<void> {
  const applications = await getCollection<ApplicationDoc>("applications");
  const result = await applications.deleteOne({
    _id: new ObjectId(appIdStr),
    userId: new ObjectId(userIdStr),
  });
  if (result.deletedCount === 0) throw new ApplicationNotFoundError();
}
