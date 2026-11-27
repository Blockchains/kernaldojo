"""Teaching model of skip-error. Not a diffusion transformer.

Signal is U-shaped: 1 at the first and last step, 0 in the middle.
A step is computed (error reset to 0) when the threshold is 0 or
negative, when the signal is at least the threshold, when a forced
refresh lands, or when the step is a segment reset. Otherwise the
running error grows by `drift`.

SIMULATED. Do not quote these traces as a video result.
"""

from __future__ import annotations


def signal(t: int, steps: int) -> float:
    if steps < 1:
        raise ValueError("steps must be positive")
    if steps == 1:
        return 1.0
    return abs((t / (steps - 1)) - 0.5) * 2.0


def trace(
    steps: int,
    threshold: float,
    force_every: int = 0,
    drift: float = 0.02,
    resets: tuple[int, ...] = (),
) -> list[float]:
    if steps < 1:
        raise ValueError("steps must be positive")
    if drift < 0:
        raise ValueError("drift must be non-negative")
    if force_every < 0:
        raise ValueError("force_every must be non-negative")
    reset_at = set(resets)
    error = 0.0
    out: list[float] = []
    for t in range(steps):
        dense = (
            threshold <= 0
            or signal(t, steps) >= threshold
            or (force_every > 0 and t % force_every == 0)
            or t in reset_at
        )
        error = 0.0 if dense else error + drift
        out.append(error)
    return out


def max_error(values: list[float]) -> float:
    if not values:
        raise ValueError("values must be non-empty")
    return max(values)
