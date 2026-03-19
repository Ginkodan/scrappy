# Web UI

The web UI runs at `http://localhost:3000` in production, or `http://localhost:5173` in dev mode (`npm run dev`).

## Screens

### Monitor

Real-time view of a job — past or currently running.

**Job selector bar** — at the top, lists all jobs as horizontal chips. Click any chip to load that job's data into all panels below. Selected chip is highlighted (cyan = done, green = running). Running jobs show a cancel `×` button. A `clear` link removes completed jobs.

**Action ticker** — text feed of the agent's current action. Pulsing green dot = running, dim = idle/done.

**Stats bar** — iteration count, scraped pages, records found, elapsed time, token usage.

**Data panels** (3-column grid):
- **Active Scrapes** — URLs currently being fetched
- **Search Queries** — Google searches the agent has made
- **Updated Rows** — rows refreshed by an update job (green = value changed). Click a row to jump to that dataset in the Scrape screen.
- **Completed Scrapes** — finished scrapes with char counts
- **Extractions** — records extracted per page

**Errors** — tool errors during the run (full width, below the grid).

**Raw Log** — full event stream, collapsible.

**Chat** — ask questions about the current job, schemas, or datasets in plain language. The assistant has full context: schema definitions, dataset list, and the last 60 job events. Scoped to Scrappy questions only (diagnosing failures, schema advice, understanding data).

### Scrape

Sidebar + content layout. The sidebar stays visible; the content area shows the selected dataset and optional action panel.

**Sidebar — Datasets**

Lists all datasets. Click to select and view records. Hover to reveal actions:
- `↻` — open the Update panel for that dataset
- `↓` — download as CSV
- `✕` — delete dataset

**Sidebar — Schemas**

Lists all schemas at the bottom of the sidebar. Hover to reveal `edit` / `del` buttons. The `+` button opens a new schema form.

**Toolbar**

Shows the active dataset name and a `+ Index` button that toggles the Index panel.

**Index panel** (cyan left border)

Start a new index job:
- Topic
- Schema (dropdown)
- Output dataset (choose existing or type a new name)
- Max iterations
- 🌱 Seeds — opens a modal to enter seed URLs (one per line)

**Update panel** (amber left border)

Opens when clicking `↻` on a dataset. Auto-selects the schema from the most recent job that used that dataset. Fields: schema (overridable), optional filter string.

**Records area**

Displays the selected dataset as a table. Columns are styled by field type: tracked/rate fields in green, URLs in blue, system fields dimmed. Duplicate groups get a colored left border and a **group header row** showing:
- Confidence badge (`exact` / `likely` / `possible`)
- Row count and similarity score
- **Merge → keep best** — merges the group, keeping the official record
- **Keep separate** — dismisses the duplicate flag for this group

## Schema editor

Click `edit` on any schema in the sidebar, or `+` to create one. The editor has four sections:

- **Identity** — ID (slug) and display name
- **Fields** — each field has a name, description, and optional flag
- **Data settings** — URL field, dedupe key (comma-separated), tracked fields (monitored for changes during updates)
- **Naming rules** — per-field normalisation instructions for the LLM (optional, one per line)

## Settings

Click the gear icon in the header:
- **Crawl4AI endpoint** — overrides `CRAWL4AI_BASE` env var
- **LLM provider** — Anthropic / OpenAI / ZordMind
- **Agent model and extract model** per provider
- **API key** — read-only display with copy button; required for REST API calls
- **Webhook URL** — called (POST) when a job finishes

## Token counter

The stats bar shows a running token total for the current job. Useful for estimating API costs mid-run.
