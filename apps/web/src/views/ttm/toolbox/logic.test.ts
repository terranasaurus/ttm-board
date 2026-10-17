import { describe, expect, it } from "vitest";

import {
  allocateUnits,
  buildGoal,
  correctedAge,
  diffMonthsDays,
  parseDateInput,
  unitsForMinutes,
} from "./logic";

const d = (s: string) => {
  const v = parseDateInput(s);
  if (!v) throw new Error(`bad date ${s}`);
  return v;
};

describe("diffMonthsDays", () => {
  it("counts whole months and leftover days", () => {
    expect(diffMonthsDays(d("2026-01-15"), d("2026-04-20"))).toMatchObject({ months: 3, days: 5 });
  });
  it("handles month-end birthdays", () => {
    expect(diffMonthsDays(d("2026-01-31"), d("2026-02-28"))).toMatchObject({ months: 1, days: 0 });
  });
});

describe("correctedAge", () => {
  it("subtracts weeks born early for a preterm infant", () => {
    // Born at 32 weeks -> 8 weeks (56 days) early.
    const r = correctedAge(d("2026-01-01"), d("2026-07-01"), 32, 0);
    expect(r.weeksEarly).toBe(8);
    expect(r.chronological.months).toBe(6);
    expect(r.corrected?.months).toBe(4);
    expect(r.shouldCorrect).toBe(true);
  });
  it("does not correct at or after 37 weeks", () => {
    const r = correctedAge(d("2026-01-01"), d("2026-07-01"), 38, 2);
    expect(r.corrected).toBeNull();
  });
  it("stops recommending correction at 24 months chronological", () => {
    const r = correctedAge(d("2024-01-01"), d("2026-02-01"), 30, 0);
    expect(r.shouldCorrect).toBe(false);
  });
  it("flags an assessment date before birth", () => {
    expect(correctedAge(d("2026-05-01"), d("2026-04-01"), 30).error).toBeTruthy();
  });
});

describe("8-minute rule", () => {
  it.each([
    [7, 0], [8, 1], [22, 1], [23, 2], [37, 2], [38, 3], [52, 3], [53, 4], [67, 4], [68, 5],
  ])("%i minutes -> %i units", (min, units) => {
    expect(unitsForMinutes(min)).toBe(units);
  });

  it("allocates the leftover unit to the code with the most remaining minutes", () => {
    // 33 + 7 = 40 min -> 3 units: 97110 gets 2 (30 + 3 remaining), 97530 has 7 remaining.
    const r = allocateUnits([
      { code: "97110", label: "", minutes: 33 },
      { code: "97530", label: "", minutes: 7 },
    ]);
    expect(r.totalUnits).toBe(3);
    expect(r.perCode.find((c) => c.code === "97110")?.units).toBe(2);
    expect(r.perCode.find((c) => c.code === "97530")?.units).toBe(1);
  });

  it("never bills more units than the total allows", () => {
    // Three codes at 7 minutes = 21 min -> 1 unit total.
    const r = allocateUnits([
      { code: "a", label: "", minutes: 7 },
      { code: "b", label: "", minutes: 7 },
      { code: "c", label: "", minutes: 7 },
    ]);
    expect(r.totalUnits).toBe(1);
    expect(r.perCode.reduce((s, c) => s + c.units, 0)).toBe(1);
  });
});

describe("buildGoal", () => {
  it("assembles a sentence with a [Child] placeholder", () => {
    expect(
      buildGoal({
        timeframe: "12 weeks",
        skill: "walk 10 feet independently",
        condition: "on level surfaces",
        criterion: "in 3 of 4 trials",
        purpose: "move between rooms at home",
      }),
    ).toBe(
      "Within 12 weeks, [Child] will walk 10 feet independently on level surfaces in 3 of 4 trials in order to move between rooms at home.",
    );
  });
});
