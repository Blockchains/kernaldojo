import { useMemo, useState, type ReactNode } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useProgress } from "@/lib/progress";
import { Tag } from "./shell";

type Op = "norm" | "decode" | "attention";

function opPoint(op: Op) {
  if (op === "norm") return { flops: 4e9, bytes: 4e9, label: "BF16 RMSNorm, intensity 1" };
  if (op === "decode") return { flops: 2 * 4096 * 4096, bytes: 4096 * 4096 * 2 + 4096 * 4, label: "Decode GEMM, weights dominate" };
  const s = 8192;
  const d = 128;
  return { flops: 4 * s * s * d, bytes: 3 * s * d * 2, label: "Tiled attention sketch, scores not stored" };
}

export function simulateStack(fuse: boolean, weights: boolean, density: number, threshold: number, carry: boolean) {
  const epi = fuse ? 0.4 / (weights ? 1.15 : 1.8) : 0.4;
  const attn = 0.45 * (0.2 + 0.8 * density);
  const kernelTime = epi + attn + 0.15;
  const series: { step: number; error: number; skipped: number }[] = [];
  let skipped = 0;
  let err = 0;
  for (let s = 0; s < 30; s++) {
    const seg = Math.floor(s / 10);
    const local = s % 10;
    const boundary = local === 0;
    let delta = boundary ? 1 : Math.exp(-local / 3);
    if (carry && boundary && seg > 0) {
      delta = 0.05;
      err += 0.12;
    }
    const skip = local >= 2 && delta < threshold;
    if (skip) {
      skipped += 1;
      err += 0.04 * threshold;
    } else err += 0.005;
    series.push({ step: s + 1, error: Number(err.toFixed(4)), skipped });
  }
  const cacheFactor = 1 - (skipped / 30) * 0.75;
  const time = kernelTime * cacheFactor;
  const speedup = 1 / time;
  const lpips = Math.min(0.45, err / 8);
  const eligible = !carry && lpips <= 0.08;
  return { speedup, lpips, skipped, eligible, series, kernelTime };
}

const tipStyle = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  color: "var(--color-fg)",
  fontSize: 12,
};

export function Drills() {
  const [tab, setTab] = useState<"roof" | "fuse" | "stack">("roof");
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["roof", "Roofline"],
            ["fuse", "Fusion bytes"],
            ["stack", "Sparse + cache"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={
              "min-h-11 rounded-lg border px-3 text-sm " +
              (tab === id ? "border-accent text-accent" : "border-line text-muted")
            }
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "roof" ? <Roof /> : null}
      {tab === "fuse" ? <Fuse /> : null}
      {tab === "stack" ? <Stack /> : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="font-mono text-xs text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Roof() {
  const [op, setOp] = useState<Op>("norm");
  const [peak, setPeak] = useState(160);
  const [bw, setBw] = useState(960);
  const model = opPoint(op);
  const peakF = peak * 1e12;
  const bwB = bw * 1e9;
  const intensity = model.flops / model.bytes;
  const ridge = peakF / bwB;
  const seconds = Math.max(model.flops / peakF, model.bytes / bwB);
  const side = intensity >= ridge ? "compute" : "memory";
  const curve = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const x = Math.pow(10, -1 + (i / 24) * 4);
      const t = Math.max(x / peakF, 1 / bwB);
      const flopsPerS = x / t;
      pts.push({ x: Number(x.toFixed(3)), achieved: flopsPerS / 1e12 });
    }
    return pts;
  }, [peakF, bwB]);

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <Tag>SIMULATED</Tag>
        <p className="text-sm text-muted">
          The curve is the roofline for the peak and bandwidth you set. Those peaks are sliders, not a datasheet. {model.label}.
        </p>
        <Field label="Op">
          <select
            className="min-h-11 w-full rounded-lg border border-line bg-surface px-2"
            value={op}
            onChange={(e) => setOp(e.target.value as Op)}
          >
            <option value="norm">RMSNorm</option>
            <option value="decode">Decode GEMM</option>
            <option value="attention">Tiled attention</option>
          </select>
        </Field>
        <Field label={`Peak ${peak} TFLOP/s`}>
          <input className="w-full accent-accent" type="range" min={40} max={400} value={peak} onChange={(e) => setPeak(Number(e.target.value))} />
        </Field>
        <Field label={`Bandwidth ${bw} GB/s`}>
          <input className="w-full" type="range" min={200} max={8000} step={20} value={bw} onChange={(e) => setBw(Number(e.target.value))} />
        </Field>
        <dl className="grid grid-cols-2 gap-3 rounded-lg border border-line p-3 font-mono text-xs">
          <div>
            <dt className="text-muted">Intensity</dt>
            <dd>{intensity.toFixed(2)} FLOP/byte</dd>
          </div>
          <div>
            <dt className="text-muted">Ridge</dt>
            <dd>{ridge.toFixed(1)} FLOP/byte</dd>
          </div>
          <div>
            <dt className="text-muted">Bound</dt>
            <dd className="text-accent">{side}</dd>
          </div>
          <div>
            <dt className="text-muted">Model time</dt>
            <dd>{(seconds * 1e3).toFixed(3)} ms</dd>
          </div>
        </dl>
      </div>
      <div className="h-72 rounded-lg border border-line p-2 lg:col-span-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={curve}>
            <CartesianGrid stroke="var(--color-line)" />
            <XAxis dataKey="x" stroke="var(--color-muted)" tick={{ fontSize: 11 }} label={{ value: "FLOP/byte", fill: "var(--color-muted)", fontSize: 11, position: "insideBottom", offset: -2 }} />
            <YAxis stroke="var(--color-muted)" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tipStyle} />
            <Line type="monotone" dataKey="achieved" name="TFLOP/s" stroke="var(--color-accent)" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Fuse() {
  const [n, setN] = useState(1_048_576);
  const [weights, setWeights] = useState(true);
  const [bw, setBw] = useState(1500);
  const actEager = 2 * n * 2;
  const actFused = n * 2;
  const w = weights ? n * 2 : 0;
  const bwB = bw * 1e9;
  const tEager = (actEager + w) / bwB;
  const tFused = (actFused + w) / bwB;
  return (
    <div className="max-w-xl">
      <Tag>SIMULATED</Tag>
      <p className="mt-3 text-sm text-muted">
        Counts activation bytes for an RMSNorm followed by a linear, assuming the fused kernel never writes the intermediate. This is not a GPU measurement. Turning weights on shows why the step-level ratio collapses toward 1.
      </p>
      <div className="mt-4 flex flex-col gap-4">
        <Field label={`Elements ${(n / 1e6).toFixed(2)} M`}>
          <input type="range" min={65536} max={8388608} step={65536} value={n} onChange={(e) => setN(Number(e.target.value))} className="w-full" />
        </Field>
        <Field label={`Bandwidth ${bw} GB/s`}>
          <input type="range" min={400} max={8000} step={50} value={bw} onChange={(e) => setBw(Number(e.target.value))} className="w-full" />
        </Field>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={weights} onChange={(e) => setWeights(e.target.checked)} />
          Include a weight read of the same size as the activation
        </label>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-line p-3 font-mono text-xs">
        <div>
          <dt className="text-muted">Eager traffic</dt>
          <dd>{((actEager + w) / 1e6).toFixed(2)} MB</dd>
        </div>
        <div>
          <dt className="text-muted">Fused traffic</dt>
          <dd>{((actFused + w) / 1e6).toFixed(2)} MB</dd>
        </div>
        <div>
          <dt className="text-muted">Traffic ratio</dt>
          <dd className="text-accent">{(tEager / tFused).toFixed(2)}×</dd>
        </div>
        <div>
          <dt className="text-muted">Model time</dt>
          <dd>{(tFused * 1e3).toFixed(3)} ms fused</dd>
        </div>
      </dl>
    </div>
  );
}

