/**
 * Theme resolution happens in a blocking inline script in <head> so the correct
 * palette is painted on the first frame - reading localStorage from an effect
 * would flash the wrong theme on every load.
 *
 * Storage is a single versioned key holding one short string. Bumping the
 * version suffix retires old values instead of migrating them.
 */
export const THEME_STORAGE_KEY = "mt.theme.v1";

export type ThemeChoice = "light" | "dark" | "system";

/** Matches the resolved `--bg` token in globals.css for each theme. */
export const THEME_BG = {
  light: "#fdfdfe",
  dark: "#1a1b21",
} as const;

/**
 * Runs before first paint. Kept as a hand-minified string because it ships
 * inline on every page - and deliberately wrapped in try/catch since
 * localStorage throws outright in some privacy modes.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k="${THEME_STORAGE_KEY}",s=localStorage.getItem(k),m=window.matchMedia("(prefers-color-scheme: dark)").matches,d=s==="dark"||(s!=="light"&&m),e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light";var t=document.querySelector('meta[name="theme-color"]');if(t)t.setAttribute("content",d?"${THEME_BG.dark}":"${THEME_BG.light}")}catch(_){}})()`;
