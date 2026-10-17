import { useState } from "react";

import { Field, inputClass, Stat } from "../../ui";
import { CMT_GRADE_LABEL, cmtGrade } from "./score";
import { Callout, extLink, SourceNote, Toggle } from "./shared";

export function Torticollis() {
  const [age, setAge] = useState("");
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [postural, setPostural] = useState(false);
  const [mass, setMass] = useState(false);

  const diff = postural ? 0 : left !== "" && right !== "" ? Math.abs(Number(left) - Number(right)) : null;
  const grade = age !== "" && diff !== null ? cmtGrade({ ageMonths: Number(age), rotationDiff: diff, scmMass: mass }) : null;

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Age at exam (months)" hint="Completed months">
          <input inputMode="numeric" className={inputClass} value={age} onChange={(e) => setAge(e.target.value)} />
        </Field>
        <Field label="Rotation to left (°)" hint="Passive, supine">
          <input inputMode="numeric" disabled={postural} className={inputClass} value={left} onChange={(e) => setLeft(e.target.value)} />
        </Field>
        <Field label="Rotation to right (°)">
          <input inputMode="numeric" disabled={postural} className={inputClass} value={right} onChange={(e) => setRight(e.target.value)} />
        </Field>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Toggle label="Postural preference only (no ROM difference)" checked={postural} onChange={setPostural} />
        <Toggle label="SCM mass present" checked={mass} onChange={setMass} />
      </div>
      {grade !== null && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Severity grade" value={`Grade ${grade}`} tone="accent" />
            <Stat label="Classification" value={CMT_GRADE_LABEL[grade]} />
            <Stat label="Rotation difference" tone="muted" value={postural ? "Postural only" : `${diff}°`} />
          </div>
          {grade >= 6 && (
            <Callout tone="flag">
              The guideline uses the grade for prognosis: later and more severe grades generally mean a longer episode of care. Read
              it alongside the rest of your exam.
            </Callout>
          )}
        </>
      )}
      <SourceNote>
        Grades per the 2018 APTA Academy of Pediatric Physical Therapy CMT guideline (Kaplan SL, Coulter C, Sargent B. Pediatr Phys
        Ther 2018;30:240–90, Action Statement 9), paraphrased. A 15° difference counts as moderate. The{" "}
        <a className={extLink} href="https://doi.org/10.1097/PEP.0000000000001114" target="_blank" rel="noreferrer">
          2024 update
        </a>{" "}
        (Sargent et al.) supersedes it; check its classification before relying on these grades.
      </SourceNote>
    </div>
  );
}
