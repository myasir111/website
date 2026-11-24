"""Effects for the plate shots, made from the simulations themselves (no tones, no drones):
sand rattle whose density follows the share of grains hopping; a slowed, lower rattle for the slow-motion shot;
soft contact clicks for the sensors. Every file is exactly the shot's length.
    python fx.py   -> fx/<shot>.wav"""
import json, os, wave
import numpy as np

SR = 48000
DATA = os.environ.get("DATA", "web/data")
OUT = os.environ.get("OUT", "fx")


def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    from scipy.signal import lfilter
    return lfilter([1 - a], [1, -a], x)


def write(name, y):
    os.makedirs(OUT, exist_ok=True)
    with wave.open(f"{OUT}/{name}.wav", "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())


def activity(prefix):
    m = json.load(open(f"{DATA}/{prefix}.json")); n, F, fps = m["n"], m["frames"], m["fps"]
    hop = np.fromfile(f"{DATA}/{prefix}.hop.bin", np.uint8).reshape(F, n).astype(float) / 255
    a = (hop > 0.02).mean(1) * (hop.mean(1) / max(hop.mean(1).max(), 1e-9)) ** 0.5
    return a, fps


def rattle(act_at, dur, rate=260, tick_ms=3.0, bright=2500, seed=3, hiss=0.05):
    """act_at(t) -> 0..1 ; grains ticking at a rate that follows it"""
    rng = np.random.default_rng(seed); N = int(dur * SR); y = np.zeros(N)
    L = int(tick_ms / 1000 * SR); tick = rng.standard_normal(L) * np.exp(-np.arange(L) / (L / 5))
    tick = tick - lowpass(tick, bright)
    step = 1 / 120
    for t0 in np.arange(0, dur, step):
        a = act_at(t0)
        for _ in range(rng.poisson(rate * a * step)):
            i = int((t0 + rng.random() * step) * SR)
            if i + L < N: y[i:i + L] += tick * rng.uniform(0.15, 1.0)
    env = np.array([act_at(t) for t in np.arange(N) / SR]) if N < 4 * SR else np.interp(np.arange(N) / SR, np.arange(0, dur, 0.01), [act_at(t) for t in np.arange(0, dur, 0.01)])
    h = rng.standard_normal(N); h = lowpass(h - lowpass(h, 1800), 9000)
    y += hiss * h * env
    return y


def click(at, dur, vol=0.5, body=320, decay=0.012, seed=1):
    """a soft contact click (the sensors landing)"""
    y = np.zeros(int(dur * SR)); L = int(0.06 * SR); t = np.arange(L) / SR
    n = lowpass(np.random.default_rng(seed).standard_normal(L), 1600)
    c = (n / np.abs(n).max() + 0.6 * np.sin(2 * np.pi * body * t)) * np.exp(-t / decay) * np.minimum(1, t / 0.001)
    i = int(at * SR); y[i:i + L] += vol * c[:max(0, min(L, len(y) - i))]
    return y


def norm(y, peak=0.5):
    return y / (np.abs(y).max() + 1e-9) * peak


if __name__ == "__main__":
    # s1: the figure forms; the rattle swells when the drive starts and fades as grains find the lines
    a, fps = activity("s1")
    write("s1", norm(rattle(lambda t: a[min(len(a) - 1, int(t * fps))], 9.0)))
    # s2: slow motion (film t -> sim 1.45 + 0.3 t): fewer, lower, longer ticks
    a, fps = activity("s2")
    write("s2", norm(rattle(lambda t: a[min(len(a) - 1, int((1.45 + 0.3 * t) * fps))], 10.0, rate=90, tick_ms=9.0, bright=900, seed=5, hiss=0.03), 0.42))
    # s5: a burst at each new pattern, fading as it settles; silent in the gaps between peaks
    a, fps = activity("s5")
    write("s5", norm(rattle(lambda t: a[min(len(a) - 1, int(t * fps))], 26.4, rate=240), 0.42))
    # s7: the two sensors land (critically damped drop: contact ~0.55 s after each starts)
    write("s7", click(1.55, 20.0, 0.45, 300, seed=2) + click(3.15, 20.0, 0.45, 340, seed=3))
    # s8: the left plate (brace on the line) rattles into its figure; the right one barely ticks
    a1, fps = activity("s8a"); a2, _ = activity("s8b")
    m = max(a1.max(), a2.max())
    write("s8", norm(rattle(lambda t: (a1[min(len(a1) - 1, int(t * fps))] + a2[min(len(a2) - 1, int(t * fps))]) / m, 12.0, rate=200), 0.4))
    print("fx written:", sorted(os.listdir(OUT)))
