import unittest

from kernel_math import page_waste, qkv_bytes, quant_codes, score_bytes, tile_bytes, tile_grid


class KernelMathTest(unittest.TestCase):
    def test_score_matrix_dwarfs_qkv(self):
        # N=4096, D=128, BF16. The matrix is 32 MiB. QKV is 3 MiB.
        self.assertEqual(score_bytes(4096), 33_554_432)
        self.assertEqual(qkv_bytes(4096, 128), 3_145_728)
        self.assertGreater(score_bytes(4096), qkv_bytes(4096, 128) * 10)

    def test_one_tile_is_not_the_matrix(self):
        self.assertEqual(tile_bytes(64, 64), 8192)
        # Exact tiling still covers the matrix. It does not store it.
        self.assertEqual(score_bytes(4096) // tile_bytes(64, 64), 4096)

    def test_tail_must_be_masked(self):
        count, tail = tile_grid(100, 32)
        self.assertEqual((count, tail), (4, 4))
        self.assertEqual(count * 32 - 100, 28)

    def test_outlier_sets_the_quantum(self):
        # 8.0 sets the step. 0.02 rounds to 0. 8.0 stays at the top code.
        codes = quant_codes([0.2, 0.05, 0.02, 8.0], levels=127)
        self.assertEqual(codes[-1], 127)
        self.assertEqual(codes[2], 0)
        self.assertGreater(codes[0], codes[1])

    def test_pages_win_when_lengths_differ(self):
        row = page_waste([100, 5], page=16)
        self.assertEqual(row["pages"], 8)
        self.assertEqual(row["waste"], 23)
        self.assertEqual(row["static_waste"], 95)
        self.assertGreater(row["static_waste"], row["waste"])

    def test_a_coarse_page_can_lose(self):
        # Page 16 against lengths 17 and 3 wastes the ends of three pages.
        # Padding to the true max (17) wastes less. Paging is not free.
        row = page_waste([17, 3], page=16)
        self.assertGreater(row["waste"], row["static_waste"])

    def test_rejects_bad_inputs(self):
        with self.assertRaises(ValueError):
            score_bytes(0)
        with self.assertRaises(ValueError):
            tile_grid(8, 0)


if __name__ == "__main__":
    unittest.main()
