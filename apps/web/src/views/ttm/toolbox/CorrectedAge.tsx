import { useMemo, useState } from "react";

import { Card, Field, inputClass, Stat } from "../ui";
import {
  CORRECT_UNTIL_MONTHS,
  correctedAge,
  formatAge,
  parseDateInput,
} from "./logic";

const todayInput = () => new Date().toISOString().slice(0, 10);

export function CorrectedAge() {
  const [birth, setBirth] = useState("");
  const [assessed, setAssessed] = useState(todayInput());
  const [gaWeeks, setGaWeeks] = useState("40");
  const [gaDays, setGaDays] = useState("0");

  const result = useMemo(() => {
    const b = parseDateInput(birth);
    const a = parseDateInput(assessed);
    const w = Number(gaWeeks);
    const dd = Number(gaDays || 0);
    if (!b || !a || !Number.isFinite(w)) return null;
    return correctedAge(b, a, w, dd);
  }, [birth, assessed, gaWeeks, gaDays]);

  return (
    <Card
      id="corrected-age"
      title="Corrected (adjusted) age"
      description={`For infants born before 37 weeks. Corrected age = chronological age − weeks born early (from 40 weeks). Conventionally used until ${CORRECT_UNTIL_MONTHS} months chronological age.`}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Birth date">
          <input type="date" className={inputClass} value={birth} onChange={(e) => setBirth(e.target.value)} />
        </Field>
        <Field label="Assessment date">
          <input type="date" className={inputClass} value={assessed} onChange={(e) => setAssessed(e.target.value)} />
        </Field>
        <Field label="Gestational age (weeks)">
          <input type="number" min={22} max={44} className={inputClass} value={gaWeeks} onChange={(e) => setGaWeeks(e.target.value)} />
        </Field>
        <Field label="+ days">
          <input type="number" min={0} max={6} className={inputClass} value={gaDays} onChange={(e) => setGaDays(e.target.value)} />
        </Field>
      </div>

      {result?.error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{result.error}</p>
      )}
      {result && !result.error && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat label="Chronological age" value={formatAge(result.chronological)} />
          <Stat
            label="Corrected age"
            tone={result.corrected && result.shouldCorrect ? "accent" : "muted"}
            value={result.corrected ? formatAge(result.corrected) : "No correction (≥ 37 wk)"}
          />
          <Stat
            label="Born early"
            tone="muted"
            value={result.daysEarly ? `${result.weeksEarly} wk ${result.daysEarly % 7} d` : "—"}
          />
          {result.corrected && !result.shouldCorrect && (
            <p className="text-sm text-light-900 dark:text-dark-900 sm:col-span-3">
              Past {CORRECT_UNTIL_MONTHS} months chronological age: most standardized tools stop correcting here. Check the specific tool's manual.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
