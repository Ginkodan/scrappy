import Database from "better-sqlite3";
import { readRecords, updateRecords } from "../tools/records.js";
import { searchGoogle } from "../tools/serp.js";
import type { CsvRow, SchemaDefinition, EmitFn } from "../types.js";
import type { LLMClient } from "../agent/llm-client.js";

const COMPARISON_DOMAINS = [
  "finpension.ch", "moneyland.ch", "comparis.ch", "vermoegens-partner.ch",
  "schwiizerfranke.ch", "evaluno.ch", "financescout24.ch", "moneypark.ch",
  "hypotheke.ch", "kredite.ch", "toppreise.ch", "vermoegenszentrum.ch",
  "123-pensionierung.ch", "kassentest.ch", "vorsorge-experten.ch",
];

function isComparisonUrl(url: string): boolean {
  return COMPARISON_DOMAINS.some((d) => url.toLowerCase().includes(d));
}

function extractNums(s: string): number[] {
  return [...s.matchAll(/(\d+[.,]\d+|\d+)/g)]
    .map((m) => parseFloat(m[1].replace(",", ".")))
    .filter((n) => !isNaN(n));
}

function rateNumericallyEqual(a: string, b: string): boolean {
  const na = extractNums(a);
  const nb = extractNums(b);
  if (na.length === 0 && nb.length === 0) return a.trim() === b.trim();
  if (na.length !== nb.length) return false;
  return na.every((v, i) => Math.abs(v - nb[i]) < 0.001);
}

