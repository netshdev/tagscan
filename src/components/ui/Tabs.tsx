"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabItem {
  value: string;
  label: string;
  icon?: ReactNode;
  /** Optional trailing annotation, e.g. an issue count. */
  badge?: ReactNode;
}

interface TabsProps {
  items: ReadonlyArray<TabItem>;
  value: string;
  onChange: (value: string) => void;
  /** Accessible name for the tablist - required, since tabs have no heading. */
  label: string;
  className?: string;
}

/**
 * Roving-tabindex tablist: exactly one tab is tabbable, and Arrow/Home/End move
 * selection within it. Controlled so the parent can mirror the active tab into
 * the URL and keep the view deep-linkable.
 */
export function Tabs({ items, value, onChange, label, className }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  function focusTab(index: number) {
    const wrapped = (index + items.length) % items.length;
    const next = items[wrapped];
    if (!next) return;
    onChange(next.value);
    listRef.current
      ?.querySelector<HTMLButtonElement>(`[data-tab="${CSS.escape(next.value)}"]`)
      ?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const current = items.findIndex((i) => i.value === value);
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusTab(current + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusTab(current - 1);
        break;
      case "Home":
        event.preventDefault();
        focusTab(0);
        break;
      case "End":
        event.preventDefault();
        focusTab(items.length - 1);
        break;
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      // Wraps rather than scrolls: with nine platforms a horizontal scroller
      // hides the last tabs behind an easily-missed affordance.
      className={cn("flex flex-wrap gap-1 rounded-lg bg-surface-sunken p-1", className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            data-tab={item.value}
            aria-selected={active}
            aria-controls={`panel-${item.value}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={cn(
              // A border is always present, just transparent when inactive, so
              // selection never shifts the layout - which matters here because
              // the strip wraps onto a second row.
              "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium",
              "transition-[background-color,border-color,color,box-shadow] duration-150",
              active
                ? "border-border-strong bg-surface-selected text-fg shadow-xs"
                : "border-transparent text-muted hover:bg-surface/60 hover:text-fg",
            )}
          >
            {item.icon ? (
              <span aria-hidden="true" className="grid size-3.5 place-items-center">
                {item.icon}
              </span>
            ) : null}
            {item.label}
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      tabIndex={0}
      className={cn("focus-visible:outline-none", className)}
    >
      {children}
    </div>
  );
}
