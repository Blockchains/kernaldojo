export type Block =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "code"; label: string; code: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "note"; tag: string; text: string };

const m0: Block[] = [
  {
    type: "p",
    text: "A speedup is a ratio of two times. Both times need a definition: which GPU, which shape, warmed up or not, synchronised or not, one step or fifty. This module is that definition. The rest of KernelDojo is not allowed to skip it.",
  },
  {
    type: "note",
    tag: "UNTESTED on device",
    text: "The arithmetic below is pure Python and is tested in the programme files. CUDA event timing is a specification. This preview has no GPU.",
  },
  { type: "p", text: "Roofline, in one picture. Peak math throughput and peak bandwidth fix a ridge. Arithmetic intensity is FLOPs divided by bytes moved. Left of the ridge, the kernel waits on memory. Right of it, the kernel waits on math. Fusion moves bytes. Tensor cores and algorithms move FLOPs. Doing the wrong one is how weeks disappear." },
  {
    type: "code",
    label: "modules/00-roofline/roofline.py",
    code: `def arithmetic_intensity(flops: float, nbytes: float) -> float:
    if nbytes <= 0:
        raise ValueError("nbytes must be positive")
    return flops / nbytes

def ridge_point(peak_flops_per_s: float, bandwidth_bytes_per_s: float) -> float:
    if bandwidth_bytes_per_s <= 0:
        raise ValueError("bandwidth must be positive")
    return peak_flops_per_s / bandwidth_bytes_per_s

def bound(flops: float, nbytes: float, peak: float, bandwidth: float) -> str:
    return "compute" if arithmetic_intensity(flops, nbytes) >= ridge_point(peak, bandwidth) else "memory"

def roofline_seconds(flops: float, nbytes: float, peak: float, bandwidth: float) -> float:
    return max(flops / peak, nbytes / bandwidth)`,
  },
  {
    type: "p",
    text: "Decode versus a diffusion step. A single-token GEMM reads a large weight matrix and writes a small activation. Intensity is low. The machine is a memory system that happens to multiply. A video DiT step applies those weights to a long token axis, then spends a quadratic-looking attention on that axis. Intensity climbs, and attention stops being free. That is why Module 1 (fusion, launch overhead) and Module 3 (attention) are different tools, and why a trick that wins on decode can do almost nothing on a 50-step sampler.",
  },
  {
    type: "table",
    headers: ["Regime", "What dominates the bytes", "First lever"],
    rows: [
      ["LLM decode, batch 1", "Weights, every token", "Quantise weights, fuse the tiny epilogue, batch if latency allows"],
      ["Diffusion step, long latent", "Activations between small ops; then attention math", "Fuse the epilogue; then look at attention, not at another all-reduce slogan"],
      ["Warmup / first call", "Compile, autotune, allocator", "Do not quote it"],
    ],
  },
  {
    type: "p",
    text: "Timing protocol you will be graded on. Warm up. Record CUDA events around the region, or synchronise on both sides of a CPU timer. Use the same protocol for both sides of a ratio. Report N. Attach a profiler table only to name the op, not as the clock.",
  },
  {
    type: "code",
    label: "Timing sketch — UNTESTED, requires CUDA",
    code: `def time_ms(fn, warmup=5, iters=20) -> float:
    for _ in range(warmup):
        fn()
    torch.cuda.synchronize()
    start, end = torch.cuda.Event(True), torch.cuda.Event(True)
    start.record()
    for _ in range(iters):
        fn()
    end.record()
    torch.cuda.synchronize()
    return start.elapsed_time(end) / iters`,
  },
  {
    type: "note",
    tag: "Smoke test",
    text: "python -m unittest modules/00-roofline/test_roofline.py — this one was run in the preview. It does not touch a device.",
  },
  {
    type: "p",
    text: "Expected-results table. Fill the right-hand column on your machine. Leaving it blank is honest. Copying 4.52× into it is not.",
  },
  {
    type: "table",
    headers: ["Check", "Pass", "Your number"],
    rows: [
      ["Intensity of BF16 RMSNorm (order of magnitude)", "Below a ridge of ~50–150 FLOP/byte on current high-end GPUs", "ESTIMATE until you measure peak and bandwidth"],
      ["Event timer vs unsynchronised CPU timer", "CPU timer much smaller", "UNTESTED here"],
      ["Top op in one eager step of the synthetic block", "Name it from a trace", "UNTESTED here"],
    ],
  },
];

