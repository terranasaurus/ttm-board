import { useState } from "react";
import { HiOutlinePlusSmall, HiOutlineTrash } from "react-icons/hi2";

import { inputClass, Stat } from "../../ui";
import { gasTScore } from "./score";
import { Callout, ScorePicker, SourceNote } from "./shared";

interface Row {
  id: number;
  label: string;
  score: number | null;
  weight: string;
}

const LEVELS = [
  { value: -2, label: "−2" },
  { value: -1, label: "−1" },
  { value: 0, label: "0" },
  { value: 1, label: "+1" },
  { value: 2, label: "+2" },
];

let nextId = 3;

export function Gas() {
  const [rows, setRows] = useState<Row[]>([
    { id: 1, label: "Goal 1", score: null, weight: "1" },
    { id: 2, label: "Goal 2", score: null, weight: "1" },
  ]);
  const update = (id: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const scored = rows.filter((r) => r.score !== null);
  const t = scored.length === rows.length ? gasTScore(rows.map((r) => ({ score: r.score ?? 0, weight: Number(r.weight) || 0 }))) : null;

  return (
    <div>
      <p className="mb-3 text-sm text-light-900 dark:text-dark-900">
        Score each goal at review: <strong>−2</strong> much less than expected, <strong>−1</strong> somewhat less,{" "}
        <strong>0</strong> expected outcome, <strong>+1</strong> somewhat more, <strong>+2</strong> much more. Many EI teams set the
        baseline at −1 (or −2 if no change is possible).
      </p>
      <div className="divide-y divide-light-300 dark:divide-dark-300">
        {rows.map((r, idx) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2 py-2">
            <input
              aria-label={`Goal ${idx + 1} short name`}
              className={`${inputClass} min-w-0 flex-1 basis-40`}
              value={r.label}
              maxLength={40}
              onChange={(e) => update(r.id, { label: e.target.value })}
            />
            <label className="flex items-center gap-1 text-xs font-semibold text-light-900 dark:text-dark-900">
              Weight
              <input
                type="number"
                min={1}
                max={5}
                className={`${inputClass} w-16`}
                value={r.weight}
                onChange={(e) => update(r.id, { weight: e.target.value })}
              />
            </label>
            <ScorePicker label="" value={r.score} options={LEVELS} onChange={(s) => update(r.id, { score: s })} />
            <button
              type="button"
              aria-label="Remove goal"
              disabled={rows.length === 1}
              onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
              className="rounded-md p-2 text-light-900 hover:bg-red-500/10 hover:text-red-600 disabled:opacity-30 dark:text-dark-900"
            >
              <HiOutlineTrash className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={rows.length >= 8}
        onClick={() => setRows((rs) => [...rs, { id: nextId++, label: `Goal ${rs.length + 1}`, score: null, weight: "1" }])}
        className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-ttm-green hover:text-ttm-orange disabled:opacity-40 dark:text-dark-1000"
      >
        <HiOutlinePlusSmall className="h-4 w-4" /> Add goal
      </button>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Stat label="GAS T-score" tone={t === null ? "muted" : "accent"} value={t ?? `Score all ${rows.length} goals`} />
        <Stat label="Goals scored" tone="muted" value={`${scored.length} / ${rows.length}`} />
      </div>
      {t !== null && (
        <Callout>
          {t >= 50
            ? "50 or above: goals were met as expected or better overall."
            : "Below 50: goals were met less than expected overall. Revisit the plan or the goal levels."}{" "}
          Report goal-by-goal levels alongside the T-score.
        </Callout>
      )}
      <SourceNote>
        Kiresuk TJ & Sherman RE, Community Ment Health J 1968. T = 50 + 10·Σwᵢxᵢ / √((1 − ρ)Σwᵢ² + ρ(Σwᵢ)²), with ρ = 0.3. Free to use.
      </SourceNote>
    </div>
  );
}
