import Link from "next/link";
import { NotFoundForm } from "@/components/NotFoundForm";

/**
 * Most traffic here is someone opening a link that was shared with them, so the
 * copy leads with why that link can't work rather than a bare "404". The form
 * turns the dead end into the one action worth taking.
 */
export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28"
    >
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted shadow-xs">
        <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
        Nothing here
      </span>

      <h1 className="mt-6 text-pretty text-3xl font-bold tracking-tight text-fg sm:text-4xl">
        This page doesn&rsquo;t exist
      </h1>

      <p className="mt-4 max-w-xl text-pretty text-sm leading-relaxed text-muted sm:text-base">
        If someone sent you this link expecting to show you a result, it was never
        going to load. TagScan doesn&rsquo;t store scans - a result lives only in the
        browser tab that ran it, so there is nothing at a shared address to fetch.
      </p>

      <p className="mt-3 max-w-xl text-pretty text-sm leading-relaxed text-subtle">
        The good news is that running it yourself takes a few seconds, and you get
        live data rather than a snapshot of whatever the page looked like when they
        scanned it.
      </p>

      <div className="mt-8 w-full max-w-md">
        <NotFoundForm />
      </div>

      <Link
        href="/"
        className="mt-6 text-xs font-medium text-muted underline decoration-border underline-offset-4 transition-colors hover:text-fg hover:decoration-current"
      >
        Or go to the homepage
      </Link>
    </main>
  );
}
