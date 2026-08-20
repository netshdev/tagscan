"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAppReset } from "@/components/AppReset";

/**
 * The header logo, doubling as "get me out of here".
 *
 * When the app is mounted it resets in place - cancelling any running scan and
 * clearing the result - instead of navigating. That's both faster than a round
 * trip and the only version that actually stops the scan. Anywhere else (the
 * not-found page, say) there is nothing registered, so this stays an ordinary
 * link and Cmd-click, middle-click, and "open in new tab" keep working.
 */
export function HomeLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const appReset = useAppReset();

  return (
    <Link
      href="/"
      className={className}
      onClick={(event) => {
        // Never hijack a modified click - the user is asking for a new tab.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (event.button !== 0) return;

        if (appReset?.reset()) event.preventDefault();
      }}
    >
      {children}
    </Link>
  );
}
