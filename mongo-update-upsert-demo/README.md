# MongoDB Update vs Upsert — Learning by Doing

**Goal:** Understand the difference between **update** and **upsert** in MongoDB with a runnable demo:
- Press **Run Demo** in the web UI (Bootstrap).
- A Node.js endpoint executes:
  1) `updateOne` on an existing doc,
  2) `updateOne` on a missing doc (no upsert) — does nothing,
  3) `updateOne` with `{ upsert: true }` — inserts new doc.

---

## TL;DR

- **update**: modifies only matching documents; **does not create** new ones if none match.
- **upsert**: **update or insert** — if no match, MongoDB inserts a new doc using your filter + update doc.
- Use `$setOnInsert` for **insert-only** fields (e.g., `createdAt`).

---

## Project Structure

```
mongo-update-upsert-demo/
├─ README.md
├─ CHANGELOG.md
├─ .env.example
├─ package.json
├─ docker-compose.yml
├─ docker/
│  └─ Dockerfile
├─ public/
│  └─ index.html
└─ src/
├─ server.js
├─ demo.js
└─ logger.js
```
---

## Prerequisites

- Node.js 18+ (or use Docker)
- Docker Desktop (if running via Compose)

---

## 1) Environment variables

Copy `.env.example` → `.env` and adjust if needed:

```env
PORT=8080
MONGO_URL=mongodb://mongo:27017
DB_NAME=demo_db
COLLECTION=contacts
```
•	When running without Docker, set MONGO_URL=mongodb://localhost:27017.

2) Install & Run (Local)

```bash
npm install
npm start
# open http://localhost:8080
```

Start MongoDB locally if not using Docker:

```bash
docker run -d --name local-mongo -p 27017:27017 mongo:7
# Then set MONGO_URL=mongodb://localhost:27017 in .env
```

3) Run with Docker Compose (Recommended)

```sh
docker compose up --build
# App:    http://localhost:8080
# Mongo:  mongodb://mongo:27017
```

4) What the demo does

Collection: contacts (unique by email)

Step A — Update existing (plain update)
	•	Filter: { email: "aarti@shade.org.in" } (inserted if not present)
	•	Update: { $set: { city: "Chennai (Adyar)" } }
	•	Expected: matched=1 modified=1 upsertedId=null

Step B — Update missing (no upsert)
	•	Filter: { email: "missing@example.com" }
	•	Update: { $set: { city: "Mumbai" } }
	•	Expected: matched=0 modified=0 (no insert)

Step C — Upsert missing ({ upsert: true })
	•	Filter: { email: "missing@example.com" }
	•	Update:

```sh
{
  $set: { city: "Mumbai" },
  $setOnInsert: { createdAt: new Date(), tags: ["Prospect"] }
}
```

	•	Expected: matched=0 modified=0 upsertedId=<ObjectId> (insert happens)

⸻

5) Sample console output

```
[demo] Ensuring indexes...
[demo] A) UPDATE existing -> matched=1 modified=1 upsertedId=null
[demo] B) UPDATE missing (no upsert) -> matched=0 modified=0
[demo] C) UPSERT missing -> matched=0 modified=0 upsertedId=66f...
[demo] Final docs:
[
  {
    "email": "aarti@shade.org.in",
    "name": "Aarti",
    "city": "Chennai (Adyar)"
  },
  {
    "email": "missing@example.com",
    "city": "Mumbai",
    "createdAt": "2025-08-30T13:00:01.234Z",
    "tags": ["Prospect"]
  }
]
```

6) API
	•	POST /run-demo → runs the 3 steps and returns JSON report.

Example:

```sh
curl -X POST http://localhost:8080/run-demo | jq
```

Response (abridged):

```json
{
  "ok": true,
  "results": {
    "updateExisting": {"matched":1,"modified":1,"upsertedId":null},
    "updateMissingNoUpsert": {"matched":0,"modified":0,"upsertedId":null},
    "upsertMissing": {"matched":0,"modified":0,"upsertedId":"66f..."},
    "finalDocs": [ ... ]
  }
}
```

7) Why $setOnInsert?
	•	Fields like createdAt, createdBy, or default tags should only be set once (on insert).
	•	$setOnInsert ensures they won’t be overwritten in subsequent updates.

