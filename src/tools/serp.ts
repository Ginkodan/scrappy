const SERPAPI_BASE = "https://serpapi.com/search";

export async function searchGoogle(query: string, apiKey: string): Promise<string[]> {
  const params = new URLSearchParams({
    q: query,
    api_key: apiKey,
    engine: "google",
    num: "100",
    hl: "de",
  });

  const res = await fetch(`${SERPAPI_BASE}?${params}`);
  if (!res.ok) {
    throw new Error(`SerpAPI error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as { organic_results?: Array<{ link?: string }> };
  const urls = (data.organic_results ?? [])
    .map((r) => r.link)
    .filter((url): url is string => typeof url === "string");

  // Deduplicate to one result per domain so a single site doesn't dominate
  const seenDomains = new Set<string>();
  return urls.filter(url => {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      if (seenDomains.has(host)) return false;
      seenDomains.add(host);
      return true;
    } catch { return true; }
  });
}
