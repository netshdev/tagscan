/**
 * Renders an absolute time in the *viewer's* locale.
 *
 * The server formats with its own locale and the client with the browser's, which
 * legitimately differ - this is the narrow case `suppressHydrationWarning` exists
 * for. The machine-readable value in `dateTime` is identical on both sides, so
 * nothing that matters diverges.
 */
export function Timestamp({ iso, className }: { iso: string; className?: string }) {
  const date = new Date(iso);

  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)}
    </time>
  );
}
