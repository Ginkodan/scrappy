import { randomUUID } from "crypto";
import { dbInsertJob, dbFinishJob, dbGetJob, dbListJobs, dbInsertEvent, dbGetEvents } from "./db.js";
import { readSettings } from "./settings.js";
import { fireWebhook } from "./webhook.js";

export type JobType = "index" | "update";
export type JobStatus = "running" | "done" | "failed" | "cancelled";

/** Runtime-only state for active jobs (not persisted) */
interface ActiveJob {
  subscribers: Set<(event: JobEvent) => void>;
  abortController: AbortController;
}

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  params: Record<string, string>;
  startedAt: string;
  finishedAt?: string;
  result?: string;
  // Runtime only — not serialized
  subscribers: Set<(event: JobEvent) => void>;
  abortController: AbortController;
}

export interface JobEvent {
  type: string;
  payload: Record<string, unknown>;
  ts: string;
}

const activeJobs = new Map<string, ActiveJob>();

export function createJob(type: JobType, params: Record<string, string>): Job {
  const id = randomUUID();
  const startedAt = new Date().toISOString();

  dbInsertJob({ id, type, status: "running", params, started_at: startedAt });

  const active: ActiveJob = {
    subscribers: new Set(),
    abortController: new AbortController(),
  };
  activeJobs.set(id, active);

  return buildJob(id, type, "running", params, startedAt, active);
}

export function getJob(id: string): Job | undefined {
  const row = dbGetJob(id);
  if (!row) return undefined;
  const active = activeJobs.get(id);
  return buildJob(
    row.id,
    row.type as JobType,
    row.status as JobStatus,
    row.params,
    row.started_at,
    active,
    row.finished_at,
    row.result,
  );
}

export function listJobs(): Omit<Job, "subscribers" | "abortController">[] {
  return dbListJobs().map((row) => ({
    id: row.id,
    type: row.type as JobType,
    status: row.status as JobStatus,
    params: row.params,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    result: row.result,
  }));
}

export function emitEvent(job: Job, type: string, payload: Record<string, unknown>): void {
  const ts = new Date().toISOString();
  dbInsertEvent(job.id, type, payload);
  const event: JobEvent = { type, payload, ts };
  const active = activeJobs.get(job.id);
  if (active) {
    for (const fn of active.subscribers) fn(event);
  }
}

/** Backward-compat helper: emit a plain log line as a "log" event */
export function appendLog(job: Job, line: string): void {
  emitEvent(job, "log", { message: line });
}

export function finishJob(job: Job, status: "done" | "failed" | "cancelled", result?: string): void {
  const finishedAt = new Date().toISOString();
  dbFinishJob(job.id, status, finishedAt, result);
  job.status = status;
  job.finishedAt = finishedAt;
  job.result = result;

  const active = activeJobs.get(job.id);
  if (active) {
    const doneEvent: JobEvent = { type: "__done__", payload: { status }, ts: finishedAt };
    for (const fn of active.subscribers) fn(doneEvent);
    active.subscribers.clear();
    activeJobs.delete(job.id);
  }

  const { webhookUrl } = readSettings();
  if (webhookUrl) {
    fireWebhook(webhookUrl, {
      event: "job.finished",
      jobId: job.id,
      type: job.type,
      status,
      result: result ?? null,
      finishedAt,
      params: job.params,
    });
  }
}

export function getJobEvents(jobId: string): JobEvent[] {
  return dbGetEvents(jobId).map((e) => ({ type: e.type, payload: e.payload, ts: e.ts }));
}

function buildJob(
  id: string,
  type: JobType,
  status: JobStatus,
  params: Record<string, string>,
  startedAt: string,
  active: ActiveJob | undefined,
  finishedAt?: string,
  result?: string,
): Job {
  return {
    id,
    type,
    status,
    params,
    startedAt,
    finishedAt,
    result,
    subscribers: active?.subscribers ?? new Set(),
    abortController: active?.abortController ?? new AbortController(),
  };
}
