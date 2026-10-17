import { useState } from "react";
import { twMerge } from "tailwind-merge";

import { Field, inputClass, Stat } from "../../ui";
import { HINE_ROMEO_CUTOFF, PBS_ITEMS, pbsNorm, readHine, sumItems } from "./score";
import { Callout, extLink, ScorePicker, SourceNote } from "./shared";

/* ------------------------------ PBS ------------------------------ */

const ZERO_TO_FOUR = [0, 1, 2, 3, 4].map((value) => ({ value }));

export function PediatricBalance() {
  const [items, setItems] = useState<(number | null)[]>(PBS_ITEMS.map(() => null));
  const [years, setYears] = useState("");
  const [months, setMonths] = useState("0");
  const total = sumItems(items);
  const partial = items.reduce<number>((s, x) => s + (x ?? 0), 0);
  const scored = items.filter((x) => x !== null).length;
  const ageMonths = years ? Number(years) * 12 + Number(months || 0) : null;
  const norm = ageMonths !== null ? pbsNorm(ageMonths) : null;

  return (
    <div>
      <p className="mb-3 text-sm text-light-900 dark:text-dark-900">
        Score each item 0–4 using the{" "}
        <a className={extLink} href="https://www.sralab.org/sites/default/files/2017-06/PediatricBalanceScale_3.pdf" target="_blank" rel="noreferrer">
          published administration and scoring criteria
        </a>
        .
      </p>
      <div className="divide-y divide-light-300 dark:divide-dark-300">
        {PBS_ITEMS.map((name, i) => (
          <ScorePicker
            key={name}
            label={`${i + 1}. ${name}`}
            value={items[i] ?? null}
            options={ZERO_TO_FOUR}
            onChange={(v) => setItems((xs) => xs.map((x, j) => (j === i ? v : x)))}
          />
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Age (years)">
          <input inputMode="numeric" className={inputClass} value={years} onChange={(e) => setYears(e.target.value)} />
        </Field>
        <Field label="+ months">
          <input inputMode="numeric" className={inputClass} value={months} onChange={(e) => setMonths(e.target.value)} />
        </Field>
        <Stat label={total === null ? `Total (${scored}/14 scored)` : "Total"} tone={total === null ? "muted" : "accent"} value={`${total ?? partial} / 56`} />
        <Stat label="Typical mean (cut)" tone="muted" value={norm ? `${norm.mean} (${norm.cut})` : ageMonths !== null ? "Outside 2–13 y" : "Add age"} />
      </div>
      {total !== null && norm && (
        <Callout tone={total < norm.cut ? "flag" : "info"}>
          {total < norm.cut
            ? `Below the critical cut score of ${norm.cut} for ${norm.label}.`
            : `At or above the critical cut score of ${norm.cut} for ${norm.label}.`}{" "}
          The cut score is the lower bound of the 95% confidence interval of the typical mean.
        </Callout>
      )}
      <SourceNote>
        Franjoine MR et al., Pediatr Phys Ther 2003;15:114–28 (development) and 2010;22:350–9 (643 typically developing children
        aged 2y4m–13y7m; boys and girls pooled), as reproduced by the Shirley Ryan AbilityLab. Free to use; item criteria are in the
        linked form.
      </SourceNote>
    </div>
  );
}

/* ------------------------------ FMS ------------------------------ */

const FMS_LEVELS = [
  { v: "6", t: "Independent on all surfaces, including uneven ground, curbs and crowds" },
  { v: "5", t: "Independent on level surfaces; needs a rail for stairs" },
  { v: "4", t: "Uses sticks (one or two), no help from another person" },
  { v: "3", t: "Uses crutches, no help from another person" },
  { v: "2", t: "Uses a walker or frame, no help from another person" },
  { v: "1", t: "Uses a wheelchair; may stand for transfers or step with support" },
  { v: "C", t: "Crawling (home only)" },
  { v: "N", t: "Does not apply (doesn't complete the distance)" },
];

const DISTANCES = [
  { key: "5", label: "5 m · home", q: "Short distances around the house" },
  { key: "50", label: "50 m · school", q: "In and between classrooms" },
  { key: "500", label: "500 m · community", q: "Long distances, e.g. a shopping center" },
];

export function FunctionalMobility() {
  const [v, setV] = useState<Record<string, string>>({});
  const done = DISTANCES.every((d) => v[d.key]);
  return (
    <div>
      <p className="mb-3 text-sm text-light-900 dark:text-dark-900">
        Ask the child or family how the child <em>actually</em> moves around now at each distance (not what they can do on a good day).
        Include orthoses they use routinely. For children with CP aged 4–18.
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        {DISTANCES.map((d) => (
          <div key={d.key} className="min-w-0">
            <h4 className="text-sm font-bold text-light-1000 dark:text-dark-1000">{d.label}</h4>
            <p className="mb-2 text-xs text-light-900 dark:text-dark-900">{d.q}</p>
            <div className="space-y-1">
              {FMS_LEVELS.filter((l) => l.v !== "C" || d.key === "5").map((l) => (
                <button
                  key={l.v}
                  type="button"
                  onClick={() => setV({ ...v, [d.key]: l.v })}
                  aria-pressed={v[d.key] === l.v}
                  className={twMerge(
                    "flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left text-xs",
                    v[d.key] === l.v
                      ? "border-ttm-green bg-ttm-green/10 dark:border-ttm-gold dark:bg-ttm-gold/10"
                      : "border-light-500 hover:border-ttm-orange dark:border-dark-500",
                  )}
                >
                  <span className="w-4 shrink-0 font-extrabold text-ttm-green dark:text-ttm-gold">{l.v}</span>
                  <span className="text-light-1000 dark:text-dark-1000">{l.t}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 max-w-xs">
        <Stat label="FMS (5 / 50 / 500 m)" tone={done ? "accent" : "muted"} value={done ? `${v["5"]}, ${v["50"]}, ${v["500"]}` : "Rate all three"} />
      </div>
      <SourceNote>
        Graham HK et al., J Pediatr Orthop 2004;24:514–20. Ratings paraphrased from the Royal Children's Hospital Melbourne FMS
        (version 2, © RCH 2004); contact the RCH gait lab before reproducing their form.
      </SourceNote>
    </div>
  );
}

/* ------------------------------ HINE ------------------------------ */

export function HineReader() {
  const [score, setScore] = useState("");
  const [age, setAge] = useState("");
  const r = score && age ? readHine(Number(score), Number(age)) : null;

  return (
    <div>
      <p className="mb-3 text-sm text-light-900 dark:text-dark-900">
        Enter a HINE global score you've already scored on the official proforma (26 items, 0–78) to see what the published cut-offs say.
        The exam itself must be learned and scored with the official materials.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="HINE global score (0–78)">
          <input inputMode="numeric" className={inputClass} value={score} onChange={(e) => setScore(e.target.value)} />
        </Field>
        <Field label="Corrected age (months)" hint="Use the corrected-age tool above for preterm infants">
          <input inputMode="decimal" className={inputClass} value={age} onChange={(e) => setAge(e.target.value)} />
        </Field>
      </div>
      {score && age && !r && <p className="mt-3 text-sm text-red-600 dark:text-red-400">Score must be 0–78 and age at least 2 months.</p>}
      {r && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Stat label="Score" value={`${score} / 78`} tone="accent" />
            <Stat
              label={r.agePoint ? `Romeo 2013 cut-off at ${r.agePoint} mo` : "Romeo 2013 cut-off"}
              tone="muted"
              value={r.agePoint ? `≤ ${HINE_ROMEO_CUTOFF[r.agePoint]}` : "Only 3–12 months"}
            />
          </div>
          {(r.atOrBelowRomeo || r.novak.length > 0) ? (
            <Callout tone="flag">
              <ul className="list-disc space-y-1 pl-5">
                {r.atOrBelowRomeo && <li>At or below the Romeo 2013 cut-off for {r.agePoint} months (≥ 90% sensitivity, ≥ 85% specificity for CP).</li>}
                {r.novak.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <p className="mt-2">
                The international guideline pairs HINE with neuroimaging and/or General Movements to make an early diagnosis or a
                "high risk of CP" diagnosis. Talk with Terran and the physician the same day.
              </p>
            </Callout>
          ) : (
            <Callout>Above the published CP-risk cut-offs for this age.</Callout>
          )}
        </>
      )}
      <SourceNote>
        Cut-offs: Romeo DM et al., Eur J Paediatr Neurol 2013;17:192–8; Novak I et al., JAMA Pediatr 2017;171:897–907. HINE: Haataja L
        et al., J Pediatr 1999. The HINE proforma and training are sold by Mac Keith Press, so the items aren't reproduced here.
      </SourceNote>
    </div>
  );
}
