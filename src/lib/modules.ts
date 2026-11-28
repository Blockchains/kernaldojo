export type Hack = {
  title: string;
  why: string;
  code: string;
  bench: string;
  fails: string;
  source: string;
};

export type Choice = { id: string; text: string; correct?: boolean };

export type Question = {
  prompt: string;
  choices: Choice[];
  explain: string;
};

export type Bug = {
  title: string;
  symptom: string;
  code: string;
  choices: Choice[];
  explain: string;
};

export type ModuleMeta = {
  id: string;
  code: string;
  title: string;
  hours: number;
  tier: string;
  vram: string;
  runtime: string;
  prereq: string;
  outcomes: string[];
  deliverable: string;
  summary: string;
  /** One idea the module is for. Not a slogan. */
  insights: string[];
  depth: "full" | "skeleton";
};

export const modules: ModuleMeta[] = [
  {
    id: "0",
    code: "M0",
    title: "Setup, profiling, roofline",
    hours: 8,
    tier: "Any GPU, or CPU for the arithmetic",
    vram: "None for the drill. 8 GB if you profile a tiny PyTorch model.",
    runtime: "Under an hour for the smoke path.",
    prereq: "Python, basic PyTorch tensors.",
    outcomes: [
      "From FLOPs, bytes, a peak and a bandwidth, compute intensity, the ridge, the bound, and the roofline time. The unit test is the answer key for the arithmetic.",
      "Time one region with a stated protocol (CUDA events, or an explicit UNTESTED) and write what that number excludes: warmup, copies, other steps.",
      "Put token-by-token decode and a diffusion step on a ridge you calculated, and say which lever is wasted on each.",
    ],
    deliverable: "A profile note: one trace, one roofline point, one sentence on the bound.",
    summary:
      "You cannot speed up a kernel you have not located. This module is the measurement habit the rest of the programme depends on.",
    insights: [
      "A ratio without a protocol is not a measurement. Warmup, synchronisation, sample count, and the work you left out belong in the same sentence as the number.",
      "Left of the ridge, rewriting the math does not move the timer. Fusion is a byte delete. Tensor cores are a math upgrade. They are not interchangeable.",
      "Decode of one token is usually a memory system that happens to multiply. A video step is a long activation plus attention. Porting a decode trick onto a sampler and expecting the same factor is the first way this programme goes wrong.",
    ],
    depth: "full",
  },
  {
    id: "1",
    code: "M1",
    title: "Compilation and fusion",
    hours: 10,
    tier: "Tier A. CUDA graphs want a fixed shape.",
    vram: "8 GB for the synthetic block. 24 GB if you point it at a small video DiT.",
    runtime: "Tens of minutes for compile-once benchmarks. First compile can be slow.",
    prereq: "Module 0.",
    outcomes: [
      "Name the compile mode you used and which of fusion, autotune, or a CUDA graph you actually got. A flag you set is not evidence the graph replayed.",
      "Show the activation-byte model: eager traffic over fused traffic is 2 on the norm’s intermediate, and say why that is not a 2× step.",
      "Either capture the error from replaying a graph at a new sequence length, or state that you did not capture a graph.",
    ],
    deliverable: "PR with eager vs compiled timings on the synthetic block, plus the byte-count table.",
    summary:
      "Most of a diffusion step is not a mysterious kernel. It is a parade of small memory round-trips. Fusion deletes the parade.",
    insights: [
      "On the published RTX 5090 table the kernel row is about 1.08× (1045.4 s to 971.6 s). The large factor shows up only after cache, and cache is an approximation. If your story needs fusion to be ‘the’ speedup, you are reading the wrong row. CLAIMED BY SOURCE, not a result from this repo.",
      "A CUDA graph that has never thrown has not been tested. Shape changes, fresh allocations, and a host read inside the region are the three failures worth provoking on purpose.",
      "Quoting the first call, which includes compile and autotune, makes every later run look like a regression. Report warmup and steady state as two numbers.",
    ],
    depth: "full",
  },
  {
    id: "2",
    code: "M2",
    title: "Writing a real kernel",
    hours: 16,
    tier: "Tier A. Triton first. CUDA C++ only after the Triton kernel matches PyTorch.",
    vram: "8 GB.",
    runtime: "A day of iteration, not a single run.",
    prereq: "Modules 0 and 1. Comfort reading a small GPU kernel.",
    outcomes: [
      "Pass assert_close against eager PyTorch on a fixed seed, including a negative input and a length that is not a multiple of the tile.",
      "Time the kernel with search excluded, name the winning tile, and name one tile you rejected and why.",
      "Place the kernel on a roofline whose peak is measured or labelled ESTIMATE. Do not borrow a vendor peak and call it yours.",
    ],
    deliverable: "Kernel, test, roofline plot, short failure note.",
    summary:
      "Triton is the first language. CUTLASS or CuTe comes after you can explain the Triton result, not before.",
    insights: [
      "A kernel that is fast and wrong is a different function. Numerics are the gate. The timer is what you open after the gate.",
      "Large square GEMMs are a library problem. Write the kernel where fusion removes a round trip the library cannot see, not where cuBLAS already sits on the ridge.",
      "The tile that wins at a long sequence often loses on a short one, because the launch and the masked tail dominate. Ship the shape you measured.",
    ],
    depth: "skeleton",
  },
  {
    id: "3",
    code: "M3",
    title: "Attention, exact and sparse",
    hours: 16,
    tier: "Tier A for a short sequence. Tier B if you approach real video token counts.",
    vram: "16 GB for sequences that start to stress attention. Full video frames can exceed 24 GB.",
    runtime: "Hours if you sweep density. Minutes for the unit test.",
    prereq: "Module 2. You can read an online-softmax sketch.",
    outcomes: [
      "Match a dense reference on a short sequence, including a causal or padding mask, before you drop any block.",
      "Show in a profile that skipped tiles were not computed. A mask of zeros after a full GEMM is not sparsity.",
      "Report speed and a numeric distance to the dense output at three densities, at one operating point.",
    ],
    deliverable: "Density sweep: speed and a numeric quality delta at three densities.",
    summary:
      "Video DiTs spend the step on attention over a long token axis. Sparse methods only help if the tiles still match the GPU.",
    insights: [
      "Not materialised is not the same as not computed. FlashAttention is exact tiled attention. Sol-Attn, as NVIDIA describe it, still approximates the blocks it does not compute exactly. Zeroing those blocks is a third algorithm. Name which one you ran.",
      "A diagonal you deleted, or a text prefix you treated as ordinary video tokens, will not show up as a big LPIPS move and will show up as a clip that ignores the prompt.",
      "A cutoff such as ‘first 10 steps and first two layers stay dense’ is someone else’s policy for a 50-step sampler. On a 4-step distilled sampler it is a new experiment. Say so.",
    ],
    depth: "skeleton",
  },
  {
    id: "4",
    code: "M4",
    title: "Step caching",
    hours: 12,
    tier: "Tier A on the synthetic DiT. Tier B before you trust a long video.",
    vram: "Same as the model you cache. The cache itself is a residual, not a second copy of the weights.",
    runtime: "A sweep of thresholds is an afternoon.",
    prereq: "Module 3. You understand a denoising loop.",
    outcomes: [
      "At a threshold of zero, match the uncached loop within a tolerance you wrote down first.",
      "Plot skip rate and error against step, then across a segment boundary with the cache cleared and with it kept.",
      "Ship one threshold as a point on that curve, plus the rule that makes you refuse to skip.",
    ],
    deliverable: "Threshold curve plus a written rule for when you refuse to skip.",
    summary:
      "On the published RTX 5090 ablation, cache — not the kernel pass — is where the large factor appears. It is also where quality quietly dies.",
    insights: [
      "If deciding to skip costs a full forward, you did not skip anything. The probe (a timestep residual, or the first block) has to be cheaper than the work it cancels.",
      "Error integrates. A segment can look acceptable and still hand the next segment a biased latent. Score the join, not only segment one. The in-repo error_horizon.py is a teaching model of that accumulation, marked SIMULATED, not a DiT.",
      "An absolute threshold tracks magnitude, not change. When activations grow, a fixed L2 either never hits or always hits. Use a relative delta, and log the scale beside the hit rate.",
    ],
    depth: "skeleton",
  },
  {
    id: "5",
    code: "M5",
    title: "Low precision",
    hours: 12,
    tier: "FP8 wants Hopper or newer for tensor-core paths. NVFP4 is a Blackwell topic.",
    vram: "Drops versus BF16, which is the point. Still budget the master copy if you calibrate.",
    runtime: "Calibration can exceed the timed run. Do not hide it.",
    prereq: "Modules 1 and 2.",
    outcomes: [
      "Quantise one GEMM, keep the residual add and the softmax in a wider type, and show a case where doing it backwards destroys the update.",
      "Report a quality delta against BF16 on a fixed prompt and seed, and name the scale axis.",
      "Name the device capability the kernel ran on. A silent fallback to BF16 is not a low-precision result.",
    ],
    deliverable: "BF16 vs low-precision table with a calibration note.",
    summary:
      "Four-bit formats are not a free memory win. Outliers and the wrong scale axis show up as texture, not as a NaN.",
    insights: [
      "A few outlier channels set a per-tensor scale. Everyone else then rounds toward zero. The picture goes flat before you ever see a NaN. Look at a histogram before you pick the scale.",
      "Store narrow, accumulate wide. Casting the residual add is how a small update disappears inside the quantum of the activation.",
      "NVFP4 in the Sol-H3 two-stage README is a different pipeline and a different timing boundary from the BF16 4.52× table. Do not put them in one bar.",
    ],
    depth: "skeleton",
  },
  {
    id: "6",
    code: "M6",
    title: "Serving and scale",
    hours: 14,
    tier: "Tier A for a batching toy. Multi-GPU is Tier B or a rental.",
    vram: "KV cache, not weights, is what exhausts a long LLM decode. Video jobs exhaust activations.",
    runtime: "An overnight queue is part of the lab, not a failure.",
    prereq: "Modules 0–3. Module 5 helps but is not required.",
    outcomes: [
      "Name the batching unit (token, sequence, clip, or diffusion step) and show that pad tokens are not billed as work.",
      "Explain paged KV as a fix for fragmentation in decode, and say why a non-autoregressive DiT often has nothing to page.",
      "Write an admission rule with a memory budget so one oversized job cannot kill the queue behind it.",
    ],
    deliverable: "A serving note: batch policy, memory budget, what you refuse to share.",
    summary:
      "Decode and diffusion both queue work onto a GPU. They do not share a cache design. Treating them as one system is a bug.",
    insights: [
      "Continuous batching helps when requests finish at different times. A 50-step sampler usually wants the batch to take the steps together. Mixing step 3 with step 20 in one GEMM is a different scheduler, not a free lunch.",
      "Speculative decoding is exact only with the rejection check. Drop the check and you shipped the draft model, then timed it.",
      "A retry that silently halves resolution has changed the contract. Log the new shape or fail the job.",
    ],
    depth: "skeleton",
  },
  {
    id: "7",
    code: "M7",
    title: "Capstone",
    hours: 24,
    tier: "Tier A if the target is the synthetic DiT or a small Apache-licensed video model that fits. Tier B for larger open video DiTs.",
    vram: "State it in the PR. Do not download MiniMax-H3 weights to chase the headline number.",
    runtime: "A real ablation is a day of GPU time plus the quality review.",
    prereq: "Modules 0–4. Module 5 if you touch precision.",
    outcomes: [
      "Publish four rows that share a seed, a decode path, and a step count: dense, kernels, plus sparse attention, plus cache.",
      "Score quality against the dense row (LPIPS or a stated substitute), including the join if you chained segments.",
      "Run a blind paired preference with the protocol fixed beforehand, or write the sentence that says you did not.",
    ],
    deliverable: "Portfolio write-up that a stranger can re-run from the PR.",
    summary:
      "The capstone is an ablation, not a demo reel. If you cannot name the step count, resolution, seed and licence, you do not have a result.",
    insights: [
      "One variable per row. A new seed, a JPEG on one arm, or a different step count is a second experiment hiding inside the first.",
      "LPIPS can miss flicker, hands, and identity drift that a person cannot. That is why the blind protocol exists. A small N is an estimate of preference, not a proof. Say the N.",
      "‘Reproduced Sol’ is a claim about the operating point, not about the stack of ideas. ‘Attempted the stack on this model, at this shape’ is a complete and honest sentence.",
    ],
    depth: "skeleton",
  },
];

export function moduleById(id: string) {
  return modules.find((m) => m.id === id);
}
