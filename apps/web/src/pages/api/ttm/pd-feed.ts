// TTM addition: recent PubMed articles for the Resources page's
// professional-development feed. Signed-in users only; topics are fixed.
import type { NextApiRequest, NextApiResponse } from "next";

import { createNextApiContext } from "@kan/api/trpc-context";
import { withRateLimit } from "@kan/api/utils/rateLimit";

import type { FeedItem } from "~/views/ttm/resources/pubmed";
import {
  esearchUrl,
  esummaryUrl,
  FEED_TOPICS,
  parseEsearch,
  parseEsummary,
} from "~/views/ttm/resources/pubmed";

const TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; items: FeedItem[] }>();

// NCBI allows 3 requests/second without an API key; back off briefly on 429.
async function getJson(url: string, attempt = 0): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (res.status === 429 && attempt < 3) {
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    return getJson(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`PubMed responded ${res.status}`);
  return res.json();
}

export default withRateLimit(
  { points: 60, duration: 60 },
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    const { user } = await createNextApiContext(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const key = typeof req.query.topic === "string" ? req.query.topic : "";
    const topic = FEED_TOPICS.find((t) => t.key === key);
    if (!topic) return res.status(400).json({ error: "Unknown topic" });

    const hit = cache.get(topic.key);
    if (hit && Date.now() - hit.at < TTL_MS) {
      res.setHeader("Cache-Control", "private, max-age=1800");
      return res.status(200).json({ items: hit.items, fetchedAt: hit.at });
    }

    try {
      const ids = parseEsearch(await getJson(esearchUrl(topic)));
      const items = ids.length ? parseEsummary(await getJson(esummaryUrl(ids)), ids) : [];
      const at = Date.now();
      cache.set(topic.key, { at, items });
      res.setHeader("Cache-Control", "private, max-age=1800");
      return res.status(200).json({ items, fetchedAt: at });
    } catch {
      if (hit) return res.status(200).json({ items: hit.items, fetchedAt: hit.at, stale: true });
      return res.status(502).json({ error: "PubMed is unavailable right now. Try again later." });
    }
  },
);
