// Grouping logic for the "My work" page (modelled on Plane's "Your work" and
// OpenProject's "My page"). Pure functions so they can be unit-tested.

export interface WorkCard {
  publicId: string;
  title: string;
  ref: string | null;
  dueDate: Date | null;
  labels: { name: string; colourCode: string | null }[];
  memberEmails: string[];
  boardName: string;
  boardPublicId: string;
  listName: string;
}

export interface Me {
  email?: string | null;
  name?: string | null;
}

export interface WorkGroups {
  overdue: WorkCard[];
  dueSoon: WorkCard[];
  p0: WorkCard[];
  doing: WorkCard[];
  waiting: WorkCard[];
  decide: WorkCard[];
  openCount: number;
}

const DONE_LISTS = new Set(["done", "complete", "completed", "archive"]);
export const isDoneList = (name: string) => DONE_LISTS.has(name.trim().toLowerCase());

/** A card is "mine" if I'm a member or it carries an @FirstName owner label. */
export function isMine(card: WorkCard, me: Me): boolean {
  const email = me.email?.toLowerCase();
  if (email && card.memberEmails.some((e) => e.toLowerCase() === email)) return true;
  const first = me.name?.trim().split(/\s+/)[0]?.toLowerCase();
  if (!first) return false;
  return card.labels.some((l) => l.name.trim().toLowerCase() === `@${first}`);
}

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

const byDue = (a: WorkCard, b: WorkCard) =>
  (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity);

export function groupWork(
  cards: WorkCard[],
  opts: { me: Me; onlyMine: boolean; now?: Date; soonDays?: number },
): WorkGroups {
  const now = opts.now ?? new Date();
  const today = startOfDay(now);
  const soonEnd = today + (opts.soonDays ?? 7) * 24 * 60 * 60 * 1000;

  const open = cards.filter(
    (c) => !isDoneList(c.listName) && (!opts.onlyMine || isMine(c, opts.me)),
  );
  const hasLabel = (c: WorkCard, n: string) =>
    c.labels.some((l) => l.name.trim().toLowerCase() === n);
  const inList = (c: WorkCard, n: string) => c.listName.trim().toLowerCase() === n;

  return {
    overdue: open.filter((c) => c.dueDate && c.dueDate.getTime() < today).sort(byDue),
    dueSoon: open
      .filter((c) => c.dueDate && c.dueDate.getTime() >= today && c.dueDate.getTime() < soonEnd)
      .sort(byDue),
    p0: open.filter((c) => hasLabel(c, "p0")).sort(byDue),
    doing: open.filter((c) => inList(c, "doing") || inList(c, "in progress")).sort(byDue),
    waiting: open.filter((c) => inList(c, "waiting") || inList(c, "blocked")).sort(byDue),
    decide: open.filter((c) => inList(c, "decide")).sort(byDue),
    openCount: open.length,
  };
}
