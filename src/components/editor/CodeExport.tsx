"use client";

import { useMemo, useState } from "react";
import { TARGETS, generate, type TargetId } from "@/lib/meta/codegen";
import type { MetaDraft } from "@/lib/meta/types";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { Tabs, type TabItem } from "@/components/ui/Tabs";

const TAB_ITEMS: TabItem[] = TARGETS.map((t) => ({ value: t.id, label: t.label }));

/**
 * Renders the current draft as ready-to-paste code for whichever framework the
 * user is actually working in - the step metatags.io leaves you to do by hand.
 */
export function CodeExport({ draft }: { draft: MetaDraft }) {
  const [target, setTarget] = useState<TargetId>("html");

  const spec = TARGETS.find((t) => t.id === target) ?? TARGETS[0];
  // Regenerating is cheap, but it runs on every keystroke of the editor upstream,
  // so memoise on the two things that actually change the output.
  const code = useMemo(() => generate(target, draft), [target, draft]);
  const lineCount = useMemo(() => code.split("\n").length, [code]);

  return (
    <Card as="section">
      <CardHeader>
        <div className="flex min-w-0 items-center gap-2">
          <CardTitle>Code</CardTitle>
          <Badge tone="neutral">
            <span className="font-mono">{spec.filename}</span>
          </Badge>
        </div>
        <CopyButton value={code} label="Copy code" size="md" />
      </CardHeader>

      <div className="px-4 pb-4 pt-3">
        <Tabs
          items={TAB_ITEMS}
          value={target}
          onChange={(value) => setTarget(value as TargetId)}
          label="Export framework"
        />
      </div>

      {/* Same picker/content separation as the preview stage, so both panels
          share one structure: header, tab strip, then a delimited canvas. */}
      <CardBody className="border-t border-border p-4">
        <div
          role="tabpanel"
          id={`panel-${target}`}
          aria-label={`${spec.label} code`}
          className="relative overflow-hidden rounded-lg border border-border bg-surface-sunken"
        >
          {/* Horizontal scroll rather than wrapping: wrapped code misleads about
              line structure, and these snippets get pasted verbatim. */}
          <pre className="scroll-thin overflow-x-auto p-4 text-[0.75rem] leading-[1.7]">
            <code className="font-mono text-fg">{code}</code>
          </pre>
        </div>

        <p className="mt-3 text-xs text-subtle">
          {lineCount} line{lineCount === 1 ? "" : "s"} · Paste into{" "}
          <span className="font-mono text-muted">{spec.filename}</span>
          {target === "html" ? " inside <head>." : "."}
        </p>
      </CardBody>
    </Card>
  );
}
