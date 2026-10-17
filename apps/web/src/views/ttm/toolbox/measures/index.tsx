import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

import { Card } from "../../ui";
import { Ashworth } from "./Ashworth";
import { Beighton } from "./Beighton";
import { Gas } from "./Gas";
import { HeadShape } from "./HeadShape";
import { FunctionalMobility, HineReader, PediatricBalance } from "./Scales";
import { SixMinuteWalk, Tuds, Tug } from "./TimedTests";
import { Torticollis } from "./Torticollis";

interface Measure {
  key: string;
  name: string;
  short: string;
  group: string;
  ages: string;
  what: string;
  Component: () => JSX.Element;
}

export const MEASURES: Measure[] = [
  { key: "cmt", name: "Torticollis severity grade", short: "CMT grade", group: "Head & neck", ages: "0–24 months", what: "APTA CPG severity grade from age, rotation difference and SCM mass", Component: Torticollis },
  { key: "head-shape", name: "Head shape (CVAI & cephalic index)", short: "Head shape", group: "Head & neck", ages: "Infants", what: "Plagiocephaly level and brachycephaly from caliper measurements", Component: HeadShape },
  { key: "pbs", name: "Pediatric Balance Scale", short: "PBS", group: "Balance & mobility", ages: "2–13 years", what: "14-item functional balance scale with age cut scores", Component: PediatricBalance },
  { key: "tug", name: "Timed Up and Go", short: "TUG", group: "Balance & mobility", ages: "3–9 years (norms)", what: "Functional mobility, timed, with a built-in stopwatch", Component: Tug },
  { key: "tuds", name: "Timed Up and Down Stairs", short: "TUDS", group: "Balance & mobility", ages: "6–14 years (norms)", what: "Stair negotiation, timed, against a reference equation", Component: Tuds },
  { key: "6mwt", name: "Six-Minute Walk Test", short: "6MWT", group: "Balance & mobility", ages: "3–18 years (norms)", what: "Walking endurance, with a 6-minute timer and lap counter", Component: SixMinuteWalk },
  { key: "fms", name: "Functional Mobility Scale", short: "FMS", group: "Goals & function", ages: "4–18 years, CP", what: "Usual mobility at 5, 50 and 500 m", Component: FunctionalMobility },
  { key: "gas", name: "Goal Attainment Scaling", short: "GAS", group: "Goals & function", ages: "Any age", what: "Change on individual IFSP / plan-of-care goals as one T-score", Component: Gas },
  { key: "beighton", name: "Beighton score", short: "Beighton", group: "Joints & tone", ages: "Children and adults", what: "Generalized joint hypermobility (9-point screen)", Component: Beighton },
  { key: "mas", name: "Modified Ashworth Scale", short: "MAS", group: "Joints & tone", ages: "Any age", what: "Resistance to passive stretch (grade reference)", Component: Ashworth },
  { key: "hine", name: "HINE score interpreter", short: "HINE", group: "Neuro screen", ages: "3–12 months corrected", what: "Published CP-risk cut-offs for a HINE global score", Component: HineReader },
];

const GROUP_ORDER = ["Head & neck", "Balance & mobility", "Joints & tone", "Goals & function", "Neuro screen"];

export function OutcomeMeasures() {
  const [key, setKey] = useState<string>("cmt");

  // Deep link: /toolbox#measure-beighton opens that measure.
  useEffect(() => {
    const k = /^#measure-(.+)$/.exec(window.location.hash)?.[1];
    if (k && MEASURES.some((x) => x.key === k)) setKey(k);
  }, []);

  const current = MEASURES.find((m) => m.key === key) ?? MEASURES[0];
  if (!current) return null;
  const groups = GROUP_ORDER.map((g) => ({ g, items: MEASURES.filter((m) => m.group === g) })).filter((x) => x.items.length);

  return (
    <Card
      id="measures"
      title="Outcome measures"
      description="Free, published measures we can use without buying a licence. Scores are worked out in your browser and never saved; copy what you need into the note."
    >
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Outcome measures" className="min-w-0">
          {/* Phones: one scrollable row of chips. Desktop: grouped list. */}
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:hidden">
            {MEASURES.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setKey(m.key)}
                aria-pressed={m.key === key}
                className={twMerge(
                  "whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold",
                  m.key === key
                    ? "border-ttm-green bg-ttm-green text-white dark:border-ttm-gold dark:bg-ttm-gold dark:text-dark-50"
                    : "border-light-600 text-light-950 dark:border-dark-600 dark:text-dark-950",
                )}
              >
                {m.short}
              </button>
            ))}
          </div>
          <div className="hidden space-y-4 lg:block">
            {groups.map(({ g, items }) => (
              <div key={g}>
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-light-900 dark:text-dark-900">{g}</h3>
                <ul className="space-y-0.5">
                  {items.map((m) => (
                    <li key={m.key}>
                      <button
                        type="button"
                        onClick={() => setKey(m.key)}
                        aria-current={m.key === key}
                        className={twMerge(
                          "w-full rounded-md px-2 py-1.5 text-left text-sm",
                          m.key === key
                            ? "bg-light-200 font-semibold text-light-1000 dark:bg-dark-200 dark:text-dark-1000"
                            : "text-light-950 hover:bg-light-200 dark:text-dark-950 dark:hover:bg-dark-200",
                        )}
                      >
                        {m.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>
        <div className="min-w-0">
          <div className="mb-4">
            <h3 className="text-base font-extrabold text-light-1000 dark:text-dark-1000">{current.name}</h3>
            <p className="text-xs text-light-900 dark:text-dark-900">
              {current.what} · <span className="font-semibold">{current.ages}</span>
            </p>
          </div>
          <current.Component key={current.key} />
        </div>
      </div>
    </Card>
  );
}
