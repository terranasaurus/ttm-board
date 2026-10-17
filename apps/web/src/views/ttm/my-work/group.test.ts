import { describe, expect, it } from "vitest";

import type { WorkCard } from "./group";
import { groupWork, isMine } from "./group";

const card = (over: Partial<WorkCard>): WorkCard => ({
  publicId: Math.random().toString(36).slice(2),
  title: "t",
  ref: null,
  dueDate: null,
  labels: [],
  memberEmails: [],
  boardName: "TTM Team",
  boardPublicId: "b",
  listName: "Next",
  ...over,
});
const me = { email: "terran@terranthroughmilestones.com", name: "Terran" };
const now = new Date(2026, 9, 17, 9, 0);

describe("isMine", () => {
  it("matches the @FirstName owner label case-insensitively", () => {
    expect(isMine(card({ labels: [{ name: "@terran", colourCode: null }] }), me)).toBe(true);
    expect(isMine(card({ labels: [{ name: "@Sheila", colourCode: null }] }), me)).toBe(false);
  });
  it("matches card membership by email", () => {
    expect(isMine(card({ memberEmails: ["Terran@TerranThroughMilestones.com"] }), me)).toBe(true);
  });
});

describe("groupWork", () => {
  const cards = [
    card({ title: "late", dueDate: new Date(2026, 9, 15), labels: [{ name: "@Terran", colourCode: null }] }),
    card({ title: "today", dueDate: new Date(2026, 9, 17), labels: [{ name: "@Terran", colourCode: null }] }),
    card({ title: "next month", dueDate: new Date(2026, 10, 20), labels: [{ name: "@Terran", colourCode: null }] }),
    card({ title: "p0 doing", listName: "Doing", labels: [{ name: "P0", colourCode: null }, { name: "@Terran", colourCode: null }] }),
    card({ title: "done late", listName: "Done", dueDate: new Date(2026, 9, 1), labels: [{ name: "@Terran", colourCode: null }] }),
    card({ title: "sheila", listName: "Waiting", labels: [{ name: "@Sheila", colourCode: null }] }),
  ];

  it("buckets my open cards and ignores Done", () => {
    const g = groupWork(cards, { me, onlyMine: true, now });
    expect(g.overdue.map((c) => c.title)).toEqual(["late"]);
    expect(g.dueSoon.map((c) => c.title)).toEqual(["today"]);
    expect(g.p0.map((c) => c.title)).toEqual(["p0 doing"]);
    expect(g.doing.map((c) => c.title)).toEqual(["p0 doing"]);
    expect(g.waiting).toHaveLength(0);
    expect(g.openCount).toBe(4);
  });

  it("includes everyone's cards when onlyMine is off", () => {
    const g = groupWork(cards, { me, onlyMine: false, now });
    expect(g.waiting.map((c) => c.title)).toEqual(["sheila"]);
    expect(g.openCount).toBe(5);
  });
});
