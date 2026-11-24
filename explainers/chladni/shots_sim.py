"""Sand data for every plate shot of the Chladni film, from plate.py's modes (or a braced plate's forced response).
Writes web/data/<shot>.{pos.bin,hop.bin,json}. Kick per segment scales with that pattern's wavelength."""
import json, sys
import numpy as np
from numpy.polynomial import legendre as Lg
from scipy.linalg import eigh, null_space
from plate import basis_1d, shape
import sand

E, RHO, NU, H, L = 69e9, 2700.0, 0.33, 1.0e-3, 0.24
D = E * H**3 / (12 * (1 - NU**2)); SCALE = np.sqrt(D / (RHO * H)) / (2 * np.pi * L**2)
NB, RES, ZETA = 32, 401, 0.005
DR = json.load(open("driven.json"))
FRF = np.load("frf.npz")
P_NODE, P_ANTI = tuple(FRF["p_node"]), tuple(FRF["p_anti"])
G = np.linspace(-1, 1, RES)


def modes(pins, k=90):
    q, wq = Lg.leggauss(2 * NB + 4); V = basis_1d(NB, q)
    I = lambda a, b: (V[a] * wq) @ V[b].T
    A0, A1, A2, C = I(0, 0), I(1, 1), I(2, 2), I(2, 0)
    K = np.kron(A2, A0) + np.kron(A0, A2) + NU * (np.kron(C, C.T) + np.kron(C.T, C)) + 2 * (1 - NU) * np.kron(A1, A1)
    M = np.kron(A0, A0)
    rows = [np.kron(basis_1d(NB, np.array([x]))[0][:, 0], basis_1d(NB, np.array([y]))[0][:, 0]) for x, y in pins]
    Z = null_space(np.array(rows)); lam, a = eigh(Z.T @ K @ Z, Z.T @ M @ Z)
    return 4 * np.sqrt(np.clip(lam, 0, None))[:k], (Z @ a)[:, :k]


def response(pins, f_drive):
    """|relative response| of a centre-driven plate (base motion) over the grid, complex modal sum"""
    Om, cf = modes(pins)
    q, wq = Lg.leggauss(2 * NB + 4); WW = wq[:, None] * wq[None, :]
    w = 2 * np.pi * f_drive; out = np.zeros((RES, RES), complex)
    for k in range(len(Om)):
        if Om[k] < 1: continue
        Wq = shape(cf[:, k], NB, q, q); m = np.sum(WW * Wq**2); gam = np.sum(WW * Wq) / m
        wn = 2 * np.pi * Om[k] * SCALE
        out += gam * shape(cf[:, k], NB, G, G) * w**2 / (wn**2 - w**2 + 2j * ZETA * wn * w)
    return np.abs(out)


def run(name, segments, seconds, fps, n=40000, sub=6, seed=20261118, start=None, kick0=0.045):
    """segments: list of (t0, field or None, Omega for the kick scale)"""
    rng = np.random.default_rng(seed)
    x, y = (rng.uniform(-1, 1, n), rng.uniform(-1, 1, n)) if start is None else (start[:, 0].astype(float).copy(), start[:, 1].astype(float).copy())
    F = int(round(seconds * fps)); pos = np.zeros((F, len(x), 2), np.float32); hop = np.zeros((F, len(x)), np.float32)
    steps = sub * 30 / fps                                      # same diffusion per second at any frame rate
    nsub = max(1, int(round(steps))); kfac = np.sqrt(steps / nsub)
    for f in range(F):
        t = f / fps; seg = [s for s in segments if t >= s[0]][-1]
        field, Om = seg[1], seg[2]
        if field is not None:
            kick = kick0 * (227.0 / Om) ** 0.5 * kfac
            for _ in range(nsub):
                a = np.clip(sand.sample(field, x, y) - 0.012, 0, None)
                x += kick * a * rng.standard_normal(len(x)); y += kick * a * rng.standard_normal(len(y))
                x = np.where(x < -1, -2 - x, np.where(x > 1, 2 - x, x)); y = np.where(y < -1, -2 - y, np.where(y > 1, 2 - y, y))
            hop[f] = a
        pos[f, :, 0], pos[f, :, 1] = x, y
    out = f"web/data/{name}"
    np.clip((pos + 1) / 2 * 65535, 0, 65535).astype("<u2").tofile(out + ".pos.bin")
    np.clip(hop / 0.3 * 255, 0, 255).astype("u1").tofile(out + ".hop.bin")
    json.dump({"frames": F, "n": len(x), "fps": fps}, open(out + ".json", "w"))
    return pos


def mode_field(k):
    w, Om = sand.mode_grid(DR[k]["j"], RES)
    return w, DR[k]["Omega"]


if __name__ == "__main__":
    import os; os.makedirs("web/data", exist_ok=True)
    which = sys.argv[1:] or ["s1", "s2", "s5", "s8"]
    w967, O967 = mode_field(4)
    if "s1" in which:
        p = run("s1", [(0, None, 1), (1.6, w967, O967)], 9.0, 30)
        np.save("web/data/settled967.npy", p[-1]); print("s1 settled", round(sand.settled_fraction(p[-1], DR[4]["j"], 0.06), 3))
    if "s2" in which:                                            # slow-motion replay of the forming figure
        run("s2", [(0, None, 1), (1.6, w967, O967)], 5.0, 120)
    if "s5" in which:                                            # the sweep: one pattern per peak
        segs, t = [(0, None, 1)], 0.6
        for k in (1, 2, 3, 4, 6, 7):
            w, Om = mode_field(k); segs.append((t, w, Om)); segs.append((t + 3.8, None, 1)); t += 4.3
        p = run("s5", segs, 26.4, 30); print("s5 done", [round(s[0], 1) for s in segs])
    if "s8" in which:                                            # a brace on the nodal ring vs at the antinode, both driven at 967 Hz
        f0 = DR[4]["f"]
        ref = response([(0.0, 0.0)], f0).max()
        for nm, pins in (("s8a", [(0.0, 0.0), P_NODE]), ("s8b", [(0.0, 0.0), P_ANTI])):
            r = response(pins, f0) / ref
            print(nm, "peak response vs unbraced", round(float(r.max()), 3))
            run(nm, [(0, None, 1), (1.0, r, O967)], 12.0, 30, n=30000)
