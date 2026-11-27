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
    text: "Worked arithmetic, the same numbers the unit test checks. Peak 200 TFLOP/s and bandwidth 2 TB/s put the ridge at 100 FLOP/byte. Four FLOPs moving four bytes is intensity 1, which is memory-bound: the roofline time is the byte time, not the FLOP time. A thousand FLOPs on those same four bytes is intensity 250, which is compute-bound. If you cannot reproduce that with a pencil, do not open a profiler yet.",
  },
  {
    type: "note",
    tag: "Wrong conclusion",
    text: "‘The kernel uses Tensor Cores, so it is compute-bound.’ Tensor Cores raise the ridge. They do not move a streaming copy onto the right-hand side. Check intensity first.",
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
    tag: "Wrong conclusion",
    text: "‘Compiled was slower, so compile does not work.’ You timed the compile. Run the warmup, then time the replay. If it is still slower, then you have a result: say whether a graph recaptured because the address changed. Also capture at sequence 1024 and call it at 2048. Record the error. A graph that has never failed has not been tested.",
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
      { type: "p", text: "Write one fused kernel in Triton. RMSNorm with an affine scale, or a bias plus residual in the epilogue of a GEMM. The reference is eager PyTorch. The point of the kernel is a round trip you can point at in the byte count, not a new algorithm." },
      { type: "p", text: "Order of work. Get allclose green on a multiple of the tile and on a tail (N = BLOCK + 17). Then autotune. Then time, with the search outside the timer. Then place FLOPs and bytes on the Module 0 roofline. If you reverse that order you will tune a kernel that drops the last rows." },
      { type: "ul", items: [
        "Mask the tail on both the load and the store. For scores, the masked fill is a large negative, not zero. Zero is a real logit.",
        "Acceptance: torch.testing.assert_close, tolerance written next to the dtype. FP16 is not FP32.",
        "Acceptance: the benchmark process does not include autotune search time, and the winning config is in the JSON.",
        "Acceptance: one rejected tile, with a reason (spill, tail waste, or a short sequence where eager wins).",
        "CUTLASS or CuTe is optional, and only after the Triton test is green. A second language is not a result.",
      ]},
      { type: "note", tag: "Wrong conclusion", text: "‘Occupancy is 100%, so the kernel is fast.’ Occupancy is a means. Achieved bandwidth or a passing roofline is the result. A tile that uses too many registers can be slower at higher occupancy than a smaller tile that hits the memory ceiling." },
      { type: "note", tag: "UNTESTED", text: "No Triton in this preview. Do not invent a microbenchmark to fill the table." },
    ],
    "3": [
      { type: "p", text: "Build or call an exact tiled attention and match scaled_dot_product_attention on a short sequence, mask included. Only then add a block rule. If the exact kernel is already faster than eager materialised softmax, that gap is tiling, not sparsity. Put it in its own row or you will congratulate the wrong change." },
      { type: "p", text: "Three different sparse ideas get conflated in write-ups. Exact tiled attention computes every score, just not all at once. A hard drop sets low-mass blocks to zero and throws their softmax mass away. Sol-Attn, as the NVIDIA note describes it, keeps a cheap proxy for the blocks it does not compute exactly, inside the online softmax. Your PR has to say which of the three you implemented. ‘Sparse attention’ is not a name." },
      { type: "ul", items: [
        "Acceptance: a profile shows the skipped tiles were not launched. A zero mask after a dense GEMM does not count.",
        "Acceptance: the diagonal, and any text prefix the model uses as a sink, stay exact unless the experiment is specifically about dropping them. Then expect prompt adherence to die and say so.",
        "Acceptance: three densities, three distances to the dense output, one shape, one seed, one step count.",
        "A cutoff copied from a 50-step policy (first 10 steps, first two layers dense) is a new experiment on a 4-step sampler. Label it as yours.",
      ]},
      { type: "note", tag: "Wrong conclusion", text: "‘LPIPS barely moved, so the method is lossless.’ LPIPS is a frame distance. Flicker, hands, and a prompt that stopped steering can hide under a small mean. Keep one nasty frame and look at it. The capstone’s blind pairs exist because of this." },
      { type: "note", tag: "Claims to read, not to paste", text: "Spark-H3, Sol-Attn and Sol³ are on the Sources page. Quote the URL and the workload. Your table stays empty until you fill it." },
    ],
    "4": [
      { type: "p", text: "A skip is only a skip if the decision is cheaper than the step. TeaCache’s probe is the timestep embedding’s residual. First Block Cache’s probe is the relative change of the first block. Both are bets that a small probe means the rest of the network barely moved. Verify the bet on your model. Do not import the threshold." },
      { type: "p", text: "The teaching model in public/programme/modules/04-cache/error_horizon.py is not a DiT. Signal is U-shaped: high at the first and last step, low in the middle. A skip adds a fixed drift. A dense step, a forced refresh, or a segment reset sets the running error back to zero. The unit test checks four facts you should be able to say out loud: threshold 0 never drifts; an aggressive threshold drifts every step; a forced refresh bounds the run of skips; a reset at a boundary beats carrying the error across." },
      {
        type: "code",
        label: "SIMULATED — error_horizon.trace",
        code: `def signal(t, steps):
    # 1 at both ends, 0 in the middle
    return abs((t / (steps - 1)) - 0.5) * 2

# dense if threshold <= 0, or signal >= threshold,
# or t hits force_every, or t is a segment reset.
# else error += drift`,
      },
      { type: "ul", items: [
        "Acceptance: threshold 0 matches the uncached loop within a tolerance you wrote down before looking.",
        "Acceptance: the segment-cut test fails if the cache is reused and passes if it is cleared. Score the concatenation.",
        "Acceptance: the shipped threshold is one marked point on a curve of skip rate versus error.",
        "Use a relative delta. An absolute L2 tracks the scale of the activation and will look like ‘the cache stopped working’ halfway through a clip.",
      ]},
      { type: "note", tag: "Wrong conclusion", text: "‘Reuse rate is 70%, close to the 67% in the H100 write-up, so the method matches.’ Reuse rate is not quality, and their 67.35% is one claimed run on MiniMax-H3. Your percentage on a toy is a different fact." },
      { type: "note", tag: "SIMULATED drill", text: "python -m unittest discover -s public/programme/modules/04-cache -p 'test_*.py'. The in-browser drill is the same idea. Neither is FBCache on H3." },
    ],
    "5": [
      { type: "p", text: "Quantise the tensor you store. Accumulate the math wider. The failure mode to provoke: a residual a hundred times smaller than the activation, cast to the storage type before the add, vanishes. The block then ignores the update and the picture goes mushy without a NaN to alert you." },
      { type: "p", text: "Per-tensor scale is a hypothesis. Eight outlier channels set the quantum; the bulk rounds to nothing. Mask padding before you take amax. A batch that is half zeros will lie about the scale. Histogram, then scale, then a single GEMM against FP32, then a video. Do not start at the video." },
      { type: "ul", items: [
        "Acceptance: same seed, BF16 versus the narrow format, a numeric quality delta, calibration set named.",
        "Acceptance: an explicit check of device capability. A silent else that runs BF16 must not be labelled FP8 or NVFP4.",
        "Acceptance: the narrow run is its own row. It is not folded into a BF16 ablation you are comparing with someone else’s table.",
        "Read the MiniMax-H3 community licence before any weight download. This module does not assume the weights are yours to use.",
      ]},
      { type: "note", tag: "Wrong conclusion", text: "‘The Sol-H3 README uses NVFP4 and finishes in about 40 seconds, so the 4.52× BF16 pipeline is the same speed.’ Those are different recipes and different timing boundaries. Cite them separately or not at all." },
    ],
    "6": [
      { type: "p", text: "You are not building vLLM. You are writing a note that cannot be confused with a diffusion queue, plus a test that runs two jobs back to back without sharing a graph or a residual." },
      { type: "p", text: "Paged attention exists because decode KV caches fragment. A finished request must return pages without a copy. A full-frame DiT recomputes Q, K and V every step; there is often no growing cache to page. Autoregressive video is the exception, and the exception has to be named. Speculative decoding is exact only while the rejection check stands." },
      { type: "ul", items: [
        "Acceptance: the note names the batching unit. Pads are either skipped by the kernel or absent. A static pad to the longest sequence is a cost you measured or removed.",
        "Acceptance: admission checks a byte budget. One 33B resident model plus a second copy is a refused job, not an OOM of the worker.",
        "Acceptance: a resolution change is logged as a different contract. Silent 768p to 480p retries fail review.",
        "Report seconds per clip at a stated shape, step count and warmup. Tokens per second is the wrong unit for a sampler.",
      ]},
      { type: "note", tag: "Wrong conclusion", text: "‘We added paged attention to the video server.’ If the model is not autoregressive, say what you paged. If the answer is ‘nothing’, delete the paragraph." },
    ],
    "7": [
      { type: "p", text: "Four rows, one operating point. Dense baseline. Kernels only. Kernels plus the attention approximation you named in Module 3. That stack plus the cache you named in Module 4. Nothing else moves: seed, sampler, steps, resolution, decode path, file writer." },
      { type: "p", text: "Quality is two instruments. LPIPS (or a substitute you define) against the dense row, mean and worst frame, and on the concatenation if you chained segments. A blind paired preference whose protocol was written before you looked, with N stated. Small N stays an estimate. Skipping the pairs is allowed if the PR says you skipped them." },
      {
        type: "table",
        headers: ["Row", "What may change", "What may not"],
        rows: [
          ["Dense", "Nothing. This is the reference.", "Seed, steps, resolution, sampler, weights, decoder"],
          ["Kernels", "Fusion, compile, your kernel", "Everything in the dense row"],
          ["+ sparse", "The attention approximation only", "Everything in the kernels row except attention"],
          ["+ cache", "The skip gate only", "Everything in the sparse row except the cache"],
        ],
      },
      { type: "ul", items: [
        "Portfolio: commit, GPU, SM, driver, torch, triton, CUDA, shape, steps, seed, dtype, licence note, timings with N, quality, one paragraph on what broke.",
        "A 1.05× whose run-to-run spread is ±0.08 is not a speedup. Report the spread and stop.",
        "Do not write ‘reproduced Sol’ unless the operating point matches. ‘Attempted the stack’ is a complete sentence.",
        "The leaderboard script refuses a row with a missing field, a step mismatch, or LPIPS above the gate you set first.",
      ]},
      { type: "note", tag: "Wrong conclusion", text: "‘Our number is 4.52× because the blog’s number is 4.52×.’ That sentence fails the module even if your code is fast." },
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
