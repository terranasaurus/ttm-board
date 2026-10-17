import { twMerge } from "tailwind-merge";

/** Source + licence line shown under every measure. */
export function SourceNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 border-t border-light-300 pt-3 text-xs text-light-900 dark:border-dark-300 dark:text-dark-900">
      {children}
    </p>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      className={twMerge(
        "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm",
        checked
          ? "border-ttm-green bg-ttm-green/10 text-light-1000 dark:border-ttm-gold dark:bg-ttm-gold/10 dark:text-dark-1000"
          : "border-light-500 text-light-950 dark:border-dark-500 dark:text-dark-950",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-light-600 text-ttm-green focus:ring-ttm-orange"
      />
      {label}
    </label>
  );
}

/** Segmented 0…n picker for item-scored scales. */
export function ScorePicker({
  value,
  onChange,
  options,
  label,
}: {
  value: number | null;
  onChange: (v: number) => void;
  options: { value: number; label?: string }[];
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-1.5">
      {label && <span className="min-w-0 flex-1 text-sm text-light-1000 dark:text-dark-1000">{label}</span>}
      <div className="inline-flex shrink-0 rounded-md border border-light-600 p-0.5 dark:border-dark-600" role="radiogroup" aria-label={label || "Score"}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={twMerge(
              "min-w-[2.25rem] rounded px-2 py-1 text-xs font-semibold tabular-nums",
              value === o.value
                ? "bg-ttm-green text-white dark:bg-ttm-gold dark:text-dark-50"
                : "text-light-950 hover:bg-light-200 dark:text-dark-950 dark:hover:bg-dark-200",
            )}
          >
            {o.label ?? o.value}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Callout({ tone = "info", children }: { tone?: "info" | "flag"; children: React.ReactNode }) {
  return (
    <div
      className={twMerge(
        "mt-4 rounded-md border px-4 py-3 text-sm",
        tone === "flag"
          ? "border-ttm-orange/50 bg-ttm-orange/10 text-light-1000 dark:text-dark-1000"
          : "border-light-500 bg-light-100 text-light-1000 dark:border-dark-400 dark:bg-dark-200 dark:text-dark-1000",
      )}
    >
      {children}
    </div>
  );
}

export const extLink = "font-semibold text-ttm-green underline hover:text-ttm-orange dark:text-dark-1000";
