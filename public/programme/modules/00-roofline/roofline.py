"""Roofline arithmetic. No torch, no CUDA.

The GPU timers in the KernelDojo lesson are specifications.
This file is the part that can run anywhere.
"""

from __future__ import annotations


def arithmetic_intensity(flops: float, nbytes: float) -> float:
    if nbytes <= 0:
        raise ValueError("nbytes must be positive")
    return flops / nbytes


def ridge_point(peak_flops_per_s: float, bandwidth_bytes_per_s: float) -> float:
    if bandwidth_bytes_per_s <= 0:
        raise ValueError("bandwidth must be positive")
    return peak_flops_per_s / bandwidth_bytes_per_s


def bound(flops: float, nbytes: float, peak: float, bandwidth: float) -> str:
    intensity = arithmetic_intensity(flops, nbytes)
    ridge = ridge_point(peak, bandwidth)
    return "compute" if intensity >= ridge else "memory"


def roofline_seconds(flops: float, nbytes: float, peak: float, bandwidth: float) -> float:
    if peak <= 0 or bandwidth <= 0:
        raise ValueError("peak and bandwidth must be positive")
    return max(flops / peak, nbytes / bandwidth)


def eager_activation_bytes(n: int) -> int:
    """BF16 RMSNorm writes y and the following linear reads y."""
    if n < 0:
        raise ValueError("n must be non-negative")
    return 2 * n * 2


def fused_activation_bytes(n: int) -> int:
    """Intermediate stays on chip. Count the final store only."""
    if n < 0:
        raise ValueError("n must be non-negative")
    return n * 2


def activation_traffic_ratio(n: int) -> float:
    fused = fused_activation_bytes(n)
    if fused == 0:
        raise ValueError("n must be positive")
    return eager_activation_bytes(n) / fused
