import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-on-accent shadow-[var(--shadow-accent)] hover:bg-accent-hover active:bg-accent-active",
  secondary:
    "border border-border bg-surface text-fg shadow-xs hover:bg-surface-hover hover:border-border-strong",
  ghost: "text-muted hover:bg-surface-hover hover:text-fg",
  danger: "bg-danger text-white hover:brightness-110 active:brightness-95",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs rounded-md",
  md: "h-10 gap-2 px-4 text-sm rounded-lg",
  lg: "h-12 gap-2 px-5 text-[0.9375rem] rounded-xl",
};

interface ButtonProps extends Omit<ComponentProps<"button">, "className"> {
  variant?: Variant;
  size?: Size;
  /** Renders a spinner and blocks input, but keeps the button focusable. */
  pending?: boolean;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  pending = false,
  fullWidth = false,
  className,
  children,
  disabled,
  onClick,
  ...rest
}: ButtonProps) {
  return (
    <button
      // `aria-disabled` over `disabled` while pending: a disabled button drops
      // out of the tab order mid-interaction, stranding keyboard focus.
      aria-disabled={pending || disabled ? true : undefined}
      aria-busy={pending ? true : undefined}
      disabled={disabled && !pending}
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center font-medium",
        "transition-[background-color,border-color,color,filter,opacity] duration-150",
        "aria-disabled:cursor-not-allowed aria-disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
      onClick={pending || disabled ? undefined : onClick}
    >
      {pending ? (
        <span
          className="motion-safe-spin size-3.5 rounded-full border-[1.5px] border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  );
}