export async function runUpdate(
  dataset: string,
  schemaDef: SchemaDefinition,
  llmClient: LLMClient,
  crawl4aiBase: string,
  opts: { signal?: AbortSignal; filter?: string; emit?: EmitFn; db?: Database.Database; serpApiKey?: string } = {}
): Promise<void> {
  const { signal, filter, emit, serpApiKey } = opts;
  const log = (type: string, payload: Record<string, unknown>) => {
    emit?.(type, payload);
    const msg = payload.message ?? `[update] ${JSON.stringify(payload)}`;
    process.stderr.write(`[scrappy:update] ${msg}\n`);
  };

  const db: Database.Database = opts.db ?? (await import("../server/db.js")).db;
  const rows = readRecords(dataset, db);
  const urlField = schemaDef.urlField;

  let officialRows: CsvRow[] = [];
  let comparisonRows: CsvRow[] = [];

  for (const r of rows) {
    const url = String(r[urlField] ?? "");
    if (!url.startsWith("http") || isComparisonUrl(url)) {
      comparisonRows.push(r);
    } else {
      officialRows.push(r);
    }
  }

  log("log", {
    message: `${officialRows.length} rows have official URLs, ${comparisonRows.length} are comparison-only`,
  });

  if (filter) {
    const q = filter.toLowerCase();
    const matches = (r: CsvRow) =>
      schemaDef.dedupeKey.some((k) => String(r[k] ?? "").toLowerCase().includes(q));
    officialRows = officialRows.filter(matches);
    comparisonRows = comparisonRows.filter(matches);
    log("log", {
      message: `Filter "${filter}" matched ${officialRows.length} official + ${comparisonRows.length} comparison rows`,
    });
  }

  log("update_start", { total: officialRows.length + comparisonRows.length });

  let updates = 0;
  let failed = 0;

  async function fetchMd(url: string, query: string): Promise<string> {
    const res = await fetch(`${crawl4aiBase}/md`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        filter_type: "bm25",
        query,
        crawler_config: {
          type: "CrawlerRunConfig",
          delay_before_return_html: 8,
          page_timeout: 60000,
          js_code: "window.scrollTo(0, document.body.scrollHeight);",
        },
      }),
    });
    if (!res.ok) throw new Error(`crawl4ai /md error ${res.status}: ${await res.text()}`);
    const data = await res.json() as { markdown?: string; content?: string };
    return data.markdown ?? data.content ?? "";
  }

  async function extractAndUpdate(row: CsvRow, url: string, providerName: string): Promise<boolean> {
    const rateFieldDescriptions = schemaDef.rateFields
      .map((f) => `  - ${f}: ${schemaDef.fieldDescriptions[f] ?? f}`)
      .join("\n");

    const bm25Query = schemaDef.rateFields
      .map((f) => schemaDef.fieldDescriptions[f] ?? f)
      .join(" ");

    log("scrape_start", { url, provider: providerName });
    const markdown = await fetchMd(url, bm25Query);
    log("scrape_done", { url, provider: providerName, chars: markdown.length });

    if (!markdown) {
      log("error", { tool: "scrape_url", message: `${providerName}: empty response` });
      return false;
    }

    const msg = await llmClient.messages.create({
      model: llmClient.extractModel,
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `Extract the following fields from this webpage content for "${providerName}". Return ONLY a JSON object with the field values, or null if not found.

Fields to extract:
${rateFieldDescriptions}

Webpage content:
${markdown}`,
      }],
    });

    if (msg.usage) {
      log("tokens", { input: msg.usage.input_tokens, output: msg.usage.output_tokens });
    }

    const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log("error", { tool: "llm", message: `${providerName}: could not parse LLM response` });
      return false;
    }

    const extracted = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    for (const f of schemaDef.rateFields) {
      if (typeof extracted[f] === "string") {
        extracted[f] = (extracted[f] as string).replace(/,(\d)/g, ".$1").trim();
      }
    }
    const hasData = schemaDef.rateFields.some((f) => extracted[f] != null && extracted[f] !== "");

    if (!hasData) {
      log("error", { tool: "llm", message: `${providerName}: no rate data found` });
      return false;
    }

    const patch: CsvRow = { ...row };
    for (const f of schemaDef.rateFields) {
      if (extracted[f] != null) patch[f] = extracted[f];
    }
    patch[urlField] = url;
    patch._dataSource = "official";
    patch._lastUpdated = new Date().toISOString().split("T")[0];

    const oldRate = schemaDef.rateFields.map((f) => `${f}=${row[f]}`).join(", ");
    const newRate = schemaDef.rateFields.map((f) => `${f}=${patch[f]}`).join(", ");
    const changed = schemaDef.rateFields.some((f) => !rateNumericallyEqual(String(row[f] ?? ""), String(patch[f] ?? "")));
    log("update_row", { provider: providerName, url, oldRate, newRate, changed });

    const { updated: u } = await updateRecords([patch], dataset, schemaDef, db);
    updates += u;
    return true;
  }

  // Official rows: scrape stored URL directly
  for (const row of officialRows) {
    if (signal?.aborted) break;
    const url = String(row[urlField]);
    const providerName = schemaDef.dedupeKey.map((k) => row[k]).join(" / ");
    try {
      if (!await extractAndUpdate(row, url, providerName)) failed++;
    } catch (err) {
      log("error", { tool: "update", message: `${providerName}: ${err instanceof Error ? err.message : String(err)}` });
      failed++;
    }
  }

  // Comparison-only rows: search for official URL first
  if (comparisonRows.length > 0) {
    if (!serpApiKey) {
      log("log", { message: `Skipping ${comparisonRows.length} comparison-only rows (no SERPAPI_KEY configured)` });
    } else {
      for (const row of comparisonRows) {
        if (signal?.aborted) break;
        const providerName = schemaDef.dedupeKey.map((k) => row[k]).join(" / ");
        try {
          log("log", { message: `Searching for official URL: ${providerName}` });
          const results = await searchGoogle(providerName, serpApiKey);
          const officialUrl = results.find((u) => !isComparisonUrl(u));
          if (!officialUrl) {
            log("log", { message: `${providerName}: no official URL found in search results` });
            failed++;
            continue;
          }
          log("log", { message: `${providerName}: found ${officialUrl}` });
          if (!await extractAndUpdate(row, officialUrl, providerName)) failed++;
        } catch (err) {
          log("error", { tool: "update", message: `${providerName}: ${err instanceof Error ? err.message : String(err)}` });
          failed++;
        }
      }
    }
  }

  log("log", { message: `Done. ${updates} rows updated, ${failed} failed.` });
}
