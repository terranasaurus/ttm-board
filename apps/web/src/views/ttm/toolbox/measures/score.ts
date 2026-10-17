// Scoring math for the Toolbox's outcome measures. Pure functions only, so
// every number shown in the UI is unit-tested. Cut-offs and norms carry their
// source next to them; check the original before using one clinically.

const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;

/* ------------------------------------------------------------------ */
/* Beighton score (joint hypermobility)                                 */
/* ------------------------------------------------------------------ */

export interface BeightonInput {
  pinkyLeft: boolean;
  pinkyRight: boolean;
  thumbLeft: boolean;
  thumbRight: boolean;
  elbowLeft: boolean;
  elbowRight: boolean;
  kneeLeft: boolean;
  kneeRight: boolean;
  palmsToFloor: boolean;
}

export type BeightonGroup = "prepubertal" | "pubertal-50" | "over-50";

/**
 * 2017 International EDS criteria thresholds for generalized joint
 * hypermobility (Malfait et al., Am J Med Genet C 2017).
 */
export const BEIGHTON_CUTOFF: Record<BeightonGroup, number> = {
  prepubertal: 6,
  "pubertal-50": 5,
  "over-50": 4,
};

export function beightonScore(i: BeightonInput): number {
  return Object.values(i).filter(Boolean).length;
}

/* ------------------------------------------------------------------ */
/* Head shape: CVAI and cephalic index                                  */
/* ------------------------------------------------------------------ */

/**
 * Cranial Vault Asymmetry Index: |A − B| / max(A, B) × 100, where A and B are
 * the two cranial diagonals measured 30° from the anteroposterior line.
 */
export function cvai(diagA: number, diagB: number): number | null {
  if (!(diagA > 0 && diagB > 0)) return null;
  return round((Math.abs(diagA - diagB) / Math.max(diagA, diagB)) * 100, 1);
}

/** Cephalic index: maximum head width / maximum head length × 100. */
export function cephalicIndex(width: number, length: number): number | null {
  if (!(width > 0 && length > 0)) return null;
  return round((width / length) * 100, 1);
}

/**
 * Children's Healthcare of Atlanta plagiocephaly severity level from CVAI
 * (Holowka et al., J Craniofac Surg 2017;28:717-22). Published bands share
 * endpoints; we treat each lower bound as inclusive.
 */
export function choaLevel(cvaiValue: number): 1 | 2 | 3 | 4 | 5 {
  if (cvaiValue < 3.5) return 1;
  if (cvaiValue < 6.25) return 2;
  if (cvaiValue < 8.75) return 3;
  if (cvaiValue < 11) return 4;
  return 5;
}

/** Brachycephaly bands from Graham et al., J Clin Med 2020;9:1027 (authors' synthesis). */
export function brachyBand(ci: number): "normal" | "mild" | "moderate" | "severe" {
  if (ci < 90) return "normal";
  if (ci <= 93) return "mild";
  if (ci <= 97) return "moderate";
  return "severe";
}

/**
 * Cephalic index ±2 SD by age and sex (AAOP 2004, as tabulated in BCBS
 * medical policy DME103.007). Defined for 16 days to 12 months only.
 */
export const CI_NORMS = {
  male: [
    { maxMonths: 6, low: 63.7, mean: 73.7, high: 83.7 },
    { maxMonths: 12, low: 64.8, mean: 78.0, high: 91.2 },
  ],
  female: [
    { maxMonths: 6, low: 63.9, mean: 73.3, high: 82.7 },
    { maxMonths: 12, low: 69.5, mean: 78.5, high: 87.5 },
  ],
} as const;

export function ciNorm(sex: "male" | "female", ageMonths: number) {
  if (!(ageMonths >= 0.5 && ageMonths <= 12)) return null;
  return CI_NORMS[sex].find((b) => ageMonths <= b.maxMonths) ?? null;
}

/* ------------------------------------------------------------------ */
/* Congenital muscular torticollis severity (2018 APTA CPG)             */
/* ------------------------------------------------------------------ */

export interface CmtInput {
  /** Age at examination in completed months. */
  ageMonths: number;
  /** Side-to-side difference in passive cervical rotation, degrees. 0 = postural preference only. */
  rotationDiff: number;
  /** Sternocleidomastoid mass present. */
  scmMass: boolean;
}

export const CMT_GRADE_LABEL: Record<number, string> = {
  1: "Early Mild",
  2: "Early Moderate",
  3: "Early Severe",
  4: "Late Mild",
  5: "Late Moderate",
  6: "Late Severe",
  7: "Late Extreme",
  8: "Very Late",
};

/**
 * Kaplan, Coulter & Sargent, Pediatr Phys Ther 2018;30:240-90 (Action
 * Statement 9). Rotation differences of exactly 15° count as moderate.
 */