function Stack() {
  const addDrill = useProgress((s) => s.addDrill);
  const [fuse, setFuse] = useState(true);
  const [weights, setWeights] = useState(true);
  const [density, setDensity] = useState(0.35);
  const [threshold, setThreshold] = useState(0.28);
  const [carry, setCarry] = useState(false);
  const [filed, setFiled] = useState(false);
  const sim = useMemo(
    () => simulateStack(fuse, weights, density, threshold, carry),
    [fuse, weights, density, threshold, carry],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <Tag>SIMULATED</Tag>
        <p className="text-sm text-muted">
          A teaching model of a 30-step, 3-segment loop. It is not MiniMax-H3 and it is not Sol-Attn. Error is in made-up units, shown as a fake LPIPS so the gate has something to refuse.
        </p>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={fuse} onChange={(e) => setFuse(e.target.checked)} />
          Fuse the norm epilogue
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={weights} onChange={(e) => setWeights(e.target.checked)} />
          Weights dominate the epilogue
        </label>
        <Field label={`Exact-block density ${(density * 100).toFixed(0)}%`}>
          <input type="range" min={0.1} max={1} step={0.01} value={density} onChange={(e) => setDensity(Number(e.target.value))} className="w-full" />
        </Field>
        <Field label={`Cache threshold ${threshold.toFixed(2)}`}>
          <input type="range" min={0.05} max={0.9} step={0.01} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-full" />
        </Field>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={carry} onChange={(e) => setCarry(e.target.checked)} />
          Carry cache across the segment cut
        </label>
        <dl className="grid grid-cols-2 gap-3 rounded-lg border border-line p-3 font-mono text-xs">
          <div>
            <dt className="text-muted">Toy speedup</dt>
            <dd className="text-accent">{sim.speedup.toFixed(2)}×</dd>
          </div>
          <div>
            <dt className="text-muted">Toy LPIPS</dt>
            <dd>{sim.lpips.toFixed(3)}</dd>
          </div>
          <div>
            <dt className="text-muted">Steps skipped</dt>
            <dd>
              {sim.skipped} / 30
            </dd>
          </div>
          <div>
            <dt className="text-muted">Gate 0.08</dt>
            <dd>{sim.eligible ? "eligible" : "refused"}</dd>
          </div>
        </dl>
        <button
          type="button"
          className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink"
          onClick={() => {
            addDrill({
              speedup: Number(sim.speedup.toFixed(3)),
              lpips: Number(sim.lpips.toFixed(4)),
              eligible: sim.eligible,
              note: `fuse ${fuse}, weights ${weights}, density ${density.toFixed(2)}, thr ${threshold.toFixed(2)}, carry ${carry}`,
            });
            setFiled(true);
          }}
        >
          File this drill locally
        </button>
        {filed ? <p className="text-sm text-muted">Filed on this browser’s board. It is still simulated.</p> : null}
      </div>
      <div className="h-72 rounded-lg border border-line p-2 lg:col-span-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sim.series}>
            <CartesianGrid stroke="var(--color-line)" />
            <XAxis dataKey="step" stroke="var(--color-muted)" tick={{ fontSize: 11 }} />
            <YAxis stroke="var(--color-muted)" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tipStyle} />
            <Line type="monotone" dataKey="error" name="error" stroke="var(--color-accent)" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
