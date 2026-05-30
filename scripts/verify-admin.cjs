// Verifies a user authenticates with the same logic as src/auth.ts.
// Usage: node scripts/verify-admin.cjs <email> <password>
const fs = require("node:fs");
const path = require("node:path");
const dns = require("node:dns");
const { scryptSync, timingSafeEqual } = require("node:crypto");
const { MongoClient } = require("mongodb");

function loadEnvLocal() {
  const raw = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
  }
}

function verify(pw, stored) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const d = scryptSync(pw, salt, 64);
  const e = Buffer.from(hash, "hex");
  return d.length === e.length && timingSafeEqual(d, e);
}

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: node scripts/verify-admin.cjs <email> <password>");
    process.exit(1);
  }

  loadEnvLocal();
  const dnsServers = process.env.DNS_SERVERS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (dnsServers?.length) dns.setServers(dnsServers);

  const c = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });
  await c.connect();
  try {
    const u = await c
      .db(process.env.MONGODB_DB ?? "jobineurope")
      .collection("users")
      .findOne({ email: email.toLowerCase() });
    console.log("found:", !!u, "| email:", u && u.email, "| name:", u && u.name);
    console.log("password verifies:", u && verify(password, u.passwordHash));
  } finally {
    await c.close();
  }
}

main().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
