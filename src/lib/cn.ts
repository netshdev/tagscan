/**
 * Joins class values, dropping falsy ones. No merge/dedupe logic on purpose -
 * components below expose explicit `variant`/`size` props rather than inviting
 * callers to override arbitrary utilities, so conflicts don't arise in practice.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  let out = "";
  for (const part of parts) {
    if (!part) continue;
    out = out ? `${out} ${part}` : part;
  }
  return out;
}
