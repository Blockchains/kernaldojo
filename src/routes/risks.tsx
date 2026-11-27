import { createFileRoute } from "@tanstack/react-router";
import { PageTitle, Shell } from "@/components/shell";
import { risks } from "@/lib/sources";

export const Route = createFileRoute("/risks")({ component: RisksPage });

function RisksPage() {
  return (
    <Shell>
      <PageTitle
        kicker="Register"
        title="What will go wrong"
        lede="Licences, missing hardware, ratios that will not come back, and quality that dies at a segment cut. Read this before Module 7."
      />
      <ol className="flex flex-col gap-4">
        {risks.map((r, i) => (
          <li key={r.id} className="rounded-lg border border-line p-4">
            <p className="font-mono text-xs text-accent">0{i + 1}</p>
            <h2 className="mt-1 text-lg font-medium">{r.title}</h2>
            <p className="mt-2 text-sm text-muted">{r.detail}</p>
          </li>
        ))}
      </ol>
    </Shell>
  );
}
