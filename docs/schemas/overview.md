# Schemas

A schema tells Scrappy what data to extract and how. It defines the fields, their descriptions for the LLM, deduplication keys, and which fields contain rates to refresh.

## Schema file structure

```typescript
import { z } from "zod";
import type { SchemaDefinition } from "../src/types.js";

const schemaDef: SchemaDefinition = {
  // Zod schema for type validation
  schema: z.object({
    productName: z.string(),
    providerName: z.string(),
    interestRate: z.string(),
    url: z.string().optional(),
  }),

  // Descriptions passed to the LLM — be precise
  fieldDescriptions: {
    productName: "Full product name as shown by the provider",
    providerName: "Name of the bank or institution",
    interestRate: "Annual interest rate (e.g. '0.75%' or '0.39%–0.45%' for tiered)",
    url: "Direct URL to the official product page (not a comparison site)",
  },

  // Fields used for deduplication — must uniquely identify a record
  dedupeKey: ["productName", "providerName"],

  // Which field stores the official URL (used by update command)
  urlField: "url",

  // Which fields contain rates to refresh during an update job
  rateFields: ["interestRate"],

  // Optional: consistency rules for the LLM
  namingRules: [
    "providerName: use the short common name, no legal suffixes (e.g. 'UBS' not 'UBS AG')",
  ],

  // Optional: URLs to scrape first before any Google searches
  seedUrls: [
    "https://www.moneyland.ch/de/savings-account-comparison",
  ],
};

export default schemaDef;
```

## Tips

**`fieldDescriptions` quality matters most.** The agent uses these to decide what to extract. Vague descriptions produce inconsistent results. Include examples of expected values (e.g. `"0.75%"`, `"0.39%–0.45%"`).

**`dedupeKey` should be stable.** If the agent sometimes writes `"UBS 3a"` and sometimes `"UBS Säule 3a"`, they won't deduplicate. Use `namingRules` to enforce consistency.

**One record per product, not per tier.** If a product has tiered rates (different rates by balance), express it as a range like `"0.39%–0.45%"` in a single record. Don't create multiple records for the same product.

**Leave `url` blank rather than putting a comparison site URL.** The update command skips the SERP search step if a proper official URL is already stored. Only store the URL when you're confident it's the official provider page.

## Creating schemas

The primary way to create and edit schemas is the web UI: **Scrape → Schemas → + New Schema**. Schemas are stored in the SQLite database and available immediately to index and update jobs.

TypeScript schema files (like the example above) are also supported for version control workflows. Pass the file path as the `--schema` argument when running via CLI, or select it from the schema dropdown in the UI if it's been loaded into the database.

When editing a schema that's already been used for scraping, be careful changing `dedupeKey` fields — existing records won't automatically re-deduplicate.
