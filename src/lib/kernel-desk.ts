export function quantCodes(values: number[], levels = 127): number[] {
  const amax = Math.max(...values.map((v) => Math.abs(v)));
  if (amax === 0) return values.map(() => 0);
  const quantum = amax / levels;
  return values.map((v) => Math.round(v / quantum));
}

export function pageWaste(lengths: number[], page: number) {
  const pages = lengths.reduce((sum, n) => sum + Math.ceil(n / page), 0);
  const reserved = pages * page;
  const used = lengths.reduce((sum, n) => sum + n, 0);
  const longest = Math.max(...lengths);
  const staticReserved = longest * lengths.length;
  return {
    pages,
    waste: reserved - used,
    staticWaste: staticReserved - used,
  };
}

export function scoreBytes(n: number, elem = 2): number {
  return n * n * elem;
}

export function qkvBytes(n: number, d = 128, elem = 2): number {
  return 3 * n * d * elem;
}

export function tileBytes(rows = 64, cols = 64, elem = 2): number {
  return rows * cols * elem;
}

export const sessions = [
  {
    hours: 4,
    title: "Read one kernel",
    fork: "llm.c",
    work: "Open train_gpt2.cu. Find one matmul. Do not time it. Write what it reads and what it writes, in bytes, for a shape you choose.",
  },
  {
    hours: 4,
    title: "Delete a round trip",
    fork: "Liger",
    work: "In src/liger_kernel/ops, name the activation that no longer returns to memory. Compute the eager byte count and the fused one. The step will not match that ratio.",
  },
  {
    hours: 6,
    title: "Exact attention",
    fork: "FlashAttention",
    work: "In csrc/flash_attn, find the tile. Use the desk below: the score matrix is resident or it is not. Tiling does not cut the math.",
  },
  {
    hours: 4,
    title: "Pages, or not",
    fork: "FlashInfer",
    work: "Compute page waste for lengths 100 and 5, then for 17 and 3. Explain which case paging loses. If the model recomputes K and V, write “nothing to page”.",
  },
  {
    hours: 6,
    title: "A tile that does not launch",
    fork: "SpargeAttention",
    work: "In csrc/ or Triton_SpargeAttn/, point at the branch that skips a tile. A zero mask after a dense GEMM is the wrong branch. Do not copy the paper’s speed.",
  },
  {
    hours: 6,
    title: "The scale",
    fork: "Sage, bitsandbytes, Transformer Engine, Nunchaku",
    work: "Run quant_codes on a vector with one outlier. Record which entries became 0. Name the device capability before you call anything FP8 or FP4.",
  },
  {
    hours: 4,
    title: "Tiles as the language",
    fork: "ThunderKittens, CUTLASS, TileLang",
    work: "Cover a length that is not a multiple of the block. Count the tail. Say which elements a missing mask would store.",
  },
  {
    hours: 4,
    title: "A different algorithm",
    fork: "Flash Linear Attention",
    work: "Write one sentence on why the N² score-byte formula does not apply. If you cannot, you have not opened the README.",
  },
] as const;

export const drills: Record<string, string> = {
  "flash-attention": "Desk: set N and compare the score matrix with one 64×64 tile. Exact attention still does every score. It just refuses to store them.",
  flashinfer: "Desk: lengths 100 and 5 beat padding. Lengths 17 and 3 do not. Write both.",
  sparge: "After you can point at a skipped tile, estimate the fraction you skipped. A fraction is not a speedup.",
  fla: "State the recurrence in one line. If the line still says softmax, stop.",
  sage: "Quantise a head of scores with one large logit. See which neighbours collapse.",
  nunchaku: "Name the low-rank branch and the 4-bit branch. If you cannot, you are not in nunchaku/ops yet.",
  bnb: "Find the scale next to the narrow matrix. A missing scale means the kernel is not the one you think.",
  te: "Read the FP8 cast beside the GEMM. Record SM. A fallback is a different row.",
  liger: "Count bytes of the fused op versus the eager chain. Exclude the weight read, then put it back.",
  kittens: "Pick a tile edge from the headers. Run tile_grid on a length that is not a multiple.",
  cutlass: "Open one example whose shape you understand. Pin the commit in the note.",
  tilelang: "Read the MIT licence, including the dated collaboration note, before you copy an example out.",
  llmc: "One matmul, one sentence on its bytes. Training, not decode.",
};
