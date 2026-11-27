import { createFileRoute } from "@tanstack/react-router";
import { PageTitle, Shell } from "@/components/shell";
import { sources } from "@/lib/sources";

export const Route = createFileRoute("/sources")({ component: SourcesPage });

function SourcesPage() {
  return (
    <Shell>
      <PageTitle
        kicker="Research"
        title="Sources"
        lede="Read in November 2026. Each row says what KernelDojo uses it for. A URL is not an endorsement, and a number on the page is not a number we measured."
      />
      <ul className="flex flex-col gap-4">
        {sources.map((s) => (
          <li key={s.url} className="rounded-lg border border-line p-4">
            <h2 className="font-medium">{s.title}</h2>
            <p className="mt-1 font-mono text-xs text-muted">{s.date}</p>
            <p className="mt-2 text-sm">{s.use}</p>
            <a className="mt-2 inline-flex min-h-11 items-center text-sm text-accent underline" href={s.url}>
              {s.url.replace("https://", "")}
            </a>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
