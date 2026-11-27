import unittest

from roofline import (
    activation_traffic_ratio,
    arithmetic_intensity,
    bound,
    ridge_point,
    roofline_seconds,
)


class RooflineTest(unittest.TestCase):
    def test_intensity(self):
        self.assertEqual(arithmetic_intensity(100.0, 25.0), 4.0)

    def test_ridge_and_bound(self):
        # 200 TFLOP/s, 2 TB/s -> ridge 100 FLOP/byte.
        peak = 200e12
        bandwidth = 2e12
        self.assertAlmostEqual(ridge_point(peak, bandwidth), 100.0)
        self.assertEqual(bound(4, 4, peak, bandwidth), "memory")
        self.assertEqual(bound(1000, 4, peak, bandwidth), "compute")

    def test_time_is_the_max(self):
        # Memory side: 8 bytes at 4 B/s = 2 s. Compute: 4 FLOPs at 100 FLOP/s = 0.04 s.
        self.assertAlmostEqual(roofline_seconds(4, 8, 100, 4), 2.0)

    def test_fusion_traffic(self):
        self.assertEqual(activation_traffic_ratio(1024), 2.0)

    def test_rejects_bad_inputs(self):
        with self.assertRaises(ValueError):
            arithmetic_intensity(1, 0)
        with self.assertRaises(ValueError):
            activation_traffic_ratio(0)


if __name__ == "__main__":
    unittest.main()
