"""Film score for the wavelets video, synthesised with NumPy: quiet piano intro, strings join, a slow build to a
climax at the machine reveal, then a resolved ending.   python score.py cuts.json wv_audio/mix.wav wv_audio/music.wav out.wav
(the last two let it lift the sound effects out of Manim's mix:  effects = mix - old music)"""
import json, sys, wave
import numpy as np
from scipy.signal import fftconvolve

SR = 44100
meta = json.load(open(sys.argv[1]))
T = meta["total"]
c = meta["cuts"]                       # fade-in end, title, hook->stft, ->wavelet, ->machine, ->recap
t_title, t_stft, t_wav, t_mach, t_recap = c[1], c[2], c[3], c[4], c[5]
N = int(SR * (T + 3.0))
BEAT = 60 / 72
BAR = 4 * BEAT
NOTE = lambda n: 440.0 * 2 ** ((n - 69) / 12)        # midi -> Hz
#            Bm               G                D                A        (vi - IV - I - V in D major)
CH = [[47, 54, 59, 62, 66], [43, 50, 55, 59, 62], [50, 57, 62, 66, 69], [45, 52, 57, 61, 64]]


def piano(f, dur, vel):
    t = np.arange(int(SR * dur)) / SR
    y = sum((1 / n ** 1.6) * np.sin(2 * np.pi * f * n * np.sqrt(1 + 0.0004 * n * n) * t) * np.exp(-t * (1.1 + 0.55 * n))
            for n in range(1, 7))
    return vel * y * np.minimum(1, t / 0.006)


def strings(f, dur, vel, rise=1.6, fall=1.6):
    t = np.arange(int(SR * dur)) / SR
    y = np.zeros_like(t)
    for det in (-0.0035, 0.0, 0.004):
        ph = 2 * np.pi * f * (1 + det) * t + 0.9 * np.sin(2 * np.pi * 5.1 * t + det * 900) * np.minimum(1, t / 1.5) * 0.25
        y += sum((1 / n ** 1.9) * np.sin(n * ph) for n in range(1, 6))
    return vel * y / 3 * np.minimum(1, t / rise) * np.minimum(1, (dur - t) / fall).clip(0, 1)


def put(buf, y, t0):
    i = int(t0 * SR)
    n = min(len(y), len(buf) - i)
    if n > 0 and i >= 0:
        buf[i:i + n] += y[:n]


def level(t, pts):                      # piecewise-linear intensity curve
    return float(np.interp(t, [p[0] for p in pts], [p[1] for p in pts]))


PIANO = [(0, 0.0), (t_title, 0.0), (t_title + 0.1, 0.5), (t_stft, 0.6), (t_wav, 0.75), (t_mach, 0.9), (t_mach + 11, 1.0),
         (t_recap + 3, 0.55), (T, 0.3)]
STR = [(0, 0.0), (t_title - 3, 0.0), (t_title, 0.35), (t_title + 6, 0.18), (t_stft, 0.3), (t_wav, 0.5), (t_mach, 0.75),
       (t_mach + 11, 1.0), (t_recap + 2, 0.7), (T, 0.45)]
HIGH = [(0, 0), (t_wav + 8, 0.0), (t_mach, 0.4), (t_mach + 11, 1.0), (t_recap + 2, 0.5), (T, 0.2)]
BASS = [(0, 0), (t_stft, 0.0), (t_wav, 0.5), (t_mach + 11, 1.0), (T, 0.5)]

dry_p, dry_s = np.zeros(N), np.zeros(N)
# cold open: three lonely low piano notes before the title
for k, (n, tt) in enumerate([(47, 1.6), (54, 4.4), (50, 7.4)]):
    put(dry_p, piano(NOTE(n), 5, 0.5), tt)
