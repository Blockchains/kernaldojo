# kernaldojo

KernelDojo is a GitHub-native training programme for AI inference performance.

The practice loop is the one used by Sol.College (open the code, investigate the behaviour, leave evidence). The subject is GPU inference: fusion, training-free sparse attention, and cross-step caching. This repository is not affiliated with NVIDIA, MiniMax, or Sol.College.

## What is in this repo

- `src/` — the reader: path, modules, bench, repo browser, sources, risks, plan, pull-request rules.
- `public/programme/` — the CPU smoke path (`roofline.py` and its test). CUDA timings are not in this tree. Anything not run here is UNTESTED.
- Numbers such as 4.52× on an RTX 5090 are claims from NVIDIA's on-device note (3 Aug 2026), not measurements from this repo.

## Remote

https://github.com/Blockchains/kernaldojo

`github.blockchain.io` did not respond (HTTP 503) when this remote was created. The connected GitHub account is **Blockchains** (Blockchain Lab).

## Licence posture

Read the MiniMax-H3 community licence before downloading weights. Do not treat open weights as unrestricted. Programme text in this repo is published so the course can be read and forked.

## Advanced GPU Kernel Engineering

The method is documented in [docs/advanced-gpu-kernel-engineering.md](docs/advanced-gpu-kernel-engineering.md).

Public page: https://kerneldojo.com/kernels

Thirteen GPU kernel repositories are forked on the Blockchains account. The page names the file to open, the failure to provoke, and the upstream licence. Star counts are upstream as of 27 Nov 2026. No speedup in that list was measured by KernelDojo.

Diagrams, original and not taken from papers: `public/diagrams/`.

