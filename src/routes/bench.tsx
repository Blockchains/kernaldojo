import { createFileRoute } from "@tanstack/react-router";
import { Drills } from "@/components/drills";
import { PageTitle, Shell } from "@/components/shell";

export const Route = createFileRoute("/bench")({ component: BenchPage });

function BenchPage() {
  return (
    <Shell>
      <PageTitle
        kicker="Drills"
        title="The bench"
        lede="Three teaching models you can move with a slider. They exist so the failure modes have a shape. They are not timings. File a stack drill only if you want it on the local board — it will stay labelled simulated."
      />
      <Drills />
    </Shell>
  );
}
