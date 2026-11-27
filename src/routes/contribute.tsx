import { createFileRoute } from "@tanstack/react-router";
import { PageTitle, Shell } from "@/components/shell";

export const Route = createFileRoute("/contribute")({ component: ContributePage });

const flow = [
  ["Branch", "Name the mechanism. m4-reset-cache, not final-speedup."],
  ["Test", "Correctness is red or green before any timing file exists."],
  ["bench/results.json", "You write it. Fields: name, speedup, lpips, steps, baseline_steps, gpu, torch, seed."],
  ["CI", "CPU tests always. GPU tests only on a labelled runner, and a skip posts UNTESTED."],
  ["Review", "One row, one change. A borrowed ratio is a request for changes, not a discussion."],
];

function ContributePage() {
  return (
    <Shell>
      <PageTitle
        kicker="Pull requests"
        title="How work lands"
        lede="The evidence lives in the review, not in a certificate. The programme remote is github.com/Blockchains/kernaldojo. CI in that repo runs the CPU tests. A GPU number you did not measure stays off the comment."
      />
      <ol className="flex flex-col gap-3">
        {flow.map(([t, d], i) => (
          <li key={t} className="rounded-lg border border-line p-4">
            <p className="font-mono text-xs text-accent">0{i + 1} · {t}</p>
            <p className="mt-2 text-sm">{d}</p>
          </li>
        ))}
      </ol>
      <section className="mt-8">
        <h2 className="text-lg font-medium">Portfolio standard</h2>
        <ul className="mt-2 list-disc pl-5 text-sm">
          <li className="mt-1">A speedup you measured, with the operating point in the same paragraph.</li>
          <li className="mt-1">A correctness test that fails when the kernel is wrong, including a nasty input.</li>
          <li className="mt-1">A quality number against the dense run, and a sentence if you did not run the blind pairs.</li>
          <li className="mt-1">The failure you hit: a graph that rejected a shape, a cache that crossed a cut, a fallback you refused to time.</li>
        </ul>
      </section>
    </Shell>
  );
}
