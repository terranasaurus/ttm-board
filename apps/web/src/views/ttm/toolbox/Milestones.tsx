import { useState } from "react";
import { twMerge } from "tailwind-merge";

import { Card } from "../ui";

// Verbatim "Movement/Physical Development Milestones" from CDC's
// "Learn the Signs. Act Early." pages (public domain), retrieved 2026-10-17.
// CDC: "Developmental milestones are things most children (75% or more) can
// do by a certain age."
const CDC_MOVEMENT: { age: string; slug: string; items: string[] }[] = [
  { age: "2 mo", slug: "2-months", items: ["Holds head up when on tummy", "Moves both arms and both legs", "Opens hands briefly"] },
  { age: "4 mo", slug: "4-months", items: ["Holds head steady without support when you are holding him", "Holds a toy when you put it in his hand", "Uses his arm to swing at toys", "Brings hands to mouth", "Pushes up onto elbows/forearms when on tummy"] },
  { age: "6 mo", slug: "6-months", items: ["Rolls from tummy to back", "Pushes up with straight arms when on tummy", "Leans on hands to support herself when sitting"] },
  { age: "9 mo", slug: "9-months", items: ["Gets to a sitting position by herself", "Moves things from one hand to her other hand", "Uses fingers to “rake” food towards himself", "Sits without support"] },
  { age: "12 mo", slug: "1-year", items: ["Pulls up to stand", "Walks, holding on to furniture", "Drinks from a cup without a lid, as you hold it", "Picks things up between thumb and pointer finger, like small bits of food"] },
  { age: "15 mo", slug: "15-months", items: ["Takes a few steps on his own", "Uses fingers to feed herself some food"] },
  { age: "18 mo", slug: "18-months", items: ["Walks without holding on to anyone or anything", "Scribbles", "Drinks from a cup without a lid and may spill sometimes", "Feeds himself with his fingers", "Tries to use a spoon", "Climbs on and off a couch or chair without help"] },
  { age: "2 yr", slug: "2-years", items: ["Kicks a ball", "Runs", "Walks (not climbs) up a few stairs with or without help", "Eats with a spoon"] },
  { age: "30 mo", slug: "30-months", items: ["Uses hands to twist things, like turning doorknobs or unscrewing lids", "Takes some clothes off by himself, like loose pants or an open jacket", "Jumps off the ground with both feet", "Turns book pages, one at a time, when you read to her"] },
  { age: "3 yr", slug: "3-years", items: ["Strings items together, like large beads or macaroni", "Puts on some clothes by himself, like loose pants or a jacket", "Uses a fork"] },
  { age: "4 yr", slug: "4-years", items: ["Catches a large ball most of the time", "Serves herself food or pours water, with adult supervision", "Unbuttons some buttons", "Holds crayon or pencil between fingers and thumb (not a fist)"] },
  { age: "5 yr", slug: "5-years", items: ["Buttons some buttons", "Hops on one foot"] },
];

export function Milestones() {
  const [selected, setSelected] = useState(4);
  const prev = CDC_MOVEMENT[selected - 1];
  const current = CDC_MOVEMENT[selected];
  const next = CDC_MOVEMENT[selected + 1];

  return (
    <Card
      id="milestones"
      title="CDC movement milestones"
      description="Movement/physical milestones from CDC “Learn the Signs. Act Early.” (2022 revision): skills 75% or more of children show by each age. A screening reference, not a standardized assessment. Use corrected age for preterm infants."
    >
      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Age">
        {CDC_MOVEMENT.map((m, i) => (
          <button
            key={m.slug}
            type="button"
            role="tab"
            aria-selected={i === selected}
            onClick={() => setSelected(i)}
            className={twMerge(
              "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              i === selected
                ? "bg-ttm-green text-white dark:bg-ttm-orange"
                : "border border-light-600 text-light-950 hover:border-ttm-orange dark:border-dark-600 dark:text-dark-950",
            )}
          >
            {m.age}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { m: prev, label: "Previous age" },
          { m: current, label: "Selected age", focus: true },
          { m: next, label: "Next age" },
        ].map(({ m, label, focus }) => (
          <div
            key={label}
            className={twMerge(
              "rounded-md border p-4",
              focus
                ? "border-ttm-orange bg-light-100 dark:bg-dark-200"
                : "border-light-500 opacity-80 dark:border-dark-400",
            )}
          >
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-light-900 dark:text-dark-900">
                {label}
              </span>
              <span className="text-sm font-extrabold text-light-1000 dark:text-dark-1000">
                {m?.age ?? "—"}
              </span>
            </div>
            {m ? (
              <ul className="list-disc space-y-1 pl-4 text-sm text-light-1000 dark:text-dark-1000">
                {m.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-light-900 dark:text-dark-900">—</p>
            )}
            {m && (
              <a
                href={`https://www.cdc.gov/act-early/milestones/${m.slug}.html`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-xs font-semibold text-ttm-green underline dark:text-dark-950"
              >
                Full CDC checklist
              </a>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
