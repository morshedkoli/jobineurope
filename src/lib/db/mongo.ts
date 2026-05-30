import dns from "node:dns";
import { MongoClient, type Db, type Collection, type Document } from "mongodb";
import { COLLECTIONS } from "./schema";

const dbName = process.env.MONGODB_DB ?? "jobineurope";

// Some networks' default resolver refuses SRV lookups from Node's c-ares
// (querySrv ECONNREFUSED), which breaks `mongodb+srv://` URIs. Allow pointing
// Node at explicit resolvers via DNS_SERVERS (comma-separated) when needed.
const dnsServers = process.env.DNS_SERVERS?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (dnsServers?.length) {
  dns.setServers(dnsServers);
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

function createClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local");
  }
  // Fail fast (default is 30s) so a bad connection surfaces a clear error
  // instead of hanging the request/login flow.
  return new MongoClient(uri, { serverSelectionTimeoutMS: 10000 }).connect();
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
