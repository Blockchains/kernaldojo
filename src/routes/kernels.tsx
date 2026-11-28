import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import {
  fetchedOn,
  kernelFamilies,
  kernelForks,
  methodSteps,
  upstreamBase,
  type KernelFamily,
} from "@/lib/kernels";
import { drills, pageWaste, qkvBytes, quantCodes, scoreBytes, sessions, tileBytes } from "@/lib/kernel-desk";

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

const diagrams: { id: string; src: string; alt: string; caption: string }[] = [
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
  {
    id: "softmax",
    src: "/diagrams/softmax.svg",
    alt: "Online softmax. Three tiles arrive in order. When the maximum jumps, the running sum is rescaled. The score matrix is never stored.",
    caption: "Tiling does not reduce the math. Forgetting the rescale makes an exact kernel inexact.",
  },
  {
    id: "quant",
    src: "/diagrams/quant.svg",
    alt: "Four bars, three short and one tall. The tall bar sets the quantisation step.",
    caption: "One outlier sets the step. Smaller values round down, sometimes to zero. The picture goes flat before a NaN.",
  },
  {
    id: "pages",
    src: "/diagrams/pages.svg",
    alt: "Paged KV for lengths 100 and 5 on pages of 16, which wastes less than padding both to 100. A coarse page can still lose.",
    caption: "Lengths 100 and 5: paging wastes 23, padding wastes 95. Lengths 17 and 3: paging wastes more. A page is not free.",
  },
];

function KernelsPage() {
  const [family, setFamily] = useState<(typeof kernelFamilies)[number]>("All");
  const [n, setN] = useState(4096);
  const rows = useMemo(
    () => (family === "All" ? kernelForks : kernelForks.filter((k) => k.family === family)),
    [family],
  );
  const safeN = Number.isFinite(n) && n >= 1 && n <= 8192 ? Math.floor(n) : 4096;
  const scores = scoreBytes(safeN);
  const qkv = qkvBytes(safeN);
  const tile = tileBytes();
  const codes = quantCodes([0.2, 0.05, 0.02, 8]);
  const wide = pageWaste([100, 5], 16);
  const coarse = pageWaste([17, 3], 16);
  const hours = sessions.reduce((sum, s) => sum + s.hours, 0);

  return (
    <Shell>
      <article>
        <header className="-mx-4 bg-paper px-4 py-8 text-paper-ink">
          <p className="font-mono text-xs">KernelDojo.com · {kernelForks.length} forks · {fetchedOn}</p>
          <h1 className="mt-4 max-w-xl text-4xl font-medium leading-none tracking-tight">
            Advanced GPU Kernel Engineering
          </h1>
          <p className="mt-4 max-w-md text-sm">
            Nineteen libraries, forked for reading. The work is a pull request to the original repository, from your own fork, onto their default branch. The Blockchains copy is not the place a student patch lands.
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

        <section className="mt-8" aria-labelledby="sessions">
          <h2 id="sessions" className="text-xl font-medium">
            Eight sessions, {hours} hours
          </h2>
          <p className="mt-2 text-sm text-muted">
            Hours are the work, not a video. Each session opens one fork and leaves a number you computed. None of those numbers is a GPU time.
          </p>
          <ol className="mt-3 flex flex-col gap-2">
            {sessions.map((s, i) => (
              <li key={s.title} className="rounded-lg border border-line px-3 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")} · {s.hours} h</p>
                  <p className="font-mono text-xs text-muted">{s.fork}</p>
                </div>
                <h3 className="mt-1 text-lg font-medium">{s.title}</h3>
                <p className="mt-1 text-sm">{s.work}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8" aria-labelledby="desk">
          <h2 id="desk" className="text-xl font-medium">
            Desk
          </h2>
          <p className="mt-2 text-sm text-muted">
            The same functions as <span className="font-mono">modules/gpu/kernel_math.py</span>. The unit test is the answer key. This is not a profile.
          </p>
          <label className="mt-4 block text-sm" htmlFor="seq">
            Sequence length N
            <input
              id="seq"
              type="number"
              min={1}
              max={8192}
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              className="mt-1 block min-h-11 w-full rounded-lg border border-line bg-bg px-3 font-mono"
            />
          </label>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            {[
              ["Score matrix", group(scores)],
              ["Q, K and V", group(qkv)],
              ["One 64×64 tile", group(tile)],
              ["Tiles in the matrix", group(Math.floor(scores / tile))],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-line bg-surface px-3 py-3">
                <dt className="font-mono text-xs text-muted">{k}</dt>
                <dd className="mt-1 font-mono text-sm">{v} B</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm">
            BF16, head dim 128. At N={safeN} the matrix is {group(scores)} bytes and one tile is {group(tile)}. Exact tiling still covers every tile. It stops the matrix living in memory.
          </p>
          <div className="mt-4 rounded-lg border border-line bg-surface px-3 py-3 text-sm">
            <p>
              <span className="font-mono text-xs text-accent">Quant. </span>
              Values 0.2, 0.05, 0.02, 8 onto 127 levels become {codes.join(", ")}. The 8 stays at 127. The 0.02 becomes 0.
            </p>
            <p className="mt-2">
              <span className="font-mono text-xs text-accent">Pages. </span>
              Lengths 100 and 5, page 16: waste {wide.waste}, padding waste {wide.staticWaste}. Lengths 17 and 3: waste {coarse.waste}, padding waste {coarse.staticWaste}. The second case is worse.
            </p>
          </div>
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
                  <a href={k.upstream} className="inline-flex min-h-12 items-center justify-center border-l border-line text-sm">
                    Upstream
                  </a>
                  <a
                    href={`https://github.com/${k.upstreamName}/compare`}
                    className="col-span-2 inline-flex min-h-12 items-center justify-center border-t border-line px-3 text-center text-sm font-medium"
                  >
                    Send a PR · base {upstreamBase(k.upstreamName)}
                  </a>
                </div>
                <p className="px-4 pt-3 text-sm">{k.hack}</p>
                <p className="px-4 pt-2 text-sm">
                  <span className="font-mono text-xs text-accent">Failure. </span>
                  {k.failure}
                </p>
                <p className="px-4 pt-2 text-sm text-muted">{k.caution}</p>
                {drills[k.id] ? <p className="px-4 pt-2 text-sm">{drills[k.id]}</p> : null}
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

function group(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function iLabel(family: "All" | KernelFamily, n: number) {
  return `${family.toLowerCase()} · ${n} showing`;
}
