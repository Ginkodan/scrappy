import type { ScrapeResult } from "../types.js";

const LINK_REGEX = /\[.*?\]\((https?:\/\/[^\s)]+)\)/g;

export async function scrapeUrl(
  url: string,
  crawl4aiBase: string
): Promise<ScrapeResult> {
  const res = await fetch(`${crawl4aiBase}/crawl`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      urls: [url],
      crawler_config: {
        type: "CrawlerRunConfig",
        delay_before_return_html: 8,
        page_timeout: 60000,
        js_code: "window.scrollTo(0, document.body.scrollHeight);",
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Crawl4AI error for ${url}: ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as {
    results?: Array<{
      markdown?: { raw_markdown?: string; fit_markdown?: string } | string;
      success?: boolean;
      error_message?: string;
    }>;
  };

  const result = data.results?.[0];
  if (!result?.success) {
    throw new Error(`Crawl failed for ${url}: ${result?.error_message ?? "unknown error"}`);
  }

  const md = result.markdown;
  let markdown: string;
  if (typeof md === "string") {
    markdown = md;
  } else {
    const fit = md?.fit_markdown ?? "";
    const raw = md?.raw_markdown ?? "";
    console.error(`[crawl debug] fit=${fit.length} raw=${raw.length} keys=${Object.keys(md ?? {}).join(",")}`);
    // prefer fit_markdown, fall back to raw_markdown when fit is too short
    markdown = fit.length >= 200 ? fit : raw;
  }
  const links: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = LINK_REGEX.exec(markdown)) !== null) {
    links.push(match[1]);
  }

  return { url, markdown, links: [...new Set(links)] };
}
