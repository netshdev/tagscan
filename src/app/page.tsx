import { TagScanApp } from "@/components/TagScanApp";
import { parsePlatform, parseView } from "@/lib/views";

// `searchParams` is a request-time API, so this is never prerendered.
export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export default async function Home(props: PageProps<"/">) {
  // Read the deep-link params on the server so the correct tab renders on the
  // first paint - resolving them in an effect would flash the default view.
  const params = await props.searchParams;

  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-16 pt-6 sm:px-6"
    >
      {/*
        `?url=` is the one shareable thing here: results aren't stored, so a link
        can't carry them - but it can carry the instruction to scan a page, which
        is what the not-found page hands people.
      */}
      <TagScanApp
        initialUrl={firstValue(params.url)}
        initialView={parseView(params.view)}
        initialPlatform={parsePlatform(params.platform)}
      />
    </main>
  );
}
