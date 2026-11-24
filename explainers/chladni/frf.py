"""Base-driven response of the film's plate at two sensor spots on the x axis, by modal sum:
H(x, f) = |sum_n G_n W_n(x) w^2 / (wn^2 - w^2 + 2i zeta wn w)|, G_n = int W_n / int W_n^2 (participation).
    python frf.py     -> frf.npz (f, node, anti, p_node, p_anti): the 967 Hz nodal ring vs a point inside it"""
import numpy as np
from numpy.polynomial import legendre as Lg
from plate import solve, shape
from truth import NU, SCALE, ZETA

P_NODE, P_ANTI = (0.525, 0.0), (0.275, 0.0)


def frf(points, f):
    Om, cf, n = solve(n=32, nu=NU, centre='pin', k=120)
    q, wq = Lg.leggauss(2 * n + 4); WW = wq[:, None] * wq[None, :]
    w = 2 * np.pi * f; out = [np.zeros(len(f), complex) for _ in points]
    for k in range(len(Om)):
        if Om[k] < 1: continue
        Wq = shape(cf[:, k], n, q, q); G = np.sum(WW * Wq) / np.sum(WW * Wq**2)
        wn = 2 * np.pi * Om[k] * SCALE
        for o, (x, y) in zip(out, points):
            o += G * shape(cf[:, k], n, np.array([x]), np.array([y]))[0, 0] * w**2 / (wn**2 - w**2 + 2j * ZETA * wn * w)
    return [np.abs(o) for o in out]


if __name__ == "__main__":
    f = np.linspace(100, 2000, 4000)
    node, anti = frf([P_NODE, P_ANTI], f)
    np.savez("frf.npz", f=f, node=node, anti=anti, p_node=np.array(P_NODE), p_anti=np.array(P_ANTI))
    i = np.argmin(np.abs(f - 967.1))
    print("967 Hz: anti / node = %.1f dB" % (20 * np.log10(anti[i] / node[i])))
