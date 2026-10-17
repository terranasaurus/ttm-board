import Link from "next/link";
import { useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";

import { authClient } from "@kan/auth/client";

import type { WorkCard, WorkGroups } from "./group";
import { PageHead } from "~/components/PageHead";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { Card, PageShell, Stat } from "../ui";
import { groupWork } from "./group";

const SECTIONS: { key: keyof Omit<WorkGroups, "openCount">; title: string; empty: string }[] = [
  { key: "overdue", title: "Overdue", empty: "Nothing overdue." },
  { key: "dueSoon", title: "Due in the next 7 days", empty: "Nothing due this week." },
  { key: "p0", title: "P0: this week's priorities", empty: "No P0 cards." },
  { key: "doing", title: "In progress (Doing)", empty: "Nothing in Doing." },
  { key: "decide", title: "Waiting on a decision (Decide)", empty: "No open decisions." },
  { key: "waiting", title: "Waiting on someone else", empty: "Nothing waiting." },
];

const fmtDue = (d: Date, now: Date) => {
  const days = Math.round(
    (new Date(d).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86400000,
  );
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days < 0) return `${-days} days late`;
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

function CardRow({ c, now }: { c: WorkCard; now: Date }) {
  const late = c.dueDate && c.dueDate.getTime() < new Date(now).setHours(0, 0, 0, 0);
  return (
    <li>
      <Link
        href={`/cards/${c.publicId}`}
        className="group flex items-start justify-between gap-3 rounded-md px-3 py-2 hover:bg-light-200 dark:hover:bg-dark-200"
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-light-1000 group-hover:text-ttm-green dark:text-dark-1000 dark:group-hover:text-dark-1000">
            {c.title}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-light-900 dark:text-dark-900">
            {c.ref && <span className="font-mono">{c.ref}</span>}
            <span>
              {c.boardName} · {c.listName}
            </span>
            {c.labels
              .filter((l) => !l.name.startsWith("@"))
              .slice(0, 3)
              .map((l) => (
                <span
                  key={l.name}
                  className="inline-flex items-center gap-1 rounded-full border border-light-500 px-1.5 py-px dark:border-dark-500"
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: l.colourCode ?? "#b3b3b3" }} />
                  {l.name}
                </span>
              ))}
          </div>
        </div>
        {c.dueDate && (
          <span
            className={twMerge(
              "shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold",
              late
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : "bg-light-300 text-light-950 dark:bg-dark-300 dark:text-dark-950",
            )}
          >
            {fmtDue(c.dueDate, now)}
          </span>
        )}
      </Link>
    </li>
  );
}

export default function MyWorkView() {
  const { workspace } = useWorkspace();
  const { data: session } = authClient.useSession();
  const [onlyMine, setOnlyMine] = useState(true);
  const now = useMemo(() => new Date(), []);

  const { data: boards, isLoading: boardsLoading } = api.board.all.useQuery(
    { workspacePublicId: workspace.publicId },
    { enabled: !!workspace.publicId },
  );
  const boardQueries = api.useQueries((t) =>
    (boards ?? []).map((b) => t.board.byId({ boardPublicId: b.publicId })),
  );
  const loading = boardsLoading || boardQueries.some((q) => q.isLoading);

  const cards: WorkCard[] = useMemo(
    () =>
      boardQueries.flatMap((q) => {
        const b = q.data;
        if (!b) return [];
        return b.lists.flatMap((l) =>
          l.cards.map((c) => ({
            publicId: c.publicId,
            title: c.title,
            ref: c.cardNumber != null ? `${b.workspace.cardPrefix}-${c.cardNumber}` : null,
            dueDate: c.dueDate ? new Date(c.dueDate) : null,
            labels: c.labels.map((x) => ({ name: x.name, colourCode: x.colourCode })),
            memberEmails: c.members.map((m) => m.user?.email ?? m.email),
            boardName: b.name,
            boardPublicId: b.publicId,
            listName: l.name,
          })),
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boardQueries.map((q) => q.dataUpdatedAt).join(",")],
  );

  const groups = useMemo(
    () =>
      groupWork(cards, {
        me: { email: session?.user.email, name: session?.user.name },
        onlyMine,
        now,
      }),
    [cards, session?.user.email, session?.user.name, onlyMine, now],
  );

  const firstName = session?.user.name.split(" ")[0];

  return (
    <>
      <PageHead title="My work | TTM Portal" />
      <PageShell
        title="My work"
        subtitle={
          <>
            Everything open across <strong>{workspace.name}</strong>. “Mine” means cards you're a member of or that carry your owner label
            {firstName ? <> (<span className="font-mono">@{firstName}</span>)</> : null}.
          </>
        }
        actions={
          <div className="inline-flex rounded-md border border-light-600 p-0.5 text-xs font-semibold dark:border-dark-600">
            {[
              { v: true, label: "Mine" },
              { v: false, label: "Everyone" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => setOnlyMine(o.v)}
                className={twMerge(
                  "rounded px-3 py-1.5",
                  onlyMine === o.v
                    ? "bg-ttm-green text-white dark:bg-ttm-orange"
                    : "text-light-950 dark:text-dark-950",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Open" value={loading ? "…" : groups.openCount} />
          <Stat label="Overdue" tone={groups.overdue.length ? "accent" : "default"} value={loading ? "…" : groups.overdue.length} />
          <Stat label="Due this week" value={loading ? "…" : groups.dueSoon.length} />
          <Stat label="P0" value={loading ? "…" : groups.p0.length} />
        </div>
        {loading ? (
          <p className="text-sm text-light-900 dark:text-dark-900">Loading boards…</p>
        ) : (
          <div className="grid gap-5 pb-16 lg:grid-cols-2">
            {SECTIONS.map((s) => (
              <Card key={s.key} title={`${s.title} (${groups[s.key].length})`}>
                {groups[s.key].length ? (
                  <ul className="-mx-3 space-y-0.5">
                    {groups[s.key].map((c) => (
                      <CardRow key={`${s.key}-${c.publicId}`} c={c} now={now} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-light-900 dark:text-dark-900">{s.empty}</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </PageShell>
    </>
  );
}
