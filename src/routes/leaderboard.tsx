import { createFileRoute } from "@tanstack/react-router";
import { PageTitle, Shell, Tag } from "@/components/shell";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/leaderboard")({ component: BoardPage });

const claims = [
  ["RTX 5090 stack", "4.52×", "768p, cache included", "https://nvlabs.github.io/Sana/Sol-Engine/H3-OnDevice/"],
  ["4× H100", "3.56×", "50 steps, Ulysses-4", "https://nvlabs.github.io/Sana/Sol-Engine/H3-DataCenter/"],
  ["4× A100", "3.55×", "same policy", "https://nvlabs.github.io/Sana/Sol-Engine/H3-DataCenter/"],
  ["Spark-H3 10% density", "2.49× DiT", "PSNR 24.81 dB vs dense", "https://arxiv.org/abs/2611.24256"],
];

function BoardPage() {
  const drills = useProgress((s) => s.drills);
  const ranked = drills.filter((d) => d.eligible).slice().sort((a, b) => b.speedup - a.speedup);
  const refused = drills.filter((d) => !d.eligible);
  return (
    <Shell>
      <PageTitle
        kicker="Ranking"
        title="Board"
        lede="Published claims stay in their own list and are not ranked. The only rows this page will sort are simulated drills from this browser that clear the toy LPIPS gate of 0.08 and do not carry a cache across a cut."
      />
      <h2 className="text-lg font-medium">Published claims, not ranked</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {claims.map((c) => (
          <li key={c[0]} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-line px-3 py-3 text-sm">
            <Tag>CLAIMED</Tag>
            <span className="font-medium">{c[0]}</span>
            <span className="font-mono text-xs">{c[1]}</span>
            <span className="text-muted">{c[2]}</span>
            <a className="text-accent underline" href={c[3]}>
              source
            </a>
          </li>
        ))}
      </ul>
      <h2 className="mt-8 text-lg font-medium">Local drills</h2>
      {ranked.length === 0 ? (
        <p className="mt-2 text-sm text-muted">None eligible yet. The bench can file one. Carrying the cache across a cut is refused on purpose.</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-2">
          {ranked.map((d, i) => (
            <li key={d.id} className="rounded-lg border border-line px-3 py-3 text-sm">
              <span className="font-mono text-xs text-accent">{i + 1}</span>{" "}
              <span className="font-mono">{d.speedup.toFixed(2)}×</span>{" "}
              <span className="text-muted">toy LPIPS {d.lpips.toFixed(3)}</span>
              <p className="mt-1 text-muted">{d.note}</p>
            </li>
          ))}
        </ol>
      )}
      {refused.length > 0 ? (
        <p className="mt-4 font-mono text-xs text-muted">{refused.length} filed drill(s) refused by the gate.</p>
      ) : null}
    </Shell>
  );
}
