"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Resets scroll position whenever the route (pathname) changes.
 * If you have a custom scroll container, mark it with data-scroll-root.
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Reset window scroll (default browser scroll)
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }

    // If you use a scrollable shell container, reset that too
    const scrollRoot =
      document.querySelector<HTMLElement>("[data-scroll-root]");
    if (scrollRoot) {
      scrollRoot.scrollTop = 0;
    }
  }, [pathname]);

  return null;
}
