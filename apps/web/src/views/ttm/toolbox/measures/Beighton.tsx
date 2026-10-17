import { useState } from "react";

import { Field, inputClass, Stat } from "../../ui";
import type { BeightonGroup, BeightonInput } from "./score";
import { BEIGHTON_CUTOFF, beightonScore } from "./score";
import { Callout, SourceNote, Toggle } from "./shared";

const ITEMS: { key: keyof BeightonInput; label: string }[] = [
  { key: "pinkyLeft", label: "Left 5th finger extends > 90°" },
  { key: "pinkyRight", label: "Right 5th finger extends > 90°" },
  { key: "thumbLeft", label: "Left thumb touches forearm" },
  { key: "thumbRight", label: "Right thumb touches forearm" },
  { key: "elbowLeft", label: "Left elbow hyperextends > 10°" },
  { key: "elbowRight", label: "Right elbow hyperextends > 10°" },
  { key: "kneeLeft", label: "Left knee hyperextends > 10°" },
  { key: "kneeRight", label: "Right knee hyperextends > 10°" },
  { key: "palmsToFloor", label: "Palms flat on floor, knees straight" },
];

const EMPTY = Object.fromEntries(ITEMS.map((i) => [i.key, false])) as unknown as BeightonInput;

const GROUPS: { value: BeightonGroup; label: string }[] = [
  { value: "prepubertal", label: "Pre-pubertal child" },
  { value: "pubertal-50", label: "Pubertal to age 50" },
  { value: "over-50", label: "Over 50" },
];

export function Beighton() {
  const [v, setV] = useState<BeightonInput>(EMPTY);
  const [group, setGroup] = useState<BeightonGroup>("prepubertal");
  const score = beightonScore(v);
  const cutoff = BEIGHTON_CUTOFF[group];

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        {ITEMS.map((i) => (
          <Toggle key={i.key} label={i.label} checked={v[i.key]} onChange={(c) => setV({ ...v, [i.key]: c })} />
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Field label="Age group">
          <select className={inputClass} value={group} onChange={(e) => setGroup(e.target.value as BeightonGroup)}>
            {GROUPS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
        <Stat label="Beighton score" value={`${score} / 9`} tone={score >= cutoff ? "accent" : "default"} />
        <Stat label="Threshold" tone="muted" value={`≥ ${cutoff}`} />
      </div>
      <Callout tone={score >= cutoff ? "flag" : "info"}>
        {score >= cutoff
          ? `Meets the ${cutoff}/9 threshold for generalized joint hypermobility in this age group. Hypermobility alone is common in young children; look at the whole picture (pain, instability, family history) before drawing conclusions.`
          : `Below the ${cutoff}/9 threshold for generalized joint hypermobility in this age group.`}
      </Callout>
      <SourceNote>
        Beighton P et al., Ann Rheum Dis 1973. Age thresholds from the 2017 International Classification of the Ehlers–Danlos Syndromes (Malfait F et al., Am J Med Genet C 2017;175C:8–26). Free to use.
      </SourceNote>
    </div>
  );
}
