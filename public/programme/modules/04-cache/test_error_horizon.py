import unittest

from error_horizon import max_error, trace


class ErrorHorizonTest(unittest.TestCase):
    def test_threshold_zero_never_drifts(self):
        self.assertEqual(trace(20, threshold=0.0), [0.0] * 20)

    def test_aggressive_threshold_drifts_every_step(self):
        # Signal never reaches 2, and nothing forces a refresh.
        got = trace(5, threshold=2.0, drift=0.02)
        self.assertEqual(got, [0.02, 0.04, 0.06, 0.08, 0.10])

    def test_forced_refresh_bounds_the_run(self):
        got = trace(8, threshold=2.0, force_every=4, drift=0.02)
        self.assertEqual(got[0], 0.0)
        self.assertEqual(got[4], 0.0)
        self.assertAlmostEqual(max_error(got), 0.06)

    def test_segment_reset_beats_carrying(self):
        carried = trace(8, threshold=2.0, drift=0.02)
        reset = trace(8, threshold=2.0, drift=0.02, resets=(4,))
        self.assertEqual(reset[4], 0.0)
        self.assertGreater(max_error(carried), max_error(reset))

    def test_rejects_bad_inputs(self):
        with self.assertRaises(ValueError):
            trace(0, threshold=0.1)


if __name__ == "__main__":
    unittest.main()
