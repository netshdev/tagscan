"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Soft target vs. hard truncation point, in characters. */
export interface Limit {
  ideal: number;
  max: number;
}

type CounterState = "ok" | "near" | "over";

function counterState(length: number, limit: Limit): CounterState {
  if (length > limit.max) return "over";
  if (length > limit.ideal) return "near";
  return "ok";
}

const COUNTER_TONE: Record<CounterState, string> = {
  ok: "text-subtle",
  near: "text-warning-text",
  over: "text-danger-text",
};

const CONTROL_BASE =
  "w-full bg-surface text-fg placeholder:text-subtle transition-[border-color,box-shadow] duration-150 " +
  "border border-border rounded-lg " +
  "hover:border-border-strong " +
  "focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent/20 " +
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-surface-sunken " +
  "aria-invalid:border-danger aria-invalid:focus:ring-danger/20";

interface ShellProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  /** Right-aligned adornment on the label row (counter, badge, action). */
  meta?: ReactNode;
  children: ReactNode;
}

function FieldShell({ id, label, hint, error, meta, children }: ShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[0.8125rem] font-medium text-fg">
          {label}
        </label>
        {meta}
      </div>

      {children}

      {/* Errors are announced when they appear; static hints are not. */}
      {error ? (
        <p id={`${id}-msg`} role="alert" className="text-xs text-danger-text">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-xs text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Counter({ length, limit }: { length: number; limit: Limit }) {
  const state = counterState(length, limit);
  return (
    <span
      className={cn("tnum text-xs", COUNTER_TONE[state])}
      // Only speak up once the value actually needs attention, otherwise every
      // keystroke would be announced.
      aria-live={state === "over" ? "polite" : "off"}
    >
      {state === "over" ? (
        <>
          {length} / {limit.max} - Too Long
        </>
      ) : (
        <>
          {length} / {limit.ideal}
        </>
      )}
    </span>
  );
}

interface TextFieldProps extends Omit<ComponentProps<"input">, "className" | "id"> {
  label: string;
  hint?: string;
  error?: string;
  limit?: Limit;
  value: string;
}

export function TextField({ label, hint, error, limit, value, ...rest }: TextFieldProps) {
  const id = useId();
  const describedBy = error || hint ? `${id}-msg` : undefined;

  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      meta={limit ? <Counter length={value.length} limit={limit} /> : undefined}
    >
      <input
        id={id}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(CONTROL_BASE, "h-10 px-3 text-sm")}
        {...rest}
      />
    </FieldShell>
  );
}

interface TextAreaFieldProps extends Omit<ComponentProps<"textarea">, "className" | "id"> {
  label: string;
  hint?: string;
  error?: string;
  limit?: Limit;
  value: string;
}

export function TextAreaField({
  label,
  hint,
  error,
  limit,
  value,
  rows = 3,
  ...rest
}: TextAreaFieldProps) {
  const id = useId();
  const describedBy = error || hint ? `${id}-msg` : undefined;

  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      meta={limit ? <Counter length={value.length} limit={limit} /> : undefined}
    >
      <textarea
        id={id}
        value={value}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(CONTROL_BASE, "resize-y px-3 py-2 text-sm leading-relaxed")}
        {...rest}
      />
    </FieldShell>
  );
}

interface SelectFieldProps extends Omit<ComponentProps<"select">, "className" | "id"> {
  label: string;
  hint?: string;
  error?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}

export function SelectField({ label, hint, error, options, ...rest }: SelectFieldProps) {
  const id = useId();
  const describedBy = error || hint ? `${id}-msg` : undefined;

  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(CONTROL_BASE, "h-10 px-3 text-sm")}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
