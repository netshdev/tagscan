"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { runAudit } from "@/lib/meta/audit";
import type { PlatformId } from "@/lib/meta/platforms";
import { emptyDraft } from "@/lib/meta/resolve";
import type { Inspection, MetaDraft } from "@/lib/meta/types";
import type { View } from "@/lib/views";
import { useAppReset } from "@/components/AppReset";
import { AuditPanel } from "@/components/audit/AuditPanel";
import { DesignPanel } from "@/components/audit/DesignPanel";
import { CodeExport } from "@/components/editor/CodeExport";
import { MetaEditor } from "@/components/editor/MetaEditor";
import { PreviewStage } from "@/components/previews/PreviewStage";
import { CountBadge } from "@/components/ui/Badge";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { ScanProgress } from "@/components/ScanProgress";
import { ResultSkeleton } from "@/components/ResultSkeleton";
import { ResultHeader } from "@/components/ResultHeader";
import { ReportView } from "@/components/report/ReportView";
import { UrlForm } from "@/components/UrlForm";
import { Hero } from "@/components/Hero";

/** `name` attribute of the editor input for each draft field, for jump-to-fix. */
const INPUT_NAME: Partial<Record<keyof MetaDraft, string>> = {
  title: "title",
  description: "description",
  canonical: "canonical",
  robots: "robots",
  keywords: "keywords",
  author: "author",
  themeColor: "theme-color",
  ogTitle: "og:title",
  ogDescription: "og:description",
  ogType: "og:type",
  ogUrl: "og:url",
  ogSiteName: "og:site_name",
  ogLocale: "og:locale",
  ogImage: "og:image",
  ogImageAlt: "og:image:alt",
  ogImageWidth: "og:image:width",
  ogImageHeight: "og:image:height",
  twitterCard: "twitter:card",
  twitterSite: "twitter:site",
  twitterCreator: "twitter:creator",
  twitterTitle: "twitter:title",
  twitterDescription: "twitter:description",
  twitterImage: "twitter:image",
  twitterImageAlt: "twitter:image:alt",
};

interface Props {
  /** From `?url=`: scans immediately on arrival, which is how the 404 page hands off. */
  initialUrl?: string;
  initialView?: View;
  initialPlatform?: PlatformId;
}

