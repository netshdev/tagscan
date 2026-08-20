"use client";

import { useRouter } from "next/navigation";
import { UrlForm } from "@/components/UrlForm";

/**
 * Hands the URL to the homepage via `?url=`, which starts the scan on arrival.
 * Navigating rather than scanning in place keeps a single code path for results
 * and leaves the user on a URL they can reload.
 */
export function NotFoundForm() {
  const router = useRouter();

  return (
    <UrlForm
      pending={false}
      onSubmit={(url) => router.push(`/?url=${encodeURIComponent(url)}`)}
    />
  );
}
