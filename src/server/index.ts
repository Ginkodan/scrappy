import "dotenv/config";
import Fastify from "fastify";
import staticPlugin from "@fastify/static";
import { resolve } from "path";
import { createJob, getJob, listJobs, getJobEvents, type Job } from "./jobs.js";
import { dbClearJobs } from "./db.js";
import { listSchemas, listOutputs, runIndexJob, runUpdateJob } from "./runner.js";
import { readSettings, writeSettings } from "./settings.js";
import { db } from "./db.js";
import { readRecords, deduplicateDataset, mergeRecords, exportToCsv, deleteDataset } from "../tools/records.js";
import { dbGetSchemaRow, dbGetSchema, dbInsertSchema, dbUpdateSchema, dbDeleteSchema, type SchemaInput } from "./schema-store.js";
import { seedSchemasFromFiles } from "./seed-schemas.js";

const app = Fastify({ logger: false });

app.register(staticPlugin, {
  root: resolve("public"),
  prefix: "/",
});

// --- settings ---
app.get("/settings", async () => readSettings());
app.post("/settings", async (req, reply) => {
  const { llmProvider, anthropicAgentModel, anthropicExtractModel, openaiModel, openaiExtractModel, zordmindUrl, zordmindModel } = req.body as Record<string, string>;
  const patch: Record<string, string> = {};
  if (llmProvider === "anthropic" || llmProvider === "openai" || llmProvider === "zordmind") patch.llmProvider = llmProvider;
  if (anthropicAgentModel) patch.anthropicAgentModel = anthropicAgentModel;
  if (anthropicExtractModel) patch.anthropicExtractModel = anthropicExtractModel;
  if (openaiModel) patch.openaiModel = openaiModel;
  if (openaiExtractModel) patch.openaiExtractModel = openaiExtractModel;
  if (zordmindUrl) patch.zordmindUrl = zordmindUrl;
  if (zordmindModel) patch.zordmindModel = zordmindModel;
  return writeSettings(patch);
});

// --- schemas & outputs ---
app.get("/schemas", async () => ({ schemas: listSchemas() }));
app.get("/outputs", async () => ({ outputs: listOutputs() }));

// --- schema CRUD ---
app.get("/schemas/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const row = dbGetSchemaRow(db, id);
  if (!row) return reply.code(404).send({ error: "not found" });
  return row;
});

app.post("/schemas", async (req, reply) => {
  const input = req.body as SchemaInput;
  if (!input.id || !input.display_name || !Array.isArray(input.fields) || !input.url_field) {
    return reply.code(400).send({ error: "id, display_name, fields, url_field required" });
  }
  try {
    dbInsertSchema(db, input);
    return { ok: true };
  } catch (err) {
    return reply.code(409).send({ error: err instanceof Error ? err.message : "conflict" });
  }
});

app.put("/schemas/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const input = req.body as Omit<SchemaInput, "id">;
  if (!input.display_name || !Array.isArray(input.fields) || !input.url_field) {
    return reply.code(400).send({ error: "display_name, fields, url_field required" });
  }
  if (!dbGetSchemaRow(db, id)) return reply.code(404).send({ error: "not found" });
  dbUpdateSchema(db, id, input);
  return { ok: true };
});

app.delete("/schemas/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const result = dbDeleteSchema(db, id);
  if (!result.deleted) return reply.code(409).send({ error: result.reason });
  return { ok: true };
});

// --- start index job ---
app.post("/jobs/index", async (req, reply) => {
  const { topic, schema, output, maxIterations, seedUrls } = req.body as Record<string, string>;
  if (!topic || !schema || !output) {
    return reply.code(400).send({ error: "topic, schema, output required" });
  }
  const params: Record<string, string> = { topic, schema, output };
  if (maxIterations) params.maxIterations = maxIterations;
  if (seedUrls) params.seedUrls = seedUrls;
  const job = createJob("index", params);
  runIndexJob(job); // fire and forget
  return { id: job.id };
});

// --- start update job ---
app.post("/jobs/update", async (req, reply) => {
  const { input, schema, filter } = req.body as Record<string, string>;
  if (!input || !schema) {
    return reply.code(400).send({ error: "input, schema required" });
  }
  const params: Record<string, string> = { input, schema };
  if (filter) params.filter = filter;
  const job = createJob("update", params);
  runUpdateJob(job); // fire and forget
  return { id: job.id };
});

// --- cancel job ---
app.post("/jobs/:id/cancel", async (req, reply) => {
  const { id } = req.params as { id: string };
  const job = getJob(id);
  if (!job) return reply.code(404).send({ error: "not found" });
  if (job.status !== "running") return reply.code(400).send({ error: "job not running" });
  job.abortController.abort();
  return { ok: true };
});

// --- clear completed/failed/cancelled jobs ---
app.post("/jobs/clear", async () => { dbClearJobs(); return { ok: true }; });

