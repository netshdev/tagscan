export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-8 text-center sm:px-6">
        <p className="text-xs text-muted">
          Every result is read from the HTML as served, without running JavaScript -
          the same way search and social crawlers fetch a page.
        </p>
        <p className="text-xs text-subtle">
          Truncation limits and image rules follow each platform&rsquo;s published card
          documentation. Platforms change these without notice.
        </p>
      </div>
    </footer>
  );
}
