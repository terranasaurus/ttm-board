import Link from "next/link";
import { env } from "next-runtime-env";
import { HiArrowTopRightOnSquare } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { PageHead } from "~/components/PageHead";
import { Card, PageShell } from "../ui";
import type { ResourceLink } from "./links";
import { EMPLOYEE, LEARNING, LIBRARY, NOTEBOOK_ENV } from "./links";
import { PdFeed } from "./PdFeed";

const SECTIONS = [
  { id: "library", label: "Library" },
  { id: "employee", label: "Employee hub" },
  { id: "notebook", label: "Notebook" },
  { id: "learning", label: "Professional development" },
];

function LinkRow({ l }: { l: ResourceLink }) {
  const soon = l.status === "soon";
  const label = (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
      {l.label}
      {l.href && !l.internal && <HiArrowTopRightOnSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />}
      {soon && (
        <span className="rounded-full bg-light-300 px-2 py-px text-[10px] font-semibold uppercase tracking-wide text-light-900 dark:bg-dark-300 dark:text-dark-900">
          Coming soon
        </span>
      )}
    </span>
  );
  const linkClass =
    "text-ttm-green hover:text-ttm-orange dark:text-dark-1000 dark:hover:text-ttm-orange";
  return (
    <li className="py-2.5">
      {l.href && !soon ? (
        l.internal ? (
          <Link href={l.href} className={linkClass}>
            {label}
          </Link>
        ) : (
          <a href={l.href} target="_blank" rel="noreferrer" className={linkClass}>
            {label}
          </a>
        )
      ) : (
        <span className={twMerge(soon ? "text-light-900 dark:text-dark-900" : "text-light-1000 dark:text-dark-1000")}>
          {label}
        </span>
      )}
      {l.note && <div className="mt-0.5 text-xs text-light-900 dark:text-dark-900">{l.note}</div>}
    </li>
  );
}

function LinkList({ links }: { links: ResourceLink[] }) {
  return (
    <ul className="divide-y divide-light-300 dark:divide-dark-300">
      {links.map((l) => (
        <LinkRow key={l.label} l={l} />
      ))}
    </ul>
  );
}

function Notebook() {
  const url = env(NOTEBOOK_ENV);
  return (
    <Card
      id="notebook"
      title="Ask the TTM notebook"
      description="A NotebookLM notebook built from our training modules and handouts. Ask it questions in plain language and it answers with citations to our own material."
    >
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-ttm-orange px-4 py-2 text-sm font-semibold text-white hover:bg-ttm-orange-hover"
        >
          Open the notebook <HiArrowTopRightOnSquare className="h-4 w-4" />
        </a>
      ) : (
        <div className="text-sm text-light-950 dark:text-dark-950">
          <p className="font-semibold">Not connected yet.</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              In{" "}
              <a href="https://notebooklm.google.com" target="_blank" rel="noreferrer" className="font-semibold text-ttm-green underline dark:text-dark-1000">
                NotebookLM
              </a>
              , create a notebook and add the Training modules and Parent education Drive folders as sources.
            </li>
            <li>Share it with the team (Share → people at terranthroughmilestones.com).</li>
            <li>
              In Vercel, add the environment variable <code className="rounded bg-light-200 px-1 dark:bg-dark-200">{NOTEBOOK_ENV}</code> with the notebook link and redeploy. This card turns into an "Open the notebook" button.
            </li>
          </ol>
        </div>
      )}
      <p className="mt-4 text-xs text-light-900 dark:text-dark-900">
        Training material and handouts only. Don't add documents about a specific child or family unless NotebookLM is covered by TTM's Google Workspace BAA.
      </p>
    </Card>
  );
}

export default function ResourcesView() {
  return (
    <>
      <PageHead title="Resources | TTM Portal" />
      <PageShell
        title="Resources"
        subtitle="Our library, employee links and a professional-development feed, all in one place."
      >
        <nav className="sticky top-0 z-10 mb-6 flex gap-1 overflow-x-auto bg-light-100/90 py-2 backdrop-blur dark:bg-dark-50/90">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold text-light-950 hover:bg-light-300 hover:text-ttm-green dark:text-dark-950 dark:hover:bg-dark-300 dark:hover:text-dark-1000"
            >
              {s.label}
            </a>
          ))}
        </nav>
        <div className="space-y-6 pb-16">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card id={LIBRARY.id} title={LIBRARY.title} description={LIBRARY.description}>
              <LinkList links={LIBRARY.links} />
            </Card>
            <Card id={EMPLOYEE.id} title={EMPLOYEE.title} description={EMPLOYEE.description}>
              <LinkList links={EMPLOYEE.links} />
            </Card>
          </div>
          <Notebook />
          <Card
            id="learning"
            title="Professional development"
            description="New research on the conditions we see most, pulled from PubMed, plus free places to learn."
          >
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <PdFeed />
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-light-900 dark:text-dark-900">
                  Free learning
                </h3>
                <LinkList links={LEARNING} />
              </div>
            </div>
          </Card>
        </div>
      </PageShell>
    </>
  );
}
