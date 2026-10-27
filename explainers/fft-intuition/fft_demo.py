"""
What an FFT actually sees: companion script.

Builds a signal from two sine components plus white noise and plots the
time waveform and single-sided amplitude spectrum, with and without a Hann
window. Change the parameters at the top and re-run.

Requires: numpy, matplotlib
"""
import numpy as np
import matplotlib.pyplot as plt

FS = 1000          # sample rate, Hz
N = 1024           # number of samples
F1, A1 = 25.0, 1.0
F2, A2 = 75.0, 0.4
NOISE = 0.3

rng = np.random.default_rng(12345)
t = np.arange(N) / FS
x = A1 * np.sin(2 * np.pi * F1 * t) + A2 * np.sin(2 * np.pi * F2 * t) + NOISE * rng.standard_normal(N)


def amplitude_spectrum(signal, window):
    """Single-sided amplitude spectrum, corrected for the window's coherent gain."""
    X = np.fft.rfft(signal * window)
    return np.fft.rfftfreq(len(signal), 1 / FS), 2 * np.abs(X) / window.sum()


freqs, rect = amplitude_spectrum(x, np.ones(N))
_, hann = amplitude_spectrum(x, np.hanning(N))

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(9, 6))
ax1.plot(t[: int(0.25 * FS)], x[: int(0.25 * FS)])
ax1.set(xlabel="Time (s)", ylabel="Amplitude", title="Time waveform")

ax2.plot(freqs, rect, label="Rectangular (no window)", alpha=0.7)
ax2.plot(freqs, hann, label="Hann window")
ax2.set(xlim=(0, 250), xlabel="Frequency (Hz)", ylabel="Amplitude", title="Spectrum")
ax2.legend()

print(f"Bin spacing: {FS / N:.3f} Hz")
fig.tight_layout()
plt.show()
