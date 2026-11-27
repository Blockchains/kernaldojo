import type { Hack } from "./modules";

export const hacks: Record<string, Hack[]> = {
  "0": [
    {
      title: "Synchronise outside the timed region, not inside it",
      why: "GPU work is async. A CPU timer that does not wait records launch overhead and misses the kernel. A sync inside the loop adds a drain you will then 'optimise' by accident.",
      code: `start = torch.cuda.Event(enable_timing=True)
end = torch.cuda.Event(enable_timing=True)
for _ in range(5):
    fn()  # warmup
torch.cuda.synchronize()
start.record()
for _ in range(20):
    fn()
end.record()
torch.cuda.synchronize()
ms = start.elapsed_time(end) / 20`,
      bench: "UNTESTED on a GPU in this preview. On a real device, compare this event timer with a bare time.perf_counter() around the same call. The CPU timer should be optimistically small.",
      fails: "Events still miss CPU-side overhead you care about in serving (scheduling, host copies). One iteration after a cold cache is not a steady-state number.",
      source: "PyTorch CUDA event timing. Standard practice; confirm against the current torch.cuda.Event docs for your install.",
    },
    {
      title: "Count bytes before you count FLOPs",
      why: "Elementwise ops and norms move each element a few times and do almost no math. The ridge point (peak FLOP/s ÷ bandwidth) is often tens of FLOPs per byte. Below it, the kernel is waiting on HBM, and fusing is the lever. Above it, you need tensor cores or a better algorithm.",
      code: `def intensity(flops: float, nbytes: float) -> float:
    return flops / nbytes

# BF16 RMSNorm over [B, S, D]: read x, write y
nbytes = 2 * B * S * D * 2
flops = B * S * D * 4  # square, mean, rsqrt, scale — order of magnitude
print(intensity(flops, nbytes))  # usually < 10, memory-side of a typical ridge`,
      bench: "The arithmetic itself is CPU-safe and covered by modules/00-roofline/test_roofline.py. The ridge you compare against must be measured or taken from the vendor sheet and labelled.",
      fails: "Forgetting that a 'fused' kernel still reads the weights. Counting only activations understates traffic and makes a compute-bound GEMM look free.",
      source: "Williams, Waterman, Patterson, 'Roofline', CACM 2009. The model is old. The habit is the point.",
    },
    {
      title: "Warm up, then profile one iteration with shapes",
      why: "The first call pays compile, autotune and caching allocator traffic. A profile of that call is a profile of the compiler, not of the step you will run 50 times.",
      code: `from torch.profiler import profile, ProfilerActivity
for _ in range(3):
    fn()
with profile(activities=[ProfilerActivity.CPU, ProfilerActivity.CUDA], record_shapes=True) as prof:
    fn()
print(prof.key_averages().table(sort_by="self_cuda_time_total", row_limit=15))`,
      bench: "UNTESTED here. Export a Chrome trace and check that the top CUDA op matches the byte-count story from the roofline.",
      fails: "Profiling changes timing. Do not quote profiler timestamps as the benchmark. Use events for the number, the trace for the name.",
      source: "PyTorch profiler documentation (ProfilerActivity, record_shapes). API surface drifts; pin the version in the PR.",
    },
  ],
  "1": [
    {
      title: "Pick the compile mode for the constraint you actually have",
      why: "reduce-overhead turns the region into a CUDA graph: less launch tax, fixed addresses. max-autotune searches kernels and can win on a large GEMM, then loses the evening to compile time. A video DiT with a changing token count will not sit inside one graph.",
      code: `opt = torch.compile(step, mode="reduce-overhead", dynamic=False)
# dynamic=True if frames or batch change. You give up the graph.
# mode="max-autotune" only after the region is stable and the GEMM dominates.`,
      bench: "UNTESTED here. Report compile time separately from steady-state step time. A 1.08× kernel-only factor is in the same neighbourhood as NVIDIA's RTX 5090 kernel row (1.08×, 1045.4 s → 971.6 s) — that is their claim, not your result.",
      fails: "CUDA graphs reject CPU scalar ops, data-dependent control flow, and allocations that change. A graph captured on 16 frames is illegal at 81 frames.",
      source: "PyTorch torch.compile modes. CUDA graph constraints are documented with torch.cuda.graph. NVIDIA on-device ablation: https://nvlabs.github.io/Sana/Sol-Engine/H3-OnDevice/ (3 Aug 2026).",
    },
    {
      title: "Fuse the norm into the next consumer",
      why: "RMSNorm is bandwidth-bound. Written as its own kernel it reads X and writes Y. The linear then reads Y. Fusion keeps the normalised tile in registers or shared memory and feeds the GEMM, cutting a full activation round-trip.",
      code: `def eager(x, w):
    y = rmsnorm(x)       # read x, write y
    return y @ w.T       # read y, read w, write out

@torch.compile
def fused(x, w):
    y = rmsnorm(x)
    return y @ w.T       # Inductor may epilogue-fuse; check the trace, do not assume`,
      bench: "Byte model is tested in the programme files (SIMULATED traffic, not a GPU). On device, the proof is the profiler: the standalone norm kernel disappears or shrinks.",
      fails: "Inductor will refuse the fusion if a user-visible intermediate is saved for autograd. Inference should run under torch.no_grad() or inference_mode(). Training is a different contract.",
      source: "Inductor fusion is the mechanism inside torch.compile. Treat 'it fused' as a trace observation, not a promise. PyTorch 2.7 blog notes prologue fusion as a prototype at that release: https://pytorch.org/blog/pytorch-2-7",
    },
    {
      title: "Merge Q, K and V into one GEMM when they share the input",
      why: "Three small projections read the same activation three times and pay three launches. One weight stack reads the activation once. The win is largest when the projection is launch- or bandwidth-limited, and smaller when each GEMM already fills the GPU.",
      code: `w_qkv = torch.cat([w_q, w_k, w_v], dim=0)  # [3D, D]
qkv = x @ w_qkv.T
q, k, v = qkv.chunk(3, dim=-1)`,
      bench: "UNTESTED here. Time the three GEMMs against the stacked one at your real (B, S, D). If S·D is huge and compute-bound, expect a small gain.",
      fails: "Different dtypes, different quant scales, or a bias only on Q, all break a naive cat. GQA means K and V are narrower than Q — pad or concatenate carefully and do not silently change shapes.",
      source: "Standard inference graph rewrite, used across serving stacks. No single paper owns it. Verify shapes against your model, not against this snippet.",
    },
  ],
  "2": [
    {
      title: "Autotune the tile, then freeze the winner",
      why: "A Triton block that is too small under-occupies and reloads. A block that is too large spills registers, drops occupancy, and can be slower than the small one. The hardware will not tell you in a comment; it tells you in the timing.",
      code: `@triton.autotune(configs=[
    triton.Config({"BLOCK": 128}, num_warps=4),
    triton.Config({"BLOCK": 256}, num_warps=8),
], key=["N"])
@triton.jit
def k(X, Y, N, BLOCK: tl.constexpr):
    ...`,
      bench: "UNTESTED here. After autotune, log the chosen config into the PR. Re-run that config alone so the benchmark does not include search time.",
      fails: "Autotune keys that ignore dtype or sequence length will replay a bad config. Search time does not belong in the speedup.",
      source: "Triton language tutorials (autotune, tl.constexpr). Triton 3.3 added Blackwell support inside PyTorch 2.7 (official blog). Later pins: Triton 3.9.0 reported 27 Oct 2026 alongside torch 2.15 — secondary source, UNTESTED here: https://gpuwerk.com/dgx-spark/guides/pytorch-on-dgx-spark/",
    },
    {
      title: "Vectorised, masked loads",
      why: "HBM likes wide transactions. Scalar loads waste sectors. Masks keep the tail of a tile legal without a slow scalar cleanup, provided the mask is the exception and not the whole kernel.",
      code: `offs = pid * BLOCK + tl.arange(0, BLOCK)
mask = offs < N
x = tl.load(X + offs, mask=mask, other=0.0)
tl.store(Y + offs, x * scale, mask=mask)`,
      bench: "UNTESTED here. Compare BLOCK-aligned N against N = BLOCK+1. The tail should be correct, and the aligned case should not pay a second kernel.",
      fails: "other=0.0 inside a sum is fine; inside a max it can invent a zero that was not in the tensor. Masks on both sides of a matmul that never hit full tiles will not reach peak.",
      source: "Triton official tutorial on vector addition and masked loads.",
    },
    {
      title: "Match PyTorch before you time it",
      why: "A fast kernel that drifts in bf16 accumulation is not a speedup. It is a different function. Video errors compound across steps, so a 1e-2 mismatch at the kernel can become a different shot.",
      code: `torch.testing.assert_close(got, ref, rtol=1e-2, atol=1e-2)  # bf16
# fp32 reference: rtol 1e-4. Record the tolerance in the test, not in the README only.`,
      bench: "Correctness is the gate in CI. The benchmark job runs only after this assertion. See the workflow in Contribute.",
      fails: "Comparing against a compiled reference hides a shared bug. The reference for a new kernel is eager PyTorch.",
      source: "torch.testing.assert_close. Tolerance is a decision you publish, not a default you hope.",
    },
  ],
  "3": [
    {
      title: "Online softmax in tiles — do not materialise S",
      why: "Attention scores are O(sequence²). A 100k-token video latent cannot store them. Flash-style kernels keep a running max and sum per query tile, rescale the output accumulator, and stream K/V tiles. Bytes move; the matrix does not exist.",
      code: `# Per query tile, for each K/V tile:
# m_i = max(m_i, rowmax(scores))
# l_i = exp(m_old - m_i) * l_i + rowsum(exp(scores - m_i))
# acc = exp(m_old - m_i) * acc + exp(scores - m_i) @ V_tile`,
      bench: "UNTESTED here. The unit test is numerical agreement with torch.nn.functional.scaled_dot_product_attention on a short sequence, then a memory check that peak allocated bytes grow with sequence, not sequence squared.",
      fails: "Causal masks, window masks, and variable-length batches all change the tile bounds. A kernel that is correct for a square full mask is not a video kernel yet.",
      source: "Dao et al., FlashAttention (2022) and FlashAttention-2 (2023). The algorithm is the source of the tiling pattern. Kernel code you call should be the version pinned in your environment.",
    },
    {
      title: "Keep sparse blocks regular even when the mask is not",
      why: "GPU tensor cores and Triton tiles want fixed shapes. A sparsity pattern that picks individual tokens forces scalar work. Spark-Reblock's point is to regroup tokens by preference while the kernel still sees rectangles. Sol-Attn routes at block granularity and approximates the rest instead of dropping it.",
      code: `# Teaching sketch — not a Sol-Attn implementation.
# score a proxy per K-block; exact if proxy >= tau; else add a correction
# from the proxy so the dropped block still contributes a little mass.`,
      bench: "The bench drill on this site is a SIMULATED density model. It is not Spark-H3 and not Sol-Attn. Published anchors, not to be copied as your score: Spark-H3 reports 2.49× DiT and 24.81 dB PSNR vs dense at 10% exact-block density (arXiv:2611.24256, 18 Nov 2026).",
      fails: "Dropping blocks with no correction underestimates attention mass. A fixed grouping that ignores preference (the failure Spark-H3 describes) keeps dissimilar tokens in one tile. Either way the picture drifts before the timer looks good.",
      source: "Sol-Attn docs: https://nvlabs.github.io/Sana/Sol-Engine/docs/techniques/sparse/sol_attn/ (page fetched 2026-11-25). Spark-H3: https://arxiv.org/abs/2611.24256",
    },
    {
      title: "Keep an exact sink for tokens that are not interchangeable",
      why: "Text, audio, and the first frames are not average spatial tokens. A uniform sparse mask will chew on them. NVIDIA's published H100/A100 policy keeps an exact 951-token multimodal prefix and the first two layers dense.",
      code: `# Policy sketch from the published Sol H3 datacenter note — not weights.
# steps 0..9: dense
# layers 0..1: dense
# prefix tokens 0..950: exact attention
# elsewhere: Sol-Attn tau=1.0`,
      bench: "UNTESTED here. If you ablate the sink, measure quality on a prompt that uses the prefix (a described camera move, a spoken word), not on a silent texture clip.",
      fails: "Copying 951 into a different model is cargo-culting. The sink length is a property of that model's token layout. Read the layout, then choose.",
      source: "https://nvlabs.github.io/Sana/Sol-Engine/H3-DataCenter/ (9 Aug 2026). Route density they report: 18.04%. First-block cache reuse they report: 67.35%.",
    },
  ],
  "4": [
    {
      title: "Gate on the first block's residual, not on the timestep id",
      why: "Adjacent denoising steps often move the latent only a little, but not on a schedule you can hard-code. First Block Cache runs block 0, compares its residual to the previous step, and skips the rest of the stack when the change is under a threshold. The first block is a probe, not a heuristic lookup.",
      code: `delta = (h0 - h0_prev).abs().mean()
if delta < threshold and cache is not None:
    return x + cache          # reuse last full residual
full = blocks[1:](h0)
cache = full - x              # store the residual you might reuse
h0_prev = h0
return full`,
      bench: "SIMULATED in the cache drill. ParaAttention describes the method and a threshold trade-off; it does not give you a universal threshold. Diffusers ships FirstBlockCacheConfig (default threshold 0.05 in the v0.38 snippet we read).",
      fails: "A threshold tuned on 20 steps at 480p is not a threshold for 50 steps at 768p. Mean absolute residual hides a local change (a hand, a mouth). Those are exactly the frames people notice.",
      source: "ParaAttention README, First Block Cache: https://github.com/chengzeyi/ParaAttention — Diffusers hook: https://github.com/huggingface/diffusers/blob/v0.38.0/src/diffusers/hooks/first_block_cache.py — TeaCache is the ancestor they cite (arXiv:2411.19108), and it is not the same algorithm.",
    },
    {
      title: "Refuse to skip the steps and layers that move",
      why: "Early denoising steps decide structure. Later steps decide texture. NVIDIA's published shared policy keeps the first 10 steps and the first two layers dense, then turns on sparsity and cache. Skipping step 2 to win a demo is how limbs multiply.",
      code: `dense = (step < 10) or (layer < 2)
if dense:
    y = block(x)
else:
    y = maybe_cached(block, x)`,
      bench: "UNTESTED here. Ablate 'skip from step 0' against 'skip only after step 10' at fixed threshold. Quality first, then time.",
      fails: "Distilled 4-step samplers do not have a 'later texture' regime. The Sol-H3 page compares a 50-step dense baseline with a 4-step Sol-H3 path (8× B300, 18.250 s vs 1.653 s, 11.04×). That factor mixes step reduction with systems work. Do not cite it as a kernel speedup.",
      source: "Policy: https://nvlabs.github.io/Sana/Sol-Engine/H3-DataCenter/ — Step-count caveat: https://nvlabs.github.io/Sana/Sol-Engine/Sol-H3/ (project page, read 27 Nov 2026).",
    },
    {
      title: "Reset the cache on a segment cut",
      why: "A 15 s clip is often several 5 s generations chained in latent space, or at least in colour and motion. The residual you cached belongs to the previous shot's noise schedule. Reusing it across the cut copies structure that the new segment never predicted. Error then accumulates on top of a wrong residual, not a small one.",
      code: `if new_segment:
    cache = None
    h0_prev = None
# never initialise segment t+1 with segment t's residual`,
      bench: "The cache drill has a 'carry across the cut' switch. It is a teaching model (SIMULATED). Turn it on and watch the error jump. That jump is the lesson, not a measurement of MiniMax-H3.",
      fails: "Resetting too often (every step) deletes the speedup. Resetting only on wall-clock time, while the sampler continues one trajectory, throws away a legal cache. The cut is a content boundary, not a timer.",
      source: "Failure mode reasoned from the FBCache definition (the cache is the previous step's residual). NVIDIA's on-device write-up describes residual reuse inside a clip: https://nvlabs.github.io/Sana/Sol-Engine/H3-OnDevice/",
    },
  ],
  "5": [
    {
      title: "Quantise the GEMM, not the softmax",
      why: "Tensor cores earn their keep on the matmul. Softmax is a reduction with a max and an exp; small errors in the tail become bad weights. The usual split is a low-precision GEMM and a wider softmax and residual add.",
      code: `# Shape only. Do not treat this as a working FP8 kernel.
# q, k stay in the format your attention kernel expects
# scores = einsum in fp32 or bf16
# out = lowp_gemm(probs_cast, v)`,
      bench: "UNTESTED here. Report the format (fp8 e4m3, mxfp8, nvfp4), the scale axis (per-tensor, per-channel, per-group), and the GPU SM version from torch.cuda.get_device_capability().",
      fails: "Casting the residual stream to FP8 between every block quantises the signal the cache later thresholds on. You will skip steps because of rounding, not because the latent settled.",
      source: "Practice across Hopper FP8 inference stacks. Confirm operator coverage in your Transformer Engine or cuDNN version rather than assuming a flag exists. Blackwell NVFP4 details: verify in the CUDA and TE docs for your toolkit. Microscaling block size is UNVERIFIED on this page.",
    },
    {
      title: "Scales follow outliers, or the outliers paint the frame",
      why: "A single per-tensor scale is set by the largest value. Every other value collapses toward zero. Video activations are bursty (edges, text, faces). Per-channel or block scales spend range where the data actually lives.",
      code: `scale = x.abs().amax(dim=-1, keepdim=True).clamp(min=1e-8) / fp8_max
q = (x / scale).to(torch.float8_e4m3fn)  # API depends on your torch build`,
      bench: "UNTESTED here. The quality check is a fixed seed against the BF16 frame, LPIPS and a still you actually look at. A low mean error can hide a broken face.",
      fails: "float8_e4m3fn availability and the cast API move between PyTorch versions. A scale computed on a calibration batch from a different resolution will not fit the run you ship.",
      source: "FP8 E4M3 range is the format reason (no infinity, small exponent). PyTorch float8 dtypes: check your installed version's docs. Do not copy a calibration set you cannot redistribute.",
    },
    {
      title: "Put the kernel on the architecture that has the units",
      why: "An FP8 tensor-core kernel on Ampere is a different, often emulated, path. Sol-Attn's own table is the pattern: CuTe on SM90 (H100), SM100 (B200), SM120 (RTX 5090); Triton elsewhere. A portable fallback that is secretly eager will 'work' and teach you nothing.",
      code: `major, minor = torch.cuda.get_device_capability()
sm = major * 10 + minor
print("SM", sm)  # 120 RTX 5090, 121 GB10, 100 B200, 90 H100, 89 Ada — confirm, do not trust a comment`,
      bench: "UNTESTED here. If SM is not in the set your kernel was written for, the run is a fallback and must be labelled as such in the PR.",
      fails: "GB10 is sm_121 and can run sm_120 SASS with a warning that looks like a failure. A secondary Nov 2026 note says that warning is a false alarm for stock PyTorch wheels. Still record the warning text.",
      source: "Sol-Attn kernel table: https://nvlabs.github.io/Sana/Sol-Engine/docs/techniques/sparse/sol_attn/ — SM map: https://journal.qualiteg.com/pytorch_and_supported_gpu_version/ (updated 23 Sep 2026) — Spark wheels: https://gpuwerk.com/dgx-spark/guides/pytorch-on-dgx-spark/ (7 Nov 2026).",
    },
  ],
  "6": [
    {
      title: "Page the KV cache so a finished request returns its memory",
      why: "A contiguous KV allocation per request fragments like a naive malloc. PagedAttention (vLLM) splits the cache into blocks and maps them with a table, so a completed sequence frees blocks instead of leaving a hole the next request cannot use.",
      code: `# Logical token -> (block_id, offset)
# Physical pool is a fixed list of blocks.
# Free-list append on EOS. No cudaMalloc in the decode loop.`,
      bench: "UNTESTED here. The teaching metric is reserved bytes versus used bytes at a mixed sequence-length workload. Fragmentation is the gap.",
      fails: "Block size too small: table overhead. Too large: internal fragmentation returns. Prefix sharing across users can leak a prompt if the isolation story is wrong. Do not share blocks across tenants by accident.",
      source: "Kwon et al., 'Efficient Memory Management for Large Language Model Serving with PagedAttention', SOSP 2023 (vLLM).",
    },
    {
      title: "Continuous batching is for decode, not for a diffusion step",
      why: "LLM decode emits one token and can join or leave a batch every step. A diffusion step is a whole-network pass over a fixed latent. You batch independent clips, or you queue them. You do not 'page a token' out of a denoising step halfway through.",
      code: `# LLM: batch changes every token.
# DiT: batch is fixed for the step; the schedule is the loop.
# Do not reuse a KV paging diagram as a video activation diagram.`,
      bench: "UNTESTED here. Write down the batching unit in the PR title (token, sequence, clip, or step). If you cannot, the design is not finished.",
      fails: "Padding a batch of clips to the longest frame count wastes the GPU in the same way padded decode does. It is still not paged attention.",
      source: "Orca continuous batching (Yu et al., OSDI 2022) for the LLM side. Sarathi-Serve for chunked prefill. Diffusion serving is a different queue; Sol Engine's own write-ups are about a single generation's stack, not a multi-tenant token server.",
    },
    {
      title: "Speculative decoding checks a draft; it does not skip the truth",
      why: "A small model proposes tokens. The large model verifies them in one forward. Accepted tokens are a speedup. Rejected tokens fall back. Quality holds because the target distribution still decides. There is no equivalent 'draft frame' you can accept without looking, which is why video cache methods need an explicit error budget.",
      code: `# accept while draft token matches target sample
# on mismatch, take the target token and recompute the draft
# never accept the remainder of the draft after a mismatch`,
      bench: "UNTESTED here. Report acceptance rate next to tokens/s. A high tokens/s with a low acceptance rate can be slower than the target alone, once you count the draft.",
      fails: "Draft and target must share a tokenizer and a sampling contract. Temperature mismatch looks like a low acceptance bug and is a spec bug.",
      source: "Leviathan et al., speculative decoding (2023); Chen et al., speculative sampling. Serving implementations: vLLM, SGLang, TensorRT-LLM — pin the one you measured.",
    },
  ],
  "7": [
    {
      title: "Ablate in the order the stack actually compounds",
      why: "NVIDIA's RTX 5090 table is a stack, not three independent miracles: baseline 1045.4 s, kernels 971.6 s (1.08×), plus Sol-Attn 708.3 s (1.48×), plus cache 231.2 s (4.52×), 768p. Kernels barely move the headline. Cache does. If your write-up leads with the kernel, you have described the wrong term.",
      code: `runs = ["dense", "kernels", "kernels+sparse", "kernels+sparse+cache"]
# same prompt, seed, steps, resolution, dtype
# time each; LPIPS each against dense`,
      bench: "Their table is CLAIMED BY SOURCE, not a number this dojo measured. Your table starts empty.",
      fails: "Changing steps, resolution, or sampler between rows makes a pretty ratio and an empty paper. The Sol-H3 11× figure changes the step count. Do not mix it into this ablation.",
      source: "https://nvlabs.github.io/Sana/Sol-Engine/H3-OnDevice/ (3 Aug 2026).",
    },
    {
      title: "LPIPS against the dense run, then a blind pair",
      why: "LPIPS is a distance between two frames, not a taste score. It will catch drift the timer ignores. It will also miss a temporal flicker that a person sees in motion. A blind paired choice (same seed, same prompt, order flipped, criterion written down before you watch) is the check LPIPS cannot do.",
      code: `# Fix N pairs before viewing.
# Reviewer sees A/B, not 'ours'.
# Record preference, not a speech.
# Report LPIPS mean and the preference split separately.`,
      bench: "No human study has been run by this site. Protocol only. If you skip it, say so in the portfolio and do not imply a preference result.",
      fails: "Comparing both clips to a third 'ground truth' you do not have. The reference for a training-free speedup is the dense sampler, same seed.",
      source: "Zhang et al., LPIPS (CVPR 2018) for the metric. The protocol is a measurement design, not a paper result.",
    },
    {
      title: "Licence before weights",
      why: "MiniMax-H3 is the model in the headline numbers. Secondary reports of its community licence exclude the United States, the EU, the UK and South Korea, and restrict using outputs to improve other models. A UK learner who downloads H3 to 'match the blog' may be outside the grant. The dojo target is a synthetic DiT we own, with Wan 2.2 as an optional later target only after you read an Apache-2.0 model card yourself.",
      code: `# Do not add from_pretrained("MiniMax-H3") to the starter.
# modules 0–6 run on kerneldojo.synthetic_dit (MIT, random weights).
# Module 7 may point at a model whose card you have pasted into LICENSES.md.`,
      bench: "This is a policy, not a timing. CI fails the PR if a weight URL appears without a licence note.",
      fails: "Apache-2.0 on a codebase is not Apache-2.0 on the weights next to it. Wan 2.2's Apache grant is reported by secondary write-ups; confirm the model card. LTX-2.x has a revenue cap ($10M) and other limits.",
      source: "Fuser licence comparison (29 Sep 2026): https://fuser.studio/articles/best-open-source-video-models — LTX licence: https://ltx.io/model/license — AIPex (25 Sep 2026): https://aipex.com.au/video-generators-you-can-download/ — Not legal advice. Read the primary text.",
    },
  ],
};
