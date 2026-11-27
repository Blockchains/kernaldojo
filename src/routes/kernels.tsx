import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import {
  fetchedOn,
  kernelFamilies,
  kernelForks,
  methodSteps,
  type DiagramId,
  type KernelFamily,
} from "@/lib/kernels";

const title = "Advanced GPU Kernel Engineering | KernelDojo";
const description =
  "KernelDojo.com teaches Advanced GPU Kernel Engineering by forking real GPU libraries and reading the kernels. Fusion, attention, quantisation and tiles. Upstream claims stay labelled. No borrowed speedups.";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "Advanced GPU Kernel Engineering",
  description,
  url: "https://kerneldojo.com/kernels",
  provider: {
    "@type": "Organization",
    name: "KernelDojo",
    url: "https://kerneldojo.com",
  },
  teaches: [
    "GPU kernel fusion",
    "Exact and sparse attention kernels",
    "Low-precision GEMM",
    "Roofline analysis",
  ],
};

export const Route = createFileRoute("/kernels")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: "https://kerneldojo.com/kernels" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://kerneldojo.com/diagrams/tiles.svg" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://kerneldojo.com/kernels" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
  }),
  component: KernelsPage,
});

const diagrams: { id: DiagramId; src: string; alt: string; caption: string }[] = [
  {
    id: "roofline",
    src: "/diagrams/roofline.svg",
    alt: "Roofline diagram. A rising memory-bound line meets a flat compute ceiling at the ridge.",
    caption: "Left of the ridge, deleting bytes is the only lever. Right of it, you need more math throughput.",
  },
  {
    id: "fusion",
    src: "/diagrams/fusion.svg",
    alt: "Fusion diagram. Eager RMSNorm writes an activation that the next linear reads back. The fused kernel stores once.",
    caption: "The ratio on that activation is 2×. The step is not 2×. Weights still move.",
  },
  {
    id: "tiles",
    src: "/diagrams/tiles.svg",
    alt: "Grid of attention tiles. Filled tiles are exact, gold tiles are a cheap proxy, empty tiles must be skipped rather than zeroed after a dense multiply.",
    caption: "Empty means the kernel did not launch. A zero mask after a full GEMM still did the work.",
  },
  {
    id: "horizon",
    src: "/diagrams/horizon.svg",
    alt: "Skip-error diagram. Signal is high at the first and last step. Error climbs through skipped middle steps until a reset.",
    caption: "Simulated. Not a DiT. Threshold zero must not drift. A segment reset beats carrying the error.",
  },
];

function KernelsPage() {
  const [family, setFamily] = useState<(typeof kernelFamilies)[number]>("All");
  const rows = useMemo(
    () => (family === "All" ? kernelForks : kernelForks.filter((k) => k.family === family)),
    [family],
  );

  return (
    <Shell>
      <article>
        <header className="-mx-4 bg-paper px-4 py-8 text-paper-ink">
          <p className="font-mono text-xs">KernelDojo.com · {kernelForks.length} forks · {fetchedOn}</p>
          <h1 className="mt-4 max-w-xl text-4xl font-medium leading-none tracking-tight">
            Advanced GPU Kernel Engineering
          </h1>
          <p className="mt-4 max-w-md text-sm">
            A method, not a leaderboard. Fork a real library, open one file, draw the bytes, match the numerics, change one mechanism. Star counts are upstream. No timing on this page is ours.
          </p>
        </header>

        <section className="mt-8" aria-labelledby="method">
          <h2 id="method" className="text-xl font-medium">
            The method
          </h2>
          <ol className="mt-3 flex flex-col gap-2">
            {methodSteps.map((step, i) => (
              <li key={step} className="rounded-lg border border-line bg-surface px-3 py-3 text-sm">
                <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-1">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8" aria-labelledby="figures">
          <h2 id="figures" className="text-xl font-medium">
            Diagrams
          </h2>
          <p className="mt-2 text-sm text-muted">
            Original figures for the method. They are not a paper’s artwork and they are not measurements.
          </p>
          <div className="mt-4 flex flex-col gap-4">
            {diagrams.map((d) => (
              <figure key={d.id} id={d.id} className="overflow-hidden rounded-lg border border-line">
                <img src={d.src} alt={d.alt} className="w-full bg-paper" />
                <figcaption className="px-3 py-3 text-sm text-muted">{d.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="mt-8" aria-labelledby="shelf">
          <h2 id="shelf" className="text-xl font-medium">
            The forks
          </h2>
          <p className="mt-2 text-sm text-muted">
            Each card names a path that was present in the upstream tree on {fetchedOn}. If a later commit moves it, the card is stale and you should say so.
          </p>
          <div className="sticky top-14 z-10 -mx-4 mt-3 flex gap-2 overflow-x-auto bg-bg px-4 py-3">
            {kernelFamilies.map((name) => {
              const on = family === name;
              const count = name === "All" ? kernelForks.length : kernelForks.filter((k) => k.family === name).length;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setFamily(name)}
                  className={
                    "min-h-11 shrink-0 rounded-lg px-3 text-sm " +
                    (on ? "bg-accent text-accent-ink" : "border border-line text-muted")
                  }
                >
                  {name} {count}
                </button>
              );
            })}
          </div>
          <ol className="flex flex-col gap-4">
            {rows.map((k) => (
              <li key={k.id} className="rounded-lg border border-line bg-surface">
                <div className="flex items-baseline justify-between gap-3 px-4 pt-4">
                  <p className="font-mono text-xs text-accent">
                    {String(kernelForks.indexOf(k) + 1).padStart(2, "0")} · {k.family}
                  </p>
                  <p className="font-mono text-xs text-muted">{k.stars} upstream</p>
                </div>
                <h3 className="px-4 pt-1 text-2xl font-medium tracking-tight">{k.name}</h3>
                <p className="px-4 pt-2 font-mono text-xs text-muted">{k.read}</p>
                <div className="mt-3 grid grid-cols-2 border-y border-line">
                  <a
                    href={k.fork}
                    className="inline-flex min-h-12 items-center justify-center bg-accent text-sm font-medium text-accent-ink"
                  >
                    Open fork
                  </a>
                  <a href={k.upstream} className="inline-flex min-h-12 items-center justify-center text-sm">
                    Upstream
                  </a>
                </div>
                <p className="px-4 pt-3 text-sm">{k.hack}</p>
                <p className="px-4 pt-2 text-sm">
                  <span className="font-mono text-xs text-accent">Failure. </span>
                  {k.failure}
                </p>
                <p className="px-4 pt-2 text-sm text-muted">{k.caution}</p>
                <p className="px-4 py-3 font-mono text-xs text-muted">
                  {k.license} · {k.language}
                  <a className="mt-1 block text-accent" href={`#${k.diagram}`}>
                    Diagram · {k.diagram}
                  </a>
                </p>
              </li>
            ))}
          </ol>
        </section>

        <p className="mt-6 font-mono text-xs text-muted">
          {iLabel(family, rows.length)}. A fork keeps the upstream licence. It is not a grant to relicense. Programme notes live with the{" "}
          <a className="text-accent" href="https://github.com/Blockchains/kernaldojo">
            KernelDojo repo
          </a>
          .
        </p>
      </article>
    </Shell>
  );
}

function iLabel(family: "All" | KernelFamily, n: number) {
  return `${family.toLowerCase()} · ${n} showing`;
}
