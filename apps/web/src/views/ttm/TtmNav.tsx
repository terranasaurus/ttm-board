import Link from "next/link";
import { useRouter } from "next/router";
import {
  HiOutlineDocumentText,
  HiOutlineSquares2X2,
  HiOutlineWrenchScrewdriver,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { useIsMobile } from "~/hooks/useMediaQuery";

const ITEMS = [
  { name: "My work", href: "/my-work", Icon: HiOutlineSquares2X2 },
  { name: "Docs", href: "/docs", Icon: HiOutlineDocumentText },
  { name: "Clinician Toolbox", href: "/toolbox", Icon: HiOutlineWrenchScrewdriver },
];

/** TTM-specific sidebar section, rendered under Kan's own navigation. */
export default function TtmNav({
  isCollapsed,
  onCloseSideNav,
}: {
  isCollapsed: boolean;
  onCloseSideNav?: () => void;
}) {
  const { pathname } = useRouter();
  const isMobile = useIsMobile();

  return (
    <div className="mt-4">
      {!isCollapsed && (
        <div className="mb-1 px-1.5 text-[11px] font-semibold uppercase tracking-wide text-light-800 dark:text-dark-800">
          TTM
        </div>
      )}
      <ul role="list" className="space-y-1">
        {ITEMS.map(({ name, href, Icon }) => {
          const current = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={() => isMobile && onCloseSideNav?.()}
                title={isCollapsed ? name : undefined}
                className={twMerge(
                  "flex h-[34px] items-center gap-x-3 rounded-md p-1.5 text-sm leading-6 hover:bg-light-200 hover:text-light-1000 dark:hover:bg-dark-200 dark:hover:text-dark-1000",
                  isCollapsed && "md:justify-center",
                  current
                    ? "bg-light-200 text-light-1000 dark:bg-dark-200 dark:text-dark-1000"
                    : "text-neutral-600 dark:text-dark-900",
                )}
              >
                <Icon className={twMerge("h-[18px] w-[18px] shrink-0", current && "text-ttm-orange")} />
                <span className={twMerge(isCollapsed && "md:hidden")}>{name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
