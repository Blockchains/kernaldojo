import { createFileRoute } from "@tanstack/react-router";
import { PageTitle, Shell } from "@/components/shell";
import { nextActions, plan } from "@/lib/sources";

export const Route = createFileRoute("/plan")({ component: PlanPage });

function PlanPage() {
  return (
    <Shell>
      <PageTitle
        kicker="30 days"
        title="Build order"
        lede="One machine, one synthetic model, no weight download in the first three weeks. If a day slips, slip the capstone, not the measurement habit."
      />
      <ol className="flex flex-col gap-3">
        {plan.map((p) => (
          <li key={p.day} className="rounded-lg border border-line px-4 py-3">
            <p className="font-mono text-xs text-accent">{p.day}</p>
            <p className="mt-1">{p.work}</p>
          </li>
        ))}
      </ol>
      <h2 className="mt-8 text-xl font-medium">Next three actions</h2>
      <ol className="mt-3 list-decimal pl-5">
        {nextActions.map((a) => (
          <li key={a} className="mt-2">
            {a}
          </li>
        ))}
      </ol>
    </Shell>
  );
}
