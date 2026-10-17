import { HiArrowTopRightOnSquare } from "react-icons/hi2";

import { Card } from "../ui";

const LINKS: { group: string; items: { label: string; href: string; note?: string }[] }[] = [
  {
    group: "Our products",
    items: [
      { label: "MilestonesHEP", href: "https://www.milestoneshep.com", note: "Assign home programs" },
      { label: "Milestones Made Simple", href: "https://www.milestonesmadesimple.com", note: "Parent app" },
    ],
  },
  {
    group: "Development references",
    items: [
      { label: "CDC: Learn the Signs. Act Early.", href: "https://www.cdc.gov/act-early/", note: "Milestone checklists & tracker app" },
      { label: "APTA Pediatrics", href: "https://pediatricapta.org", note: "Fact sheets, CPGs" },
      { label: "ABPTS specialist certification", href: "https://specialization.apta.org", note: "PCS requirements" },
    ],
  },
  {
    group: "Measures (link only)",
    items: [
      { label: "GMFCS-E&R (CanChild)", href: "https://canchild.ca/resources/42-gmfcs-e-r/", note: "© CanChild; use the official descriptors" },
      { label: "Rehabilitation Measures Database", href: "https://www.sralab.org/rehabilitation-measures", note: "Norms, MCIDs and forms (Shirley Ryan AbilityLab)" },
      { label: "CMT clinical practice guideline (2024)", href: "https://doi.org/10.1097/PEP.0000000000001114", note: "APTA Pediatrics; members get full text" },
    ],
  },
  {
    group: "Billing & compliance",
    items: [
      {
        label: "CMS Claims Manual, Ch. 5 (therapy services)",
        href: "https://www.cms.gov/regulations-and-guidance/guidance/manuals/downloads/clm104c05.pdf",
        note: "Timed codes / 8-minute rule",
      },
    ],
  },
];

export function QuickLinks() {
  return (
    <Card id="links" title="Quick links">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {LINKS.map((g) => (
          <div key={g.group}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-light-900 dark:text-dark-900">
              {g.group}
            </h3>
            <ul className="space-y-2">
              {g.items.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-start gap-1 text-sm font-semibold text-ttm-green hover:text-ttm-orange dark:text-dark-1000 dark:hover:text-ttm-orange"
                  >
                    {l.label}
                    <HiArrowTopRightOnSquare className="mt-0.5 h-3.5 w-3.5 opacity-60" />
                  </a>
                  {l.note && (
                    <div className="text-xs text-light-900 dark:text-dark-900">{l.note}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
