import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppResetProvider } from "@/components/AppReset";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { THEME_BG, THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Absolute base for every generated URL in metadata - notably the per-report
 * `og:image`.
 *
 * Without it Next derives the origin from the incoming request, which silently
 * produces the wrong scheme or host behind a proxy that doesn't forward
 * `x-forwarded-*`. Since the whole point of a share link is that a crawler on
 * someone else's infrastructure can fetch that image, it's worth pinning.
 * Falling through to `undefined` keeps the request-derived behaviour in local dev.
 */
function resolveMetadataBase(): URL | undefined {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);

  return undefined;
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: {
    default: "TagScan - Preview, Edit & Audit Your Meta Tags",
    template: "%s · TagScan",
  },
  description:
    "Paste a URL to see its real Google, X, Facebook, LinkedIn, Slack, Discord, WhatsApp, Telegram, Mastodon, Bluesky, and Pinterest cards. Edit any tag live, audit what's broken, and copy the code for your framework.",
  applicationName: "TagScan",
  openGraph: {
    type: "website",
    siteName: "TagScan",
    title: "TagScan - Preview, Edit & Audit Your Meta Tags",
    description:
      "See exactly how your link looks everywhere you share it, then fix it in place.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TagScan - Preview, Edit & Audit Your Meta Tags",
    description:
      "See exactly how your link looks everywhere you share it, then fix it in place.",
  },
  robots: { index: true, follow: true },
};

// themeColor belongs on the viewport export, not metadata - it's been deprecated
// there since Next 14. Both entries are declared so the browser chrome matches
// whichever theme the OS reports before our script runs.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_BG.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_BG.dark },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The init script writes `class` and `style` here before React hydrates.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      // Opt back into Next managing scroll on navigation; 16 no longer forces it.
      data-scroll-behavior="smooth"
    >
      <head>
        {/* Blocking and inline: resolving the theme after paint would flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-on-accent"
        >
          Skip to main content
        </a>

        {/* Spans the header and the page so the logo can reset the app in place. */}
        <AppResetProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
        </AppResetProvider>
      </body>
    </html>
  );
}