export function TagScanApp({ initialUrl, initialView, initialPlatform }: Props) {
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [draft, setDraft] = useState<MetaDraft>(emptyDraft());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<View>(initialView ?? "previews");
  const [platform, setPlatform] = useState<PlatformId>(initialPlatform ?? "google");

  /**
   * Mirrors view state into the URL without a Next navigation - `replaceState`
   * keeps the page deep-linkable and shareable while avoiding a server round trip
   * on every tab click.
   */
  const syncUrl = useCallback((next: Partial<{ view: View; platform: PlatformId }>) => {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(next)) {
      if (value) url.searchParams.set(key, value);
    }
    window.history.replaceState(null, "", url);
  }, []);

  const changeView = useCallback(
    (next: View) => {
      setView(next);
      syncUrl({ view: next });
    },
    [syncUrl],
  );

  const changePlatform = useCallback(
    (next: PlatformId) => {
      setPlatform(next);
      syncUrl({ platform: next });
    },
    [syncUrl],
  );

  // Functional update keeps this callback stable across renders.
  const updateField = useCallback(
    <K extends keyof MetaDraft>(field: K, value: MetaDraft[K]) => {
      setDraft((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const resetDraft = useCallback(() => {
    setDraft(inspection?.draft ?? emptyDraft());
  }, [inspection]);

  /** The URL currently being scanned, so the progress card can name it. */
  const [scanning, setScanning] = useState<string | null>(null);

  /** Lets a scan be abandoned - by the logo, or by starting another one. */
  const inFlight = useRef<AbortController | null>(null);

  const inspect = useCallback(async (url: string) => {
    // Starting a scan supersedes any previous one.
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    setPending(true);
    setScanning(url);
    setError(null);

    try {
      const response = await fetch("/api/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Inspection failed.");

      const result = data as Inspection;
      setInspection(result);
      setDraft(result.draft);
    } catch (err) {
      // An abort is a deliberate cancellation, not a failure to report.
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      // Only the newest scan owns the pending flag; a superseded one must not
      // clear the state its replacement just set.
      if (inFlight.current === controller) {
        inFlight.current = null;
        setPending(false);
        setScanning(null);
      }
    }
  }, []);

  /**
   * Back to a clean homepage: abandon any scan, drop the result, and strip the
   * view params so a reload doesn't restore what was just dismissed.
   */
  const reset = useCallback(() => {
    inFlight.current?.abort();
    inFlight.current = null;

    setPending(false);
    setScanning(null);
    setError(null);
    setInspection(null);
    setDraft(emptyDraft());
    setView("previews");
    setPlatform("google");

    // `autoStarted` stays true on purpose - otherwise the `?url=` effect would
    // immediately restart the very scan this just cancelled.
    window.history.replaceState(null, "", "/");
  }, []);

  // Publish the reset so the header logo can reach it.
  const appReset = useAppReset();
  useEffect(() => {
    appReset?.register(reset);
    return () => appReset?.register(null);
  }, [appReset, reset]);

  /**
   * Auto-scan when arriving with `?url=`.
   *
   * The ref guard is load-bearing: React runs effects twice in development, and
   * without it every hand-off from the 404 page would crawl the target site twice.
   */
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!initialUrl || autoStarted.current) return;
    autoStarted.current = true;
    void inspect(initialUrl);
  }, [initialUrl, inspect]);

  /** Focuses the editor input behind a finding, opening its section if collapsed. */
  const jumpToField = useCallback((field: keyof MetaDraft) => {
    const name = INPUT_NAME[field];
    if (!name) return;

    const input = document.getElementsByName(name)[0];
    if (!(input instanceof HTMLElement)) return;

    input.closest("details")?.setAttribute("open", "");
    input.scrollIntoView({ block: "center", behavior: "smooth" });
    input.focus({ preventScroll: true });
  }, []);

  // Previews and the live audit re-run on every keystroke, so let React serve a
  // stale draft to them while the input itself stays responsive.
  const deferredDraft = useDeferredValue(draft);
  const stale = deferredDraft !== draft;

  const dirty = useMemo(() => {
    const baseline = inspection?.draft;
    if (!baseline) return false;
    return (Object.keys(draft) as Array<keyof MetaDraft>).some(
      (key) => draft[key] !== baseline[key],
    );
  }, [draft, inspection]);

  /**
   * Re-audits the edited draft rather than showing the original findings, so the
   * check list tracks the fixes as they're typed. Falls back to the server result
   * when nothing has been edited.
   */
  const live = useMemo(() => {
    if (!inspection) return null;
    if (!dirty) return { checks: inspection.checks, summary: inspection.summary };
    return runAudit(deferredDraft, inspection.raw, inspection.probes);
  }, [inspection, deferredDraft, dirty]);

  const viewTabs: TabItem[] = useMemo(() => {
    const problems = live ? live.summary.counts.fail + live.summary.counts.warn : 0;
    return [
      { value: "previews", label: "Previews" },
      {
        value: "audit",
        label: "Audit",
        badge: problems > 0 ? <CountBadge count={problems} tone="danger" /> : undefined,
      },
      { value: "design", label: "Design" },
      { value: "code", label: "Code" },
      { value: "report", label: "Report" },
    ];
  }, [live]);

  /* ----------------------------------------------------------------------- */

  /**
   * One scanning view, whether this is a first scan or a re-scan from the results.
   *
   * It takes over the whole page rather than sitting under the previous result: the
   * old data belongs to a different URL, and leaving it on screen beside a progress
   * indicator invites reading stale numbers as current ones.
   */
  if (pending && scanning) {
    return (
      <div className="flex w-full flex-col gap-6">
        <ScanProgress url={scanning}>
          <UrlForm
            onSubmit={inspect}
            pending
            size="compact"
            initialValue={scanning}
          />
        </ScanProgress>
        <ResultSkeleton />
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="flex w-full flex-col items-center">
        <Hero />
        <UrlForm onSubmit={inspect} pending={pending} />

        {error ? (
          <div
            role="alert"
            className="animate-rise mt-8 w-full max-w-xl rounded-lg border border-danger-border bg-danger-subtle p-4"
          >
            <p className="text-sm font-semibold text-danger-text">Couldn&rsquo;t inspect that URL</p>
            <p className="mt-1 text-sm text-fg/80">{error}</p>
          </div>
        ) : null}
      </div>
    );
  }

  // On the Report tab the editor is hidden: the report is a document to read and
  // print, and a live-editing sidebar beside it invites printing half-made changes.
  const reporting = view === "report";

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Everything marked data-print="hide" is dropped by the print stylesheet,
          so Ctrl-P on the Report tab yields the document alone. */}
      <div data-print="hide" className="contents">
        <ResultHeader
          inspection={inspection}
          pending={pending}
          onReinspect={inspect}
          error={error}
        />
      </div>

      <div
        className={
          reporting
            ? "flex flex-col gap-4"
            : "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_384px]"
        }
      >
        {/* Main stage */}
        <div className="flex min-w-0 flex-col gap-4">
          <div data-print="hide">
            <Tabs
              items={viewTabs}
              value={view}
              onChange={(v) => changeView(v as View)}
              label="Result view"
            />
          </div>

          <div
            // Keeps the stale-content dim from flashing on fast updates.
            className={stale ? "opacity-70 transition-opacity duration-200" : undefined}
          >
            {view === "previews" ? (
              <PreviewStage
                draft={deferredDraft}
                raw={inspection.raw}
                fallbackUrl={inspection.finalUrl}
                platform={platform}
                onPlatformChange={changePlatform}
              />
            ) : null}

            {view === "audit" && live ? (
              <AuditPanel
                checks={live.checks}
                summary={live.summary}
                onJumpToField={jumpToField}
              />
            ) : null}

            {view === "design" ? <DesignPanel report={inspection.design} /> : null}

            {view === "code" ? <CodeExport draft={deferredDraft} /> : null}

            {reporting ? <ReportView inspection={inspection} /> : null}
          </div>
        </div>

        {/* Editor rides along beside the stage on wide screens. */}
        {reporting ? null : (
          <div className="scroll-thin min-w-0 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
            <MetaEditor
              draft={draft}
              onChange={updateField}
              onReset={resetDraft}
              dirty={dirty}
            />
          </div>
        )}
      </div>
    </div>
  );
}