// --- list jobs ---
app.get("/jobs", async () => ({ jobs: listJobs() }));

// --- job detail ---
app.get("/jobs/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const job = getJob(id);
  if (!job) return reply.code(404).send({ error: "not found" });
  const { subscribers: _, abortController: __, ...rest } = job;
  return rest;
});

// --- structured events (for dashboard) ---
app.get("/jobs/:id/events", async (req, reply) => {
  const { id } = req.params as { id: string };
  const job = getJob(id);
  if (!job) return reply.code(404).send({ error: "not found" });
  return { events: getJobEvents(id) };
});

// --- SSE log stream ---
app.get("/jobs/:id/stream", async (req, reply) => {
  const { id } = req.params as { id: string };
  const job = getJob(id);
  if (!job) return reply.code(404).send({ error: "not found" });

  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const sendEvent = (type: string, payload: Record<string, unknown>, ts: string) => {
    reply.raw.write(`data: ${JSON.stringify({ type, payload, ts })}\n\n`);
  };

  // Replay existing events
  for (const e of getJobEvents(id)) {
    sendEvent(e.type, e.payload, e.ts);
  }

  if (job.status !== "running") {
    sendEvent("__done__", { status: job.status }, new Date().toISOString());
    reply.raw.end();
    return reply;
  }

  // Subscribe to future events
  const handler = (e: { type: string; payload: Record<string, unknown>; ts: string }) => {
    sendEvent(e.type, e.payload, e.ts);
    if (e.type === "__done__") reply.raw.end();
  };
  (job as Job).subscribers.add(handler);

  req.raw.on("close", () => {
    (job as Job).subscribers.delete(handler);
  });

  return reply;
});

// --- export dataset as CSV download ---
app.get("/outputs/:dataset", async (req, reply) => {
  const { dataset } = req.params as { dataset: string };
  if (dataset.includes("..")) return reply.code(400).send({ error: "invalid" });
  const name = dataset.replace(/\.csv$/i, "");
  const jobRow = db.prepare(
    "SELECT params FROM jobs WHERE json_extract(params, '$.output') = ? OR json_extract(params, '$.input') = ? ORDER BY started_at DESC LIMIT 1"
  ).get(name, name) as { params: string } | undefined;
  if (!jobRow) return reply.code(404).send({ error: "dataset not found" });
  const params = JSON.parse(jobRow.params) as Record<string, string>;
  const schemaDef = dbGetSchema(db, params.schema);
  if (!schemaDef) return reply.code(404).send({ error: `schema "${params.schema}" not found` });
  const csv = exportToCsv(name, schemaDef, db);
  reply.header("Content-Type", "text/csv");
  reply.header("Content-Disposition", `attachment; filename="${name}.csv"`);
  return reply.send(csv);
});

// --- delete dataset ---
app.delete("/outputs/:dataset", async (req, reply) => {
  const { dataset } = req.params as { dataset: string };
  if (dataset.includes("..")) return reply.code(400).send({ error: "invalid" });
  const name = dataset.replace(/\.csv$/i, "");
  deleteDataset(name, db);
  return { ok: true };
});

// --- dedupe dataset ---
app.post("/outputs/:dataset/dedupe", async (req, reply) => {
  const { dataset } = req.params as { dataset: string };
  if (dataset.includes("..")) return reply.code(400).send({ error: "invalid" });
  const name = dataset.replace(/\.csv$/i, "");
  return deduplicateDataset(name, db);
});

// --- merge rows by DB id ---
app.post("/outputs/:dataset/merge-rows", async (req, reply) => {
  const { dataset } = req.params as { dataset: string };
  if (dataset.includes("..")) return reply.code(400).send({ error: "invalid" });
  const name = dataset.replace(/\.csv$/i, "");
  const { keepId, removeIds } = req.body as { keepId: number; removeIds: number[] };
  if (typeof keepId !== "number" || !Array.isArray(removeIds)) {
    return reply.code(400).send({ error: "keepId (number) and removeIds (array) required" });
  }
  const kept = mergeRecords(keepId, removeIds, db);
  if (!kept) return reply.code(404).send({ error: "record not found" });
  return { ok: true, kept };
});

// --- records as JSON ---
app.get("/outputs/:dataset/records", async (req, reply) => {
  const { dataset } = req.params as { dataset: string };
  if (dataset.includes("..")) return reply.code(400).send({ error: "invalid" });
  const name = dataset.replace(/\.csv$/i, "");
  const rows = readRecords(name, db);
  if (rows.length === 0) return { headers: [], rows: [] };
  const headers = Object.keys(rows[0]).filter((k) => k !== "_id");
  return { headers, rows };
});

await seedSchemasFromFiles(db);

const port = parseInt(process.env.PORT ?? "3000", 10);
await app.listen({ port, host: "0.0.0.0" });
console.log(`scrappy server running on http://localhost:${port}`);
