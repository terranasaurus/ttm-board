import { describe, expect, it } from "vitest";

import { esearchUrl, FEED_TOPICS, parseEsearch, parseEsummary } from "./pubmed";

function must<T>(x: T | undefined | null): T {
  if (x == null) throw new Error("expected a value");
  return x;
}

describe("esearchUrl", () => {
  it("adds the free-full-text filter only when the topic asks for it", () => {
    const free = must(FEED_TOPICS.find((t) => t.freeOnly));
    const paid = must(FEED_TOPICS.find((t) => !t.freeOnly));
    expect(decodeURIComponent(esearchUrl(free).replace(/\+/g, " "))).toContain("free full text[sb]");
    expect(decodeURIComponent(esearchUrl(paid).replace(/\+/g, " "))).not.toContain("free full text[sb]");
  });

  it("asks for newest first within the window", () => {
    const url = new URL(esearchUrl(must(FEED_TOPICS[0])));
    expect(url.hostname).toBe("eutils.ncbi.nlm.nih.gov");
    expect(url.searchParams.get("sort")).toBe("pub_date");
    expect(url.searchParams.get("reldate")).toBe("365");
  });

  it("has unique topic keys", () => {
    const keys = FEED_TOPICS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("parseEsearch", () => {
  it("returns numeric ids only", () => {
    expect(parseEsearch({ esearchresult: { idlist: ["123", "x", 4, "456"] } })).toEqual(["123", "456"]);
  });
  it("tolerates junk", () => {
    expect(parseEsearch(null)).toEqual([]);
    expect(parseEsearch({ error: "bad" })).toEqual([]);
  });
});

describe("parseEsummary", () => {
  const json = {
    result: {
      uids: ["1", "2", "3"],
      "1": {
        title: "Tummy time &amp; <i>motor</i> skills.",
        source: "Pediatr Phys Ther",
        pubdate: "2026 Oct",
        authors: [{ name: "Smith A" }, { name: "Lee B" }, { name: "Ng C" }, { name: "Diaz D" }],
        articleids: [{ idtype: "doi", value: "10.1097/PEP.0000" }],
      },
      "2": { title: "", source: "X" },
      "3": { title: "Second", fulljournalname: "Journal Two", authors: [] },
    },
  };

  it("keeps order, decodes HTML, abbreviates authors and builds links", () => {
    const items = parseEsummary(json, ["1", "2", "3"]);
    expect(items.map((i) => i.pmid)).toEqual(["1", "3"]);
    expect(items[0]).toMatchObject({
      title: "Tummy time & motor skills",
      journal: "Pediatr Phys Ther",
      authors: "Smith A, Lee B, Ng C, et al.",
      url: "https://pubmed.ncbi.nlm.nih.gov/1/",
      doiUrl: "https://doi.org/10.1097/PEP.0000",
    });
    expect(items[1]).toMatchObject({ journal: "Journal Two", authors: "", doiUrl: null });
  });
});
