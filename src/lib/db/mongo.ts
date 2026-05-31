import dns from "node:dns";
import { MongoClient, type Db, type Collection, type Document } from "mongodb";
import { COLLECTIONS } from "./schema";

const dbName = process.env.MONGODB_DB ?? "jobineurope";

// Some networks' default resolver refuses SRV lookups from Node's c-ares
// (querySrv ECONNREFUSED), which breaks `mongodb+srv://` URIs. DNS_SERVERS
// (comma-separated) lets us point lookups at public resolvers (e.g. 8.8.8.8).
const dnsServers = process.env.DNS_SERVERS?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Resolve an Atlas `mongodb+srv://` URI to a standard `mongodb://` seedlist
 * using a dedicated resolver pointed at DNS_SERVERS.
 *
 * `dns.setServers()` is process-global and unreliable inside the Next.js
 * runtime, so we resolve the SRV + TXT records explicitly here and hand the
 * driver a plain host seedlist. Normal A-record lookups for those hosts go
 * through the system resolver (getaddrinfo), which is not affected by the
 * SRV refusal — only the c-ares SRV query was being blocked.
 */
async function resolveSrvUri(uri: string, servers: string[]): Promise<string> {
  const u = new URL(uri);
  const resolver = new dns.promises.Resolver();
  resolver.setServers(servers);

  const records = await resolver.resolveSrv(`_mongodb._tcp.${u.hostname}`);
  const hosts = records.map((r) => `${r.name}:${r.port}`).join(",");

  const params = new URLSearchParams(u.search);
  params.set("ssl", "true"); // SRV implies TLS; preserve it for the seedlist.

  // Atlas publishes connection options (authSource, replicaSet) via a TXT
  // record on the SRV host. TXT is optional, so failures are non-fatal.
  try {
    const txt = (await resolver.resolveTxt(u.hostname)).flat();
    for (const entry of txt) {
      for (const pair of entry.split("&")) {
        const [key, value] = pair.split("=");
        if (key && !params.has(key)) params.set(key, value);
      }
    }
  } catch {
    // No TXT record / lookup failed — proceed with what we have.
  }

  const credentials = u.username
    ? `${u.username}${u.password ? `:${u.password}` : ""}@`
    : "";
  const path = u.pathname && u.pathname !== "/" ? u.pathname : "";
  return `mongodb://${credentials}${hosts}${path}?${params.toString()}`;
}

/**
 * Reuse the client across hot reloads in dev and across invocations in
 * serverless. A single MongoClient holds an internal connection pool.
 * Initialization is lazy so importing this module never throws at build time.
 */
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

async function createClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local");
  }
  // When DNS_SERVERS is configured and the URI uses SRV, resolve the seedlist
  // ourselves so the driver never issues the (refused) global SRV lookup.
  const connectionUri =
    dnsServers?.length && uri.startsWith("mongodb+srv://")
      ? await resolveSrvUri(uri, dnsServers)
      : uri;
  // Fail fast (default is 30s) so a bad connection surfaces a clear error
  // instead of hanging the request/login flow.
  return new MongoClient(connectionUri, {
    serverSelectionTimeoutMS: 10000,
  }).connect();
}

function getClientPromise(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "production") {
    return createClientPromise();
  }
  return (global._mongoClientPromise ??= createClientPromise());
}

/** Lazy promise the MongoDB adapter consumes; not connected until awaited. */
const clientPromise: Promise<MongoClient> = {
  then(onF, onR) {
    return getClientPromise().then(onF, onR);
  },
} as Promise<MongoClient>;

export async function getDb(): Promise<Db> {
  const c = await getClientPromise();
  return c.db(dbName);
}

export async function getCollection<T extends Document>(
  name: keyof typeof COLLECTIONS,
): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(COLLECTIONS[name]);
}

export default clientPromise;
