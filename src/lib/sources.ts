export type Source = {
  title: string;
  date: string;
  url: string;
  use: string;
};

export const sources: Source[] = [
  {
    title: "Sol Video Inference Engine (arXiv:2606.23743)",
    date: "2026-06, HTML v2 read as 24 Jun 2026",
    url: "https://arxiv.org/abs/2606.23743",
    use: "The stack this programme studies: cache, sparse attention, token pruning, quantisation, kernel fusion. Claim of >2× on Cosmos3-Super, LTX-2.3 and SANA-Video is theirs, not ours.",
  },
  {
    title: "Deploy MiniMax-H3 on DGX Spark and RTX 5090",
    date: "3 Aug 2026",
    url: "https://nvlabs.github.io/Sana/Sol-Engine/H3-OnDevice/",
    use: "The 4.52× table: 1045.4 s → 971.6 s (kernels, 1.08×) → 708.3 s (Sol-Attn, 1.48×) → 231.2 s (cache, 4.52×) on an RTX 5090 at 768p. DGX Spark 3.92× is stated on the same page; this build did not re-copy the Spark baseline row.",
  },
  {
    title: "Deploy MiniMax-H3 on H100 and A100",
    date: "9 Aug 2026",
    url: "https://nvlabs.github.io/Sana/Sol-Engine/H3-DataCenter/",
    use: "4×H100 81.47 s → 22.89 s (3.56×); 4×A100 217.32 s → 61.28 s (3.55×). Policy: first 10 steps and first two layers dense, tau=1.0, 951-token exact prefix, 18.04% route density, 67.35% FBCache reuse.",
  },
  {
    title: "Sol-Attn kernel support",
    date: "Docs page fetched 25 Nov 2026",
    url: "https://nvlabs.github.io/Sana/Sol-Engine/docs/techniques/sparse/sol_attn/",
    use: "Online block routing with proxy correction. CuTe on SM90/SM100/SM120, Triton elsewhere. Citation key arXiv:2607.24027 as given on that page.",
  },
  {
    title: "Sol-H3 on 8× B300",
    date: "Project page, read 27 Nov 2026",
    url: "https://nvlabs.github.io/Sana/Sol-Engine/Sol-H3/",
    use: "8×B300, 5 s, 124 frames, 1344×768: dense 50-step 18.250 s versus Sol-H3 4-step 1.653 s (11.04×). Step counts differ. Not a kernel ablation.",
  },
  {
    title: "Spark-H3 (arXiv:2611.24256)",
    date: "18 Nov 2026",
    url: "https://arxiv.org/abs/2611.24256",
    use: "Training-free block-sparse attention on MiniMax-H3. 10% density: 2.49× DiT, 24.81 dB PSNR vs dense. 20%: 2.26×, 26.76 dB. Conditions: 20 steps, 345 frames, 1344×768.",
  },
  {
    title: "Sol³ (arXiv:2611.32562)",
    date: "24 Nov 2026",
    url: "https://arxiv.org/abs/2611.32562",
    use: "Hierarchical sparse routing. Claims 86% attention sparsity and 3.07× attention speedup. Code URL on the abstract was not verified in this build.",
  },
  {
    title: "Token2Tile (arXiv:2611.17930)",
    date: "13 Nov 2026",
    url: "https://arxiv.org/html/2611.17930",
    use: "Per-query scores with tile execution. Claims 1.48–1.54× end-to-end vs dense FlashAttention-3 on MiniMax-H3 and Wan2.1-14B.",
  },
  {
    title: "ParaAttention — First Block Cache",
    date: "README as indexed; Diffusers hook at v0.38.0",
    url: "https://github.com/chengzeyi/ParaAttention",
    use: "Definition of FBCache: first-block residual as the skip probe. Diffusers hook: https://github.com/huggingface/diffusers/blob/v0.38.0/src/diffusers/hooks/first_block_cache.py",
  },
  {
    title: "TeaCache (arXiv:2411.19108)",
    date: "2024 paper, cited by Diffusers as the ancestor",
    url: "https://huggingface.co/papers/2411.19108",
    use: "Timestep-embedding cache. Not the same algorithm as First Block Cache. Do not mix the citations.",
  },
  {
    title: "ToCa (arXiv:2410.05317, ICLR 2025)",
    date: "2025",
    url: "https://arxiv.org/pdf/2410.05317",
    use: "Token-wise feature caching. Claimed 2.36× on OpenSora. Background for Module 4, not a lab dependency.",
  },
  {
    title: "BWCache (arXiv:2509.13789)",
    date: "2025",
    url: "https://arxiv.org/abs/2509.13789",
    use: "Block-wise cache with a similarity gate. Claimed up to 2.24×. Another point on the same design space.",
  },
  {
    title: "FlashAttention",
    date: "2022 / 2023",
    url: "https://arxiv.org/abs/2205.14135",
    use: "Tiled online softmax. Module 3's exact-attention baseline pattern. FlashAttention-2: https://arxiv.org/abs/2307.08691",
  },
  {
    title: "PagedAttention / vLLM",
    date: "SOSP 2023",
    url: "https://arxiv.org/abs/2309.06180",
    use: "Module 6. Block tables for KV. Not a video-activation design.",
  },
  {
    title: "PyTorch 2.7 and Blackwell wheels",
    date: "2.7 release blog; later versions are secondary reports",
    url: "https://pytorch.org/blog/pytorch-2-7",
    use: "First official Blackwell + CUDA 12.8 wheels, Triton 3.3 in that release. Do not treat 2.7 as the current pin.",
  },
  {
    title: "Compute capability map",
    date: "Journal page updated 23 Sep 2026",
    url: "https://journal.qualiteg.com/pytorch_and_supported_gpu_version/",
    use: "sm_120 RTX 50 / RTX PRO 6000 Blackwell, sm_121 GB10, sm_100 B200, CUDA 12.8 minimum stated for those Blackwell parts. Secondary compilation of NVIDIA tables — confirm with nvidia-smi on the box.",
  },
  {
    title: "PyTorch on DGX Spark",
    date: "7 Nov 2026",
    url: "https://gpuwerk.com/dgx-spark/guides/pytorch-on-dgx-spark/",
    use: "Secondary pin note: torch 2.15.0 (28 Oct 2026) cu132, Triton 3.9.0, and a warning that GB10's sm_121 can run sm_120 SASS. UNTESTED here. Match the Spark's own CUDA before you upgrade past the OS.",
  },
  {
    title: "Wafer AI performance reading list",
    date: "Repository as indexed Nov 2026",
    url: "https://github.com/wafer-ai/gpu-perf-engineering-resources",
    use: "Map of the field (roofline, Triton, CUTLASS, engines). Not a source of timings.",
  },
  {
    title: "LTX-2.x community licence",
    date: "Page fetched Nov 2026",
    url: "https://ltx.io/model/license",
    use: "Revenue threshold reported at $10M annual, plus an acceptable-use policy and a machine-generated disclosure. Read it before any LTX capstone.",
  },
  {
    title: "Weight-licence secondary summaries",
    date: "Fuser 29 Sep 2026; AIPex 25 Sep 2026",
    url: "https://fuser.studio/articles/best-open-source-video-models",
    use: "MiniMax-H3 territory limits (US, EU, UK, South Korea reported excluded) and Wan 2.2 Apache-2.0 as reported, not as a substitute for the model card. AIPex: https://aipex.com.au/video-generators-you-can-download/",
  },
];

