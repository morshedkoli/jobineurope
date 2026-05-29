import "server-only";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db/mongo";
import type { ProfileDoc } from "@/lib/db/schema";

/**
 * GitHub profile enrichment. The OAuth access token is persisted by
 * @auth/mongodb-adapter in the `accounts` collection — we read it server-side
 * (never exposed to the browser via the session) and call the GitHub REST API.
 */

const GITHUB_API = "https://api.github.com";
const MAX_REPOS = 8;

interface GithubAccount {
  access_token?: string;
}

interface GithubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  html_url: string;
  fork: boolean;
}

export class GithubNotConnectedError extends Error {
  constructor() {
    super("No GitHub account connected. Sign in with GitHub to enrich your profile.");
    this.name = "GithubNotConnectedError";
  }
}

async function getGithubToken(userId: ObjectId): Promise<string> {
  const accounts = await getCollection<GithubAccount & { userId: ObjectId; provider: string }>(
    "accounts",
  );
  const account = await accounts.findOne({ userId, provider: "github" });
  const token = account?.access_token;
  if (!token) throw new GithubNotConnectedError();
  return token;
}

async function githubGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "jobineurope",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

function rankLanguages(repos: GithubRepo[]): string[] {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    if (repo.fork || !repo.language) continue;
    counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([language]) => language);
}

type GithubProfile = NonNullable<ProfileDoc["github"]>;

function pickTopRepos(repos: GithubRepo[]): GithubProfile["repos"] {
  return repos
    .filter((r) => !r.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, MAX_REPOS)
    .map((r) => ({
      name: r.name,
      description: r.description ?? undefined,
      language: r.language ?? undefined,
      stars: r.stargazers_count,
      url: r.html_url,
    }));
}

/** Fetch the user's GitHub profile and persist it to `profile.github`. */
export async function enrichGithub(userIdStr: string): Promise<GithubProfile> {
  const userId = new ObjectId(userIdStr);
  const token = await getGithubToken(userId);

  const me = await githubGet<{ login: string }>("/user", token);
  const repos = await githubGet<GithubRepo[]>(
    "/user/repos?per_page=100&sort=pushed&type=owner",
    token,
  );

  const github: GithubProfile = {
    username: me.login,
    topLanguages: rankLanguages(repos),
    repos: pickTopRepos(repos),
  };

  const profiles = await getCollection<ProfileDoc>("profile");
  await profiles.updateOne(
    { userId },
    { $set: { github, updatedAt: new Date() }, $setOnInsert: { userId } },
    { upsert: true },
  );

  return github;
}
