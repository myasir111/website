"""Sand on the plate: each grain hops when the plate under it accelerates harder than gravity, with a hop
size that grows with the local motion |w|, so grains leave the moving regions and come to rest on the
nodal lines, where w = 0. Seeded, simulated once; frames are stored for the renderers.

    python sand.py <mode index into driven.json> <seconds> <fps> <out.npz>
"""
import sys, json
import numpy as np
from plate import solve, shape

N_BASIS = 32
_cache = {}


def mode_grid(j, res=401):
    """normalised mode shape on a res x res grid over [-1, 1]^2 (max |w| = 1)"""
    if j not in _cache:
        Om, cf, n = solve(n=N_BASIS, nu=0.33, centre='pin', k=260)
        g = np.linspace(-1, 1, res)
        w = shape(cf[:, j], n, g, g)
        _cache[j] = (w / np.abs(w).max(), float(Om[j]))
    return _cache[j]


def sample(w, x, y):
    """bilinear |w| at grain positions (x, y in [-1, 1])"""
    res = w.shape[0]
    fx, fy = (x + 1) / 2 * (res - 1), (y + 1) / 2 * (res - 1)
    i0, j0 = np.clip(fx.astype(int), 0, res - 2), np.clip(fy.astype(int), 0, res - 2)
    tx, ty = fx - i0, fy - j0
    a = np.abs(w)
    return ((1 - tx) * (1 - ty) * a[j0, i0] + tx * (1 - ty) * a[j0, i0 + 1]
            + (1 - tx) * ty * a[j0 + 1, i0] + tx * ty * a[j0 + 1, i0 + 1])


def simulate(schedule, seconds, fps=60, n=24000, sub=4, kick=0.012, threshold=0.06, seed=20261118,
             start=None):
    """schedule: list of (t_from, mode_j or None). None = plate still. Returns pos [frames, n, 2] and hop [frames, n]"""
    rng = np.random.default_rng(seed)
    x, y = (start if start is not None else (rng.uniform(-1, 1, n), rng.uniform(-1, 1, n)))
    x, y = x.copy(), y.copy()
    F = int(round(seconds * fps))
    pos = np.zeros((F, len(x), 2), np.float32); hop = np.zeros((F, len(x)), np.float32)
    for f in range(F):
        t = f / fps
        j = [m for t0, m in schedule if t >= t0][-1]
        if j is not None:
            w, _ = mode_grid(j)
            for _ in range(sub):
                a = np.clip(sample(w, x, y) - threshold, 0, None)       # below ~g nothing moves
                step = kick * a
                x += step * rng.standard_normal(len(x)); y += step * rng.standard_normal(len(y))
                x = np.where(x < -1, -2 - x, np.where(x > 1, 2 - x, x))  # grains stay on the plate
                y = np.where(y < -1, -2 - y, np.where(y > 1, 2 - y, y))
            hop[f] = a
        pos[f, :, 0], pos[f, :, 1] = x, y
    return pos, hop


def settled_fraction(pos_last, j, near=0.08):
    """share of grains sitting where |w| < near: how sharp the figure is"""
    w, _ = mode_grid(j)
    return float(np.mean(sample(w, pos_last[:, 0], pos_last[:, 1]) < near))


if __name__ == "__main__":
    j = int(sys.argv[1]); secs = float(sys.argv[2]); fps = int(sys.argv[3])
    pos, hop = simulate([(0.0, None), (0.5, j)], secs, fps)
    print("settled share at end:", round(settled_fraction(pos[-1], j), 3), "| grains:", pos.shape[1])
    np.savez_compressed(sys.argv[4], pos=pos.astype(np.float16), hop=hop.astype(np.float16))