⸻

8) Pro Tips & Pitfalls
	•	✅ Create a unique index on your natural key to prevent duplicates:

```sh
db.contacts.createIndex({ email: 1 }, { unique: true })
```

	•	✅ For counters, combine $inc with upsert:

```js
db.dailyStats.updateOne(
  { day: "2025-08-30" },
  { $inc: { donationsCount: 1 }, $setOnInsert: { createdAt: new Date() } },
  { upsert: true }
)
```

	•	⚠️ replaceOne(..., { upsert: true }) overwrites entire doc. Use only if you truly mean full replace.
	•	⚠️ Without a unique index, concurrent upserts can produce duplicates.

⸻

9) Troubleshooting
	•	ECONNREFUSED to Mongo: Check MONGO_URL, ensure Mongo is up.
	•	EADDRINUSE 8080: Change PORT or stop the other app using it.
	•	duplicate key error: You inserted the same email manually; remove duplicates or change test data.

⸻

10) License

MIT

---

# 2) `CHANGELOG.md` (optional)

```md
# Changelog

## 1.0.0 — 2025-08-30
- Initial release: Node.js demo of MongoDB update vs upsert
- Bootstrap UI with Jumbotron, Carousel, Tabs, Cards, and Toasts
- Docker Compose for app + Mongo
```

3) .env.example

```sh
PORT=8080
MONGO_URL=mongodb://mongo:27017
DB_NAME=demo_db
COLLECTION=contacts
```

(When running locally without Compose, set MONGO_URL=mongodb://localhost:27017.)

⸻

4) package.json

```json
{
  "name": "mongo-update-upsert-demo",
  "version": "1.0.0",
  "description": "Practical demo of MongoDB update vs upsert with a Bootstrap UI and Docker",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "NODE_ENV=development nodemon src/server.js"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "mongodb": "^6.8.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.4"
  },
  "license": "MIT"
}
```

5) src/logger.js

```js
export const log = (...args) => console.log(...args);
export const info = (...args) => console.info(...args);
export const warn = (...args) => console.warn(...args);
export const error = (...args) => console.error(...args);
```

6) src/demo.js — the heart of the demo

```js
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
```

7) src/server.js — tiny API + static file server

