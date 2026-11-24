"""Truth for the Chladni film: modes of a thin square plate with free edges (Kirchhoff theory),
optionally pinned or clamped at its centre, by the Ritz method with Legendre polynomials.

Coordinates xi, eta in [-1, 1]; the plate is L x L. Frequency parameter Omega = omega L^2 sqrt(rho h / D),
so f = Omega / (2 pi L^2) * sqrt(D / (rho h)) with D = E h^3 / (12 (1 - nu^2)).
"""
import numpy as np
from numpy.polynomial import legendre as Lg
from scipy.linalg import eigh, null_space

def basis_1d(n, x):
    """P_i, P_i', P_i'' at points x for i < n"""
    V = np.zeros((3, n, len(x)))
    for i in range(n):
        c = np.zeros(i + 1); c[i] = 1
        V[0, i] = Lg.legval(x, c)
        V[1, i] = Lg.legval(x, Lg.legder(c, 1)) if i >= 1 else 0
        V[2, i] = Lg.legval(x, Lg.legder(c, 2)) if i >= 2 else 0
    return V

def solve(n=18, nu=0.3, centre=None, k=40):
    """centre: None (free plate), 'pin' (w = 0 at the centre) or 'clamp' (w, w_x, w_y = 0)"""
    q, wq = Lg.leggauss(2 * n + 4)
    V = basis_1d(n, q)
    I = lambda a, b: (V[a] * wq) @ V[b].T                      # 1D integrals of products of derivatives
    A0, A1, A2, C = I(0, 0), I(1, 1), I(2, 2), I(2, 0)         # C[i, j] = int P_i'' P_j
    K = (np.kron(A2, A0) + np.kron(A0, A2) + nu * (np.kron(C, C.T) + np.kron(C.T, C))
         + 2 * (1 - nu) * np.kron(A1, A1))
    M = np.kron(A0, A0)
    Z = np.eye(n * n)
    if centre:
        V0 = basis_1d(n, np.array([0.0]))[:, :, 0]              # values and slopes at xi = 0
        rows = [np.kron(V0[0], V0[0])]
        if centre == 'clamp':
            rows += [np.kron(V0[1], V0[0]), np.kron(V0[0], V0[1])]
        Z = null_space(np.array(rows))
    lam, a = eigh(Z.T @ K @ Z, Z.T @ M @ Z)
    lam = np.clip(lam, 0, None)
    Omega = 4 * np.sqrt(lam)                                   # (2/L)^4 scaling: Omega = 4 sqrt(lambda)
    coef = Z @ a                                               # back to the full basis
    return Omega[:k], coef[:, :k], n

def shape(coef, n, x, y):
    """w on a grid; x, y in [-1, 1] (1D arrays) -> array [len(y), len(x)]"""
    Vx, Vy = basis_1d(n, x)[0], basis_1d(n, y)[0]
    return Vy.T @ coef.reshape(n, n).T @ Vx                    # coef index = i * n + k  (i: x, k: y)

def symmetry(coef, n):
    """D4 class of a mode from its shape: parity in x, in y, and across the diagonal"""
    g = np.linspace(-1, 1, 41)
    w = shape(coef, n, g, g); w = w / np.abs(w).max()
    sx = np.sign(np.sum(w * w[:, ::-1])); sy = np.sign(np.sum(w * w[::-1, :])); sd = np.sign(np.sum(w * w.T))
    return int(sx), int(sy), int(sd)

def participation(coef, n):
    """how strongly a centre base motion drives the mode: int w dA over the mode's mass (normalised)"""
    q, wq = Lg.leggauss(2 * n + 4)
    W = shape(coef, n, q, q)
    return float(np.sum(wq[:, None] * wq[None, :] * W) / np.sqrt(np.sum(wq[:, None] * wq[None, :] * W ** 2)))

if __name__ == "__main__":
    for n in (12, 16, 20):
        Om, _, _ = solve(n=n, nu=0.3)
        print("free plate, nu=0.3, n=%d:" % n, np.round(Om[3:13], 3))       # first three are rigid-body
