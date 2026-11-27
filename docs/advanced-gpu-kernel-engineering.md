# Advanced GPU Kernel Engineering

The KernelDojo method for reading real GPU kernels. The public page is [https://kerneldojo.com/kernels](https://kerneldojo.com/kernels).

This is not a certificate and not a claim that any upstream speedup was reproduced here.

## Method

1. Fork the library. Do not retype a blog into a new file and call it a kernel.
2. Open the one path named on the card. If the file is not there, stop and say so.
3. Draw the bytes before you time. Use the diagrams in `public/diagrams/`: roofline, fusion, attention tiles, skip-error.
4. Match numerics against a reference you can name. A fast kernel that is a different function fails.
5. Change one mechanism. Fusion, or sparsity, or precision, or a skip. Not two.
6. Write the failure you actually hit.
7. Keep upstream numbers in the upstream sentence. Your table contains only runs you did.

## Forks

Created on the Blockchains GitHub account, 27 Nov 2026. Star counts are the upstream repositories on that date.

| Fork | Upstream | Where to read |
| --- | --- | --- |
| [flash-attention](https://github.com/Blockchains/flash-attention) | Dao-AILab/flash-attention | `csrc/flash_attn` |
| [flashinfer](https://github.com/Blockchains/flashinfer) | flashinfer-ai/flashinfer | README, then the CUDA sources |
| [SpargeAttn](https://github.com/Blockchains/SpargeAttn) | thu-ml/SpargeAttn | `csrc/`, `Triton_SpargeAttn/` |
| [flash-linear-attention](https://github.com/Blockchains/flash-linear-attention) | fla-org/flash-linear-attention | README, then the implementation it names |
| [SageAttention](https://github.com/Blockchains/SageAttention) | thu-ml/SageAttention | `csrc/` |
| [nunchaku](https://github.com/Blockchains/nunchaku) | nunchux-ai/nunchaku | `nunchaku/csrc`, `nunchaku/ops` |
| [bitsandbytes](https://github.com/Blockchains/bitsandbytes) | bitsandbytes-foundation/bitsandbytes | `bitsandbytes/functional.py` |
| [TransformerEngine](https://github.com/Blockchains/TransformerEngine) | NVIDIA/TransformerEngine | `transformer_engine/pytorch` |
| [Liger-Kernel](https://github.com/Blockchains/Liger-Kernel) | linkedin/Liger-Kernel | `src/liger_kernel/ops` |
| [ThunderKittens](https://github.com/Blockchains/ThunderKittens) | HazyResearch/ThunderKittens | `include/kittens.cuh` |
| [cutlass](https://github.com/Blockchains/cutlass) | NVIDIA/cutlass | `include/`, `examples/` |
| [tilelang](https://github.com/Blockchains/tilelang) | tile-ai/tilelang | README and LICENSE (MIT) |
| [llm.c](https://github.com/Blockchains/llm.c) | karpathy/llm.c | `train_gpt2.cu` |

## Sessions

Eight sessions, 38 hours. Each one opens a fork and leaves a number from `public/programme/modules/gpu/kernel_math.py`. That number is byte arithmetic. It is not a GPU time.

1. Read one kernel in `train_gpt2.cu`.
2. Delete a round trip in Liger.
3. Exact attention in FlashAttention. Tiling does not cut the math.
4. Pages in FlashInfer. Lengths 100 and 5 favour paging. Lengths 17 and 3 do not.
5. A tile that does not launch, in SpargeAttention.
6. The scale, across SageAttention, bitsandbytes, Transformer Engine and Nunchaku.
7. Tiles as the language: ThunderKittens, CUTLASS, TileLang. Count the tail.
8. A different algorithm: Flash Linear Attention. The N² formula does not apply.

## Desk

`kernel_math.py` checks:

- N=4096, BF16, head 128: the score matrix is 33,554,432 bytes. Q, K and V are 3,145,728. One 64×64 tile is 8,192 bytes. There are 4,096 such tiles. Exact attention still computes them. It does not store the matrix.
- Values 0.2, 0.05, 0.02, 8 on 127 levels: the 8 stays at code 127 and 0.02 becomes 0.
- Page 16. Lengths 100 and 5 waste 23 tokens, against 95 if you pad both to 100. Lengths 17 and 3 waste more by paging than by padding to the true max.

Run:

```bash
python -m unittest discover -s public/programme/modules/gpu -p 'test_*.py'
```

## Diagrams

Original teaching figures, not reproductions of a paper’s artwork.

- `public/diagrams/roofline.svg` — memory side, compute side, ridge.
- `public/diagrams/fusion.svg` — the activation round trip a fusion deletes.
- `public/diagrams/tiles.svg` — exact tiles, proxy tiles, skipped tiles.
- `public/diagrams/horizon.svg` — simulated skip error. Not a diffusion model.
- `public/diagrams/softmax.svg` — running max, and the rescale you must not skip.
- `public/diagrams/quant.svg` — one outlier sets the step.
- `public/diagrams/pages.svg` — when a page table wins, and when it loses.

## What this module refuses

- A ratio copied from an NVIDIA note, a paper, or a README into a KernelDojo table.
- A training-step timing described as a video sampler.
- A dtype the kernel fell back from, still labelled as FP8 or FP4.
- A fork treated as a new licence. The upstream licence stands.
