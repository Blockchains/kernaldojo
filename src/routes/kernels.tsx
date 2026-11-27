import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { kernelFamilies, kernelForks, type KernelFamily } from "@/lib/kernels";

export const Route = createFileRoute("/kernels")({ component: KernelsPage });

function KernelsPage() {
  const [family, setFamily] = useState<(typeof kernelFamilies)[number]>("All");
  const rows = useMemo(
    () => (family === "All" ? kernelForks : kernelForks.filter((k) => k.family === family)),
    [family],
  );

  return (
    <Shell>
      <section className="-mx-4 bg-paper px-4 py-8 text-paper-ink">
        <p className="font-mono text-xs">Blockchains · 27 Nov 2026</p>
        <p className="mt-6 font-mono text-xs">0{kernelForks.length}</p>
        <h1 className="mt-1 text-5xl font-medium leading-none tracking-tight">Kernel shelf</h1>
        <p className="mt-4 max-w-sm text-sm">
          Nine real forks. Attention, quantised matmul, fusions, tiles. Star counts are upstream. None of this was timed here.
        </p>
      </section>

      <div className="sticky top-14 z-10 -mx-4 flex gap-2 overflow-x-auto bg-bg px-4 py-3">
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

      <ol className="flex flex-col gap-3">
        {rows.map((k) => (
          <li key={k.id} className="rounded-lg border border-line bg-surface">
            <div className="flex items-baseline justify-between gap-3 px-4 pt-4">
              <p className="font-mono text-xs text-accent">
                {String(kernelForks.indexOf(k) + 1).padStart(2, "0")} · {k.family}
              </p>
              <p className="font-mono text-xs text-muted">{k.stars}</p>
            </div>
            <h2 className="px-4 pt-1 text-2xl font-medium tracking-tight">{k.name}</h2>
            <div className="mt-3 grid grid-cols-2 border-y border-line">
              <a
                href={k.fork}
                className="inline-flex min-h-12 items-center justify-center bg-accent text-sm font-medium text-accent-ink"
              >
                Open fork
              </a>
              <a
                href={k.upstream}
                className="inline-flex min-h-12 items-center justify-center text-sm"
              >
                Upstream
              </a>
            </div>
            <p className="px-4 pt-3 text-sm">{k.hack}</p>
            <p className="px-4 pt-2 text-sm text-muted">{k.caution}</p>
            <p className="px-4 py-3 font-mono text-xs text-muted">
              {k.license} · {k.language}
              <span className="block">{k.upstreamName}</span>
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-6 font-mono text-xs text-muted">
        {iLabel(family, rows.length)}. A fork keeps the upstream licence. It is not a grant to relicense.
      </p>
    </Shell>
  );
}

function iLabel(family: "All" | KernelFamily, n: number) {
  return `${family.toLowerCase()} · ${n} showing`;
}
