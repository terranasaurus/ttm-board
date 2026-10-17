import { useState } from "react";

import { Field, inputClass, Stat } from "../../ui";
import type { Norm } from "./score";
import { round, sixMwtNorm, tudsPredicted, tugNorm, zScore } from "./score";
import { Callout, SourceNote } from "./shared";
import { Stopwatch } from "./Stopwatch";

type Sex = "male" | "female";

function SexField({ value, onChange }: { value: Sex; onChange: (s: Sex) => void }) {
  return (
    <Field label="Sex (for norms)">
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value as Sex)}>
        <option value="female">Female</option>
        <option value="male">Male</option>
      </select>
    </Field>
  );
}

function NormResult({
  value,
  unit,
  norm,
  higherIsBetter,
}: {
  value: number | null;
  unit: string;
  norm: Norm | null;
  higherIsBetter: boolean;
}) {
  if (value === null || !Number.isFinite(value) || value <= 0) return null;
  const z = norm ? zScore(value, norm) : null;
  const worse = z !== null && (higherIsBetter ? z <= -2 : z >= 2);
  const better = z !== null && (higherIsBetter ? z >= 2 : z <= -2);
  return (
    <>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Result" value={`${value} ${unit}`} tone="accent" />
        <Stat label="Typical mean (SD)" tone="muted" value={norm ? `${norm.mean} (${norm.sd}) ${unit}` : "No norm for this age"} />
        <Stat label="z-score" value={z === null ? "—" : z > 0 ? `+${z}` : z} />
      </div>
      {norm && (
        <Callout tone={worse ? "flag" : "info"}>
          Compared with typically developing children ({norm.label}). {worse
            ? "2 or more SD below typical performance."
            : better
              ? "2 or more SD better than the typical mean; double-check the timing or distance."
              : "Within 2 SD of the typical mean."}{" "}
          {higherIsBetter ? "Higher is better." : "Lower is better."}
        </Callout>
      )}
    </>
  );
}

export function Tug() {
  const [age, setAge] = useState("");
  const [time, setTime] = useState("");
  const norm = age ? tugNorm(Number(age)) : null;
  return (
    <div>
      <p className="mb-3 text-sm text-light-900 dark:text-dark-900">
        Child sits on a child-height chair, stands on "go", walks 3 m at a comfortable pace, touches a target on the wall, walks back
        and sits. Time from "go" to sitting. Run your usual number of trials; the fastest fills in below.
      </p>
      <Stopwatch onTrials={(t) => t.length && setTime(String(Math.min(...t)))} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Age (years)">
          <input inputMode="decimal" className={inputClass} value={age} onChange={(e) => setAge(e.target.value)} />
        </Field>
        <Field label="Best time (s)" hint="Filled from the stopwatch, or type it">
          <input inputMode="decimal" className={inputClass} value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <NormResult value={time ? Number(time) : null} unit="s" norm={norm} higherIsBetter={false} />
      <SourceNote>
        Norms: Williams EN et al., Dev Med Child Neurol 2005;47:518–24 (176 typically developing children aged 3–9; pediatric
        protocol with a wall target). Nicolini-Panisson & Donadio 2014 give an overall mean of 5.61 s (SD 1.06) for ages 3–18. Free to use.
      </SourceNote>
    </div>
  );
}

export function SixMinuteWalk() {
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex>("female");
  const [course, setCourse] = useState("30");
  const [laps, setLaps] = useState(0);
  const [extra, setExtra] = useState("");
  const [manual, setManual] = useState("");
  const computed = laps * Number(course || 0) + Number(extra || 0);
  const distance = manual ? Number(manual) : computed > 0 ? round(computed, 0) : null;
  const norm = age ? sixMwtNorm(sex, Number(age)) : null;

  return (
    <div>
      <p className="mb-3 text-sm text-light-900 dark:text-dark-900">
        Walk back and forth along a measured course for 6 minutes, as far as possible without running. Tap <strong>Lap</strong> each
        time the child completes one length; at the end add the partial length.
      </p>
      <Stopwatch countdownMs={6 * 60 * 1000} onLaps={setLaps} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Course length (m)">
          <input inputMode="decimal" className={inputClass} value={course} onChange={(e) => setCourse(e.target.value)} />
        </Field>
        <Field label="+ partial length (m)">
          <input inputMode="decimal" className={inputClass} value={extra} onChange={(e) => setExtra(e.target.value)} />
        </Field>
        <Field label="Age (years)">
          <input inputMode="decimal" className={inputClass} value={age} onChange={(e) => setAge(e.target.value)} />
        </Field>
        <SexField value={sex} onChange={setSex} />
      </div>
      <div className="mt-3 max-w-xs">
        <Field label="Or type the distance (m)">
          <input inputMode="decimal" className={inputClass} value={manual} onChange={(e) => setManual(e.target.value)} />
        </Field>
      </div>
      <NormResult value={distance} unit="m" norm={norm} higherIsBetter />
      <SourceNote>
        Means by age band: Geiger R et al., J Pediatr 2007;150:395–9 (Austrian children 3–18, measuring-wheel protocol), as reproduced
        by the Shirley Ryan AbilityLab. The published regression equations aren't used here because the girls' equation couldn't be
        verified. Free to use.
      </SourceNote>
    </div>
  );
}

export function Tuds() {
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex>("female");
  const [kg, setKg] = useState("");
  const [cm, setCm] = useState("");
  const [time, setTime] = useState("");
  const predicted = age && kg && cm ? tudsPredicted(sex, Number(age), Number(kg), Number(cm) / 100) : null;
  const t = time ? Number(time) : null;

  return (
    <div>
      <p className="mb-3 text-sm text-light-900 dark:text-dark-900">
        Start 1 ft from the bottom of a flight of stairs. On "go", walk up, turn on the landing and walk back down as fast as safely
        possible. Stop when both feet are back on the floor.
      </p>
      <Stopwatch onTrials={(tr) => tr.length && setTime(String(Math.min(...tr)))} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Age (years)" hint="6–14">
          <input inputMode="decimal" className={inputClass} value={age} onChange={(e) => setAge(e.target.value)} />
        </Field>
        <SexField value={sex} onChange={setSex} />
        <Field label="Weight (kg)">
          <input inputMode="decimal" className={inputClass} value={kg} onChange={(e) => setKg(e.target.value)} />
        </Field>
        <Field label="Height (cm)">
          <input inputMode="decimal" className={inputClass} value={cm} onChange={(e) => setCm(e.target.value)} />
        </Field>
        <Field label="Best time (s)">
          <input inputMode="decimal" className={inputClass} value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      {(t !== null || predicted !== null) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Result" value={t ? `${t} s` : "—"} tone="accent" />
          <Stat label="Predicted (typical)" tone="muted" value={predicted ? `${predicted} s` : "Add age 6–14, weight, height"} />
          <Stat label="% of predicted" value={t && predicted ? `${Math.round((t / predicted) * 100)}%` : "—"} />
        </div>
      )}
      <SourceNote>
        Reference equations: del Corral T et al., Physiotherapy 2021;112:31–40 (258 typically developing children aged 6–14; R² 0.50–0.56).
        Units (years, kg, metres) are inferred from the abstract; confirm against the full paper before relying on % predicted. Test: Zaino CA et al., Pediatr Phys
        Ther 2004;16:90–8. Their stair counts may differ from yours, so compare a child with themselves over time. Free to use.
      </SourceNote>
    </div>
  );
}
