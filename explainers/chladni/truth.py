"""Every number, curve and pattern the Chladni film shows, from plate.py, plus a check of each claim.
    python truth.py        -> writes truth.json, frf_sweep.npz, mode PNGs; prints the checks"""
import json
import numpy as np
from numpy.polynomial import legendre as Lg
from plate import solve, shape

E, RHO, NU, H, L = 69e9, 2700.0, 0.33, 1.0e-3, 0.24          # aluminium plate, 240 mm square, 1 mm thick
D = E * H**3 / (12 * (1 - NU**2))                             # bending stiffness, N m
RHOH = RHO * H                                                # mass per area, kg/m^2
SCALE = np.sqrt(D / RHOH) / (2 * np.pi * L**2)                # f = Omega * SCALE
G0, ZETA = 9.81, 0.005
DIR = "."


def wavelength(f):
    """bending wavelength of a thin plate at f (Hz): omega = k^2 sqrt(D / rho h)"""
    w = 2 * np.pi * f
    return 2 * np.pi * (D / (RHOH * w**2)) ** 0.25


def sweep_response(point, f, Om, cf, n):
    """|relative response| at a point of the centre-driven plate (modal sum, base motion)"""
    q, wq = Lg.leggauss(2 * n + 4); WW = wq[:, None] * wq[None, :]
    w = 2 * np.pi * f; Hs = np.zeros_like(f, complex)
    for k in range(len(Om)):
        if Om[k] < 1: continue
        Wq = shape(cf[:, k], n, q, q); m = np.sum(WW * Wq**2); gam = np.sum(WW * Wq) / m
        wn = 2 * np.pi * Om[k] * SCALE
        phi = shape(cf[:, k], n, np.array([point[0]]), np.array([point[1]]))[0, 0]
        Hs += gam * phi * w**2 / (wn**2 - w**2 + 2j * ZETA * wn * w)
    return np.abs(Hs)


def mode_png(W, path, px=600):
    """a mode as the film draws it: dark plate, light nodal lines (|W| small)"""
    from PIL import Image
    a = np.exp(-(W / 0.035) ** 2)
    rgb = np.stack([0.11 + 0.80 * a, 0.12 + 0.78 * a, 0.14 + 0.70 * a], -1)
    Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8)[::-1]).resize((px, px)).save(path)


if __name__ == "__main__":
    Om, cf, n = solve(n=32, nu=NU, centre='pin', k=120)
    dr = json.load(open(f"{DIR}/driven.json"))
    sweep_modes = [dr[k] for k in (1, 2, 3, 4, 6, 7)]
    f = np.linspace(100, 2000, 3800)
    # a sensor spot that sits off the nodal lines of all six swept modes
    g = np.linspace(-1, 1, 81); best, bp = 0, None
    for x in g[::2]:
        for y in g[::2]:
            if abs(x) > 0.9 or abs(y) > 0.9 or np.hypot(x, y) < 0.15: continue
            v = min(abs(shape(cf[:, d["j"]], n, np.array([x]), np.array([y]))[0, 0]) /
                    np.abs(shape(cf[:, d["j"]], n, g, g)).max() for d in sweep_modes)
            if v > best: best, bp = v, (float(x), float(y))
    Hs = sweep_response(bp, f, Om, cf, n)
    np.savez(f"{DIR}/frf_sweep.npz", f=f, H=Hs, point=bp)
    gg = np.linspace(-1, 1, 361)
    for d in dr[:14]:
        W = shape(cf[:, d["j"]], n, gg, gg); W /= np.abs(W).max()
        mode_png(W, f"{DIR}/web/data/mode_{round(d['f'])}.png")
    out = {"D": D, "rhoh": RHOH, "f": [d["f"] for d in dr[:14]], "sweep_f": [d["f"] for d in sweep_modes],
           "sweep_point": bp, "lam967": wavelength(dr[4]["f"]), "lam3447": wavelength(dr[12]["f"]),
           "a_1um_967_g": (2 * np.pi * dr[4]["f"])**2 * 1e-6 / G0}
    json.dump(out, open(f"{DIR}/truth.json", "w"), indent=1)
    fr = np.load(f"{DIR}/frf.npz")
    i967 = np.argmin(np.abs(fr["f"] - dr[4]["f"]))
    checks = [
        ("free plate matches published values (13.468, 19.596, 24.270)", np.allclose(solve(n=20, nu=0.3)[0][3:6], [13.468, 19.596, 24.270], atol=0.002)),
        ("bending stiffness of 1 mm aluminium is 6.45 N m", abs(D - 6.45) < 0.01),
        ("1 um of motion at 967 Hz is about 3.8 g", abs(out["a_1um_967_g"] - 3.76) < 0.05),
        ("bending wavelength at 967 Hz is about 100 mm", abs(out["lam967"] - 0.100) < 0.002),
        ("at 3,447 Hz it is about 53 mm", abs(out["lam3447"] - 0.053) < 0.002),
        ("double the frequency -> 1/sqrt(2) the wavelength", abs(wavelength(2000) / wavelength(1000) - 2**-0.5) < 1e-9),
        ("sine identity: sin(kx-wt) + sin(kx+wt) = 2 sin kx cos wt",
         np.allclose(np.sin(1.3 - 0.4) + np.sin(1.3 + 0.4), 2 * np.sin(1.3) * np.cos(0.4))),
        ("sweep spectrum peaks sit at the six pattern frequencies",
         all(abs(f[np.argmax(Hs * (abs(f - d['f']) < 25))] - d["f"]) < 3 for d in sweep_modes)),
        ("sensor on the 967 Hz nodal ring reads >20 dB less at 967 Hz",
         20 * np.log10(fr["anti"][i967] / fr["node"][i967]) > 20),
    ]
    for c, ok in checks: print("OK  " if ok else "FAIL", c)
    print("sweep point", bp, "lam967 %.1f mm, lam3447 %.1f mm" % (out["lam967"] * 1e3, out["lam3447"] * 1e3),
          "node vs anti at 967: %.1f dB" % (20 * np.log10(fr["anti"][i967] / fr["node"][i967])))