export const risks: { id: string; title: string; detail: string }[] = [
  {
    id: "licence",
    title: "Weights are not code",
    detail:
      "Modules 0–6 run on a synthetic DiT with random weights (MIT, in the programme files). MiniMax-H3 is the model in NVIDIA's tables. Secondary sources report a community licence that excludes the US, EU, UK and South Korea and limits using outputs to improve other models. This preview is aimed at a learner in the UK. Do not add an H3 download to 'match the blog'. Wan 2.2 is reported Apache-2.0; confirm the model card and paste it into LICENSES.md before use. LTX-2.x has a revenue cap. Cosmos-family models have been reported under the NVIDIA Open Model License. None of this is legal advice.",
  },
  {
    id: "hardware",
    title: "The GPU you do not have",
    detail:
      "Tier A is a 24–32 GB consumer card. Tier B is a 96–128 GB class box (RTX PRO 6000 Blackwell or DGX Spark). Tier C is a rental. Several cited kernels are SM-specific (CuTe on SM90/100/120, Triton elsewhere). A laptop without a GPU can still do Module 0's arithmetic and the simulated drills. It cannot produce a portfolio timing.",
  },
  {
    id: "repro",
    title: "Numbers that will not come back",
    detail:
      "Clocks throttle. Batch, steps, resolution and the sampler move the ratio more than the kernel does. The 11.04× Sol-H3 figure compares 50 steps with 4. The 4.52× figure is one stack on one 5090 configuration. This site measured none of them. A PR that omits the operating point is not reproducible, even if CI is green.",
  },
  {
    id: "quality",
    title: "Error compounds at the cut",
    detail:
      "Cache and sparsity both approximate. Across a step the error can stay small. Across a chain of 15-second segments, a residual that crossed the cut is no longer a small error; later skips treat it as truth. LPIPS on an average frame will hide a bad cut. The capstone asks for per-segment numbers and a blind protocol written down first.",
  },
  {
    id: "pins",
    title: "Versions drift",
    detail:
      "A defensible starting region, not a lock we ran: CUDA 12.8 or newer for Blackwell, PyTorch from the wheel that matches that CUDA. torch 2.7 was the first Blackwell release; a Nov 2026 secondary note points at torch 2.15.0 and Triton 3.9.0 for Spark-class aarch64. Pin whatever you actually import, in the PR. This preview did not import torch.",
  },
  {
    id: "untested",
    title: "This preview cannot run CUDA",
    detail:
      "Kernel listings are specifications. The Python roofline tests are pure arithmetic and were run here. Everything that needs a device is marked UNTESTED. The drills are simulated teaching models. Filing one to the local leaderboard does not create a measurement.",
  },
];

