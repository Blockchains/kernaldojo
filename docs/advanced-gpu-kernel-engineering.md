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

## Diagrams

Original teaching figures, not reproductions of a paper’s artwork.

- `public/diagrams/roofline.svg` — memory side, compute side, ridge.
- `public/diagrams/fusion.svg` — the activation round trip a fusion deletes.
- `public/diagrams/tiles.svg` — exact tiles, proxy tiles, skipped tiles.
- `public/diagrams/horizon.svg` — simulated skip error. Not a diffusion model.

## What this module refuses

- A ratio copied from an NVIDIA note, a paper, or a README into a KernelDojo table.
- A training-step timing described as a video sampler.
- A dtype the kernel fell back from, still labelled as FP8 or FP4.
- A fork treated as a new licence. The upstream licence stands.
