"use client";

import { THEME_BG, THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Deliberately stateless. The current theme lives in a class on <html> (set
 * pre-paint by THEME_INIT_SCRIPT), and which icon shows is decided by CSS
 * `dark:` variants - so there is nothing for React to hydrate and therefore no
 * mismatch and no first-frame flicker.
 *
 * Both labels render; the inactive one is `display:none`, which screen readers
 * skip, so the button always announces exactly one accurate action.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  function toggle() {
    const el = document.documentElement;
    const nowDark = !el.classList.contains("dark");

    el.classList.toggle("dark", nowDark);
    el.style.colorScheme = nowDark ? "dark" : "light";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", nowDark ? THEME_BG.dark : THEME_BG.light);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, nowDark ? "dark" : "light");
    } catch {
      // Private-mode storage denial shouldn't break the toggle for this session.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-fg ${className}`}
    >
      <span className="sr-only dark:hidden">Switch to Dark Theme</span>
      <span className="sr-only hidden dark:inline">Switch to Light Theme</span>

      {/* Sun shows in light mode - the icon names the current state. */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        className="size-4 dark:hidden"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
      </svg>

      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="hidden size-4 dark:block"
        aria-hidden="true"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
    </button>
  );
}
