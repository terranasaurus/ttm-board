import { useState } from "react";

import { Field, inputClass, Stat } from "../../ui";
import { brachyBand, cephalicIndex, choaLevel, ciNorm, cvai } from "./score";
import { Callout, SourceNote } from "./shared";

const CHOA_TEXT: Record<number, string> = {
  1: "Symmetry within normal limits. No treatment needed.",
  2: "Minimal asymmetry in one posterior quadrant. Repositioning program.",
  3: "Two-quadrant involvement, moderate–severe flattening, minimal ear shift. Repositioning; a helmet may be considered depending on age and history.",
  4: "Two or three quadrants, severe flattening, moderate ear shift, noticeable orbit asymmetry. Repositioning plus cranial remolding orthosis.",
  5: "Three or four quadrants, severe flattening and ear shift, orbit and cheek asymmetry. Repositioning plus cranial remolding orthosis.",
};

const BAND_TEXT = { normal: "Not brachycephalic (< 90)", mild: "Mild brachycephaly (90–93)", moderate: "Moderate brachycephaly (93–97)", severe: "Severe brachycephaly (> 97)" };

export function HeadShape() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [w, setW] = useState("");
  const [l, setL] = useState("");
  const [sex, setSex] = useState<"male" | "female">("female");
  const [age, setAge] = useState("");

  const c = cvai(Number(a), Number(b));
  const level = c === null ? null : choaLevel(c);
  const ci = cephalicIndex(Number(w), Number(l));
  const norm = age ? ciNorm(sex, Number(age)) : null;

  return (
    <div className="space-y-6">
      <div>
        <h4 className="mb-2 text-sm font-bold text-light-1000 dark:text-dark-1000">Plagiocephaly: CVAI</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Diagonal A (mm)" hint="Same calipers and landmarks each visit">
            <input inputMode="decimal" className={inputClass} value={a} onChange={(e) => setA(e.target.value)} />
          </Field>
          <Field label="Diagonal B (mm)">
            <input inputMode="decimal" className={inputClass} value={b} onChange={(e) => setB(e.target.value)} />
          </Field>
        </div>
        {c !== null && level !== null && (
          <>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Stat label="CVAI" value={`${c}%`} tone="accent" />
              <Stat label="CHOA level" value={level} />
              <Stat label="Diagonal difference" tone="muted" value={`${Math.abs(Number(a) - Number(b)).toFixed(1)} mm`} />
            </div>
            <Callout tone={level >= 3 ? "flag" : "info"}>{CHOA_TEXT[level]}</Callout>
          </>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-bold text-light-1000 dark:text-dark-1000">Brachycephaly: cephalic index</h4>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Head width (mm)" hint="Euryon to euryon">
            <input inputMode="decimal" className={inputClass} value={w} onChange={(e) => setW(e.target.value)} />
          </Field>
          <Field label="Head length (mm)" hint="Glabella to opisthocranion">
            <input inputMode="decimal" className={inputClass} value={l} onChange={(e) => setL(e.target.value)} />
          </Field>
          <Field label="Sex (for norms)">
            <select className={inputClass} value={sex} onChange={(e) => setSex(e.target.value as "male" | "female")}>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </Field>
          <Field label="Age (months)" hint="Norms cover ½–12 months">
            <input inputMode="decimal" className={inputClass} value={age} onChange={(e) => setAge(e.target.value)} />
          </Field>
        </div>
        {ci !== null && (
          <>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Stat label="Cephalic index" value={`${ci}%`} tone="accent" />
              <Stat label="Graham 2020 band" value={BAND_TEXT[brachyBand(ci)]} />
              <Stat
                label="Age/sex ±2 SD"
                tone="muted"
                value={norm ? `${norm.low}–${norm.high}` : age ? "Outside ½–12 mo" : "Add age"}
              />
            </div>
            {norm && (ci > norm.high || ci < norm.low) && (
              <Callout tone="flag">
                Outside ±2 SD for age and sex ({ci > norm.high ? "above" : "below"} {ci > norm.high ? norm.high : norm.low}). Many payers use
                this as the threshold for a cranial orthosis.
              </Callout>
            )}
          </>
        )}
      </div>

      <SourceNote>
        CVAI = |A − B| ÷ longer diagonal × 100. Levels: Holowka MA et al., J Craniofac Surg 2017;28:717–22 (Children's Healthcare of
        Atlanta scale), lower bounds inclusive. Cephalic index = width ÷ length × 100; bands from Graham T et al., J Clin Med
        2020;9:1027 (open access); ±2 SD norms from AAOP 2004 as used in BCBS policy DME103.007. No standard cut-off exists for
        dolichocephaly, so none is shown. Free to use.
      </SourceNote>
    </div>
  );
}