const m1: Block[] = [
  {
    type: "p",
    text: "Compilation is not a speed button. torch.compile traces the region, Inductor fuses and picks kernels, and some modes then capture a CUDA graph so the CPU stops launching every op. Each of those can fail independently. Your job is to say which one happened.",
  },
  {
    type: "ul",
    items: [
      "Eager: one kernel per op. Correct, chatty, often bandwidth-bound on the chatter.",
      "Compiled, default: fusion and kernel choice. Shape changes may recompile.",
      "reduce-overhead: CUDA graph. Fixed shapes, no host data dependencies, no surprise allocations.",
      "max-autotune: search. Worth it when a large GEMM dominates. Quote the steady state, not the search.",
    ],
  },
  {
    type: "code",
    label: "Byte model of a fusion — tested, not a GPU time",
    code: `def eager_activation_bytes(n: int) -> int:
    # RMSNorm writes y, linear reads y. BF16: 2 bytes. n = B * S * D
    return 2 * n * 2

def fused_activation_bytes(n: int) -> int:
    # Intermediate stays on chip. Count only the final store.
    return n * 2

def activation_traffic_ratio(n: int) -> float:
    return eager_activation_bytes(n) / fused_activation_bytes(n)`,
  },
  {
    type: "p",
    text: "That ratio is 2× on the activation traffic of the norm, not 2× on the step. The GEMM still reads the weights. On a compute-bound projection the step-level speedup can be 1.0something. NVIDIA's own RTX 5090 kernel row is 1.08× (1045.4 s to 971.6 s) before sparsity and cache. CLAIMED BY SOURCE. If your kernel pass lands near there, you are in a familiar neighbourhood. You have not reproduced their row.",
  },
  {
    type: "code",
    label: "modules/01-compile/compile_step.py — UNTESTED, requires CUDA and torch",
    code: `class Block(nn.Module):
    def __init__(self, d: int):
        super().__init__()
        self.w = nn.Parameter(torch.empty(d, d))
        nn.init.normal_(self.w, std=0.02)
    def forward(self, x):
        var = x.pow(2).mean(-1, keepdim=True)
        y = x * torch.rsqrt(var + 1e-6)
        return y @ self.w.T

def bench(d=768, s=1024):
    m = Block(d).cuda().bfloat16()
    x = torch.randn(1, s, d, device="cuda", dtype=torch.bfloat16)
    eager = lambda: m(x)
    fused = torch.compile(m, mode="reduce-overhead")
    # time_ms from Module 0. Do not capture until warmup has run.
    return time_ms(eager), time_ms(lambda: fused(x))`,
  },
  {
    type: "note",
    tag: "Failure you should hit on purpose",
    text: "Capture at sequence 1024, then call the graph at 2048. Record the error in the PR. A graph that has never failed in your hands is a graph you have not tested.",
  },
  {
    type: "p",
    text: "QKV merge. Stack the three weight matrices that share an input, one GEMM, then split. If K and V are narrower (grouped-query), split with the real widths. The win is one read of the activation and one launch. It shrinks when each projection already fills the GPU.",
  },
  {
    type: "table",
    headers: ["Check", "Pass", "Status in this preview"],
    rows: [
      ["activation_traffic_ratio(any n>0)", "Exactly 2.0", "MEASURED by unit test"],
      ["Eager vs compiled step time", "Both numbers, same shape, N stated", "UNTESTED"],
      ["Norm kernel in the compiled trace", "Gone, or an explanation of the use that kept it", "UNTESTED"],
      ["Shape-change behaviour of the graph", "Documented failure", "UNTESTED"],
    ],
  },
];

