import { twMerge } from "tailwind-merge";

/** Shared building blocks for TTM-specific pages (toolbox, my work, docs). */

export const inputClass =
  "block w-full rounded-md border border-light-600 bg-light-50 px-3 py-2 text-sm text-light-1000 shadow-sm placeholder:text-light-800 focus:border-ttm-orange focus:ring-1 focus:ring-ttm-orange dark:border-dark-600 dark:bg-dark-200 dark:text-dark-1000 dark:placeholder:text-dark-800";

export function PageShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="m-auto h-full max-w-[1100px] overflow-y-auto px-4 py-6 sm:px-6 md:px-16 md:py-12">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight text-light-1000 dark:text-dark-1000">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 max-w-2xl text-sm text-light-900 dark:text-dark-900">
              {subtitle}
            </p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function Card({
  title,
  description,
  children,
  className,
  id,
}: {
  title?: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={twMerge(
        "min-w-0 rounded-lg border border-light-500 bg-light-50 p-4 sm:p-5 dark:border-dark-400 dark:bg-dark-100",
        className,
      )}
    >
      {title && (
        <h2 className="text-base font-bold text-light-1000 dark:text-dark-1000">
          {title}
        </h2>
      )}
      {description && (
        <p className="mt-1 text-sm text-light-900 dark:text-dark-900">
          {description}
        </p>
      )}
      <div className={title || description ? "mt-4" : undefined}>{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-light-900 dark:text-dark-900">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-xs text-light-800 dark:text-dark-800">
          {hint}
        </span>
      )}
    </label>
  );
}

export function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "accent" | "muted";
}) {
  return (
    <div className="rounded-md border border-light-500 bg-light-100 px-4 py-3 dark:border-dark-400 dark:bg-dark-200">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-light-900 dark:text-dark-900">
        {label}
      </div>
      <div
        className={twMerge(
          "mt-1 text-lg font-extrabold tabular-nums",
          tone === "accent" && "text-ttm-orange",
          tone === "muted" && "text-light-900 dark:text-dark-900",
          tone === "default" && "text-light-1000 dark:text-dark-1000",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function PrivacyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-md border border-ttm-gold/50 bg-ttm-gold/10 px-4 py-3 text-sm text-light-1000 dark:text-dark-1000">
      {children}
    </div>
  );
}
