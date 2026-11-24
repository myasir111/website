"""Where things on the 3D plate land on screen, so the Manim overlays can point at them exactly.
The camera keys are copied from web/plate.html (three.js PerspectiveCamera, 16:9, eased per segment with io()).
Coordinates out: Manim frame units (x in [-FW/2, FW/2], y in [-FH/2, FH/2]), before and after the shot's push-in.
The push-in is a 2D zoom of the rendered plate shot (done in compose.py), shared here so overlays follow it."""
import json
import os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
FW, FH, ASPECT = 16 * 8 / 9, 8.0, 16 / 9
HALF, TOP = 1.2, 0.6 + 0.005
CAM = {   # shot: [[t, position, lookAt, fov], ...]   (web/plate.html SHOTS)
    "s5": [[0, [1.36, 6.62, 0.004], [1.36, 0.6, 0], 32], [26.4, [1.30, 6.30, 0.004], [1.30, 0.6, 0], 32]],
    "s7": [[0, [3.75, 2.62, 2.30], [0.62, 0.52, -0.42], 34], [20, [3.45, 2.85, 2.62], [0.62, 0.52, -0.42], 34]],
    "s8": [[0, [0, 3.9, 5.7], [0, 0.40, 0.3], 34], [12, [0, 5.9, 3.9], [0, 0.5, 0.15], 34]],
}
FRF = {"node": (0.525, 0.0), "anti": (0.275, 0.0), "out": (0.735, 0.0)}
S8_AT = {"node": -1.32, "out": 1.32}            # s8: the plate braced on the line (left), off it (right)
# push-ins: (start, settle time, final zoom, centre in Manim units). Critically damped arrival (super-motion: zeta = 1).
PUSH = {"s7": (5.4, 1.8, 1.35, (-1.15, 0.0)), "s3": (8.0, 2.2, 1.12, (0.0, 0.35))}


def io(x):
    return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2


def cam_at(shot, t):
    K = CAM[shot]; i = 0
    while i < len(K) - 2 and t >= K[i + 1][0]:
        i += 1
    ta, pa, la, fa = K[i]; tb, pb, lb, fb = K[min(i + 1, len(K) - 1)]
    k = io(min(max((t - ta) / (tb - ta), 0), 1)) if tb > ta else 1
    mix = lambda a, b: np.array(a) + (np.array(b) - np.array(a)) * k
    return mix(pa, pb), mix(la, lb), fa + (fb - fa) * k


def project(shot, t, P):
    """3D point(s) (N x 3, three.js world) -> Manim (x, y) before the push-in"""
    p, l, fov = cam_at(shot, t)
    P = np.atleast_2d(np.asarray(P, float))
    z = p - l; z /= np.linalg.norm(z)
    x = np.cross([0, 1, 0], z); x /= np.linalg.norm(x)
    y = np.cross(z, x)
    v = (P - p) @ np.stack([x, y, z], 1)
    th = np.tan(np.radians(fov) / 2)
    ndc = np.stack([v[:, 0] / -v[:, 2] / (th * ASPECT), v[:, 1] / -v[:, 2] / th], 1)
    return ndc * [FW / 2, FH / 2]


def zoom(shot, t):
    if shot not in PUSH:
        return 1.0
    t0, d, z1, _ = PUSH[shot]
    u = min(max((t - t0) / d, 0), 1) * 7.43
    return 1 + (z1 - 1) * (1 - np.exp(-u) * (1 + u))


def pushed(shot, t, XY):
    """apply the shot's 2D push-in to Manim points"""
    if shot not in PUSH:
        return np.asarray(XY)
    c = np.array(PUSH[shot][3]); return c + (np.asarray(XY) - c) * zoom(shot, t)


def screen(shot, t, P):
    return pushed(shot, t, project(shot, t, P))


def plate_pt(x, z, at=0.0, lift=0.0):
    """plate coordinates (x, z in [-1, 1]) -> world, on the top face"""
    return [x * HALF + at, TOP + lift, z * HALF]


def nodal967(at=0.0):
    nd = json.load(open(os.path.join(HERE, "web/data/w967_nodal.json")))
    return [np.array([plate_pt(x, z, at, 0.003) for x, z in L]) for L in nd["lines"]]
