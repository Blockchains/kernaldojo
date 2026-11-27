import type { Bug, Question } from "./modules";

const q = (
  prompt: string,
  correct: string,
  wrong: [string, string, string],
  explain: string,
): Question => ({
  prompt,
  choices: [
    { id: "a", text: correct, correct: true },
    { id: "b", text: wrong[0] },
    { id: "c", text: wrong[1] },
    { id: "d", text: wrong[2] },
  ],
  explain,
});

export const quizzes: Record<string, Question[]> = {
  "0": [
    q(
      "A norm kernel does 4 FLOPs per element and moves 4 bytes per element (read + write, BF16). Peak is 200 TFLOP/s and bandwidth is 2 TB/s. Where does it sit?",
      "Memory-bound. Intensity is 1 FLOP/byte. The ridge is 100 FLOP/byte.",
      ["Compute-bound, because 200 TFLOP/s is a large number.", "Balanced. Intensity equals the ridge.", "Impossible to say without the batch size."],
      "Ridge = 200e12 / 2e12 = 100 FLOP/byte. The op is two orders of magnitude below it. Batch size cancels out of intensity if both FLOPs and bytes scale together.",
    ),
    q(
      "Why is LLM decode often bandwidth-bound while a diffusion step's attention is not automatically the same?",
      "Decode moves the whole weight stack to emit one token. A diffusion step reuses those weights across a long token axis, so arithmetic intensity climbs.",
      ["Decode is compute-bound because GPUs are bad at small batches.", "Diffusion is always memory-bound because video is large.", "They are the same kernel with different names."],
      "The bound is intensity, not the product category. Small-batch GEMM: bytes of weights dominate. Long-sequence attention: the matmul can become compute-heavy, which is why sparsity then matters.",
    ),
    q(
      "You time a kernel with time.perf_counter() and no CUDA sync. The number is 0.02 ms. A CUDA event around a synced region says 1.4 ms. What happened?",
      "The CPU timer returned before the GPU finished. The event number is the one that includes the kernel.",
      ["The event timer is wrong because events add overhead of about 1.4 ms.", "The kernel was cached, so the second measurement saw a cold start.", "perf_counter uses GPU clocks and is the preferred API."],
      "Launches are asynchronous. Without a sync, the CPU records the launch, not the execution.",
    ),
    q(
      "Which profile should you quote as the step time?",
      "A warmed-up CUDA-event loop, with the profiler used only to name the hot op.",
      ["The first iteration, because users feel cold start.", "The profiler trace's self-CUDA time, including instrumentation.", "The minimum of one run, to be generous."],
      "Cold start and profiler overhead are real, but they answer different questions. Say which one you measured.",
    ),
    q(
      "Roofline says an op is memory-bound. What is the first lever that can move the time?",
      "Reduce bytes moved: fuse, narrow the dtype, or stop writing an intermediate.",
      ["Add more thread blocks until occupancy is 100%.", "Switch to a higher-precision accumulator.", "Increase the learning rate of the sampler."],
      "Below the ridge, extra FLOP/s capacity sits idle. Occupancy tricks do not create bandwidth.",
    ),
    q(
      "Your GEMM's intensity is above the ridge. Fusion of the following ReLU changes the trace by almost nothing. Why is that a consistent result?",
      "The GEMM was already compute-bound. The ReLU's bytes were a small term next to the math.",
      ["Fusion is broken in this version of PyTorch.", "ReLU is compute-bound too, so fusing it doubles the time.", "The ridge point only applies to convolutions."],
      "Fusion pays when the eliminated traffic was on the critical path. It is not a universal multiplier.",
    ),
    q(
      "Two students report 1.3× on the same commit. One used batch 1, one used batch 8. What do you ask before averaging them?",
      "Whether both runs were in the same regime. Batch 1 may be launch-bound while batch 8 is bandwidth- or compute-bound.",
      ["Nothing. Speedups are dimensionless and always comparable.", "Only the GPU brand. Batch size cannot change the bound.", "Which one used a laptop, because laptops cannot be measured."],
      "A speedup without the operating point is not a result. The dojo rejects averaged numbers from different regimes.",
    ),
    q(
      "Nsight shows the kernel's DRAM throughput near the plateau and tensor-core pipes quiet. The author still describes it as 'compute optimised'. What is wrong?",
      "The pipes that are busy are the memory pipes. The kernel is waiting on data, whatever the comment says.",
      ["Quiet tensor cores mean the GPU is idle, so the timing is invalid.", "DRAM throughput near the plateau means the kernel is compute-bound.", "Nsight cannot see memory traffic."],
      "Name the busy unit. 'Optimised' is not a bound.",
    ),
    q(
      "A diffusion sampler runs 50 steps. You profile step 0 only. What can you not claim?",
      "That later steps have the same mix. Step 0 may include setup, different shapes, or a dense policy the later steps do not use.",
      ["That the GPU was used at all.", "The name of the top kernel in that step.", "The output shape of that step."],
      "Sol's own published policy keeps early steps dense. A step-0 profile would miss the sparse and cached regime.",
    ),
    q(
      "Which sentence is allowed in a PR from this module?",
      "'On this 4090, warmed-up, batch 2, the norm moved 1.8× less time after fusion. N=20. Trace attached.'",
      ["'This is 4.52×, matching NVIDIA.'", "'Roofline proves the kernel is optimal.'", "'The profiler says we are done.'"],
      "A measurement names the box, the regime, and the sample. A roofline is an upper-bound argument, not a proof of optimality.",
    ),
  ],
  "1": [
    q(
      "torch.compile(fn, mode='reduce-overhead') is slow on the first call and flat afterwards. The input shape then changes. The next call errors or silently recompiles for a long time. Why?",
      "That mode wants a CUDA graph. Graphs capture fixed addresses and shapes. A new shape is a new region.",
      ["reduce-overhead disables fusion, so any shape change is illegal.", "PyTorch cannot compile functions that contain matmul.", "The flat region was a bug and the error is the real performance."],
      "Dynamic video lengths and reduce-overhead fight each other. dynamic=True is the escape hatch, and it gives the graph back.",
    ),
    q(
      "Inductor did not fuse RMSNorm into the linear. Autograd is on, and the norm output is saved for backward. What is the inference fix?",
      "Run under inference_mode or no_grad so the intermediate does not have to be materialised for backward.",
      ["Rewrite RMSNorm in CUDA before trying compile.", "Set requires_grad=True on the weights so Inductor trusts them.", "Disable TF32."],
      "Fusion has to honour the values the autograd graph needs. Inference does not need them.",
    ),
    q(
      "You merge Q, K and V into one GEMM. K and V are half the width of Q because of grouped-query attention. A naive cat along the output axis is wrong because:",
      "The three projections do not share an output width. You must concatenate the weights you actually have, then split with those widths.",
      ["GQA forbids fusion of any kind.", "Q, K and V must stay in three launches or the softmax is biased.", "Grouped query means the input activation cannot be read once."],
      "The input can still be read once. The output split has to follow the real shapes.",
    ),
    q(
      "A CUDA graph capture fails with an assertion about a CPU-device tensor being used inside the region. The robust fix is:",
      "Move the scalar decision outside the captured region, or make it a GPU tensor the graph already knows.",
      ["Call torch.cuda.synchronize() in the middle of the captured function.", "Capture on CPU and copy the graph to the GPU later.", "Turn off cuDNN."],
      "Graphs replay GPU work. A host value that changes control flow or is copied in every replay breaks capture.",
    ),
    q(
      "Eager norm+linear moves 2·B·S·D·2 bytes for the activation round-trip plus the weight read. After a true fusion, which term should disappear from the trace?",
      "The write and re-read of the normalised activation.",
      ["The weight read.", "The store of the GEMM output.", "All memory traffic."],
      "Fusion removes the intermediate. Weights and the final store remain. If the norm kernel is still in the trace, it did not fuse.",
    ),
    q(
      "max-autotune beats reduce-overhead on a single large GEMM and loses on a 40-op block full of small elementwise kernels. The consistent explanation:",
      "Autotune spends its search on kernel choice for big GEMMs. The small ops were launch-bound, which is the graph's job.",
      ["max-autotune is always slower and the GEMM result is noise.", "reduce-overhead cannot compile GEMMs.", "The block is too small for any compiler."],
      "Pick the mode that matches the bound you measured in Module 0.",
    ),
    q(
      "Your compiled step is 1.1× and you want to quote the RTX 5090 4.52× figure as confirmation. What is wrong with that sentence?",
      "The 4.52× stack includes sparse attention and cache. The kernel-only row on that page is 1.08×. You have not reproduced either row.",
      ["4.52× is an underestimate, so 1.1× disproves the page.", "Kernel work cannot exceed 1.1× on any GPU.", "The page is about training, not inference."],
      "Compare like with like. Cite the row you are actually near, and label it as their claim.",
    ),
    q(
      "A graph captured with a static address for the output buffer is replayed while another stream frees that buffer. The next replay is:",
      "Illegal. Captured addresses must stay valid for every replay. Lifetime is part of the capture contract.",
      ["Fine, because graphs copy inputs by value.", "Slower but correct.", "Automatically recaptured by the caching allocator."],
      "CUDA graphs do not extend tensor lifetimes for you. Hold the tensors.",
    ),
    q(
      "You need the norm's output for a log, and you also want fusion. What is the honest trade?",
      "Materialising it for the log defeats the fusion on that path. Log a fused run and a debug run separately.",
      ["Printing does not count as a use, so Inductor will still fuse.", "Write the log inside the kernel with printf. It is free.", "Fusion is impossible if anyone might ever debug."],
      "A use is a use. Measure the path you ship, not the path with prints in it.",
    ),
    q(
      "Which PR description passes this module?",
      "'Eager 4.2 ms, compiled 3.1 ms, N=30 after 5 warmup iters. Trace shows the norm kernel gone. Shape [1,1024,768] BF16. 4090, torch version pinned.'",
      ["'Compiled it. Feels faster.'", "'Should be 4× like the blog.'", "'CI is green' with no timing and no shape."],
      "The module's deliverable is the comparison plus the evidence the fusion happened.",
    ),
  ],
  "2": [
    q("A Triton kernel matches PyTorch in fp32 and drifts in bf16. What do you change first?", "The test tolerance and the accumulator dtype, explicitly. Do not 'fix' it by comparing the kernel to itself.", ["The benchmark harness. Drift means it is faster.", "The PyTorch reference, until it matches the kernel.", "Nothing. bf16 has no rounding."], "bf16 accumulation order is visible. Publish the tolerance. Keep a wider accumulator if the algorithm needs it."),
    q("Autotune picks BLOCK=128 during the search. You then quote the search wall time as the kernel time. What did you measure?", "Search plus at least one bad config. The number is not the steady-state kernel.", ["The fastest possible tile.", "Host overhead only.", "The roofline peak."], "Freeze the config, time that launch, log the config in the PR."),
    q("Occupancy drops when you raise BLOCK, and the kernel gets slower even though arithmetic intensity went up. A likely cause:", "Register spill. The extra tile no longer lives in registers, so you added memory traffic you thought you had removed.", ["The GPU ran out of HBM capacity for a 1 MB activation.", "Occupancy must always rise with speed.", "Triton ignores num_warps."], "Intensity on paper is not intensity after spills."),
    q("Why is the reference eager PyTorch rather than torch.compile of your own formula?", "A compiled reference can share a bug with a compiled kernel path. Eager is the independent specification.", ["Eager is always faster, so it is a harder bar.", "Compile cannot run on the same machine.", "The rubric forbids PyTorch."], "Correctness is agreement with the specification, not agreement between two optimisers."),
    q("Masked loads with other=0.0 are used in a block reduction that computes a max. The tail of the vector becomes zeros. Why is the max wrong?", "A zero manufactured by the mask can win the max if every real value is negative.", ["Masks are not allowed in reductions.", "other=0.0 is only wrong for stores.", "Triton max ignores masks."], "The fill value has to be the identity of the reduction. For max, that is a true minimum, not zero."),
    q("You want CUTLASS next. The Triton kernel is still numerically wrong. What is the move?", "Stay in Triton until the test passes. A second language will not debug the math.", ["Rewrite in CUTLASS immediately. It is closer to the metal.", "Drop the test and keep the timing.", "Call cuBLAS and skip the module."], "The module's gate is a matching kernel, not a tour of DSLs."),
    q("The roofline plot uses a peak TFLOP/s copied from a review article. The point sits at 90% of that peak. What can you not say?", "That you achieved 90% of the device. Their peak may not be your dtype, your clock, or your clock throttle.", ["That you plotted a point.", "That you should name the source of the peak.", "That a higher point would be suspicious if it crosses a measured peak."], "Label the peak ESTIMATE or MEASURED. A borrowed peak makes a borrowed percentage."),
    q("num_warps=8 on a tiny problem is slower than num_warps=4. Why can more warps hurt?", "They compete for registers and scheduling on a problem that never fills the machine. Launch and occupancy are not free.", ["Warps are executed sequentially, so 8 always takes twice as long.", "Triton only supports 4 warps.", "More warps disable tensor cores."], "Tune warps against the problem size. Do not treat the largest number as the serious one."),
    q("CI on a laptop without a GPU skips the kernel test. What should the PR status say?", "Untested on device. A skipped GPU test is not a pass.", ["Pass. The Python syntax compiled.", "Fail the repository for everyone, including docs changes.", "Measured, because the skip is reproducible."], "The workflow in this programme marks skipped GPU jobs as untested, not green."),
    q("Which failure belongs in the kernel write-up even if the test is green?", "A tile size that matched numerically and was slower than eager, and the reason you rejected it.", ["A joke about the compiler.", "The marketing name of the GPU.", "A speedup copied from FlashAttention."], "The module asks for the winner and one size that lost. Green tests do not replace that note."),
  ],
  "3": [
    q("Why does materialising the attention matrix fail for a long video latent?", "The score matrix is quadratic in token count. The latent is already large; the matrix does not fit, and writing it is the slow part.", ["Softmax is undefined for more than 4096 tokens.", "Video models do not use attention.", "GPUs cannot compute a max reduction."], "Tiling exists because the matrix is the wrong intermediate, not because of a software fashion."),
    q("Online softmax rescales the accumulator when the running max changes. If you skip the rescale, what breaks?", "The previous tile's contribution is in the wrong ratio to the new tile. The output is not a softmax mixture.", ["Only the last token is wrong.", "The kernel gets faster and stays correct.", "The mask stops applying."], "The rescale is the algorithm, not an optimisation."),
    q("Sol-Attn approximates unselected blocks instead of dropping them. Why does the correction exist?", "A dropped block still held probability mass. Discarding it biases the output. The proxy puts a cheap estimate of that mass back.", ["The correction is a regulariser used in training.", "It increases density back to 100%.", "It is only needed for audio models."], "See the Sol-Attn doc: unselected blocks reuse proxy scores rather than contributing zero."),
    q("Spark-H3's complaint about fixed grouping is that:", "Tokens with different attention preferences end up in one block, so the block decision is a compromise.", ["Fixed blocks are illegal on Blackwell.", "Grouping makes PSNR undefined.", "Sparse attention cannot run on SM120."], "Their Reblock step exists to regroup without giving up rectangular tiles. arXiv:2611.24256."),
    q("You copy a 951-token exact sink into a different architecture. What did you assume that you did not check?", "That the other model has the same multimodal prefix layout. The number is not a universal constant.", ["That 951 is a power of two.", "That sinks only work on H100.", "That exact tokens are slower than sparse tokens, which is false."], "The datacenter note's 951 is a property of that H3 policy."),
    q("At 10% exact-block density Spark-H3 reports 24.81 dB PSNR against dense outputs. What does that number not mean?", "It does not mean the video matches a camera original, and it does not mean LPIPS was 24.81.", ["It is a comparison to the dense model's own frames.", "It was reported at a stated resolution and step count.", "A higher density on that curve raised PSNR and lowered the speedup."], "PSNR versus dense is a drift metric. Read the conditions: 20 steps, 345 frames, 1344×768."),
    q("A sparse kernel is faster and the still frame looks fine. The motion flickers. Which extra check does Module 3 require before you call it done?", "A quality number on the actual sequence, not one still, plus a look at temporal failure. A still can hide flicker.", ["Nothing. Speed is the assignment.", "A human study of 1,000 people.", "Retraining the DiT."], "Accuracy versus speed is the module outcome. One pretty frame is not accuracy."),
    q("Token2Tile's stated reason for going through a low-rank space is:", "Queries want per-token selection, while kernels want tiles. The method scores per query and still executes tiles.", ["Low rank removes the need for a GPU.", "Video tokens are always rank-1.", "FlashAttention-3 is dense and therefore unused."], "arXiv:2611.17930, 13 Nov 2026. Their speedups are their claims."),
    q("Your density sweep forgets to hold seed, steps and resolution fixed. The fastest row also changed the sampler. The row is:", "Not an attention result. You measured a different programme.", ["The one you should ship, because it is fastest.", "Valid if the prompt string is the same.", "A lower bound on sparse attention."], "Ablations change one mechanism."),
    q("Which implementation order matches the module?", "Correct tiled attention on a short sequence, then a sparse mask, then a density-versus-quality table.", ["Sparse first, on the full video, with no dense reference.", "Download H3 weights, then see if it runs.", "Quote 3.07× from Sol³ and stop."], "Sol³ (arXiv:2611.32562, 24 Nov 2026) claims 3.07× attention speedup and 86% sparsity. That is a claim to read, not a result to paste."),
  ],
  "4": [
    q("First Block Cache decides to skip using:", "The residual of the first transformer block, compared with the previous step.", ["The timestep embedding alone.", "A random number so the average skip rate hits a target.", "The LPIPS of the final frame, which is not available yet."], "That is the ParaAttention / Diffusers definition. TeaCache predicts from timestep embeddings and is a different method."),
    q("The first 10 steps are kept dense in the published H3 policy. Skipping them anyway will mostly:", "Risk structure errors (layout, identity, motion) to save the steps that were never the expensive remainder.", ["Only change high-frequency noise that people cannot see.", "Make later cache decisions more accurate.", "Be required for the maths of FBCache."], "Early steps move the latent. The policy exists because of that."),
    q("A threshold tuned at 480p is reused at 768p. Why is the quality outcome not guaranteed?", "The residual scale and the token count both changed. The threshold is in residual units, not in 'amount of speed'.", ["Resolution cannot affect a residual.", "768p is always safer.", "Thresholds are dimensionless and transfer."], "Retune and show the curve. Do not inherit a magic number."),
    q("You chain three 5-second segments and keep the cache warm across each cut. The third segment inherits:", "A residual from a different noise state. Later skips compound on top of that mistake.", ["A free speedup with no quality term.", "The text prompt only, which is harmless.", "A lower LPIPS by construction."], "Reset on the content boundary. The drill's carry switch demonstrates the shape of this bug in a teaching model."),
    q("Mean absolute residual is under the threshold, but a face region moved. The gate skips. What limitation of the scalar gate is that?", "A global mean hides a local change. The probe can be calm while a part of the frame is not.", ["Proof that the threshold is too low.", "Evidence that faces do not use the DiT.", "A PyTorch broadcasting bug."], "If the artefact you care about is local, a single scalar is the wrong probe. Say so when you pick it."),
    q("Cache reuse on the datacenter H3 note is 67.35%, and the on-device 5090 stack jumps from 1.48× to 4.52× when cache is added. What should your ablation therefore include?", "A row with cache off and a row with cache on, same everything else, so the factor is visible instead of mixed into 'the stack'.", ["Only the final stack. Intermediate rows confuse readers.", "A single number labelled 4.52×.", "Training loss."], "The published jump is their claim. Your PR needs your own two rows."),
    q("Why can a 4-step distilled sampler not reuse a threshold you tuned on a 50-step sampler?", "There is no long tail of low-movement steps. Almost every step is structural, so the skip region may not exist.", ["Distillation removes the first block.", "4-step samplers do not have residuals.", "The cache is illegal below 30 steps."], "This is also why the Sol-H3 4-step versus 50-step comparison is a different experiment."),
    q("The cache stores the full residual of the skipped stack. Forgetting to clear it when the batch index now refers to a different clip means:", "Clip B can be updated with clip A's residual. That is a cross-example leak, not just a quality loss.", ["A small slowdown.", "An out-of-memory error, always.", "Nothing, because residuals are prompt-independent."], "Cache identity is part of correctness. Key it by example, not by tensor slot alone."),
    q("Error versus step index is flat, then spikes at steps 16, 32 and 48, which are exactly your segment cuts. The likely bug:", "The cache was not reset at the cut.", ["The GPU clocked down on a schedule.", "LPIPS cannot be computed at those steps.", "Sparse attention turned itself off."], "Spikes lined up with a boundary are a reset bug until proven otherwise."),
    q("Which write-up sentence is acceptable?", "'At threshold 0.03, skip rate 41%, LPIPS 0.04 against dense, same seed. Above 0.08 the hands smear. We ship 0.03.'", ["'Cache gives 4×, as expected.'", "'We skipped as much as possible.'", "'Quality unchanged' with no metric and no stills."], "A threshold without a quality curve is a guess."),
  ],
  "5": [
    q("Why keep softmax in bf16 or fp32 when the GEMM is FP8?", "Softmax is a normalisation. Rounding the logits changes the weights of the mixture, not just a matmul tile.", ["Softmax tensor cores exist on every GPU since 2016.", "FP8 cannot represent positive numbers.", "The GEMM is the only op that can be wrong."], "Put range where the format has it. Do not spend FP8 on the reduction that sets the weights."),
    q("A per-tensor FP8 scale is dominated by one outlier channel. The frame goes grey in flat regions. The mechanism:", "Most values quantise into a handful of codes because the scale is set by the outlier.", ["FP8 always greys out video.", "The VAE is broken.", "Grey is a bandwidth win."], "Use a scale axis that isolates the outlier, or the outlier spends the entire format."),
    q("You quantise the residual stream between blocks, then turn on First Block Cache. Skip decisions become noisy. Why?", "The probe residual now includes rounding. You skip because of the format, not because the latent settled.", ["Cache cannot run in low precision at all.", "FP8 removes the first block.", "Skip decisions do not look at values."], "Measure the gate on the dtype you will actually store. Do not tune it in bf16 and deploy it in fp8."),
    q("An FP8 kernel 'runs' on an Ampere GPU but tensor-core counters stay at zero. What did you likely execute?", "A fallback path that is not the FP8 tensor-core kernel you meant to benchmark.", ["The peak FP8 rate for Ampere.", "A simulated result from this website.", "SM120 code, which Ampere can translate."], "Check the SM and the profiler pipes. A fallback must be labelled."),
    q("NVFP4 is mentioned in the module. What does this page refuse to specify?", "The microscaling block size and the exact kernel recipe. Those have to come from the toolkit docs you have open, not from memory.", ["That it is a 4-bit floating format associated with Blackwell.", "That it is not free quality.", "That the PR must name the GPU."], "Unverified details stay unverified. Inventing a block size would be a false citation."),
    q("Calibration images come from a dataset whose licence you have not read. The right action:", "Stop. A calibrated checkpoint carries obligations from both the model and the calibration data.", ["Proceed. Calibration data is not training.", "Only the code licence matters.", "Strip the metadata and continue."], "LICENSES.md exists so this decision is written down."),
    q("BF16 versus FP8 LPIPS is small on a static background and large on on-screen text. You ship the mean. What did you hide?", "A local failure. Means bury the frames the format is bad at.", ["Nothing. The mean is the metric.", "A training bug.", "That LPIPS cannot see text, which is false here — it did see it."], "Report the bad slice. Text and faces are where viewers look."),
    q("Which sentence may cite a speedup?", "'On this SM90 box, torch and TE versions pinned, FP8 GEMM was 1.4× the BF16 GEMM at these shapes, N=20. Fallback not used.'", ["'FP8 is 2× because the bits are half.'", "'NVFP4 should be another 2× on top.'", "'Blackwell is faster, so we are faster.'"], "Bits are not a timing. Shapes and the real kernel are."),
    q("E4M3 has a small dynamic range and no infinities. A scale that underestimates the max will:", "Overflow into the format's saturation behaviour and stick large regions to the extreme code.", ["Wrap like two's-complement integers.", "Throw a Python exception inside the tensor core.", "Quietly promote the tensor to fp32."], "Know the format's edge. Saturation is a visible artefact."),
    q("The module's quality bar is met when:", "The PR names format, scale axis, SM, calibration source, and a same-seed quality delta.", ["The model loads in FP8.", "A blog says FP8 is lossless.", "VRAM went down, so quality is unchanged."], "Memory is the point and also the way you hide damage. Measure both."),
  ],
  "6": [
    q("PagedAttention's problem statement is:", "Contiguous per-request KV allocations fragment, so free memory exists but cannot satisfy the next request.", ["Attention scores are too accurate.", "GPUs cannot allocate more than 4 GB.", "Video latents need pages."], "Kwon et al., SOSP 2023. The mechanism is a block table plus a free list."),
    q("Why is a diffusion denoising step a poor fit for token-level continuous batching?", "The step is a full forward over a fixed latent. Requests do not complete a 'token' in the middle of it.", ["Diffusion models have no batch dimension.", "Continuous batching is only implemented in CUDA graphs.", "DiT layers are not parallelisable."], "Batch clips or queue jobs. Do not import a decode scheduler diagram unchanged."),
    q("Speculative decoding preserves quality only if:", "Rejected draft tokens are dropped and the target model's decision stands.", ["The draft model is at least half the size of the target.", "You accept the rest of the draft after the first mismatch to stay fast.", "Temperature is zero."], "The target distribution is the product. The draft is a proposal."),
    q("A shared first-block cache across unrelated overnight jobs will:", "Apply one clip's residual to another if the key is only the worker process.", ["Improve hit rate safely, because residuals are universal.", "Reduce VRAM to zero.", "Be required by the capstone."], "Key caches by job identity. Reset on boundaries. Module 4's bug scales into the queue."),
    q("Chunked prefill (Sarathi-style) exists to:", "Stop a long prefill from stalling decode for the whole prompt's worth of work.", ["Quantise the KV cache to 2 bits.", "Replace paged attention.", "Speed up video VAE decode."], "It is an LLM serving technique. Do not list it as a video-DiT method without a new argument."),
    q("Your queue runs two clips on one GPU 'to use the spare memory'. They share a CUDA graph captured for clip A's shape. Clip B has a different frame count. The run is:", "Invalid. The graph's shape is part of its contract.", ["Faster and correct.", "Correct if the batch size is 2.", "A paged-attention success."], "Capture per shape, or do not share the graph."),
    q("Multi-GPU Ulysses-style sequence parallel, as in the H3 datacenter note, changes the benchmark because:", "Communication is now inside the step. A single-GPU kernel time is not the distributed step time.", ["Four GPUs always quarter the time.", "Ulysses removes the need for a licence.", "The note used it only for training."], "They report Ulysses-4 on the 4×H100 and 4×A100 runs. Cite the topology with the number."),
    q("An overnight batch system retries a failed job by replaying the CUDA graph from the previous job's buffers. Besides the shape bug, what else is wrong?", "The buffers may have been freed or overwritten. Replay does not restore values.", ["Retries are discouraged in CI.", "CUDA graphs cannot represent GEMMs.", "Overnight jobs must use FP8."], "Ownership of memory outlives the logical request only if you designed it to."),
    q("vLLM, SGLang and TensorRT-LLM are cited in this module as:", "Systems you may measure, with the version pinned, not as logos that imply a speedup.", ["Interchangeable binaries with the same kernels.", "Required dependencies of Modules 0–5.", "The only legal way to run attention."], "A name is not a result. The resource list at wafer-ai is a map, not a measurement."),
    q("The serving note is finished when it states:", "The batching unit, the memory that dominates, what is not shared between jobs, and the hardware.", ["'We use vLLM.'", "'It scales.'", "'Latency is low.'"], "If a stranger cannot re-draw the queue, the note is not done."),
  ],
  "7": [
    q("The capstone's three rows are:", "Kernels only, plus sparse attention, plus cache, against a dense baseline at fixed seed, steps and resolution.", ["One final demo video.", "Training loss before and after.", "A 4-step run versus a 50-step run, labelled as a kernel win."], "That is the ablation the published 5090 table is shaped like. Your numbers will differ. Good."),
    q("MiniMax-H3 weights are not in the starter because:", "The headline model is not a licence you can assume, especially outside its territory. The UK is reported excluded.", ["The format is unsupported by PyTorch.", "They are too small to profile.", "NVIDIA asked this site not to name them."], "Reproduce the method on a model you are allowed to run. Compare claims in a table that stays labelled as claims."),
    q("LPIPS of 0.02 against dense means:", "The frames are close under that perceptual distance. It does not mean a viewer will accept the motion, and it does not mean you matched a published PSNR.", ["The video is identical.", "You may cite 4.52×.", "The blind study is unnecessary."], "Report LPIPS and, if you run it, the preference split. They answer different questions."),
    q("You fix the protocol after watching the clips and noticing a flicker. The preference test is:", "Invalid. The criterion and the sample were chosen after the outcome was visible.", ["Stronger, because it targets a real flaw.", "Still valid if you report the flicker.", "A replacement for LPIPS."], "Write the protocol first. Exploratory viewing is allowed only if it is not the study."),
    q("A portfolio PR with no commit hash, no GPU name and no torch version is:", "Not reproducible. The leaderboard script should refuse it.", ["Fine if the video looks good.", "Acceptable for Module 7, just not for Module 0.", "A measured result."], "The public standard is evidence a stranger can re-run."),
    q("Wan 2.2 is the optional open target, not the default. Why the caution even though Apache-2.0 is widely reported?", "Secondary write-ups are not the model card. Confirm the card, then paste the grant into LICENSES.md.", ["Apache-2.0 forbids benchmarks.", "Wan cannot run attention.", "The dojo owns the Wan weights."], "Code licence and weight licence are different files even when they match."),
    q("Your kernels-only row is 1.05×, sparse adds little, cache adds 1.8× at a small LPIPS rise. How do you present it?", "As your stack, with the cache term dominant, and without borrowing NVIDIA's 4.52×.", ["As a failed project, because it is not 4×.", "As 4.52×, because the shape of the stack matches.", "As a training result."], "A smaller, honest factor is a result. A borrowed factor is not."),
    q("The blind pairs use different seeds for A and B. A reviewer prefers A. What can you conclude?", "Almost nothing about the method. The seed changed the video.", ["That the method won.", "That LPIPS is biased.", "That the reviewer should be replaced."], "Same prompt, same seed, order hidden. Otherwise you measured the sampler's luck."),
    q("Chaining 15 seconds as three segments, you report one LPIPS averaged across all frames. The middle segment is damaged and the ends are fine. The average looks acceptable. What did the rubric ask for instead?", "The per-segment error, because compounding at the cuts is the failure mode the programme exists to catch.", ["A higher resolution.", "A different metric that cannot see the middle.", "Fewer frames so the average moves less."], "Show the cut. A mean is how the cut disappears."),
    q("When may you write 'reproduced the Sol Engine result'?", "When your table matches their operating point closely enough to be the same experiment, on hardware you name, with numbers you measured. Otherwise write 'attempted the stack' and show your rows.", ["When your speedup is any number above 1×.", "When you used torch.compile.", "When you cite the arXiv id."], "Reproduction is a claim about your measurement. Citation is not reproduction."),
  ],
};

