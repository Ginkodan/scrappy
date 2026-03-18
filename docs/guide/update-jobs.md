# Update Jobs

An update job refreshes the rate fields in an existing dataset by re-scraping official provider pages.

## How it works

Records are first split into two buckets:

**Official rows** — the stored URL points to a provider's own domain (e.g. `https://www.ubs.com/...`):
→ Enter the 3-stage pipeline directly

**Comparison-only rows** — the stored URL points to a comparison site (moneyland.ch, comparis.ch, etc.):
→ A Google SERP search is run first to find the official page, then enters the pipeline

### Stage 1 — BM25 scrape

Crawl4AI fetches the page using `filter_type: "bm25"`, passing the rate field descriptions as the query. Returns only the sections of the page relevant to those terms — typically 1–5k chars instead of 30k+. Claude Haiku extracts the rate fields. If values are found, the record is updated and the pipeline stops here.

### Stage 2 — Full crawl

If BM25 returned nothing useful, the full page is fetched without any content filter. This helps with:
- Pages where rates are hidden in JS-rendered widgets
- Custom HTML elements (web components) that markdown extraction misses — the full HTML is scanned for all `href` attributes including those in non-standard tags

Any new links discovered in stage 2 are added to the candidate pool for stage 3. Claude Haiku tries again on the full-page markdown.

### Stage 3 — Follow promising links

If still no result, outbound links from the page are scored by relevance and the best candidates are scraped individually:

| Signal | Score |
|---|---|
| `.pdf` extension | +3 |
| URL path contains rate keywords (`zins`, `rate`, `tarif`, `prix`, `rendement`, `kondition`) | +2 |
| Anchor text contains rate keywords | +2 |
| No path-level keyword signal | ×0.5 |

The top 5 scoring links are tried. PDFs are downloaded and parsed directly (with TLS fallback for Swiss CA certificates). HTML pages are scraped via Crawl4AI.

## URL routing

The routing condition checks the **stored URL**, not the `_dataSource` field. A record tagged `_dataSource: "comparison"` because it was found on a comparison portal — but whose URL field contains the official provider URL — is scraped directly, not sent to SERP search.

After a successful update, `_dataSource` is set to `"official"`.

## Rate comparison

Values are compared **numerically**, not as strings. This avoids false positives from formatting differences:

| Old | New | Result |
|---|---|---|
| `0.45%` | `0.45% p. a.` | unchanged |
| `0.45%` | `0.50%` | **changed** |
| `0.39%–0.45%` | `0.39%–0.45%` | unchanged |

Changed rows get a new `_lastUpdated` timestamp.

## Parameters

| Parameter | Description |
|---|---|
| `input` | Dataset name to update |
| `schema` | Schema ID (from UI) or path to TypeScript schema file |
| `filter` | Optional string — only update rows where any dedupeKey field contains this value |

## UI

Start an update job from the **Scrape → Update** tab. Select the dataset, schema, and an optional provider filter, then click **↻ Run**. The monitor view shows updated rows in real time (green = rate changed).

## Requirements

- `SERPAPI_KEY` must be set to process comparison-only rows (rows whose URL points to a comparison domain)
- Rows with a comparison URL and no SERPAPI_KEY are skipped with a log message
