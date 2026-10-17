// Professional-development feed: recent PubMed articles for a fixed set of
// pediatric PT topics. Queries are fixed here (never taken from the request),
// so the API route can't be used as an open proxy.

export interface FeedTopic {
  key: string;
  label: string;
  /** PubMed query, without the date window. */
  term: string;
  /** Limit to articles with free full text (most useful without subscriptions). */
  freeOnly: boolean;
  note?: string;
}

export const FEED_TOPICS: FeedTopic[] = [
  {
    key: "early-intervention",
    label: "Early intervention",
    term: '("early intervention"[tiab] OR "family-centred"[tiab] OR "family-centered"[tiab] OR coaching[tiab]) AND (physiotherapy[tiab] OR "physical therapy"[tiab] OR motor[tiab]) AND (infant[mh] OR "child, preschool"[mh])',
    freeOnly: true,
  },
  {
    key: "torticollis",
    label: "Torticollis & head shape",
    term: "(torticollis[tiab] OR plagiocephaly[tiab] OR brachycephaly[tiab]) AND (infant[mh] OR infant[tiab])",
    freeOnly: true,
  },
  {
    key: "cp-early",
    label: "Early CP detection",
    term: '"cerebral palsy"[tiab] AND ("early detection"[tiab] OR "early diagnosis"[tiab] OR "general movements"[tiab] OR "Hammersmith"[tiab] OR "high risk"[tiab]) AND (infant[mh] OR infant[tiab])',
    freeOnly: true,
  },
  {
    key: "motor-development",
    label: "Motor development",
    term: '("motor development"[tiab] OR "gross motor"[tiab] OR "motor skills"[tiab]) AND (infant[tiab] OR toddler*[tiab] OR preschool[tiab]) AND (physiotherap*[tiab] OR "physical therapy"[tiab] OR "motor intervention"[tiab] OR "early intervention"[tiab])',
    freeOnly: true,
  },
  {
    key: "toe-walking",
    label: "Toe walking",
    term: '"toe walking"[tiab] OR "toe-walking"[tiab]',
    freeOnly: false,
  },
  {
    key: "ppt-journal",
    label: "Pediatric Physical Therapy (journal)",
    term: '"Pediatr Phys Ther"[ta]',
    freeOnly: false,
    note: "Full text is free with APTA Pediatrics membership.",
  },
];

export const FEED_WINDOW_DAYS = 365;
export const FEED_MAX = 10;

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

export function esearchUrl(topic: FeedTopic): string {
  const term = topic.freeOnly ? `(${topic.term}) AND free full text[sb]` : topic.term;
  const qs = new URLSearchParams({
    db: "pubmed",
    term,
    retmode: "json",
    retmax: String(FEED_MAX),
    sort: "pub_date",
    datetype: "pdat",
    reldate: String(FEED_WINDOW_DAYS),
    tool: "ttm-portal",
  });
  return `${EUTILS}/esearch.fcgi?${qs.toString()}`;
}

export function esummaryUrl(ids: string[]): string {
  const qs = new URLSearchParams({
    db: "pubmed",
    id: ids.join(","),
    retmode: "json",
    tool: "ttm-portal",
  });
  return `${EUTILS}/esummary.fcgi?${qs.toString()}`;
}

export interface FeedItem {
  pmid: string;
  title: string;
  journal: string;
  date: string;
  authors: string;
  url: string;
  doiUrl: string | null;
}

interface SummaryRecord {
  uid?: string;
  title?: string;
  source?: string;
  fulljournalname?: string;
  pubdate?: string;
  sortpubdate?: string;
  authors?: { name?: string }[];
  articleids?: { idtype?: string; value?: string }[];
}

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();

export function parseEsearch(json: unknown): string[] {
  const ids = (json as { esearchresult?: { idlist?: unknown } } | null)?.esearchresult?.idlist;
  return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string" && /^\d+$/.test(x)) : [];
}

export function parseEsummary(json: unknown, ids: string[]): FeedItem[] {
  const result = (json as { result?: Record<string, SummaryRecord> } | null)?.result ?? {};
  const items: FeedItem[] = [];
  for (const id of ids) {
    const r = result[id];
    if (!r?.title) continue;
    const names = (r.authors ?? []).map((a) => a.name).filter(Boolean) as string[];
    const authors =
      names.length === 0 ? "" : names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")}, et al.`;
    const doi = r.articleids?.find((a) => a.idtype === "doi")?.value;
    items.push({
      pmid: id,
      title: decode(r.title).replace(/\.$/, ""),
      journal: decode(r.source ?? r.fulljournalname ?? ""),
      date: r.pubdate ?? "",
      authors,
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      doiUrl: doi ? `https://doi.org/${doi}` : null,
    });
  }
  return items;
}