```js
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
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

// Serve the static UI
app.use(express.static(path.join(__dirname, "..", "public")));

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

app.listen(PORT, () => {
  info(`🚀 Server running on http://localhost:${PORT}`);
  info(`➡️  POST /run-demo`);
});
```
8) public/index.html — Bootstrap UI (Jumbotron, Carousel, Tabs, Cards, Toasts, Navbar)

> Uses CDN Bootstrap (quick). Contains a Run Demo button that calls /run-demo, shows a Toast, and renders results.

```html
<!doctype html>
<html lang="en" data-bs-theme="light">
<head>
  <meta charset="utf-8">
  <title>MongoDB: Update vs Upsert — LBD</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- Bootstrap (CDN) -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    pre code { white-space: pre-wrap; }
    .hero { background: linear-gradient(135deg,#0d6efd22,#19875422); border-radius: 1rem; }
    .toast-container { z-index: 2000; }
  </style>
</head>
<body>
<nav class="navbar navbar-expand-lg bg-body-tertiary shadow-sm sticky-top">
  <div class="container">
    <a class="navbar-brand fw-bold" href="#">Mongo Update vs Upsert</a>
    <button class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#nav">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div id="nav" class="collapse navbar-collapse">
      <ul class="navbar-nav me-auto mb-2 mb-lg-0">
        <li class="nav-item"><a class="nav-link active" href="#learn">Learn</a></li>
        <li class="nav-item"><a class="nav-link" href="#run">Run Demo</a></li>
        <li class="nav-item"><a class="nav-link" href="#docker">Docker</a></li>
      </ul>
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" id="themeSwitch">
        <label class="form-check-label" for="themeSwitch">Dark mode</label>
      </div>
    </div>
  </div>
</nav>

<main class="container my-4">
  <!-- Jumbotron -->
  <section class="p-4 p-md-5 mb-4 hero">
    <div class="row align-items-center gy-3">
      <div class="col-md-8">
        <h1 class="display-6 fw-semibold">Update vs Upsert — See it, Run it, Learn it.</h1>
        <p class="lead mb-3">Update changes existing docs only. Upsert updates or inserts when missing. Use <code>$setOnInsert</code> for insert-only fields.</p>
        <a href="#run" class="btn btn-primary btn-lg">Run Demo</a>
        <a href="#learn" class="btn btn-outline-secondary btn-lg ms-2">Read the Basics</a>
      </div>
      <div class="col-md-4">
        <!-- Carousel -->
        <div id="concepts" class="carousel slide" data-bs-ride="carousel">
          <div class="carousel-inner rounded-4">
            <div class="carousel-item active p-4 bg-light-subtle">
              <h5>Update</h5>
              <p>Modifies only matching docs. No match → no insert.</p>
            </div>
            <div class="carousel-item p-4 bg-light-subtle">
              <h5>Upsert</h5>
              <p>No match? Inserts a new doc from filter + update.</p>
            </div>
            <div class="carousel-item p-4 bg-light-subtle">
              <h5>$setOnInsert</h5>
              <p>Insert-only fields (e.g., createdAt) won’t change later.</p>
            </div>
          </div>
          <button class="carousel-control-prev" type="button" data-bs-target="#concepts" data-bs-slide="prev">
            <span class="carousel-control-prev-icon"></span>
          </button>
          <button class="carousel-control-next" type="button" data-bs-target="#concepts" data-bs-slide="next">
            <span class="carousel-control-next-icon"></span>
          </button>
        </div>
      </div>
    </div>
  </section>

  <!-- Tabs -->
  <section id="learn" class="mb-4">
    <ul class="nav nav-tabs" id="learnTabs" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#tab-update" type="button">Update</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-upsert" type="button">Upsert</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-cheats" type="button">Cheat Sheet</button>
      </li>
    </ul>
    <div class="tab-content border border-top-0 p-3 rounded-bottom">
      <div class="tab-pane fade show active" id="tab-update">
        <p><strong>Update</strong> modifies existing docs only.</p>
        <pre><code>db.contacts.updateOne(
  { email: "aarti@shade.org.in" },
  { $set: { city: "Chennai (Adyar)" } }
)</code></pre>
      </div>
      <div class="tab-pane fade" id="tab-upsert">
        <p><strong>Upsert</strong> updates or inserts when missing. Use <code>$setOnInsert</code> for insert-only defaults.</p>
        <pre><code>db.contacts.updateOne(
  { email: "missing@example.com" },
  {
    $set: { city: "Mumbai" },
    $setOnInsert: { createdAt: new Date(), tags: ["Prospect"] }
  },
  { upsert: true }
)</code></pre>
      </div>
      <div class="tab-pane fade" id="tab-cheats">
        <div class="table-responsive">
          <table class="table table-striped">
            <thead><tr><th>Operation</th><th>Creates if missing?</th><th>Use case</th></tr></thead>
            <tbody>
              <tr><td>updateOne(filter, update)</td><td>No</td><td>Modify known doc</td></tr>
              <tr><td>updateOne(..., {upsert:true})</td><td>Yes</td><td>Idempotent sync</td></tr>
              <tr><td>replaceOne(..., {upsert:true})</td><td>Yes</td><td>Full overwrite (careful)</td></tr>
              <tr><td>$setOnInsert</td><td>—</td><td>Insert-only defaults</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>

  <!-- Cards: Run Demo + CURL -->
  <section id="run" class="mb-5">
    <div class="row g-3">
      <div class="col-md-7">
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title">Run the demo</h5>
            <p class="card-text">Calls <code>POST /run-demo</code> which executes Update (existing), Update (missing), and Upsert (missing).</p>
            <button id="runBtn" class="btn btn-success">Run Demo</button>
            <button id="clearOut" class="btn btn-outline-danger ms-2">Clear Output</button>
            <hr>
            <pre class="bg-body-secondary p-3 rounded" id="output" style="max-height: 420px; overflow:auto;"><code>// Results will appear here...</code></pre>
          </div>
        </div>
      </div>
      <div class="col-md-5">
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title">cURL</h5>
            <p class="card-text">Run from terminal:</p>
            <pre><code>curl -X POST http://localhost:8080/run-demo | jq</code></pre>
            <p class="card-text">Or use Postman: <code>POST /run-demo</code></p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Docker accordion -->
  <section id="docker" class="mb-5">
    <div class="accordion" id="acc">
      <div class="accordion-item">
        <h2 class="accordion-header"><button class="accordion-button" data-bs-toggle="collapse" data-bs-target="#a1">Docker Compose</button></h2>
        <div id="a1" class="accordion-collapse collapse show" data-bs-parent="#acc">
          <div class="accordion-body">
            <pre><code>docker compose up --build
# App:   http://localhost:8080
# Mongo: mongodb://mongo:27017</code></pre>
          </div>
        </div>
      </div>
      <div class="accordion-item">
        <h2 class="accordion-header"><button class="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#a2">Troubleshooting</button></h2>
        <div id="a2" class="accordion-collapse collapse" data-bs-parent="#acc">
          <div class="accordion-body">
            <ul>
              <li>Change port in <code>.env</code> if 8080 is busy.</li>
              <li>Ensure Mongo service is healthy before hitting <code>/run-demo</code>.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</main>

<!-- Toasts -->
<div class="toast-container position-fixed top-0 end-0 p-3">
  <div id="toast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
    <div class="toast-header">
      <strong class="me-auto">Demo</strong>
      <small>now</small>
      <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
    </div>
    <div class="toast-body" id="toastBody">Running...</div>
  </div>
</div>

<!-- Bootstrap JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
  // Dark mode toggle
  const themeSwitch = document.getElementById('themeSwitch');
  const root = document.documentElement;
  themeSwitch?.addEventListener('change', (e) => {
    document.documentElement.setAttribute('data-bs-theme', e.target.checked ? 'dark' : 'light');
  });

  const toastEl = document.getElementById('toast');
  const toast = new bootstrap.Toast(toastEl);
  const toastBody = document.getElementById('toastBody');
  const out = document.getElementById('output');

  function showToast(msg) { toastBody.textContent = msg; toast.show(); }

  document.getElementById('runBtn').addEventListener('click', async () => {
    showToast('Running demo...');
    out.textContent = '// Running...';
    try {
      const res = await fetch('/run-demo', { method: 'POST' });
      const json = await res.json();
      if (json.ok) {
        out.textContent = JSON.stringify(json.results, null, 2);
        showToast('Success! See results below.');
      } else {
        out.textContent = JSON.stringify(json, null, 2);
        showToast('Failed — see output.');
      }
    } catch (e) {
      out.textContent = e?.message || String(e);
      showToast('Error — see output.');
    }
  });

  document.getElementById('clearOut').addEventListener('click', () => {
    out.textContent = '// Results cleared';
  });
</script>
</body>
</html>
```

9) Docker

docker/Dockerfile

```
# ---- Build/runtime in one (simple) ----
FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev || npm install --omit=dev

COPY . .

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
```

docker-compose.yml

```yml
version: "3.9"
services:
  mongo:
    image: mongo:7
    container_name: mongo-update-upsert-demo-mongo
    ports:
      - "27017:27017"
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 5s
      timeout: 3s
      retries: 20
    volumes:
      - mongo_data:/data/db

  app:
    build:
      context: .
      dockerfile: docker/Dockerfile
    container_name: mongo-update-upsert-demo-app
    env_file:
      - .env
    environment:
      - MONGO_URL=mongodb://mongo:27017
    ports:
      - "8080:8080"
    depends_on:
      mongo:
        condition: service_healthy

volumes:
  mongo_data:
```

10) Done! How to run

Option A — Docker Compose

```sh
cd mongo-update-upsert-demo
cp .env.example .env
docker compose up --build
# open http://localhost:8080 and click “Run Demo”
```

Option B — Local

```sh
cd mongo-update-upsert-demo
cp .env.example .env
# If you don’t have Mongo locally, run: docker run -d --name local-mongo -p 27017:27017 mongo:7
# Then set MONGO_URL=mongodb://localhost:27017 in .env
npm install
npm start
# open http://localhost:8080
```

If you want, I can also add:
	•	a mongosh script to replay the exact steps,
	•	a Makefile (or npm scripts) for common tasks,
	•	an optional Nginx container to serve index.html separately while Node exposes only the API.


