import { useMemo, useState } from "react";

import { Card, inputClass, Stat } from "../ui";
import { allocateUnits } from "./logic";

// Timed (per-15-minute) PT codes commonly used in pediatric outpatient care.
// Short labels are our own paraphrases, not the AMA CPT descriptors.
const TIMED_CODES = [
  { code: "97110", label: "Therapeutic exercise" },
  { code: "97112", label: "Neuromuscular re-education" },
  { code: "97530", label: "Therapeutic activities" },
  { code: "97116", label: "Gait training" },
  { code: "97140", label: "Manual therapy" },
  { code: "97535", label: "Self-care / home management training" },
  { code: "97760", label: "Orthotic management & training" },
] as const;

export function BillingUnits() {
  const [minutes, setMinutes] = useState<Record<string, string>>({});

  const result = useMemo(
    () =>
      allocateUnits(
        TIMED_CODES.map((c) => ({ ...c, minutes: Number(minutes[c.code] ?? 0) || 0 })),
      ),
    [minutes],
  );

  return (
    <Card
      id="billing-units"
      title="Timed-code units (8-minute rule)"
      description="CMS method: total timed minutes set the total units (8–22 = 1, 23–37 = 2, 38–52 = 3 …), then units go to codes by minutes. Medicare rule; some commercial payers bill each code separately. Check the payer."
    >
      <div className="grid gap-2">
        {TIMED_CODES.map((c) => {
          const units = result.perCode.find((p) => p.code === c.code)?.units;
          return (
            <div key={c.code} className="grid grid-cols-[4.5rem_1fr_6rem_3.5rem] items-center gap-3">
              <span className="font-mono text-sm font-semibold text-light-1000 dark:text-dark-1000">{c.code}</span>
              <span className="truncate text-sm text-light-950 dark:text-dark-950">{c.label}</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="min"
                aria-label={`${c.code} minutes`}
                className={inputClass}
                value={minutes[c.code] ?? ""}
                onChange={(e) => setMinutes((m) => ({ ...m, [c.code]: e.target.value }))}
              />
              <span className="text-right text-sm font-bold tabular-nums text-ttm-orange">
                {units ? `${units} u` : ""}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Stat label="Total timed minutes" value={result.totalMinutes} />
        <Stat label="Billable units" tone="accent" value={result.totalUnits} />
      </div>
      <button
        type="button"
        onClick={() => setMinutes({})}
        className="mt-3 text-xs font-semibold text-light-900 underline dark:text-dark-900"
      >
        Clear
      </button>
    </Card>
  );
}
