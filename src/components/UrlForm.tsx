"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

const EXAMPLES = ["stripe.com", "vercel.com", "github.com"] as const;

interface Props {
  onSubmit: (url: string) => void;
  pending: boolean;
  /** Prefills after a shared report is opened, so re-running is one click. */
  initialValue?: string;
  size?: "hero" | "compact";
}

export function UrlForm({ onSubmit, pending, initialValue = "", size = "hero" }: Props) {
  const [value, setValue] = useState(initialValue);
  const hero = size === "hero";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed && !pending) onSubmit(trimmed);
  }

  return (
    <div className={hero ? "w-full max-w-xl" : "w-full"}>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <span
            className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${
              pending ? "text-subtle" : "text-muted"
            }`}
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="size-4">
              <circle cx="12" cy="12" r="9" />
              <path d="M3.6 9h16.8M3.6 15h16.8" />
              <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" />
            </svg>
          </span>

          <label htmlFor="inspect-url" className="sr-only">
            Website URL to inspect
          </label>
          {/* Locked while a scan runs, so the field can't disagree with the URL
              actually being scanned - the submit button alone going quiet left the
              input looking editable when editing it would change nothing. */}
          <input
            id="inspect-url"
            name="url"
            type="text"
            inputMode="url"
            enterKeyHint="go"
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={pending}
            placeholder="example.com"
            className={`w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-fg shadow-xs transition-[border-color,box-shadow,opacity] duration-150 placeholder:text-subtle hover:border-border-strong focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent/20 disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-70 ${
              hero ? "h-12 text-[0.9375rem]" : "h-10 text-sm"
            }`}
          />
        </div>

        {/* Stays enabled until the request starts, then shows progress in place. */}
        <Button type="submit" variant="primary" size={hero ? "lg" : "md"} pending={pending}>
          {pending ? "Inspecting…" : "Inspect"}
        </Button>
      </form>

      {hero ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>Try</span>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setValue(example);
                if (!pending) onSubmit(example);
              }}
              disabled={pending}
              className="rounded-full border border-border bg-surface px-2.5 py-1 font-medium transition-colors duration-150 hover:border-border-strong hover:text-fg disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
