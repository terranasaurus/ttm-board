// Pure helpers for the Clinician Toolbox. Everything here runs in the
// browser; nothing typed into the toolbox is stored or sent anywhere.

const DAY_MS = 24 * 60 * 60 * 1000;
const TERM_WEEKS = 40;
/** Correct for prematurity until this chronological age (common convention). */
export const CORRECT_UNTIL_MONTHS = 24;

/** Parse a yyyy-mm-dd date input as a UTC calendar date (no timezone drift). */
export function parseDateInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface AgeParts {
  totalDays: number;
  months: number;
  days: number;
  weeks: number;
}

/** Whole calendar months + remaining days between two UTC dates. */
export function diffMonthsDays(from: Date, to: Date): AgeParts {
  const totalDays = Math.round((to.getTime() - from.getTime()) / DAY_MS);
  let months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth());
  let anchor = addMonthsUTC(from, months);
  if (anchor.getTime() > to.getTime()) {
    months -= 1;
    anchor = addMonthsUTC(from, months);
  }
  const days = Math.round((to.getTime() - anchor.getTime()) / DAY_MS);
  return { totalDays, months, days, weeks: Math.floor(totalDays / 7) };
}

function addMonthsUTC(d: Date, months: number): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + months;
  const target = new Date(Date.UTC(y, m, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return target;
}

export interface CorrectedAgeResult {
  chronological: AgeParts;
  /** Null when the child was born at or after 37 weeks (no correction). */
  corrected: AgeParts | null;
  weeksEarly: number;
  daysEarly: number;
  /** True while chronological age is under CORRECT_UNTIL_MONTHS. */
  shouldCorrect: boolean;
  error?: string;
}

export function correctedAge(
  birth: Date,
  assessed: Date,
  gaWeeks: number,
  gaDays = 0,
): CorrectedAgeResult {
  const chronological = diffMonthsDays(birth, assessed);
  const gaTotalDays = gaWeeks * 7 + gaDays;
  const daysEarly = Math.max(0, TERM_WEEKS * 7 - gaTotalDays);
  const base = {
    chronological,
    weeksEarly: Math.floor(daysEarly / 7),
    daysEarly,
  };
  if (assessed.getTime() < birth.getTime()) {
    return { ...base, corrected: null, shouldCorrect: false, error: "Assessment date is before the birth date." };
  }
  if (gaWeeks < 22 || gaWeeks > 44 || gaDays < 0 || gaDays > 6) {
    return { ...base, corrected: null, shouldCorrect: false, error: "Gestational age should be 22–44 weeks and 0–6 days." };
  }
  const isPreterm = gaTotalDays < 37 * 7;
  if (!isPreterm) {
    return { ...base, corrected: null, shouldCorrect: false };
  }
  const dueDate = new Date(birth.getTime() + daysEarly * DAY_MS);
  const corrected =
    dueDate.getTime() <= assessed.getTime()
      ? diffMonthsDays(dueDate, assessed)
      : { totalDays: -Math.round((dueDate.getTime() - assessed.getTime()) / DAY_MS), months: 0, days: 0, weeks: 0 };
  return {
    ...base,
    corrected,
    shouldCorrect: chronological.months < CORRECT_UNTIL_MONTHS,
  };
}

/** Units for the CMS "8-minute rule" from total timed minutes. */
export function unitsForMinutes(totalMinutes: number): number {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 8) return 0;
  return Math.floor((totalMinutes + 7) / 15);
}

export interface TimedCode {
  code: string;
  label: string;
  minutes: number;
}

export interface UnitAllocation {
  totalMinutes: number;
  totalUnits: number;
  perCode: { code: string; label: string; minutes: number; units: number }[];
}

/**
 * Allocate billable units across timed codes per the CMS method:
 * total units come from total timed minutes; each code first gets one unit
 * per full 15 minutes, then leftover units go to the codes with the most
 * remaining minutes.
 */
export function allocateUnits(codes: TimedCode[]): UnitAllocation {
  const active = codes.filter((c) => c.minutes > 0);
  const totalMinutes = active.reduce((s, c) => s + c.minutes, 0);
  const totalUnits = unitsForMinutes(totalMinutes);
  const perCode = active.map((c) => ({
    ...c,
    units: Math.floor(c.minutes / 15),
    remainder: c.minutes % 15,
  }));
  let assigned = perCode.reduce((s, c) => s + c.units, 0);
  const byRemainder = [...perCode].sort(
    (a, b) => b.remainder - a.remainder || b.minutes - a.minutes,
  );
  let i = 0;
  while (assigned < totalUnits && byRemainder.length > 0) {
    const target = byRemainder[i % byRemainder.length];
    if (target) target.units += 1;
    assigned += 1;
    i += 1;
  }
  // Sum of per-code floors never exceeds floor(total/15) <= totalUnits, so no
  // trimming is needed.
  return {
    totalMinutes,
    totalUnits,
    perCode: perCode.map(({ remainder: _r, ...c }) => c),
  };
}

export interface GoalParts {
  timeframe: string;
  skill: string;
  condition: string;
  criterion: string;
  purpose: string;
}

/** Assemble a SMART goal sentence. Uses "[Child]" so no names are needed. */
export function buildGoal(p: GoalParts): string {
  const parts = [
    p.timeframe.trim() ? `Within ${p.timeframe.trim()},` : "",
    "[Child] will",
    p.skill.trim() || "[skill]",
    p.condition.trim(),
    p.criterion.trim(),
  ].filter(Boolean);
  let sentence = parts.join(" ");
  if (p.purpose.trim()) sentence += ` in order to ${p.purpose.trim()}`;
  return sentence.replace(/\s+/g, " ").trim().replace(/[.\s]*$/, ".");
}

export function formatAge(a: AgeParts): string {
  if (a.totalDays < 0) return `${Math.abs(a.totalDays)} days before due date`;
  const mo = `${a.months} mo`;
  return a.days ? `${mo} ${a.days} d` : mo;
}
