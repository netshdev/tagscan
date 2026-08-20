import { HomeLink } from "@/components/HomeLink";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Also the escape hatch: cancels a running scan and clears the result. */}
        <HomeLink className="flex shrink-0 items-center gap-2 rounded-md text-sm font-semibold text-fg transition-opacity hover:opacity-80">
          <span
            className="grid size-6 place-items-center rounded-md bg-accent text-on-accent"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
              <path d="m21 21-4.3-4.3" />
              <circle cx="11" cy="11" r="7" />
            </svg>
          </span>
          {/* Product name shouldn't be machine-translated. */}
          <span translate="no">TagScan</span>
        </HomeLink>

        <div className="flex items-center gap-1.5">
          <a
            href="https://ogp.me/"
            target="_blank"
            rel="noreferrer noopener"
            className="hidden rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:text-fg sm:inline-flex"
          >
            Open Graph Spec
          </a>
          <a
            href="https://developer.x.com/en/docs/x-for-websites/cards/overview/abouts-cards"
            target="_blank"
            rel="noreferrer noopener"
            className="hidden rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:text-fg sm:inline-flex"
          >
            X Cards
          </a>
          <ThemeToggle className="ml-1" />
        </div>
      </div>
    </header>
  );
}
