import { describe, expect, it } from "vitest";

import {
  BEIGHTON_CUTOFF,
  beightonScore,
  brachyBand,
  cephalicIndex,
  choaLevel,
  ciNorm,
  cmtGrade,
  cvai,
  gasTScore,
  pbsNorm,
  readHine,
  sixMwtNorm,
  sumItems,
  tudsPredicted,
  tugNorm,
  zScore,
} from "./score";

describe("beightonScore", () => {
  it("counts positive items", () => {
    expect(
      beightonScore({
        pinkyLeft: true,
        pinkyRight: true,
        thumbLeft: false,
        thumbRight: true,
        elbowLeft: false,
        elbowRight: false,
        kneeLeft: true,
        kneeRight: true,
        palmsToFloor: true,
      }),
    ).toBe(6);
  });
  it("uses the 2017 age thresholds", () => {
    expect(BEIGHTON_CUTOFF).toEqual({ prepubertal: 6, "pubertal-50": 5, "over-50": 4 });
  });
});

describe("cvai", () => {
  it("is the diagonal difference over the longer diagonal", () => {
    expect(cvai(140, 130)).toBe(7.1);
    expect(cvai(130, 140)).toBe(7.1);
    expect(cvai(135, 135)).toBe(0);
  });
  it("rejects missing or non-positive input", () => {
    expect(cvai(0, 130)).toBeNull();
    expect(cvai(Number.NaN, 130)).toBeNull();
  });
});

describe("cephalicIndex", () => {
  it("is width over length × 100", () => {
    expect(cephalicIndex(120, 140)).toBe(85.7);
    expect(cephalicIndex(0, 140)).toBeNull();
  });
});

describe("gasTScore", () => {
  it("is 50 when every goal is met as expected", () => {
    expect(gasTScore([{ score: 0, weight: 1 }, { score: 0, weight: 1 }])).toBe(50);
  });
  it("matches a hand-worked two-goal example (ρ = 0.3)", () => {
    // 50 + 10·2 / √(0.7·2 + 0.3·4) = 50 + 20/√2.6 = 62.40
    expect(gasTScore([{ score: 1, weight: 1 }, { score: 1, weight: 1 }])).toBe(62.4);
  });
  it("is 40 for a single goal at −1", () => {
    expect(gasTScore([{ score: -1, weight: 1 }])).toBe(40);
  });
  it("ignores zero-weight goals and returns null when none remain", () => {
    expect(gasTScore([{ score: 2, weight: 0 }])).toBeNull();
  });
});

describe("sumItems", () => {
  it("sums complete item sets only", () => {
    expect(sumItems([1, 2, 3])).toBe(6);
    expect(sumItems([1, null, 3])).toBeNull();
  });
});

describe("choaLevel", () => {
  it("uses inclusive lower bounds", () => {
    expect(choaLevel(3.49)).toBe(1);
    expect(choaLevel(3.5)).toBe(2);
    expect(choaLevel(6.25)).toBe(3);
    expect(choaLevel(8.75)).toBe(4);
    expect(choaLevel(11)).toBe(5);
    expect(choaLevel(14)).toBe(5);
  });
});

describe("cephalic index bands", () => {
  it("applies Graham 2020 brachycephaly bands", () => {
    expect(brachyBand(85)).toBe("normal");
    expect(brachyBand(90)).toBe("mild");
    expect(brachyBand(93.5)).toBe("moderate");
    expect(brachyBand(97.1)).toBe("severe");
  });
  it("picks the ±2 SD band by age and sex, only up to 12 months", () => {
    expect(ciNorm("male", 4)).toMatchObject({ high: 83.7 });
    expect(ciNorm("female", 9)).toMatchObject({ high: 87.5 });
    expect(ciNorm("male", 14)).toBeNull();
    expect(ciNorm("male", 0.2)).toBeNull();
  });
});

