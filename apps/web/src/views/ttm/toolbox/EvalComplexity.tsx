import { Card } from "../ui";

// Our own summary of the PT evaluation code levels (not AMA CPT descriptor
// text). Always confirm against current CPT and payer policy.
const ROWS = [
  {
    aspect: "History: personal factors / comorbidities affecting the plan of care",
    low: "None",
    moderate: "1–2",
    high: "3 or more",
  },
  {
    aspect: "Examination: elements addressed (body structures & functions, activity limitations, participation restrictions)",
    low: "1–2",
    moderate: "3 or more",
    high: "4 or more",
  },
  {
    aspect: "Clinical presentation",
    low: "Stable, uncomplicated",
    moderate: "Evolving, changing characteristics",
    high: "Unstable, unpredictable",
  },
  {
    aspect: "Clinical decision-making (standardized tools / measurable functional assessment)",
    low: "Low complexity",
    moderate: "Moderate complexity",
    high: "High complexity",
  },
];

export function EvalComplexity() {
  return (
    <Card
      id="eval-codes"
      title="PT evaluation code levels"
      description="Pick the level that every row supports. The lowest row sets the code. Our own summary, not CPT descriptor text; confirm against current CPT and payer policy."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-light-500 text-xs uppercase tracking-wide text-light-900 dark:border-dark-400 dark:text-dark-900">
              <th className="py-2 pr-3 font-semibold">Component</th>
              <th className="py-2 pr-3 font-semibold">97161 · Low</th>
              <th className="py-2 pr-3 font-semibold">97162 · Moderate</th>
              <th className="py-2 font-semibold">97163 · High</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.aspect} className="border-b border-light-300 align-top dark:border-dark-300">
                <td className="py-2 pr-3 text-light-950 dark:text-dark-950">{r.aspect}</td>
                <td className="py-2 pr-3 font-medium text-light-1000 dark:text-dark-1000">{r.low}</td>
                <td className="py-2 pr-3 font-medium text-light-1000 dark:text-dark-1000">{r.moderate}</td>
                <td className="py-2 font-medium text-light-1000 dark:text-dark-1000">{r.high}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-light-900 dark:text-dark-900">
        <span className="font-mono font-semibold">97164</span>: re-evaluation. Use it when there's a new clinical finding, a significant change, or no response to the plan of care, and update the plan.
      </p>
    </Card>
  );
}