export function cmtGrade({ ageMonths, rotationDiff, scmMass }: CmtInput): number | null {
  if (!(ageMonths >= 0) || !(rotationDiff >= 0)) return null;
  const d = rotationDiff;
  if (ageMonths > 12) return 8;
  if (ageMonths < 7) {
    if (scmMass || d > 30) return 3;
    if (d >= 15) return 2;
    return 1;
  }
  if (scmMass) return 7;
  if (ageMonths < 10) return d >= 15 ? 6 : 4;
  if (d > 30) return 7;
  if (d >= 15) return 6;
  return 5;
}

/* ------------------------------------------------------------------ */
/* Timed / distance tests against published norms                        */
/* ------------------------------------------------------------------ */

export interface Norm {
  mean: number;
  sd: number;
  label: string;
}

/** z = (value − mean) / SD, one decimal. */
export function zScore(value: number, n: Norm): number {
  return round((value - n.mean) / n.sd, 1);
}

/**
 * Six-minute walk distance (m), typically developing children, mean (SD)
 * by age band. Geiger et al., J Pediatr 2007;150:395-9, via SRALab.
 */
const SIXMWT: { min: number; max: number; boys: [number, number]; girls: [number, number] }[] = [
  { min: 3, max: 5, boys: [536.5, 95.6], girls: [501.9, 90.2] },
  { min: 6, max: 8, boys: [577.8, 56.1], girls: [573.2, 69.2] },
  { min: 9, max: 11, boys: [672.8, 61.6], girls: [661.9, 56.7] },
  { min: 12, max: 15, boys: [697.8, 74.7], girls: [663.0, 50.8] },
  { min: 16, max: 18, boys: [725.8, 61.2], girls: [664.3, 49.5] },
];

export function sixMwtNorm(sex: "male" | "female", ageYears: number): Norm | null {
  const y = Math.floor(ageYears);
  const band = SIXMWT.find((b) => y >= b.min && y <= b.max);
  if (!band) return null;
  const [mean, sd] = sex === "male" ? band.boys : band.girls;
  return { mean, sd, label: `${sex === "male" ? "Boys" : "Girls"} ${band.min}–${band.max} y` };
}

/**
 * Timed Up and Go (s), typically developing children, Williams et al.,
 * Dev Med Child Neurol 2005;47:518-24 (pediatric protocol: touch a target).
 */
export function tugNorm(ageYears: number): Norm | null {
  const y = Math.floor(ageYears);
  if (y >= 3 && y <= 5) return { mean: 6.7, sd: 1.2, label: "Ages 3–5" };
  if (y >= 6 && y <= 9) return { mean: 5.1, sd: 0.8, label: "Ages 6–9" };
  return null;
}

/**
 * Timed Up and Down Stairs predicted time (s), ages 6–14. Del Corral et al.,
 * Physiotherapy 2021;112:31-40. Units (years, kg, metres) inferred from the
 * abstract; confirm against the full text.
 */
export function tudsPredicted(sex: "male" | "female", ageYears: number, weightKg: number, heightM: number): number | null {
  if (!(ageYears >= 6 && ageYears < 15) || !(weightKg > 0) || !(heightM > 0.8 && heightM < 2.2)) return null;
  const v =
    sex === "male"
      ? 9.967 - 0.182 * ageYears + 0.025 * weightKg - 2.546 * heightM
      : 10.553 - 0.194 * ageYears + 0.019 * weightKg - 2.406 * heightM;
  return round(v, 1);
}

/* ------------------------------------------------------------------ */
/* Pediatric Balance Scale                                              */
/* ------------------------------------------------------------------ */

export const PBS_ITEMS = [
  "Sitting to standing",
  "Standing to sitting",
  "Transfers",
  "Standing unsupported",
  "Sitting unsupported",
  "Standing with eyes closed",
  "Standing with feet together",
  "Standing with one foot in front",
  "Standing on one foot",
  "Turning 360 degrees",
  "Turning to look behind",
  "Retrieving object from floor",
  "Placing alternate foot on stool",
  "Reaching forward with outstretched arm",
] as const;

/**
 * Franjoine et al., Pediatr Phys Ther 2010;22:350-9, via SRALab. Bands are
 * by age in months (upper bound inclusive); cut = lower 95% CI of the mean.
 */
