import { twMerge } from "tailwind-merge";

/**
 * TTM Portal logo lockup: the TTM icon plus the "TTM Portal" wordmark.
 * The icon swaps to the white-figure variant in dark mode.
 */
export const BrandMark = ({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) => {
  const icon = size === "lg" ? "h-16 w-16" : size === "md" ? "h-9 w-9" : "h-7 w-7";
  const text =
    size === "lg" ? "text-2xl" : size === "md" ? "text-lg" : "text-[16px]";

  return (
    <span className={twMerge("inline-flex items-center gap-2", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/ttm-icon.svg" alt="" className={twMerge(icon, "dark:hidden")} />
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
