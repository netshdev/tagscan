"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";

/**
 * The real pipeline in `lib/inspect.ts`, with `until` set to roughly where each
 * step tends to finish on a mid-weight page.
 *
 * These are elapsed-time estimates, not measured progress - the crawl doesn't
 * stream its state back. That's why there's no percentage anywhere here: a
 * progress bar would be inventing precision it doesn't have, whereas a stage list
 * only claims "this is the step we expect to be on", and the final stage stays
 * spinning until the result actually lands rather than sitting at a fake 100%.
 */
const STAGES = [
  { label: "Fetching the page", until: 1_200 },
  { label: "Reading the document head", until: 1_800 },
  { label: "Fetching the social image", until: 4_000 },
  { label: "Running the checks", until: Number.POSITIVE_INFINITY },
] as const;

const TICK_MS = 250;

function StageIcon({ state }: { state: "done" | "active" | "waiting" }) {
  if (state === "done") {
    return (
      <span className="grid size-4 shrink-0 place-items-center rounded-full bg-success-subtle text-success-text">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-2.5">
          <path d="m20 6-11 11-5-5" />
        </svg>
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="motion-safe-spin size-4 shrink-0 rounded-full border-2 border-accent-border border-t-accent" />
    );
  }
  return <span className="size-4 shrink-0 rounded-full border border-border" />;
}

export function ScanProgress({
  url,
  children,
}: {
  url: string;
  /** The URL form, rendered locked - see the note where it's placed below. */
  children?: React.ReactNode;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = performance.now();
    const id = setInterval(() => setElapsed(performance.now() - started), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Derived during render rather than tracked as its own state.
  const activeIndex = Math.max(
    0,
    STAGES.findIndex((stage) => elapsed < stage.until),
  );
  const seconds = Math.floor(elapsed / 1000);

  return (
    <div className="flex flex-col gap-4">
      <Card as="section" className="animate-fade">
        <div className="flex flex-col gap-4 p-4">
          <div className="min-w-0">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-accent-text">
              Scanning
            </p>
            <p className="mt-1 truncate text-base font-semibold text-fg" title={url}>
              {url}
            </p>
            <p className="tnum mt-1 text-xs text-subtle">
              {seconds}s elapsed · most pages finish inside 30s
            </p>

            {/* One live region carrying the current step, so a screen reader hears
                progress without the whole list being re-announced. */}
            <p aria-live="polite" className="sr-only">
              {STAGES[activeIndex].label}
            </p>
          </div>

          {/*
            The form stays mounted and visibly locked rather than being swapped out.
            Removing it would make the page shape change twice - once on submit, once
            on completion - and hiding the field the user just typed into reads as the
            input being lost. Locked-but-present keeps the control continuous from
            before submit through to the result.
          */}
          {children ? <div className="border-t border-border pt-4">{children}</div> : null}
        </div>
      </Card>

      <Card as="section" className="animate-fade">
        <CardHeader>
          <CardTitle>Progress</CardTitle>
          <span className="tnum text-xs text-muted">
            Step {activeIndex + 1} of {STAGES.length}
          </span>
        </CardHeader>

        {/*
          Two columns filled top-to-bottom then across, so the sequence still reads
          in order while using the card's width.

          `grid-cols-none` on the wide layout is load-bearing: leaving the mobile
          `grid-cols-1` in place keeps a `1fr` first track, which swallows the whole
          row and throws the second column against the far edge. Clearing the
          template lets both implicit tracks size to their content, and
          `justify-start` packs them together on the left.
        */}
        <CardBody className="grid grid-cols-1 gap-x-10 gap-y-2.5 sm:grid-flow-col sm:grid-cols-none sm:grid-rows-4 sm:justify-start">
          {STAGES.map((stage, index) => {
            const state =
              index < activeIndex ? "done" : index === activeIndex ? "active" : "waiting";
            return (
              <div key={stage.label} className="flex items-center gap-2.5">
                <StageIcon state={state} />
                <span
                  className={cn(
                    "text-xs transition-colors duration-300",
                    state === "active" && "font-medium text-fg",
                    state === "done" && "text-muted",
                    state === "waiting" && "text-subtle",
                  )}
                >
                  {stage.label}
                </span>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}
