"""Sand sounds for the cinematic cut. Yasir heard "some dot noise" in v2/v3: the old rattle was a few hundred
separate 3 ms clicks a second, bright (above 2.5 kHz), so it read as dots. Here the same physics drives a dense,
soft wash instead: thousands of tiny grains a second, band-limited 350 Hz - 3.5 kHz, so it sounds like sand
moving, and its level follows what the camera sees (the grains around the hero in c2, the plate in c1 and s5).
    python3 fx4.py   -> fx/c1.wav, fx/c2.wav, fx/s5q.wav"""
import json
import numpy as np
from scipy.signal import butter, sosfilt

import fx as F0

SR = F0.SR
DATA = F0.DATA


def band(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], btype="band", fs=SR, output="sos"), x)


def wash(act_at, dur, rate=3000, lo=350, hi=3500, seed=11):
    """sand: dense Poisson grains (0.6 ms each, random level) whose rate and level follow act_at(t) in 0..1"""
    rng = np.random.default_rng(seed)
    N = int(dur * SR)
    tt = np.arange(0, dur, 0.01)
    env = np.interp(np.arange(N) / SR, tt, [act_at(t) for t in tt])
    p = np.clip(rate * env / SR, 0, 1)                         # grains per sample
    imp = (rng.random(N) < p) * rng.uniform(0.2, 1.0, N) * rng.choice([-1, 1], N)
    L = int(0.0006 * SR); g = np.hanning(2 * L + 1)
    y = np.convolve(imp, g, "same")
    y = band(y, lo, hi)
    y *= np.sqrt(np.clip(env, 0, 1)) / (np.sqrt(np.maximum(p * SR, 1)) ** 0.5)   # dense texture: level by sqrt, not by count
    f = int(0.03 * SR)                                         # no click at the start or end
    y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
    return y


def crest(y, win=0.05):
    """peak / rms in short windows where there is sound: dots show up as a high crest factor"""
    n = int(win * SR); k = len(y) // n
    seg = y[:k * n].reshape(k, n); r = np.sqrt((seg ** 2).mean(1)); pk = np.abs(seg).max(1)
    live = r > 0.1 * r.max()
    return float(np.median(20 * np.log10(pk[live] / r[live])))


def local_activity(prefix, hero, radius=0.08):
    """share and size of hops among the grains around the hero, per frame (what fills the c2 frame)"""
    m = json.load(open(f"{DATA}/{prefix}.json")); n, Fr = m["n"], m["frames"]
    pos = np.fromfile(f"{DATA}/{prefix}.pos.bin", "<u2").reshape(Fr, n, 2).astype(float) / 65535 * 2 - 1
    hop = np.fromfile(f"{DATA}/{prefix}.hop.bin", np.uint8).reshape(Fr, n).astype(float) / 255
    out = np.zeros(Fr)
    for f in range(Fr):
        d2 = ((pos[f] - pos[f, hero]) ** 2).sum(1)
        near = d2 < radius ** 2
        h = hop[f, near]
        out[f] = (h > 0.02).mean() * np.sqrt(h.mean() + 1e-9)
    w = 13; out = np.convolve(np.pad(out, w, mode="edge"), np.ones(2 * w + 1) / (2 * w + 1), "valid")
    return out / max(out.max(), 1e-9), m["fps"]


def norm(y, peak):
    return y / (np.abs(y).max() + 1e-9) * peak


if __name__ == "__main__":
    a2, fps = F0.activity("s2")
    a2 = a2 / a2.max()
    slow = lambda t: 1.45 + 0.3 * t                            # c1/c2: film time -> sim time (slow motion)
    # c1: macro hook in slow motion: lower, softer grains; it thins as the ring forms and is near silent on the reveal
    c1 = wash(lambda t: a2[min(len(a2) - 1, int(slow(t) * fps))] ** 0.8, 10.5, rate=1400, lo=250, hi=2200, seed=21)
    # c2: follow one grain: the sound is the sand around it, so it fades as the grain reaches the line
    la, fps2 = local_activity("s2", 27074)
    c2 = wash(lambda t: la[min(len(la) - 1, int(slow(t) * fps2))] ** 0.8, 12.5, rate=1400, lo=250, hi=2200, seed=22)
    # s5: a soft burst at each new pattern, silent between peaks (same activity as before, new texture)
    a5, fps5 = F0.activity("s5")
    a5 = a5 / a5.max()
    s5 = wash(lambda t: a5[min(len(a5) - 1, int(t * fps5))], 26.4, rate=3000, seed=25)
    for name, y, pk in (("c1", c1, 0.32), ("c2", c2, 0.32), ("s5q", s5, 0.3)):
        F0.write(name, norm(y, pk))
        print(f"{name}: crest {crest(y):.1f} dB")
    old = F0.rattle(lambda t: a5[min(len(a5) - 1, int(t * fps5))], 26.4, rate=240)
    print(f"old s5 rattle: crest {crest(old):.1f} dB")
    print("c2 local activity at film 0, 3, 6, 9, 12 s:", [round(float(la[min(len(la) - 1, int(slow(t) * fps2))]), 2) for t in (0, 3, 6, 9, 12)])
