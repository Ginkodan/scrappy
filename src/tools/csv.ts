import { createObjectCsvWriter } from "csv-writer";
import { existsSync, readFileSync, writeFileSync } from "fs";
import type { CsvRow, SchemaDefinition } from "../types.js";

const SYSTEM_FIELDS = ["_dataSource", "_lastUpdated"];

export function allFields(schemaDef: SchemaDefinition): string[] {
  return [...Object.keys(schemaDef.schema.shape), ...SYSTEM_FIELDS];
}

function normalizeField(field: string, value: string): string {
  const v = value.toLowerCase().trim();
  if (field === "bankName") {
    // Strip legal suffixes so "Tellco AG" and "Tellco" are the same bank
    return v.replace(/\b(ag|sa|gmbh|ltd|inc|co\.?)\b/g, "").replace(/\s+/g, " ").trim();
  }
  return v;
}

function makeKey(record: CsvRow, dedupeKey: string[]): string {
  return dedupeKey.map((k) => normalizeField(k, String(record[k] ?? ""))).join("|");
}

function normalizeUrl(raw: string): string {
  return raw.trim().toLowerCase()
    .replace(/^https?:\/\//, "")          // strip protocol
    .replace(/^www\./, "")                // strip www subdomain
    .replace(/\/(de|fr|en|it|rm)\//, "/") // strip language path segment
    .replace(/\/$/, "");                  // strip trailing slash
}

// Secondary key: same bank (normalized) + same URL (normalized) + same rate(s) → duplicate
// Catches e.g. "Vorsorgekonto 3a / Tellco AG / 0.45% / tellco.ch" vs "Tellco 3a Konto / Tellco / 0.45% / tellco.ch"
// Also catches same page with /de/ vs without language prefix
// Does NOT collapse Neon products that share a URL but have different rates
function makeUrlRateKey(record: CsvRow, schemaDef: SchemaDefinition): string | null {
  const bank = normalizeField("bankName", String(record["bankName"] ?? ""));
  const url = normalizeUrl(String(record[schemaDef.urlField] ?? ""));
  if (!bank || !url) return null;
  const rates = schemaDef.rateFields.map((f) => String(record[f] ?? "").trim().toLowerCase()).join("|");
  return `${bank}|${url}|${rates}`;
}


function parsecsv(content: string, fields: string[]): CsvRow[] {
  const lines = content.trim().split("\n").slice(1); // skip header
  return lines.filter(Boolean).map((line) => {
    // Handle quoted fields with commas inside
    const cols: string[] = [];
    let inQuote = false;
    let cur = "";
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === "," && !inQuote) { cols.push(cur); cur = ""; }
      else { cur += ch; }
    }
    cols.push(cur);
    const row: CsvRow = {};
    fields.forEach((f, i) => { row[f] = cols[i] ?? ""; });
    return row;
  });
}

export function readCsv(file: string, schemaDef: SchemaDefinition): CsvRow[] {
  if (!existsSync(file)) return [];
  const fields = allFields(schemaDef);
  return parsecsv(readFileSync(file, "utf-8"), fields);
}

export async function appendRecords(
  records: CsvRow[],
  outputFile: string,
  schemaDef: SchemaDefinition
): Promise<{ written: number; skipped: number }> {
  const fields = allFields(schemaDef);
  const fileExists = existsSync(outputFile);
  const existing = fileExists ? readCsv(outputFile, schemaDef) : [];
  const existingKeys = new Set(existing.map((r) => makeKey(r, schemaDef.dedupeKey)));
  const existingUrlRateKeys = new Set(
    existing.map((r) => makeUrlRateKey(r, schemaDef)).filter((k): k is string => k !== null)
  );

  const newRecords = records.filter((r) => {
    if (existingKeys.has(makeKey(r, schemaDef.dedupeKey))) return false;
    const urk = makeUrlRateKey(r, schemaDef);
    if (urk && existingUrlRateKeys.has(urk)) return false;
    return true;
  });
  if (newRecords.length === 0) return { written: 0, skipped: records.length };

  const writer = createObjectCsvWriter({
    path: outputFile,
    header: fields.map((f) => ({ id: f, title: f })),
    append: fileExists,
  });

  await writer.writeRecords(newRecords);
  return { written: newRecords.length, skipped: records.length - newRecords.length };
}

export async function updateRecords(
  updates: CsvRow[],
  outputFile: string,
  schemaDef: SchemaDefinition
): Promise<{ updated: number }> {
  const fields = allFields(schemaDef);
  const existing = readCsv(outputFile, schemaDef);

  const updateByKey = new Map(updates.map((r) => [makeKey(r, schemaDef.dedupeKey), r]));
  let updated = 0;

  const merged = existing.map((row) => {
    const patch = updateByKey.get(makeKey(row, schemaDef.dedupeKey));
    if (!patch) return row;
    updated++;
    return { ...row, ...patch };
  });

  // Rewrite entire file
  const writer = createObjectCsvWriter({
    path: outputFile,
    header: fields.map((f) => ({ id: f, title: f })),
    append: false,
  });
  await writer.writeRecords(merged);
  return { updated };
}