export const plan: { day: string; work: string }[] = [
  { day: "Days 1–2", work: "Module 0. Pin a machine. Run the roofline tests. Profile one eager step of the synthetic block. Write the bound in a sentence." },
  { day: "Days 3–5", work: "Module 1. torch.compile the block. Show the norm disappearing from the trace, or show that it did not and why." },
  { day: "Days 6–10", work: "Module 2. One Triton kernel, a failing test first, then a match, then a roofline of the winner and one loser." },
  { day: "Days 11–15", work: "Module 3. Tiled attention on a short sequence. Then a density sweep with a dense reference. No weight downloads." },
  { day: "Days 16–19", work: "Module 4. First-block gate. Threshold curve. Deliberately break the segment reset and document the spike." },
  { day: "Days 20–22", work: "Module 5, only if the GPU has the units. Otherwise write the fallback you refused to time." },
  { day: "Days 23–25", work: "Module 6 on paper plus a two-job queue test that would have caught the shared-graph bug." },
  { day: "Days 26–30", work: "Capstone ablation on the synthetic DiT, or on a model whose card is in LICENSES.md. Portfolio note. No borrowed 4.52×." },
];

export const nextActions = [
  "Run the pure-Python roofline tests on any machine. They do not need a GPU, and they are the only tests this preview executed.",
  "On the GPU you will actually use, print torch.__version__, torch.version.cuda and get_device_capability(), and put those three strings in the first PR.",
  "Read the MiniMax-H3 licence text before anyone types a from_pretrained. If you are in the UK, assume you are outside the grant until the primary text says otherwise.",
];
