import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { REPO_URL, Shell, Tag } from "@/components/shell";
import { modules } from "@/lib/modules";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/")({ component: Home });

const ablation = [
  ["Baseline", 1045.4, "1.00×"],
  ["+ kernels", 971.6, "1.08×"],
  ["+ Sol-Attn", 708.3, "1.48×"],
  ["+ cache", 231.2, "4.52×"],
] as const;

function Home() {
  const quizzes = useProgress((s) => s.quizzes);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const next = modules.find((m) => !quizzes[m.id]) ?? modules[0];
  const done = ready ? modules.filter((m) => quizzes[m.id]).length : 0;

  return (
    <Shell>
      <p className="font-mono text-xs text-muted">Evidence loop · kernels, not Solana</p>
      <h1 className="mt-2 max-w-3xl text-4xl font-medium tracking-tight">
        Read the kernel. Measure the bound.
      </h1>
      <p className="mt-4 max-w-2xl text-base text-muted">
        KernelDojo is the Sol.College practice loop pointed at inference: open the code, break one mechanism, leave a number you can defend. Not affiliated with NVIDIA, MiniMax, or Sol.College.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          to="/modules/$id"
          params={{ id: next.id }}
          className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink"
        >
          {ready && done > 0 ? `Continue ${next.code}` : `Start ${next.code}`}
        </Link>
        <Link to="/bench" className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm">
          Run a drill
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Tag>{ready ? `${done}/${modules.length} quizzes` : "Progress on this device"}</Tag>
        <Tag>CUDA · UNTESTED</Tag>
        <Tag>CLAIMED · not measured here</Tag>
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-5">
        <div className="rounded-lg bg-paper p-4 text-paper-ink lg:col-span-3">
          <p className="font-mono text-xs">Claimed by source · 3 Aug 2026</p>
          <h2 className="mt-2 text-2xl font-medium tracking-tight">RTX 5090 · 768p · MiniMax-H3</h2>
          <p className="mt-2 text-sm">
            Kernels alone are 1.08×. The 4.52× shows up after cross-step cache. Reproduce the method. Do not paste the ratio.
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {ablation.map(([name, seconds, ratio]) => (
              <li key={name}>
                <div className="flex items-baseline justify-between gap-3 font-mono text-xs">
                  <span>{name}</span>
                  <span>
                    {seconds.toFixed(1)} s · {ratio}
                  </span>
                </div>
                <div className="mt-1 h-2 bg-paper-ink/10">
                  <div className="h-2 bg-paper-ink" style={{ width: `${(seconds / 1045.4) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-xs">
            <a className="underline" href="https://nvlabs.github.io/Sana/Sol-Engine/H3-OnDevice/">
              nvlabs.github.io · H3 on device
            </a>
          </p>
        </div>
        <ol className="flex flex-col gap-3 lg:col-span-2">
          {[
            ["1", "Read the operating point", "Shape, steps, seed, licence."],
            ["2", "Pass the test", "Correctness before the timer."],
            ["3", "Change one mechanism", "Kernels, then sparsity, then cache."],
            ["4", "Put quality next to time", "LPIPS against the dense run."],
            ["5", "Open the pull request", "The comment carries your number, or none."],
          ].map(([n, t, d]) => (
            <li key={n} className="rounded-lg border border-line bg-surface px-3 py-3">
              <p className="font-mono text-xs text-accent">0{n}</p>
              <p className="mt-1 font-medium">{t}</p>
              <p className="text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-medium">Eight modules</h2>
          <Link to="/path" className="font-mono text-xs text-accent">
            Full path
          </Link>
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {modules.map((m) => (
            <li key={m.id}>
              <Link
                to="/modules/$id"
                params={{ id: m.id }}
                className="flex items-center gap-3 rounded-lg border border-line px-3 py-3"
              >
                <span className="w-8 font-mono text-xs text-accent">{m.code}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{m.title}</span>
                  <span className="block truncate text-sm text-muted">{m.outcomes[0]}</span>
                </span>
                <span className="font-mono text-xs text-muted">{m.hours}h</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 font-mono text-xs text-muted">
        Programme source{" "}
        <a className="text-accent underline" href={REPO_URL}>
          github.com/Blockchains/kernaldojo
        </a>
        . github.blockchain.io did not answer when this link was set.
      </p>
    </Shell>
  );
}
