import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

/** Widths that read as a tab strip rather than a row of identical blocks. */
const VIEW_TABS = ["w-16", "w-12", "w-14", "w-11", "w-14"];
const PLATFORM_TABS = [
  "w-16",
  "w-8",
  "w-18",
  "w-16",
  "w-12",
  "w-14",
  "w-18",
  "w-16",
  "w-18",
  "w-14",
  "w-16",
];

function FieldSkeleton({ lines = 1 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className={lines > 1 ? "h-16 w-full rounded-lg" : "h-10 w-full rounded-lg"} />
    </div>
  );
}

/**
 * Mirrors the shape of the real results view so the layout doesn't jump when data
 * lands - the tab strip, the preview stage, and the editor sidebar all appear at
 * the size and position they'll occupy.
 *
 * Hidden from assistive technology: it carries no information, and the progress
 * list beside it already announces what's happening in a live region.
 */
export function ResultSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="grid animate-fade items-start gap-6 lg:grid-cols-[minmax(0,1fr)_384px]"
    >
      {/* Main stage */}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex gap-1 rounded-lg bg-surface-sunken p-1">
          {VIEW_TABS.map((width, index) => (
            <Skeleton key={index} className={`h-6 ${width} rounded-md`} />
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-28 rounded-lg" />
          </CardHeader>

          <div className="px-4 pb-4 pt-3">
            <div className="flex flex-wrap gap-1 rounded-lg bg-surface-sunken p-1">
              {PLATFORM_TABS.map((width, index) => (
                <Skeleton key={index} className={`h-6 ${width} rounded-md`} />
              ))}
            </div>
          </div>

          {/* The preview canvas: a card-shaped block on the sunken stage. */}
          <CardBody className="flex justify-center border-t border-border bg-surface-sunken p-6">
            <div className="flex w-full max-w-[600px] flex-col gap-3 rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-7 shrink-0 rounded-full" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-44" />
                </div>
              </div>
              <Skeleton className="h-5 w-4/5 rounded" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-11/12" />
            </div>
          </CardBody>

          <div className="flex flex-col gap-2 border-t border-border bg-bg-subtle px-4 py-3">
            <Skeleton className="h-3 w-56" />
            <Skeleton className="h-3 w-72" />
          </div>
        </Card>
      </div>

      {/* Editor sidebar */}
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-10" />
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-52" />
          </div>
          <FieldSkeleton />
          <FieldSkeleton lines={3} />
          <FieldSkeleton />
        </CardBody>
      </Card>
    </div>
  );
}
