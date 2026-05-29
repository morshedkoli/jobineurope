import { MongoClient, type Db, type Collection, type Document } from "mongodb";
import { COLLECTIONS } from "./schema";

const dbName = process.env.MONGODB_DB ?? "jobineurope";

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
  return new MongoClient(uri).connect();
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
