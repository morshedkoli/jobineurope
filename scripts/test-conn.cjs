// Quick connectivity probe. Usage: node scripts/test-conn.cjs "<mongodb-uri>"
const { MongoClient } = require("mongodb");

async function main() {
  const uri = process.argv[2];
  if (!uri) {
    console.error('Usage: node scripts/test-conn.cjs "<uri>"');
    process.exit(1);
  }
  const c = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  const t = Date.now();
  await c.connect();
  try {
    const db = c.db("jobineurope");
    await db.command({ ping: 1 });
    const users = await db.collection("users").countDocuments();
    console.log(`CONNECTED in ${Date.now() - t}ms | users: ${users}`);
  } finally {
    await c.close();
  }
}
main().catch((e) => {
  console.error("CONNECT FAILED:", e.message);
  process.exit(1);
});
