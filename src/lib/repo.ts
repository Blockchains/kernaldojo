export type RepoFile = { path: string; body: string };

export const repoFiles: RepoFile[] = [
  {
    path: "README.md",
    body: `# KernelDojo

GitHub-style programme for inference kernels. Every module is a
repository exercise: a test, a benchmark, a write-up, a pull request.

This tree is the starter. The website is the campus. They are the same
content.

Modules 0 and 1 include code that runs without a GPU (roofline and the
fusion byte model). Kernel code is a specification until you run it.

Do not download MiniMax-H3 weights to chase a published ratio.
See LICENSES.md.

Status of numbers:
- MEASURED — produced by the test in this tree, or by your PR.
- CLAIMED BY SOURCE — someone else's paper or project page.
- SIMULATED — the in-browser drills.
- UNTESTED — not executed in the KernelDojo preview.
`,
  },
  {
    path: "LICENSES.md",
    body: `# Licences

Not legal advice. Paste primary texts here before you depend on them.

## Programme code

The files under modules/ that this preview ships are MIT, for the
synthetic exercises. They are not a grant to any model's weights.

## Synthetic DiT

Random weights, generated in the lab, no dataset. MIT.

## MiniMax-H3

Used in NVIDIA Sol Engine write-ups. Secondary summaries (Fuser, 29 Sep
2026; AIPex, 25 Sep 2026) report a community licence that excludes the
United States, the European Union, the United Kingdom and South Korea,
a revenue threshold, a requirement to display the model name, and a ban
on using outputs to improve other models. UNVERIFIED against the primary
text in this build. Default decision: do not download.

## Wan 2.2

Reported Apache-2.0 on the model card by those same secondary write-ups.
Confirm the card yourself, then paste it below this line. Until then the
capstone stays on the synthetic DiT.

## LTX-2.x

Community licence: https://ltx.io/model/license
Reported terms include a US$10M annual-revenue threshold and an
acceptable-use policy. Read the page.

## Cosmos and other NVIDIA open models

Reported under the NVIDIA Open Model License, which has its own
acceptable-use terms. Read the card that ships with the weights.

## Papers

Cited papers remain under their authors' licences. Citing them is not
a licence to copy their code or their numbers into a results table.
`,
  },
  {
    path: "CONTRIBUTING.md",
    body: `# Contributing

Work lands as a pull request against a module folder.

1. Branch from main: m1-fuse-rmsnorm, not "updates".
2. The PR template asks for hardware, software pins, the ratio, and the
   quality number. Delete a section only by writing "not run" and why.
3. CI runs the CPU tests on every PR. GPU tests run if a runner exists
   and otherwise post UNTESTED. A skip is not a pass.
4. The comment bot pastes the table from bench/results.json. You produce
   that file; the bot does not invent it.
5. No PR adds a from_pretrained of a restricted model without a new
   paragraph in LICENSES.md.

Reviewers look for: one mechanism changed per ablation row, a dense
reference, and a failure mode. They do not look for a target ratio.
`,
  },
  {
    path: "requirements.txt",
    body: `# Proposed region, UNTESTED in the KernelDojo preview.
# Pin the versions you actually import. Do not treat this file as a lock.
#
# Blackwell (sm_100 / sm_120 / sm_121): CUDA 12.8 or newer.
# Source (secondary, 23 Sep 2026):
# https://journal.qualiteg.com/pytorch_and_supported_gpu_version/
#
# First PyTorch release with Blackwell wheels: 2.7.0+cu128
# https://pytorch.org/blog/pytorch-2-7
#
# A 7 Nov 2026 secondary note for DGX Spark (aarch64) points at
# torch==2.15.0 (cu132) and triton==3.9.0, and warns that the OS CUDA
# may be 13.0.x. Match the machine. UNTESTED here.
# https://gpuwerk.com/dgx-spark/guides/pytorch-on-dgx-spark/
#
# CPU smoke test (no torch):
#   python -m unittest modules/00-roofline/test_roofline.py
`,
  },
  {
    path: ".github/workflows/module-ci.yml",
    body: `name: module
on:
  pull_request:
jobs:
  cpu:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Roofline and fusion byte model
        working-directory: modules/00-roofline
        run: python -m unittest test_roofline.py
  gpu:
    runs-on: [self-hosted, gpu]
    if: \${{ vars.KERNELDOJO_GPU_RUNNER == 'true' }}
    steps:
      - uses: actions/checkout@v4
      - name: Device pins
        run: |
          python - <<'PY'
          import torch
          print(torch.__version__, torch.version.cuda, torch.cuda.get_device_capability())
          PY
      - name: Correctness
        run: python -m unittest discover -s modules -p 'test_*.py'
      - name: Publish table
        if: always()
        run: |
          echo "GPU job finished. Speedups come from bench/results.json in the PR, not from this log."
`,
  },
  {
    path: "scripts/leaderboard.py",
    body: `"""Rank capstone rows. Refuses incomplete evidence.

A row is eligible when lpips <= gate, steps match the baseline,
and the notes name gpu, torch and seed. This script does not
fetch published blog numbers. There is nothing to look up.
"""
import json, sys

GATE = 0.08  # LPIPS against the dense run. Set before you sort.

def eligible(row):
    need = ["name", "speedup", "lpips", "steps", "baseline_steps", "gpu", "torch", "seed"]
    if any(k not in row for k in need):
        return False
    if row["steps"] != row["baseline_steps"]:
        return False
    if row["lpips"] > GATE:
        return False
    return True

def main(path):
    rows = json.load(open(path))
    kept = [r for r in rows if eligible(r)]
    kept.sort(key=lambda r: -r["speedup"])
    for i, r in enumerate(kept, 1):
        print(f"{i:2d}  {r['speedup']:.3f}x  lpips {r['lpips']:.4f}  {r['name']}  {r['gpu']}")
    print(f"{len(rows) - len(kept)} row(s) refused (missing fields, step mismatch, or LPIPS > {GATE})")

if __name__ == "__main__":
    main(sys.argv[1])
`,
  },
  {
    path: "modules/00-roofline/roofline.py",
    body: `# Tested copy lives at public/programme/modules/00-roofline/roofline.py
# and is served with the site. The unit test covers intensity, the ridge,
# roofline time, and the 2x activation-traffic ratio from fusion.
#
# Run:
#   cd modules/00-roofline && python -m unittest test_roofline.py
`,
  },
  {
    path: "modules/07-capstone/RUBRIC.md",
    body: `# Capstone rubric

Pass:
- Four rows: dense, kernels, +sparse, +cache.
- One operating point. Steps do not change between rows.
- LPIPS against dense, reported per segment if you chained segments.
- Blind protocol attached, or a sentence that says you did not run one.
- LICENSES.md updated if any weights were downloaded.
- Hardware and software pins in the PR.

Fail:
- A ratio taken from nvlabs.github.io written into your table.
- A 4-step run compared with a 50-step run and called a kernel result.
- A human preference collected after the reviewers were shown the artefact.
`,
  },
];
