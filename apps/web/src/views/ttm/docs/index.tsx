import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { HiOutlineDocumentText, HiOutlinePlusSmall } from "react-icons/hi2";
import { MdPushPin } from "react-icons/md";

import Button from "~/components/Button";
import { PageHead } from "~/components/PageHead";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { Card, PageShell } from "../ui";
import { DOC_TEMPLATES } from "./templates";

export const relativeTime = (d: Date) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export default function DocsListView() {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const [creating, setCreating] = useState<string | null>(null);

  const { data: docs, isLoading, error } = api.ttmDoc.list.useQuery(
    { workspacePublicId: workspace.publicId },
    { enabled: !!workspace.publicId },
  );
  const create = api.ttmDoc.create.useMutation({
    onSuccess: ({ publicId }) => router.push(`/docs/${publicId}`),
    onSettled: () => setCreating(null),
  });

  const newDoc = (key: string) => {
    const tpl = DOC_TEMPLATES.map((f) => f()).find((t) => t.key === key);
    if (!tpl) return;
    setCreating(key);
    create.mutate({ workspacePublicId: workspace.publicId, title: tpl.title, content: tpl.content });
  };

  return (
    <>
      <PageHead title={`Docs | ${workspace.name}`} />
      <PageShell
        title="Docs"
        subtitle={
          <>
            SOPs, onboarding, meeting notes and anything else the team should be able to find. Shared with everyone in <strong>{workspace.name}</strong>. Keep patient details in Drive and link to them.
          </>
        }
        actions={
          <Button
            variant="primary"
            iconLeft={<HiOutlinePlusSmall className="h-4 w-4" />}
            isLoading={creating === "blank"}
            onClick={() => newDoc("blank")}
          >
            New doc
          </Button>
        }
      >
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-light-900 dark:text-dark-900">
            Start from
          </span>
          {DOC_TEMPLATES.map((f) => f())
            .filter((t) => t.key !== "blank")
            .map((t) => (
              <button
                key={t.key}
                type="button"
                disabled={!!creating}
                onClick={() => newDoc(t.key)}
                className="rounded-full border border-light-600 px-3 py-1 text-xs font-semibold text-light-950 hover:border-ttm-orange hover:text-ttm-orange disabled:opacity-50 dark:border-dark-600 dark:text-dark-950"
              >
                {creating === t.key ? "Creating…" : t.label}
              </button>
            ))}
        </div>

        <Card>
          {isLoading ? (
            <p className="text-sm text-light-900 dark:text-dark-900">Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-600 dark:text-red-400">Couldn't load docs: {error.message}</p>
          ) : !docs?.length ? (
            <div className="py-10 text-center">
              <HiOutlineDocumentText className="mx-auto h-8 w-8 text-light-800 dark:text-dark-800" />
              <p className="mt-2 text-sm text-light-900 dark:text-dark-900">
                No docs yet. Start with a template above.
              </p>
            </div>
          ) : (
            <ul className="-mx-2 divide-y divide-light-300 dark:divide-dark-300">
              {docs.map((d) => (
                <li key={d.publicId}>
                  <Link
                    href={`/docs/${d.publicId}`}
                    className="group flex items-center justify-between gap-4 rounded-md px-2 py-3 hover:bg-light-200 dark:hover:bg-dark-200"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {d.isPinned ? (
                        <MdPushPin className="h-4 w-4 shrink-0 text-ttm-orange" aria-label="Pinned" />
                      ) : (
                        <HiOutlineDocumentText className="h-4 w-4 shrink-0 text-light-800 dark:text-dark-800" />
                      )}
                      <span className="truncate text-sm font-semibold text-light-1000 group-hover:text-ttm-green dark:text-dark-1000">
                        {d.title}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-light-900 dark:text-dark-900">
                      {relativeTime(d.updatedAt)}
                      {d.updatedByName ? ` · ${d.updatedByName}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </PageShell>
    </>
  );
}
