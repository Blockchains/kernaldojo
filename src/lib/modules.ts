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
      "Time a region with synchronisation in the right places, and say what the number does not include.",
      "Classify an op as bandwidth-bound or compute-bound from intensity and a ridge point.",
      "Explain why diffusion steps and LLM decode sit on different sides of that ridge.",
    ],
    deliverable: "A profile note: one trace, one roofline point, one sentence on the bound.",
    summary:
      "You cannot speed up a kernel you have not located. This module is the measurement habit the rest of the programme depends on.",
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
      "Use torch.compile and state which mode you picked and why.",
      "Show a fused RMSNorm + linear moving fewer bytes than the eager chain.",
      "Capture a CUDA graph, and name one input that makes the capture illegal.",
    ],
    deliverable: "PR with eager vs compiled timings on the synthetic block, plus the byte-count table.",
    summary:
      "Most of a diffusion step is not a mysterious kernel. It is a parade of small memory round-trips. Fusion deletes the parade.",
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
      "Ship one fused kernel (RMSNorm-affine or a bias-GELU epilogue) that matches PyTorch within a stated tolerance.",
      "Plot it on a roofline you measured, not one you copied.",
      "Name the tile size that won, and one size that spilled or under-occupied.",
    ],
    deliverable: "Kernel, test, roofline plot, short failure note.",
    summary:
      "Triton is the first language. CUTLASS or CuTe comes after you can explain the Triton result, not before.",
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
      "Implement or call a tiled attention that does not materialise the score matrix.",
      "Profile a training-free sparsity pattern and report exact-block density.",
      "Publish accuracy against the dense output, not against a vibe.",
    ],
    deliverable: "Density sweep: speed and a numeric quality delta at three densities.",
    summary:
      "Video DiTs spend the step on attention over a long token axis. Sparse methods only help if the tiles still match the GPU.",
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
      "Implement a first-block residual gate and a reuse policy.",
      "Plot error against step index, and against a chain of segments.",
      "Show the failure when a cache crosses a shot boundary.",
    ],
    deliverable: "Threshold curve plus a written rule for when you refuse to skip.",
    summary:
      "On the published RTX 5090 ablation, cache — not the kernel pass — is where the large factor appears. It is also where quality quietly dies.",
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
      "Quantise a GEMM, keep the softmax in a wider format, and say why.",
      "Report a quality delta on a fixed prompt and seed.",
      "State the GPU architecture the kernel actually ran on.",
    ],
    deliverable: "BF16 vs low-precision table with a calibration note.",
    summary:
      "Four-bit formats are not a free memory win. Outliers and the wrong scale axis show up as texture, not as a NaN.",
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
      "Contrast static batching, continuous batching, and a diffusion step loop.",
      "Explain paged KV in terms of fragmentation, not slogans.",
      "Leave a queue design for jobs that must not share a warm cache across unrelated clips.",
    ],
    deliverable: "A serving note: batch policy, memory budget, what you refuse to share.",
    summary:
      "Decode and diffusion both queue work onto a GPU. They do not share a cache design. Treating them as one system is a bug.",
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
      "Report three stacked runs: kernels only, plus sparse attention, plus cache.",
      "Quantify quality with LPIPS against the dense run, and run a blind paired preference with the protocol fixed in advance.",
      "Separate your measurement from any published claim.",
    ],
    deliverable: "Portfolio write-up that a stranger can re-run from the PR.",
    summary:
      "The capstone is an ablation, not a demo reel. If you cannot name the step count, resolution, seed and licence, you do not have a result.",
    depth: "skeleton",
  },
];

export function moduleById(id: string) {
  return modules.find((m) => m.id === id);
}
