import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

import type { FeedItem } from "./pubmed";
import { FEED_TOPICS } from "./pubmed";

async function fetchTopic(key: string): Promise<FeedItem[]> {
  const res = await fetch(`/api/ttm/pd-feed?topic=${encodeURIComponent(key)}`);
  const body = (await res.json()) as { items?: FeedItem[]; error?: string };
  if (!res.ok) throw new Error(body.error ?? "Couldn't load the feed");
  return body.items ?? [];
}

export function PdFeed() {
  const [topic, setTopic] = useState<string>("early-intervention");
  const current = FEED_TOPICS.find((t) => t.key === topic);
  const { data, isLoading, error } = useQuery({
    queryKey: ["ttm-pd-feed", topic],
    queryFn: () => fetchTopic(topic),
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="min-w-0">
      <div className="-mx-1 mb-3 flex flex-wrap gap-1.5 px-1">
        {FEED_TOPICS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTopic(t.key)}
            aria-pressed={t.key === topic}
            className={twMerge(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              t.key === topic
                ? "border-ttm-green bg-ttm-green text-white dark:border-ttm-gold dark:bg-ttm-gold dark:text-dark-50"
                : "border-light-600 text-light-950 hover:border-ttm-orange hover:text-ttm-orange dark:border-dark-600 dark:text-dark-950",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="mb-2 text-xs text-light-900 dark:text-dark-900">
        Newest first, published in the last year{current?.freeOnly ? ", free full text only" : ""}.
        {current?.note ? ` ${current.note}` : ""}
      </p>
      {isLoading ? (
        <p className="py-6 text-sm text-light-900 dark:text-dark-900">Loading…</p>
      ) : error ? (
        <p className="py-6 text-sm text-red-600 dark:text-red-400">{error.message}</p>
      ) : !data?.length ? (
        <p className="py-6 text-sm text-light-900 dark:text-dark-900">Nothing new in the last year.</p>
      ) : (
        <ul className="divide-y divide-light-300 dark:divide-dark-300">
          {data.map((a) => (
            <li key={a.pmid} className="py-3">
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-light-1000 hover:text-ttm-orange dark:text-dark-1000"
              >
                {a.title}
              </a>
              <div className="mt-0.5 break-words text-xs text-light-900 dark:text-dark-900">
                {[a.authors, a.journal, a.date].filter(Boolean).join(" · ")}
                {a.doiUrl && (
                  <>
                    {" · "}
                    <a href={a.doiUrl} target="_blank" rel="noreferrer" className="underline hover:text-ttm-orange">
                      Full text
                    </a>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-light-800 dark:text-dark-800">Source: PubMed (NCBI). Refreshed every few hours.</p>
    </div>
  );
}
