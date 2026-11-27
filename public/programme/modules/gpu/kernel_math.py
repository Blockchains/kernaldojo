"""Byte arithmetic for the Advanced GPU Kernel Engineering module.

No torch and no CUDA. These are the counts a kernel either moves or avoids.
A passing test is not a GPU timing.
"""

from __future__ import annotations

import math


def score_bytes(n: int, elem: int = 2) -> int:
    """Bytes to store an N by N score matrix. BF16 is 2."""
    if n < 1 or elem < 1:
        raise ValueError("n and elem must be positive")
    return n * n * elem


def qkv_bytes(n: int, d: int = 128, elem: int = 2) -> int:
    """Bytes for Q, K and V, each N by D."""
    if n < 1 or d < 1 or elem < 1:
        raise ValueError("n, d and elem must be positive")
    return 3 * n * d * elem


def tile_bytes(rows: int = 64, cols: int = 64, elem: int = 2) -> int:
    """Bytes of one score tile kept on chip."""
    if rows < 1 or cols < 1 or elem < 1:
        raise ValueError("tile edges and elem must be positive")
    return rows * cols * elem


def tile_grid(n: int, block: int) -> tuple[int, int]:
    """How many blocks cover n, and how many leftover elements the last one has.

    A tail of 0 means n is an exact multiple. The padded write is
    tile_count * block, which is larger than n whenever the tail is not 0.
    """
    if n < 1 or block < 1:
        raise ValueError("n and block must be positive")
    count = math.ceil(n / block)
    rem = n % block
    tail = 0 if rem == 0 else rem
    return count, tail


def quant_codes(values: list[float], levels: int = 127) -> list[int]:
    """Round each value onto an integer grid whose step is amax/levels.

    The largest absolute value sets the step. Smaller values can round to 0.
    """
    if levels < 1:
        raise ValueError("levels must be positive")
    if not values:
        raise ValueError("values must be non-empty")
    amax = max(abs(v) for v in values)
    if amax == 0:
        return [0 for _ in values]
    quantum = amax / levels
    return [int(round(v / quantum)) for v in values]


def page_waste(lengths: list[int], page: int) -> dict[str, int]:
    """Tokens reserved by a page table versus one padded allocation per sequence.

    Paged: each sequence takes ceil(len/page) pages.
    Static: every sequence is padded to the longest length.
    """
    if page < 1:
        raise ValueError("page must be positive")
    if any(n < 1 for n in lengths) or not lengths:
        raise ValueError("lengths must be positive")
    pages = sum(math.ceil(n / page) for n in lengths)
    reserved = pages * page
    used = sum(lengths)
    longest = max(lengths)
    static = longest * len(lengths)
    return {
        "pages": pages,
        "reserved": reserved,
        "used": used,
        "waste": reserved - used,
        "static": static,
        "static_waste": static - used,
    }