const skeleton = (id: string): Block[] => {
  const common: Record<string, Block[]> = {
    "2": [
      { type: "p", text: "Write one fused kernel in Triton. RMSNorm with an affine scale, or a linear epilogue that applies a bias and writes the residual add. Match eager PyTorch. Then time it. Then put the point on a roofline whose peak you can defend." },
      { type: "ul", items: [
        "Acceptance: torch.testing.assert_close against eager, tolerance stated, including a negative-valued input.",
        "Acceptance: benchmark process does not include autotune search time.",
        "Acceptance: one rejected tile size with a reason (spill, tail, occupancy).",
        "CUTLASS or CuTe DSL is optional and only after the Triton test is green.",
      ]},
      { type: "note", tag: "UNTESTED", text: "No Triton in this preview. Do not invent a microbenchmark to fill the table." },
    ],
    "3": [
      { type: "p", text: "Implement tiled attention for a short sequence, compared with scaled_dot_product_attention. Then add a block mask that actually skips tiles. Sweep exact-block density at three points. Quality is distance to the dense output." },
      { type: "ul", items: [
        "Acceptance: peak memory grows slower than sequence squared on the short-sequence test, or you explain why the allocator hides it.",
        "Acceptance: a mask applied after a full matmul does not count as sparse. The profiler has to show the skipped work.",
        "Acceptance: if you implement a sink, its length comes from the model's token layout, not from the number 951.",
      ]},
      { type: "note", tag: "Claims to read, not to paste", text: "Spark-H3, Sol-Attn, Token2Tile and Sol³ are in Sources. Quote them with the URL. Your table is empty until you fill it." },
    ],
    "4": [
      { type: "p", text: "Implement the first-block residual gate on the synthetic DiT. Sweep the threshold. Plot skip rate and error against step, then against three chained segments. Include the broken run that forgets to reset the cache." },
      { type: "ul", items: [
        "Acceptance: at threshold 0 the output matches the uncached loop within tolerance.",
        "Acceptance: a segment-cut test fails if the cache is reused, and passes if it is cleared.",
        "Acceptance: the shipped threshold is one point on a curve, not a single still you liked.",
      ]},
      { type: "note", tag: "SIMULATED drill", text: "The in-browser cache drill uses a teaching model of error. It is not FBCache on H3. Use it to learn the shape of the bug, then replace it with your measurement." },
    ],
    "5": [
      { type: "p", text: "Quantise one GEMM. Keep softmax and the residual add wider. Name the format, the scale axis, and the SM you ran on. If the kernel fell back, the timing is not an FP8 result." },
      { type: "ul", items: [
        "Acceptance: same seed, BF16 versus low precision, a numeric quality delta.",
        "Acceptance: calibration data listed in LICENSES.md.",
        "Acceptance: an assertion on device capability, not a silent else branch.",
        "NVFP4: read the toolkit doc for the block size. This site does not state one.",
      ]},
    ],
    "6": [
      { type: "p", text: "You are not building vLLM. You are writing a serving note that could not be confused with a diffusion queue, plus a test that runs two different jobs back to back without sharing a graph or a residual." },
      { type: "ul", items: [
        "Acceptance: the note names the batching unit (token, sequence, clip, or step).",
        "Acceptance: a regression test with two shapes in one process.",
        "Acceptance: speculative decoding, if you touch it, reports acceptance rate and does not keep draft tokens after a rejection.",
      ]},
    ],
    "7": [
      { type: "p", text: "Three runs, one operating point. Dense baseline. Kernels. Kernels plus sparse attention. Kernels plus sparse attention plus cache. LPIPS against the dense run, per segment if you chain clips. A blind paired protocol written down before you watch, or an explicit statement that you did not run one." },
      { type: "ul", items: [
        "Portfolio: commit, GPU, SM, driver, torch, triton, CUDA, shape, steps, seed, dtype, licence note, timings, quality, one paragraph on what broke.",
        "Leaderboard: only rows that clear a quality gate you set before seeing the ranking. This site's local board records simulated drills separately and will not accept a typed-in 4.52.",
        "Do not write 'reproduced Sol' unless the experiment matches. 'Attempted the stack' is a complete sentence.",
      ]},
      { type: "table", headers: ["Row", "What may change", "What may not"], rows: [
        ["Kernels", "Fusion, compile, your kernel", "Steps, seed, resolution, sampler, weights"],
        ["+ sparse", "The attention approximation", "Everything in the kernels row except attention"],
        ["+ cache", "The skip gate", "Everything in the sparse row except the cache"],
      ]},
    ],
  };
  return common[id] ?? [];
};

export function lessonFor(id: string): Block[] {
  if (id === "0") return m0;
  if (id === "1") return m1;
  return skeleton(id);
}

export const rubrics: Record<string, string[]> = {
  "0": [
    "Times use one stated protocol on both sides of every ratio.",
    "At least one op is classified memory-bound or compute-bound from intensity and a ridge you can source.",
    "The write-up says what the number excludes (cold start, host copies, other steps).",
  ],
  "1": [
    "Eager and compiled numbers share a shape, a dtype and a sample count.",
    "A trace or a dump shows whether the norm fused.",
    "A CUDA graph is either shown to reject a bad input, or not used.",
  ],
  "2": [
    "Numerical test against eager, including an awkward sign and a tail length.",
    "Benchmark excludes search time and names the tile.",
    "Roofline peak is measured or labelled as an estimate.",
  ],
  "3": [
    "Dense reference exists.",
    "Sparsity is visible as skipped work, not as a mask of zeros after a dense GEMM.",
    "Three densities, three quality numbers, one operating point.",
  ],
  "4": [
    "Threshold curve, not a single point.",
    "Segment-cut reset tested both ways.",
    "No claim that a scalar mean residual protects a local region.",
  ],
  "5": [
    "Format, scale, SM, and fallback behaviour are explicit.",
    "Quality delta on a fixed seed.",
    "Calibration data licensed.",
  ],
  "6": [
    "Batching unit named.",
    "Two-job test does not share a graph or a cache entry.",
    "Decode techniques are not quietly relabelled as video techniques.",
  ],
  "7": [
    "Ablation changes one mechanism per row.",
    "LPIPS (or a stated substitute) against dense, per segment if segments exist.",
    "Licence note present. No borrowed headline ratio.",
  ],
};
