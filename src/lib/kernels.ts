export type KernelFamily = "Attention" | "Quant" | "Fusion" | "Tiles";

export type KernelFork = {
  id: string;
  name: string;
  family: KernelFamily;
  hack: string;
  caution: string;
  license: string;
  language: string;
  stars: string;
  fork: string;
  upstream: string;
  upstreamName: string;
};

/** Upstream star counts fetched 27 Nov 2026. Forks have no stars of their own. */
export const kernelForks: KernelFork[] = [
  {
    id: "flash-attention",
    name: "FlashAttention",
    family: "Attention",
    hack: "Exact attention. Scores stay in tiles and the softmax is online, so the N² matrix is never stored. Sparse and quantised attention in this shelf are deviations from this, not replacements for it.",
    caution: "Speed on their README is theirs. Nothing on this page was timed here.",
    license: "BSD-3-Clause",
    language: "Python",
    stars: "25,357",
    fork: "https://github.com/Blockchains/flash-attention",
    upstream: "https://github.com/Dao-AILab/flash-attention",
    upstreamName: "Dao-AILab/flash-attention",
  },
  {
    id: "flashinfer",
    name: "FlashInfer",
    family: "Attention",
    hack: "Serving kernels: attention variants, sampling, and a page table for KV cache. Built for LLM decode, where the cache grows token by token.",
    caution: "A DiT that recomputes K and V every step often has nothing for that page table to hold.",
    license: "Apache-2.0",
    language: "CUDA",
    stars: "7,020",
    fork: "https://github.com/Blockchains/flashinfer",
    upstream: "https://github.com/flashinfer-ai/flashinfer",
    upstreamName: "flashinfer-ai/flashinfer",
  },
  {
    id: "sparge",
    name: "SpargeAttention",
    family: "Attention",
    hack: "Training-free sparse attention. The interesting file is the one that skips a tile, not the one that multiplies a mask of zeros after a dense GEMM.",
    caution: "ICML 2025 claims stay in the paper. Your Module 3 table stays empty until you fill it.",
    license: "Apache-2.0",
    language: "CUDA",
    stars: "1,269",
    fork: "https://github.com/Blockchains/SpargeAttn",
    upstream: "https://github.com/thu-ml/SpargeAttn",
    upstreamName: "thu-ml/SpargeAttn",
  },
  {
    id: "sage",
    name: "SageAttention",
    family: "Quant",
    hack: "Attention in INT8 and FP8. The matmul narrows; the online softmax is the part you check before you trust the picture.",
    caution: "The upstream line is a 2–5× claim against FlashAttention, across language, image and video, without losing end-to-end metrics. CLAIMED BY SOURCE.",
    license: "Apache-2.0",
    language: "Python",
    stars: "4,026",
    fork: "https://github.com/Blockchains/SageAttention",
    upstream: "https://github.com/thu-ml/SageAttention",
    upstreamName: "thu-ml/SageAttention",
  },
  {
    id: "nunchaku",
    name: "Nunchaku",
    family: "Quant",
    hack: "SVDQuant kernels for 4-bit diffusion. Outlier channels go into a low-rank branch so the 4-bit GEMM is not asked to represent them. That is the failure Module 5 warns about, turned into a kernel.",
    caution: "The code is Apache-2.0. Weights you point it at are not. Read the model licence before a download.",
    license: "Apache-2.0",
    language: "Python",
    stars: "3,967",
    fork: "https://github.com/Blockchains/nunchaku",
    upstream: "https://github.com/nunchux-ai/nunchaku",
    upstreamName: "nunchux-ai/nunchaku",
  },
  {
    id: "liger",
    name: "Liger Kernel",
    family: "Fusion",
    hack: "Triton fusions for training: RMSNorm, RoPE, SwiGLU, fused linear cross-entropy. The move is the same as Module 1. An activation that used to round-trip to HBM stays on chip.",
    caution: "Their numbers are training steps, not a 50-step video sampler. Do not carry a training ratio across.",
    license: "BSD-2-Clause",
    language: "Python",
    stars: "6,715",
    fork: "https://github.com/Blockchains/Liger-Kernel",
    upstream: "https://github.com/linkedin/Liger-Kernel",
    upstreamName: "linkedin/Liger-Kernel",
  },
  {
    id: "kittens",
    name: "ThunderKittens",
    family: "Tiles",
    hack: "Tile primitives for Hopper CUDA. You write the kernel as tiles, not as a thread index you hope the compiler will vectorise.",
    caution: "This is a way to author a kernel. It is not a speedup until you time the kernel you wrote.",
    license: "MIT",
    language: "CUDA",
    stars: "3,809",
    fork: "https://github.com/Blockchains/ThunderKittens",
    upstream: "https://github.com/HazyResearch/ThunderKittens",
    upstreamName: "HazyResearch/ThunderKittens",
  },
  {
    id: "cutlass",
    name: "CUTLASS",
    family: "Tiles",
    hack: "CUDA templates and CuTe layouts under a large share of high-end GEMMs. Open it when a Triton kernel is no longer the right tool, and only after you can explain the Triton result.",
    caution: "A green CUTLASS example is not your model’s step time. Pin the commit you built.",
    license: "BSD-3-Clause",
    language: "C++",
    stars: "10,782",
    fork: "https://github.com/Blockchains/cutlass",
    upstream: "https://github.com/NVIDIA/cutlass",
    upstreamName: "NVIDIA/cutlass",
  },
  {
    id: "fla",
    name: "Flash Linear Attention",
    family: "Attention",
    hack: "Triton kernels for linear-attention variants. Different recurrence, different bytes, different bugs from softmax attention.",
    caution: "A win in this repo does not transfer to FlashAttention, and the other way around.",
    license: "MIT",
    language: "Python",
    stars: "6,096",
    fork: "https://github.com/Blockchains/flash-linear-attention",
    upstream: "https://github.com/fla-org/flash-linear-attention",
    upstreamName: "fla-org/flash-linear-attention",
  },
];

export const kernelFamilies = ["All", "Attention", "Quant", "Fusion", "Tiles"] as const;