export const bugs: Record<string, Bug[]> = {
  "0": [
    {
      title: "The generous timer",
      symptom: "A fused kernel reports 8× against eager. The eager loop has a synchronise inside, and the fused loop does not synchronise at all.",
      code: `for _ in range(20):
    eager(); torch.cuda.synchronize()
t0 = time.perf_counter()
for _ in range(20):
    fused()  # no sync
print("fused ms", (time.perf_counter()-t0)/20*1e3)`,
      choices: [
        { id: "a", text: "The fused number is mostly launch overhead. The comparison is not a kernel speedup.", correct: true },
        { id: "b", text: "The eager sync makes eager more accurate, so 8× is conservative." },
        { id: "c", text: "perf_counter waits for the default CUDA stream." },
        { id: "d", text: "The bug is the warmup. Add more eager iterations." },
      ],
      explain: "Time both sides with the same event or sync protocol, after warmup. As written, fused returns before the GPU is done.",
    },
    {
      title: "The borrowed ridge",
      symptom: "A student marks a point 'at 80% of peak' using a 4090 FP16 number found on a retailer page, measured on a laptop 4090 that is power-limited.",
      code: `peak = 82.6e12  # from a product listing, datatype unclear
print(achieved / peak)`,
      choices: [
        { id: "a", text: "The denominator is not this machine's peak. The percentage is not a measurement.", correct: true },
        { id: "b", text: "Retailer peaks are lower than reality, so the student is being modest." },
        { id: "c", text: "Power limits do not change TFLOP/s." },
        { id: "d", text: "FP16 and BF16 share a peak on every architecture, so the listing is fine." },
      ],
      explain: "Measure the peak you will use, or label the listing an estimate and drop the percentage. Clocks move.",
    },
  ],
  "1": [
    {
      title: "Graph of a changing frame count",
      symptom: "Capture succeeds on 16-frame clips. The overnight queue then submits 24-frame clips and the replay is wrong or crashes.",
      code: `g = torch.cuda.CUDAGraph()
with torch.cuda.graph(g):
    out = step(static_16)  # captured N=16
# later
static_16.copy_(clip_24)  # clip_24 is longer
g.replay()`,
      choices: [
        { id: "a", text: "The graph contains the 16-frame shape and addresses. A longer clip is not the captured programme.", correct: true },
        { id: "b", text: "copy_ extends the graph to the new size." },
        { id: "c", text: "CUDA graphs pad automatically to the next power of two." },
        { id: "d", text: "The bug is BF16. Capture in FP32." },
      ],
      explain: "One graph per shape, or do not use a graph. Padding to a max length is a different, explicit design.",
    },
    {
      title: "The fused kernel that is still in the trace",
      symptom: "The PR says RMSNorm was fused. The profiler still shows a standalone norm, then a GEMM, and the speedup is 1.01×.",
      code: `y = rmsnorm(x)
torch.save(y, "/tmp/debug.pt")  # leftover from a debug session
return F.linear(y, w)`,
      choices: [
        { id: "a", text: "The save is a real use of y. The compiler must materialise it, so the fusion cannot happen.", correct: true },
        { id: "b", text: "torch.save is ignored by Inductor." },
        { id: "c", text: "1.01× means the GPU is broken." },
        { id: "d", text: "F.linear never fuses, even with no extra uses." },
      ],
      explain: "Remove the debug use and profile again. Do not claim a fusion the trace still contradicts.",
    },
  ],
  "2": [
    {
      title: "Identity of the wrong reduction",
      symptom: "The kernel matches PyTorch on random positive inputs and fails when the tensor is negative.",
      code: `x = tl.load(ptr + offs, mask=offs < N, other=0.0)
m = tl.max(x, axis=0)`,
      choices: [
        { id: "a", text: "Masked-out lanes contribute 0, which becomes the max whenever real values are negative.", correct: true },
        { id: "b", text: "tl.max does not support masks." },
        { id: "c", text: "Negative numbers are illegal in Triton." },
        { id: "d", text: "The bug is N not being a power of two, regardless of sign." },
      ],
      explain: "Fill with the identity for max, and add a test with negative values. All-positive tests hide this.",
    },
    {
      title: "Autotune in the timing loop",
      symptom: "The benchmark process is 40× slower than a colleague's, on the same config, and the first call dominates.",
      code: `@triton.autotune(configs=CONFIGS, key=["N"])
def kernel(...):
    ...
for n in sizes:          # N changes every call
    kernel(x[:n])        # search again
    bench(kernel, x[:n]) # and maybe again`,
      choices: [
        { id: "a", text: "The key changes every size, so you are timing the search. Cache or freeze configs per N.", correct: true },
        { id: "b", text: "Colleagues' GPUs skip autotune." },
        { id: "c", text: "key=['N'] disables autotune." },
        { id: "d", text: "The first call is always the device peak." },
      ],
      explain: "Split search from measurement. Log the chosen config and time a kernel that no longer searches.",
    },
  ],
  "3": [
    {
      title: "The forgotten rescale",
      symptom: "Tiled attention matches the dense result for one tile and diverges as soon as the running max increases on tile two.",
      code: `m_new = max(m, rowmax(scores))
acc = acc + softmax_tile(scores, m_new) @ v   # no scale on acc
l = l + rowsum(exp(scores - m_new))`,
      choices: [
        { id: "a", text: "acc and l from the previous tile are still in the old max's units. They must be rescaled by exp(m - m_new).", correct: true },
        { id: "b", text: "The bug is using max instead of min." },
        { id: "c", text: "Tile two should be computed in a second kernel and added on CPU." },
        { id: "d", text: "rowsum is illegal in attention." },
      ],
      explain: "Write the online-softmax recurrence on paper for two tiles before editing the kernel. The rescale is the whole trick.",
    },
    {
      title: "Density theatre",
      symptom: "Reported density is 10%, but the 'sparse' kernel still multiplies the full K matrix and then multiplies the output by a mask of ones and zeros.",
      code: `scores = q @ k.T          # full matrix
scores = scores * mask     # mask has 10% ones
out = softmax(scores) @ v`,
      choices: [
        { id: "a", text: "The mask does not remove the bytes or the FLOPs. Density of the mask is not sparsity of the work.", correct: true },
        { id: "b", text: "Multiplying by zero is free on real hardware, so this is a fair sparse kernel." },
        { id: "c", text: "Softmax of a masked matrix is undefined." },
        { id: "d", text: "The bug is storing out in bf16." },
      ],
      explain: "A sparse method has to skip the tiles. Prove it with a profiler, not with the count of zeros in a mask.",
    },
  ],
  "4": [
    {
      title: "Warm cache, cold clip",
      symptom: "Segment 2 of a three-part shot starts with the colour and pose of the end of segment 1, then melts.",
      code: `for seg in segments:
    for step in steps:
        x = cached_step(x)   # cache lives outside both loops
    write(x)`,
      choices: [
        { id: "a", text: "The cache survives the segment cut. Reset it with the latent, or the new segment reuses the old residual.", correct: true },
        { id: "b", text: "write() is too slow, so the GPU overlaps segments." },
        { id: "c", text: "The melt means the threshold is too small." },
        { id: "d", text: "Segments must share a cache or the sampler is biased." },
      ],
      explain: "Initialise cache and the first-block probe to empty at each cut. Then re-measure skip rate. It will drop, and the start of the segment will belong to itself.",
    },
    {
      title: "Tuning on the frame you liked",
      symptom: "Threshold 0.2 passes a single hero still and fails a contact sheet of the same clip: hands and lips smear on four of twenty frames.",
      code: `if lpips(frame[0], dense[0]) < 0.05:
    ship(threshold=0.2)`,
      choices: [
        { id: "a", text: "One frame is not the clip. The gate has to survive the worst frames you promised to care about, chosen up front.", correct: true },
        { id: "b", text: "LPIPS on frame 0 is a sufficient statistic for video." },
        { id: "c", text: "Smear means the dense model is the one that is wrong." },
        { id: "d", text: "Raising the threshold always lowers LPIPS." },
      ],
      explain: "Pick the review frames before you sweep. Include a cut, a hand, and text if the prompt has them.",
    },
  ],
  "5": [
    {
      title: "The scale from the wrong batch",
      symptom: "Calibration ran on 256×256 stills. Inference is 768p video. Flat skies posterise.",
      code: `scale = calib_stills.abs().mean() * 0.9
video_q = quantise(video, scale)`,
      choices: [
        { id: "a", text: "The scale does not describe this activation. Resolution and motion changed the distribution.", correct: true },
        { id: "b", text: "Posterising means the VAE learning rate is too high." },
        { id: "c", text: "A mean scale is always safer than a max scale, so this is the textbook choice." },
        { id: "d", text: "768p uses the same codes as 256p by definition." },
      ],
      explain: "Calibrate on the distribution you serve, or use a dynamic scale and pay for it in the timing.",
    },
    {
      title: "Fallback dressed as FP8",
      symptom: "The FP8 PR reports 1.9× on a 4090 (Ada, SM89) using a kernel whose README says Hopper tensor cores only. No profiler screenshot.",
      code: `if sm >= 90:
    y = te_fp8(x)
else:
    y = x.float() @ w.float()  # silent
print("fp8 speedup", t_bf16 / t)`,
      choices: [
        { id: "a", text: "The timed path is the else branch. The label is false. Print the branch, or better, fail.", correct: true },
        { id: "b", text: "Ada runs Hopper FP8 kernels unchanged, so the README is out of date and the number stands." },
        { id: "c", text: "A silent fallback is acceptable if the outputs match." },
        { id: "d", text: "SM89 is newer than SM90, so the if condition is the bug and the speedup is real." },
      ],
      explain: "Assert the architecture. A fallback that times a different algorithm will always 'succeed'.",
    },
  ],
  "6": [
    {
      title: "The shared graph in the queue",
      symptom: "Job B finishes with a slice of job A's frames in the first 16 positions. Both jobs passed unit tests alone.",
      code: `GRAPH = capture(job_template)  # module global
def run(job):
    buf.copy_(job.latent)  # buf is shorter than some jobs
    GRAPH.replay()
    return buf`,
      choices: [
        { id: "a", text: "One captured graph and one buffer are being reused across jobs whose shapes and identities differ.", correct: true },
        { id: "b", text: "copy_ isolates jobs by value, so the mix-up is in the filesystem." },
        { id: "c", text: "Replay is thread-safe against any buffer size." },
        { id: "d", text: "The unit tests prove the queue, because they imported the same function." },
      ],
      explain: "Capture per shape, allocate per job, and never store another job's residual in a process global. Add a test that runs two shapes in sequence.",
    },
    {
      title: "Acceptance by optimism",
      symptom: "Speculative decoding reports 3× tokens/s. The text diverges from the target model's samples at the same seed. The implementation accepts the rest of the draft after a mismatch 'to stay in batch'.",
      code: `if token != target:
    token = target
    # continue taking draft tokens anyway`,
      choices: [
        { id: "a", text: "After a rejection the draft's continuation is not on the target path. Accepting it changes the distribution.", correct: true },
        { id: "b", text: "Staying in batch is worth a distribution change. Tokens/s is the spec." },
        { id: "c", text: "The target token only matters for the first mismatch in a sequence." },
        { id: "d", text: "Seed mismatch is expected whenever a draft exists." },
      ],
      explain: "On rejection, take the target token and draft again from there. Quote acceptance rate beside tokens/s.",
    },
  ],
  "7": [
    {
      title: "The step-count swap",
      symptom: "The capstone table's 'cache' row uses 8 steps and the baseline uses 32. The author labels the ratio 4× from caching.",
      code: `base = run(steps=32)
fast = run(steps=8, cache=True)
print(base.time / fast.time)`,
      choices: [
        { id: "a", text: "Most of that ratio is fewer steps. Add a row that changes only the cache, at 32 steps, before attributing anything.", correct: true },
        { id: "b", text: "Cache implies fewer steps, so the comparison is the definition of the method." },
        { id: "c", text: "32 and 8 are close enough for a portfolio." },
        { id: "d", text: "Time ratios cancel the step count." },
      ],
      explain: "This is the same trap as reading Sol-H3's 50-step versus 4-step figure as a kernel result. Keep the sampler fixed inside an ablation row.",
    },
    {
      title: "The unblinded hero",
      symptom: "Reviewers are shown 'dense' on the left and 'ours' on the right, after a stand-up where the author pointed at the flicker in 'ours'. Preference is 50/50. The PR says quality is unchanged.",
      code: `show(left="dense", right="ours")  # labels visible
# criterion written afterwards: "ignore flicker"`,
      choices: [
        { id: "a", text: "Labels, order, and a criterion edited after viewing all bias the test. 50/50 here is not a quality result.", correct: true },
        { id: "b", text: "50/50 always means indistinguishable, whatever the protocol." },
        { id: "c", text: "Pointing at the flicker helps reviewers be objective." },
        { id: "d", text: "Blind tests are only for medical studies." },
      ],
      explain: "Relabel, randomise order, freeze the question, and do not brief reviewers on the artefact you hope they miss.",
    },
  ],
};