const PBS_NORMS: { maxMonths: number; label: string; mean: number; sd: number; cut: number }[] = [
  { maxMonths: 29, label: "2y0m–2y5m", mean: 26.2, sd: 6.38, cut: 23.3 },
  { maxMonths: 35, label: "2y6m–2y11m", mean: 34.3, sd: 7.72, cut: 32.7 },
  { maxMonths: 41, label: "3y0m–3y5m", mean: 46.0, sd: 6.55, cut: 45.4 },
  { maxMonths: 47, label: "3y6m–3y11m", mean: 48.5, sd: 5.02, cut: 47.5 },
  { maxMonths: 53, label: "4y0m–4y5m", mean: 49.5, sd: 5.76, cut: 48.5 },
  { maxMonths: 59, label: "4y6m–4y11m", mean: 51.2, sd: 5.07, cut: 50.4 },
  { maxMonths: 65, label: "5y0m–5y5m", mean: 54.0, sd: 2.52, cut: 53.2 },
  { maxMonths: 71, label: "5y6m–5y11m", mean: 53.3, sd: 3.2, cut: 52.2 },
  { maxMonths: 77, label: "6y0m–6y5m", mean: 53.8, sd: 2.49, cut: 52.8 },
  { maxMonths: 83, label: "6y6m–6y11m", mean: 54.4, sd: 1.89, cut: 53.3 },
  // The 2010 sample's oldest child was 13y7m; don't extrapolate past it.
  { maxMonths: 163, label: "7y0m–13y7m", mean: 55.2, sd: 1.74, cut: 54.6 },
];

export function pbsNorm(ageMonths: number) {
  if (!(ageMonths >= 24)) return null;
  return PBS_NORMS.find((b) => ageMonths <= b.maxMonths) ?? null;
}

/* ------------------------------------------------------------------ */
/* HINE global score interpretation                                      */
/* ------------------------------------------------------------------ */

/** Romeo et al., Eur J Paediatr Neurol 2013: CP likely at or below these scores. */
export const HINE_ROMEO_CUTOFF: Record<3 | 6 | 9 | 12, number> = { 3: 56, 6: 59, 9: 62, 12: 65 };

export interface HineReading {
  /** Closest Romeo 2013 age point used, or null outside 3–12 months. */
  agePoint: 3 | 6 | 9 | 12 | null;
  atOrBelowRomeo: boolean | null;
  /** Statements from Novak et al., JAMA Pediatr 2017 that apply. */
  novak: string[];
}

export function readHine(score: number, correctedMonths: number): HineReading | null {
  if (!(score >= 0 && score <= 78) || !(correctedMonths >= 2)) return null;
  const points = [3, 6, 9, 12] as const;
  const agePoint =
    correctedMonths >= 2 && correctedMonths <= 13.5
      ? points.reduce((best, p) => (Math.abs(p - correctedMonths) < Math.abs(best - correctedMonths) ? p : best), points[0])
      : null;
  const novak: string[] = [];
  if (correctedMonths < 6) {
    if (score < 57) novak.push("Below 57 at 3 months: 96% predictive of cerebral palsy.");
  } else if (correctedMonths <= 13.5) {
    if (score < 73) novak.push("Below 73 at 6–12 months: high risk of cerebral palsy.");
    if (score < 40) novak.push("Below 40: almost always indicates cerebral palsy or an abnormal outcome.");
    if (score >= 50 && score < 73) novak.push("50–73 in a child with CP: more likely unilateral.");
    if (score < 50) novak.push("Below 50 in a child with CP: more likely bilateral.");
  }
  return {
    agePoint,
    atOrBelowRomeo: agePoint ? score <= HINE_ROMEO_CUTOFF[agePoint] : null,
    novak,
  };
}

/* ------------------------------------------------------------------ */
/* Goal Attainment Scaling                                              */
/* ------------------------------------------------------------------ */

export interface GasGoal {
  /** Attainment level, −2 … +2. */
  score: number;
  /** Weight; 1 when goals are unweighted. */
  weight: number;
}

/**
 * Kiresuk & Sherman (1968) T-score:
 *   T = 50 + 10·Σ(wᵢxᵢ) / √[(1 − ρ)·Σwᵢ² + ρ·(Σwᵢ)²]
 * with the conventional ρ = 0.3. 50 means goals were met as expected.
 */
export function gasTScore(goals: GasGoal[], rho = 0.3): number | null {
  const valid = goals.filter((g) => Number.isFinite(g.score) && g.weight > 0);
  if (!valid.length) return null;
  const sumWX = valid.reduce((s, g) => s + g.weight * g.score, 0);
  const sumW2 = valid.reduce((s, g) => s + g.weight ** 2, 0);
  const sumW = valid.reduce((s, g) => s + g.weight, 0);
  return round(50 + (10 * sumWX) / Math.sqrt((1 - rho) * sumW2 + rho * sumW ** 2), 1);
}

/* ------------------------------------------------------------------ */
/* Simple item-sum scales                                               */
/* ------------------------------------------------------------------ */

/** Sum of item scores; null until every item has a score. */
export function sumItems(items: (number | null)[]): number | null {
  if (items.some((x) => x === null || !Number.isFinite(x))) return null;
  return (items as number[]).reduce((s, x) => s + x, 0);
}

export { round };
