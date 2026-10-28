"""
Check every Fourier series in "Why we see harmonics" against an FFT.

For each function we sample exactly one period (so harmonic n lands on FFT bin n),
compute the amplitude of each harmonic, and compare it with the closed-form
formula from the carousel. Run it:  python verify_harmonics.py

Needs only NumPy.
"""
import numpy as np

N = 2 ** 14                      # samples in one period (T = 1)
t = np.arange(N) / N
w0 = 2 * np.pi                   # omega_0 = 2*pi / T


def amplitudes(x, n_max=9):
    """DC term and |c_n| = sqrt(a_n^2 + b_n^2) for n = 1..n_max."""
    X = np.fft.rfft(x) / N
    return X[0].real, 2 * np.abs(X[1:n_max + 1])


n = np.arange(1, 10)
odd = n % 2 == 1
even = ~odd
# 2 / (pi (n^2 - 1)) for even n (the cut-sine harmonics); n = 1 is handled separately
cut_even = np.zeros(9)
cut_even[even] = 2 / (np.pi * (n[even] ** 2 - 1))

CASES = [
    # name, samples, closed-form |c_n|, closed-form DC
    ("pure sine  sin(w0 t)",
     np.sin(w0 * t), np.where(n == 1, 1.0, 0.0), 0.0),
    ("square     sgn(sin w0 t)",
     np.sign(np.sin(w0 * t)), np.where(odd, 4 / (np.pi * n), 0.0), 0.0),
    ("sawtooth   (2/pi) sum (-1)^(n+1) sin(n w0 t)/n",
     2 * ((t + 0.5) % 1) - 1, 2 / (np.pi * n), 0.0),
    ("triangle   (8/pi^2) sum_odd ... /n^2",
     (2 / np.pi) * np.arcsin(np.sin(w0 * t)), np.where(odd, 8 / (np.pi ** 2 * n ** 2), 0.0), 0.0),
    ("cut sine   max(sin w0 t, 0)",
     np.maximum(np.sin(w0 * t), 0),
     np.where(n == 1, 0.5, cut_even), 1 / np.pi),
    ("sin^2(w0 t) = 1/2 - (1/2) cos 2w0t",
     np.sin(w0 * t) ** 2, np.where(n == 2, 0.5, 0.0), 0.5),
    ("sin^3(w0 t) = (3/4) sin w0t - (1/4) sin 3w0t",
     np.sin(w0 * t) ** 3, np.where(n == 1, 0.75, np.where(n == 3, 0.25, 0.0)), 0.0),
]

print(f"{'function':48s} {'n':>2s} {'FFT':>8s} {'formula':>8s}")
worst = 0.0
for name, x, formula, dc in CASES:
    dc_fft, amp = amplitudes(x)
    print(f"{name:48s} DC {dc_fft:8.4f} {dc:8.4f}")
    for k in range(9):
        if amp[k] > 1e-3 or formula[k] > 1e-3:
            print(f"{'':48s} {k + 1:2d} {amp[k]:8.4f} {formula[k]:8.4f}")
    worst = max(worst, np.max(np.abs(amp - formula)), abs(dc_fft - dc))
    print()

print(f"largest difference between FFT and formula: {worst:.1e}")
print("(tiny differences on the square and sawtooth come from sampling the jump)")
