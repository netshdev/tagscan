import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppResetProvider } from "@/components/AppReset";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_TITLE,
  siteUrl,
} from "@/lib/site";
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
 * `metadataBase` makes every relative URL below absolute - notably `og:image`,
 * which a crawler on someone else's infrastructure has to be able to fetch.
 *
 * Without it Next derives the origin from the incoming request, which silently
 * produces the wrong scheme or host behind a proxy that doesn't forward
 * `x-forwarded-*`.
 *
 * `openGraph.images` and `twitter.images` are deliberately absent: the
 * `opengraph-image` and `twitter-image` routes populate them, and declaring an
 * image here as well would emit `og:image` twice. A duplicate tag isn't just
 * untidy - crawlers take the first value, so the two could silently disagree.
 */
export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Consolidates ranking signals if the site is ever reachable on more than one
  // host, and stops `?url=`/`?view=` scans being indexed as separate pages.
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: SITE_LOCALE,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    // Lets Google show a full-size thumbnail and an untruncated snippet rather
    // than its conservative defaults.
    "max-image-preview": "large",
    "max-snippet": -1,
  },
};

/**
 * Structured data for the site and the tool it offers.
 *
 * A `@graph` keeps this to a single script tag with both nodes cross-referenced by
 * `@id`, which is what crawlers prefer over two disconnected blocks - and means
 * only one thing has to parse for the page to have valid structured data at all.
 *
 * `offers` at zero price is here because `SoftwareApplication` without it reads as
 * "price unknown" in Search Console rather than "free".
 */
function structuredData(): string {
  const base = siteUrl().toString().replace(/\/$/, "");
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: `${base}/`,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "en",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${base}/#app`,
        name: SITE_NAME,
        url: `${base}/`,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Any",
        description: SITE_DESCRIPTION,
        isPartOf: { "@id": `${base}/#website` },
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
    ],
  });
}

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
        {/*
          Server-rendered rather than injected, so the crawlers that read it - none
          of which run JavaScript - actually see it. `JSON.stringify` output needs
          no further escaping here: every value is a constant we control, so there
          is no untrusted input that could close the script tag.
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredData() }}
        />
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
