import { MongoClient } from "mongodb";
import { info } from "./logger.js";

export async function runUpdateUpsertDemo({ mongoUrl, dbName, collectionName }) {
  const client = new MongoClient(mongoUrl, { maxPoolSize: 5 });
  await client.connect();
  const db = client.db(dbName);
  const col = db.collection(collectionName);

  const report = {
    updateExisting: null,
    updateMissingNoUpsert: null,
    upsertMissing: null,
    finalDocs: []
  };

  try {
    info("[demo] Ensuring indexes...");
    await col.createIndex({ email: 1 }, { unique: true });

    // Seed "Aarti" if not present
    await col.updateOne(
      { email: "aarti@shade.org.in" },
      { $setOnInsert: { email: "aarti@shade.org.in", name: "Aarti", city: "Chennai" } },
      { upsert: true }
    );

    // A) UPDATE existing
    const r1 = await col.updateOne(
      { email: "aarti@shade.org.in" },
      { $set: { city: "Chennai (Adyar)" } }
    );
    report.updateExisting = normalize(r1);

    // B) UPDATE missing (no upsert)
    const r2 = await col.updateOne(
      { email: "missing@example.com" },
      { $set: { city: "Mumbai" } }
    );
    report.updateMissingNoUpsert = normalize(r2);

    // C) UPSERT missing
    const r3 = await col.updateOne(
      { email: "missing@example.com" },
      {
        $set: { city: "Mumbai" },
        $setOnInsert: { createdAt: new Date(), tags: ["Prospect"] }
      },
      { upsert: true }
    );
    report.upsertMissing = normalize(r3);

    // Final docs snapshot
    report.finalDocs = await col
      .find({}, { projection: { _id: 0 } })
      .sort({ email: 1 })
      .toArray();

    info("[demo] Done.");
    return report;
  } finally {
    await client.close();
  }
}

function normalize(r) {
  return {
    matched: r.matchedCount ?? 0,
    modified: r.modifiedCount ?? 0,
    upsertedId: r.upsertedId?.toString() ?? null
  };
}

