import { PageHead } from "~/components/PageHead";
import { PageShell, PrivacyNote } from "../ui";
import { BillingUnits } from "./BillingUnits";
import { CorrectedAge } from "./CorrectedAge";
import { EvalComplexity } from "./EvalComplexity";
import { GoalBuilder } from "./GoalBuilder";
import { OutcomeMeasures } from "./measures";
import { Milestones } from "./Milestones";
import { QuickLinks } from "./QuickLinks";

const SECTIONS = [
  { id: "corrected-age", label: "Corrected age" },
  { id: "measures", label: "Outcome measures" },
  { id: "milestones", label: "Milestones" },
  { id: "goal-builder", label: "Goal builder" },
  { id: "billing-units", label: "Billing units" },
  { id: "eval-codes", label: "Eval codes" },
  { id: "links", label: "Links" },
];

export default function ToolboxView() {
  return (
    <>
      <PageHead title="Clinician Toolbox | TTM Portal" />
      <PageShell
        title="Clinician Toolbox"
        subtitle="Calculators, free outcome measures and references for pediatric PT sessions."
      >
        <PrivacyNote>
          <strong>Nothing here is saved or sent.</strong> Every tool runs in your browser and forgets when you leave the page. Don't type names or other identifiers; patient details stay in the EMR and Drive.
        </PrivacyNote>
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
          <CorrectedAge />
          <OutcomeMeasures />
          <Milestones />
          <GoalBuilder />
          <BillingUnits />
          <EvalComplexity />
          <QuickLinks />
        </div>
      </PageShell>
    </>
  );
}
