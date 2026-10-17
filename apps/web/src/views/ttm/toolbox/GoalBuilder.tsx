import { useMemo, useState } from "react";

import type { GoalParts } from "./logic";
import { Card, Field, inputClass } from "../ui";
import { buildGoal } from "./logic";

const EMPTY: GoalParts = { timeframe: "", skill: "", condition: "", criterion: "", purpose: "" };

const EXAMPLES: { label: string; parts: GoalParts }[] = [
  {
    label: "Gross motor",
    parts: {
      timeframe: "12 weeks",
      skill: "transition from floor to stand",
      condition: "through half-kneel without upper-extremity support",
      criterion: "in 4 of 5 trials",
      purpose: "get up to play with siblings",
    },
  },
  {
    label: "Balance",
    parts: {
      timeframe: "8 weeks",
      skill: "stand on one foot",
      condition: "on each leg",
      criterion: "for 5 seconds in 3 of 4 trials",
      purpose: "put on shoes and pants while standing",
    },
  },
  {
    label: "Caregiver",
    parts: {
      timeframe: "4 weeks",
      skill: "demonstrate the home program",
      condition: "with no more than one verbal cue from the therapist",
      criterion: "for 3 consecutive sessions",
      purpose: "carry it over into daily routines",
    },
  },
];

export function GoalBuilder() {
  const [parts, setParts] = useState<GoalParts>(EMPTY);
  const [copied, setCopied] = useState(false);
  const goal = useMemo(() => buildGoal(parts), [parts]);
  const set = (k: keyof GoalParts) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setParts((p) => ({ ...p, [k]: e.target.value }));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(goal);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card
      id="goal-builder"
      title="SMART goal builder"
      description="Fill in the parts and copy the sentence into your note. Uses “[Child]” so you never type a name here."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => setParts(ex.parts)}
            className="rounded-full border border-light-600 px-3 py-1 text-xs font-semibold text-light-950 hover:border-ttm-orange hover:text-ttm-orange dark:border-dark-600 dark:text-dark-950"
          >
            Example: {ex.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setParts(EMPTY)}
          className="px-2 py-1 text-xs font-semibold text-light-900 underline dark:text-dark-900"
        >
          Clear
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Timeframe" hint="e.g. 12 weeks, 6 months">
          <input className={inputClass} value={parts.timeframe} onChange={set("timeframe")} />
        </Field>
        <Field label="Skill (observable)" hint="e.g. walk 10 feet independently">
          <input className={inputClass} value={parts.skill} onChange={set("skill")} />
        </Field>
        <Field label="Condition / level of support" hint="e.g. on level surfaces, with min assist">
          <input className={inputClass} value={parts.condition} onChange={set("condition")} />
        </Field>
        <Field label="Criterion (measurable)" hint="e.g. in 3 of 4 trials, for 10 seconds">
          <input className={inputClass} value={parts.criterion} onChange={set("criterion")} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Functional purpose" hint="Ties the goal to participation, e.g. keep up with peers at the playground">
            <input className={inputClass} value={parts.purpose} onChange={set("purpose")} />
          </Field>
        </div>
      </div>
      <div className="mt-5 rounded-md border-l-4 border-ttm-orange bg-light-100 p-4 text-sm leading-relaxed text-light-1000 dark:bg-dark-200 dark:text-dark-1000">
        {goal}
      </div>
      <button
        type="button"
        onClick={copy}
        className="mt-3 rounded-md bg-ttm-orange px-3 py-1.5 text-xs font-semibold text-white hover:bg-ttm-orange-hover"
      >
        {copied ? "Copied" : "Copy goal"}
      </button>
    </Card>
  );
}
