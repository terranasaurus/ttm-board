import { twMerge } from "tailwind-merge";

/**
 * TTM Portal logo lockup: the TTM icon plus the "TTM Portal" wordmark.
 * The icon swaps to the white-figure variant in dark mode.
 *
 * The `lg` size (login, signup, 404) renders the official
 * "Terran Through Milestones" lockup from the TTM Brand Package
 * (`/ttm-logo.svg`, `/ttm-logo-on-dark.svg`) instead of the compact mark.
 */
export const BrandMark = ({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) => {
  if (size === "lg") {
    return (
      <span className={twMerge("inline-flex items-center", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/ttm-logo.svg"
          alt="Terran Through Milestones"
          className="h-28 w-auto dark:hidden"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/ttm-logo-on-dark.svg"
          alt="Terran Through Milestones"
          className="hidden h-28 w-auto dark:block"
        />
      </span>
    );
  }

  const icon = size === "md" ? "h-9 w-9" : "h-7 w-7";
  const text = size === "md" ? "text-lg" : "text-[16px]";

  return (
    <span className={twMerge("inline-flex items-center gap-2", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/ttm-icon.svg"
        alt=""
        className={twMerge(icon, "dark:hidden")}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/ttm-icon-on-dark.svg"
        alt=""
        className={twMerge(icon, "hidden dark:block")}
      />
      <span
        className={twMerge(
          text,
          "font-extrabold tracking-tight text-ttm-green dark:text-dark-1000",
        )}
      >
        TTM <span className="text-ttm-orange">Portal</span>
      </span>
    </span>
  );
};

export default BrandMark;
