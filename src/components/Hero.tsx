import { PLATFORM_ORDER } from "@/lib/meta/platforms";
import { PlatformMark } from "@/components/previews/registry";

/** Static, so it renders on the server and ships no JavaScript. */
export function Hero() {
  return (
    // Top padding is trimmed by the 24px `main` already applies, so the hero's
    // vertical rhythm stays symmetric rather than gaining a step.
    <div className="flex flex-col items-center pb-14 pt-8 text-center sm:pb-20 sm:pt-14">
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted shadow-xs">
        <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
        Eleven platforms, one crawl
      </span>

      <h1 className="mt-6 max-w-3xl text-pretty text-4xl font-bold tracking-tight text-fg sm:text-5xl">
        See exactly how your link looks{" "}
        <span className="text-accent">everywhere you share it</span>
      </h1>

      <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
        Paste a URL to preview its real Google, X, Facebook, LinkedIn, Slack, Discord,
        WhatsApp, Telegram, Mastodon, Bluesky, and Pinterest cards. Edit any tag live,
        audit what&rsquo;s broken, then copy the code for your framework.
      </p>

      <ul className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {PLATFORM_ORDER.map((id) => (
          <li
            key={id}
            className="grid size-8 place-items-center rounded-lg border border-border bg-surface shadow-xs"
          >
            <PlatformMark id={id} size={16} />
          </li>
        ))}
      </ul>
    </div>
  );
}
