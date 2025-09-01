import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";
import { runUpdateUpsertDemo } from "./demo.js";
import { info, error } from "./logger.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "demo_db";
const COLLECTION = process.env.COLLECTION || "contacts";

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

async function withCol(fn) {
  const client = new MongoClient(MONGO_URL, { maxPoolSize: 5 });
  await client.connect();
  try {
    const col = client.db(DB_NAME).collection(COLLECTION);
    await col.createIndex({ email: 1 }, { unique: true });
    return await fn(col);
  } finally {
    await client.close();
  }
}

// --- Original demo route ---
app.post("/run-demo", async (req, res) => {
  try {
    const results = await runUpdateUpsertDemo({
      mongoUrl: MONGO_URL,
      dbName: DB_NAME,
      collectionName: COLLECTION
    });
    res.json({ ok: true, results });
  } catch (e) {
    error(e);
    res.status(500).json({ ok: false, error: e?.message || "Unknown error" });
  }
});

// --- NEW: clear-data ---
app.post("/clear-data", async (req, res) => {
  try {
    const result = await withCol(async (col) => {
      await col.deleteMany({});
      return { deleted: true };
    });
    res.json({ ok: true, result });
  } catch (e) {
    error(e);
    res.status(500).json({ ok: false, error: e?.message || "Unknown error" });
  }
});

// --- NEW: insert-sample ---
app.post("/insert-sample", async (req, res) => {
  try {
    const now = new Date();
    const result = await withCol(async (col) => {
      const ops = [
        { updateOne: { filter: { email: "aarti@shade.org.in" }, update: { $setOnInsert: { email: "aarti@shade.org.in", name: "Aarti", city: "Chennai", tags: ["Volunteer"], createdAt: now } }, upsert: true } },
        { updateOne: { filter: { email: "rahul@example.com"     }, update: { $setOnInsert: { email: "rahul@example.com",      name: "Rahul", city: "Bengaluru", tags: ["Donor"], createdAt: now } }, upsert: true } },
        { updateOne: { filter: { email: "latha@example.com"     }, update: { $setOnInsert: { email: "latha@example.com",      name: "Latha", city: "Mumbai", tags: ["Prospect"], createdAt: now } }, upsert: true } }
      ];
      const r = await col.bulkWrite(ops, { ordered: false });
      const count = await col.countDocuments();
      return { bulk: { matched: r.matchedCount, modified: r.modifiedCount, upserts: r.upsertedCount }, total: count };
    });
    res.json({ ok: true, result });
  } catch (e) {
    error(e);
    res.status(500).json({ ok: false, error: e?.message || "Unknown error" });
  }
});

// --- NEW: list-contacts ---
app.get("/list-contacts", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || "10", 10)));
    const city = (req.query.city || "").trim();
    const tag = (req.query.tag || "").trim();

    const filter = {};
    if (city) filter.city = city;
    if (tag)  filter.tags = tag;

    const result = await withCol(async (col) => {
      const total = await col.countDocuments(filter);
      const docs = await col.find(filter, { projection: { _id: 0 } })
        .sort({ email: 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray();
      return { page, pageSize, total, docs };
    });

    res.json({ ok: true, result });
  } catch (e) {
    error(e);
    res.status(500).json({ ok: false, error: e?.message || "Unknown error" });
  }
});

// --- NEW: upsert-contact ---
app.post("/upsert-contact", async (req, res) => {
  try {
    const { email, name, city, tags } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, error: "email is required" });

    const result = await withCol(async (col) => {
      const r = await col.updateOne(
        { email },
        {
          $set: {
            ...(name ? { name } : {}),
            ...(city ? { city } : {}),
            ...(Array.isArray(tags) ? { tags } : {}),
            updatedAt: new Date()
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );
      return { matched: r.matchedCount, modified: r.modifiedCount, upsertedId: r.upsertedId ?? null };
    });

    res.json({ ok: true, result });
  } catch (e) {
    error(e);
    res.status(500).json({ ok: false, error: e?.message || "Unknown error" });
  }
});

app.listen(PORT, () => {
  info(`🚀 Server running on http://localhost:${PORT}`);
  info(`➡️  POST /run-demo`);
  info(`➡️  POST /clear-data`);
  info(`➡️  POST /insert-sample`);
  info(`➡️  GET  /list-contacts`);
  info(`➡️  POST /upsert-contact`);
});

