import { useState } from "react";
import { twMerge } from "tailwind-merge";

import { SourceNote } from "./shared";

const GRADES = [
  { grade: "0", text: "No increase in muscle tone." },
  {
    grade: "1",
    text: "Slight increase in tone: a catch and release, or minimal resistance at the end of the range when the part is moved into flexion or extension.",
  },
  {
    grade: "1+",
    text: "Slight increase in tone: a catch, followed by minimal resistance through the rest (less than half) of the range.",
  },
  { grade: "2", text: "More marked increase in tone through most of the range, but the part is still easily moved." },
  { grade: "3", text: "Considerable increase in tone; passive movement is difficult." },
  { grade: "4", text: "Affected part is rigid in flexion or extension." },
];

export function Ashworth() {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div>
      <p className="mb-3 text-sm text-light-900 dark:text-dark-900">
        Move the limb through its full range over about one second, child relaxed and positioned the same way each time. Tap a grade to
        copy its wording.
      </p>
      <ul className="space-y-2">
        {GRADES.map((g) => (
          <li key={g.grade}>
            <button
              type="button"
              onClick={() => {
                setPicked(g.grade);
                void navigator.clipboard.writeText(`MAS ${g.grade}: ${g.text}`).catch(() => undefined);
              }}
              className={twMerge(
                "flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left text-sm",
                picked === g.grade
                  ? "border-ttm-green bg-ttm-green/10 dark:border-ttm-gold dark:bg-ttm-gold/10"
                  : "border-light-500 hover:border-ttm-orange dark:border-dark-500",
              )}
            >
              <span className="w-8 shrink-0 font-extrabold tabular-nums text-ttm-green dark:text-ttm-gold">{g.grade}</span>
              <span className="text-light-1000 dark:text-dark-1000">{g.text}</span>
            </button>
          </li>
        ))}
      </ul>
      {picked && <p className="mt-2 text-xs text-light-900 dark:text-dark-900">Copied MAS {picked} to the clipboard.</p>}
      <SourceNote>
        Bohannon RW & Smith MB, Phys Ther 1987;67(2):206–7. Grade definitions paraphrased. Free to use. Reliability in young children is
        modest, so pair it with a velocity-dependent measure (e.g., Modified Tardieu) when tone drives decisions.
      </SourceNote>
    </div>
  );
}