describe("cmtGrade (2018 CPG)", () => {
  const g = (ageMonths: number, rotationDiff: number, scmMass = false) => cmtGrade({ ageMonths, rotationDiff, scmMass });
  it("grades early infants (0–6 mo)", () => {
    expect(g(2, 0)).toBe(1);
    expect(g(2, 14)).toBe(1);
    expect(g(2, 15)).toBe(2);
    expect(g(5, 30)).toBe(2);
    expect(g(5, 31)).toBe(3);
    expect(g(1, 5, true)).toBe(3);
  });
  it("grades 7–9 months", () => {
    expect(g(8, 10)).toBe(4);
    expect(g(8, 20)).toBe(6);
    expect(g(8, 0, true)).toBe(7);
  });
  it("grades 10–12 months", () => {
    expect(g(11, 10)).toBe(5);
    expect(g(11, 20)).toBe(6);
    expect(g(12, 35)).toBe(7);
    expect(g(10, 0, true)).toBe(7);
  });
  it("is Very Late after 12 months, whatever the findings", () => {
    expect(g(13, 0)).toBe(8);
  });
  it("rejects bad input", () => {
    expect(g(-1, 0)).toBeNull();
    expect(g(3, Number.NaN)).toBeNull();
  });
});

describe("norms", () => {
  it("6MWT bands by sex and whole years", () => {
    expect(sixMwtNorm("male", 4.9)).toMatchObject({ mean: 536.5, sd: 95.6 });
    expect(sixMwtNorm("female", 12)).toMatchObject({ mean: 663.0, sd: 50.8 });
    expect(sixMwtNorm("female", 2)).toBeNull();
    expect(sixMwtNorm("male", 19)).toBeNull();
  });
  it("TUG norms for 3–9 years", () => {
    expect(tugNorm(4)).toMatchObject({ mean: 6.7, sd: 1.2 });
    expect(tugNorm(9.5)).toMatchObject({ mean: 5.1, sd: 0.8 });
    expect(tugNorm(10)).toBeNull();
  });
  it("z-scores", () => {
    expect(zScore(9.1, { mean: 6.7, sd: 1.2, label: "" })).toBe(2);
  });
  it("TUDS reference equation (10-year-old boy, 35 kg, 1.40 m ≈ 5.5 s)", () => {
    expect(tudsPredicted("male", 10, 35, 1.4)).toBe(5.5);
    // 10.553 − 1.94 + 0.665 − 3.368 = 5.9
    expect(tudsPredicted("female", 10, 35, 1.4)).toBe(5.9);
    expect(tudsPredicted("male", 5, 20, 1.1)).toBeNull();
    expect(tudsPredicted("male", 10, 35, 140)).toBeNull(); // cm by mistake
  });
  it("PBS bands by age in months", () => {
    expect(pbsNorm(24)).toMatchObject({ cut: 23.3 });
    expect(pbsNorm(30)).toMatchObject({ cut: 32.7 });
    expect(pbsNorm(60)).toMatchObject({ cut: 53.2 });
    expect(pbsNorm(100)).toMatchObject({ cut: 54.6 });
    expect(pbsNorm(200)).toBeNull();
    expect(pbsNorm(20)).toBeNull();
  });
});

describe("readHine", () => {
  it("applies Romeo 2013 cut-offs at the nearest age point", () => {
    expect(readHine(56, 3)).toMatchObject({ agePoint: 3, atOrBelowRomeo: true });
    expect(readHine(60, 6.4)).toMatchObject({ agePoint: 6, atOrBelowRomeo: false });
    expect(readHine(65, 12)).toMatchObject({ agePoint: 12, atOrBelowRomeo: true });
  });
  it("adds Novak 2017 statements", () => {
    expect(readHine(55, 3)?.novak[0]).toMatch(/96%/);
    expect(readHine(70, 9)?.novak.join(" ")).toMatch(/high risk/);
    expect(readHine(35, 9)?.novak.join(" ")).toMatch(/almost always/);
    expect(readHine(76, 9)?.novak).toEqual([]);
  });
  it("rejects out-of-range input", () => {
    expect(readHine(80, 6)).toBeNull();
    expect(readHine(60, 1)).toBeNull();
  });
});
