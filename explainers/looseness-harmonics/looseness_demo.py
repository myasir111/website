"""
Why looseness makes harmonics: companion script.

A pure sine response limited by stops (clipping) for three cases:
  1. clipped equally on both sides   -> odd harmonics only
  2. clipped on one side only        -> even harmonics appear (strong 2X)
  3. clipped every other revolution  -> half-orders (0.5X, 1.5X, ...)

The signal spans a whole number of revolutions, so every order lands on an
exact FFT bin and no window is needed.

Requires: numpy, matplotlib
"""
import numpy as np
import matplotlib.pyplot as plt

REVS = 16                 # revolutions captured
SPR = 256                 # samples per revolution
N = REVS * SPR
theta = 2 * np.pi * np.arange(N) / SPR
free = np.sin(theta)
rev_index = np.arange(N) // SPR

cases = {
    "Clipped both sides (±0.6)": np.clip(free, -0.6, 0.6),
    "Clipped one side (+0.6)": np.clip(free, -1.0, 0.6),
    "One side, every other rev": np.where(rev_index % 2 == 0, np.clip(free, -1.0, 0.6), free),
}

orders = np.arange(N // 2 + 1) / REVS
fig, axes = plt.subplots(len(cases), 2, figsize=(11, 8))

for (name, y), (ax_t, ax_f) in zip(cases.items(), axes):
    amp = 2 * np.abs(np.fft.rfft(y)) / N
    ax_t.plot(theta[: 4 * SPR] / (2 * np.pi), free[: 4 * SPR], "--", color="grey", lw=1)
    ax_t.plot(theta[: 4 * SPR] / (2 * np.pi), y[: 4 * SPR], lw=1.8)
    ax_t.set(title=name, xlabel="Revolutions", ylabel="Displacement")

    keep = (amp > 1e-3) & (orders > 0) & (orders <= 8)
    ax_f.stem(orders[keep], 20 * np.log10(amp[keep]), bottom=-60)
    ax_f.set(xlim=(0, 8.5), ylim=(-60, 5), xlabel="Order (× running speed)", ylabel="Amplitude (dB)")

    print(name)
    for o, a in zip(orders[keep], amp[keep]):
        print(f"  {o:4.1f}X  {a:.3f}")

fig.tight_layout()
plt.show()
