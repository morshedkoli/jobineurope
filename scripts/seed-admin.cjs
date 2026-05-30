// One-off admin seeding script.
// Usage: node scripts/seed-admin.cjs <email> <password> [name]
// Replicates the scrypt hashing in src/lib/auth/password.ts and upserts the
// user into the `users` collection.
const fs = require("node:fs");
const path = require("node:path");
const dns = require("node:dns");
const { scryptSync, randomBytes } = require("node:crypto");
const { MongoClient } = require("mongodb");

const SCRYPT_KEYLEN = 64;

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${derived}`;
}

function loadEnvLocal() {
  const raw = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}

async function main() {
  const [email, password, name = "Admin"] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: node scripts/seed-admin.cjs <email> <password> [name]");
    process.exit(1);
  }

  loadEnvLocal();
  // Node's default resolver refuses SRV lookups in some environments
  // (querySrv ECONNREFUSED). Honor the same DNS_SERVERS override the app uses.
  const dnsServers = process.env.DNS_SERVERS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (dnsServers?.length) dns.setServers(dnsServers);

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  const dbName = process.env.MONGODB_DB ?? "jobineurope";

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  try {
    const users = client.db(dbName).collection("users");
    const normalized = email.toLowerCase();
    const result = await users.updateOne(
      { email: normalized },
      {
        $set: { email: normalized, passwordHash: hashPassword(password), name },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
    const action = result.upsertedCount > 0 ? "CREATED" : "UPDATED";
    console.log(`Admin user ${action}: ${normalized} (db: ${dbName})`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