bar0 = t_title                                         # bar 1 starts on the title card
nbars = int(np.ceil((T - bar0) / BAR))
ARP = [0, 1, 2, 3, 4, 3, 2, 1]                         # eighth-note pattern through the chord
for b in range(nbars):
    tb = bar0 + b * BAR
    ch = CH[b % 4] if tb < T - BAR else CH[2]          # last bar lands home on D
    last = tb >= T - BAR
    sv = level(tb + BAR / 2, STR)
    for n in ch[:3]:
        put(dry_s, strings(NOTE(n + 12), BAR + 1.4, 0.16 * sv, fall=1.4 if not last else 3.0), tb)
    hv = level(tb + BAR / 2, HIGH)
    if hv > 0:
        put(dry_s, strings(NOTE(ch[4] + 12), BAR + 1.4, 0.10 * hv), tb)
        put(dry_s, strings(NOTE(ch[2] + 24), BAR + 1.4, 0.05 * hv), tb)
    bv = level(tb, BASS)
    if bv > 0:
        put(dry_s, strings(NOTE(ch[0] - 12), BAR + 1.0, 0.22 * bv, rise=0.5), tb)
        put(dry_p, piano(NOTE(ch[0] - 12), 4, 0.5 * bv), tb)
    pv = level(tb, PIANO)
    if last:
        for j, n in enumerate(ch):                     # final rolled chord, left to ring
            put(dry_p, piano(NOTE(n + 12), 6, 0.45), tb + 0.07 * j)
        continue
    busy = tb >= t_stft                                # quarters at first, eighths once the story is moving
    steps = 8 if busy else 4
    for i in range(steps):
        n = ch[ARP[i if busy else 2 * i]] + 12
        acc = 1.0 if i == 0 else 0.8 if i == steps // 2 else 0.62
        put(dry_p, piano(NOTE(n), 3.5, 0.42 * pv * acc), tb + i * BAR / steps)
    if tb >= t_mach:                                   # the climax carries a simple tune on top
        for i, n in enumerate([ch[4] + 12, ch[3] + 12, ch[4] + 12, ch[2] + 24]):
            put(dry_p, piano(NOTE(n + 12), 3.5, 0.3 * pv), tb + i * BEAT)
# a soft swell into the title and into the climax
rng = np.random.default_rng(3)
for t_hit, dur, v in ((t_title, 3.0, 0.05), (t_mach, 5.0, 0.07)):
    n = rng.standard_normal(int(SR * dur))
    n = np.convolve(n, np.ones(180) / 180, mode="same")
    put(dry_s, v * n / np.abs(n).max() * np.linspace(0, 1, len(n)) ** 2.5, t_hit - dur)

# hall reverb: decaying noise, a little different left and right
def hall(seed, rt=2.8):
    t = np.arange(int(SR * rt)) / SR
    ir = np.random.default_rng(seed).standard_normal(len(t)) * np.exp(-t * 6.9 / rt)
    ir = np.convolve(ir, np.ones(6) / 6, mode="same")
    return ir / np.sqrt((ir ** 2).sum())


out = []
for seed in (1, 2):
    wet = fftconvolve(0.9 * dry_p + 1.0 * dry_s, hall(seed))[:N]
    out.append(0.75 * dry_p + 0.55 * dry_s + 0.33 * wet)
music = np.stack(out, 1)
tt = np.arange(N) / SR
music *= (np.minimum(1, tt / 1.0) * np.clip((T + 2.6 - tt) / 3.0, 0, 1))[:, None]
music *= 0.5 / np.abs(music).max()

def rd(p):
    with wave.open(p, "rb") as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32767

mix, old = rd(sys.argv[2]), rd(sys.argv[3])
n = min(len(mix), len(old))
fx = np.zeros(N)
fx[:min(n, N)] = (mix[:n] - old[:n])[:N]
final = music + 0.55 * fx[:, None]
final *= 0.9 / np.abs(final).max()
with wave.open(sys.argv[4], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((final * 32767).astype(np.int16).tobytes())
print("score", round(N / SR, 1), "s")
