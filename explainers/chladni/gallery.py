import numpy as np, json
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
from plate import solve, symmetry, participation, shape
E, rho, nu, h, L = 69e9, 2700.0, 0.33, 1.0e-3, 0.24
D = E * h**3 / (12 * (1 - nu**2)); scale = np.sqrt(D / (rho * h)) / (2 * np.pi * L**2)
Om, cf, n = solve(n=26, nu=nu, centre='pin', k=260)
driven = [(j, Om[j]) for j in range(len(Om)) if Om[j] > 1 and abs(participation(cf[:, j], n)) > 0.02]
print(len(driven), "driven modes;", [round(o * scale) for _, o in driven][:24])
g = np.linspace(-1, 1, 301)
fig, ax = plt.subplots(3, 6, figsize=(18, 9.4), facecolor="#0E1116")
out = []
for a, (j, o) in zip(ax.flat, driven[:18]):
    w = shape(cf[:, j], n, g, g); w /= np.abs(w).max()
    a.imshow(np.exp(-(w / 0.04) ** 2), cmap="gray", origin="lower", extent=(-1, 1, -1, 1))
    a.set_title(f"{o * scale:.0f} Hz  (Ω={o:.1f})", color="w", fontsize=10); a.axis("off")
    out.append({"j": int(j), "Omega": float(o), "f": float(o * scale)})
plt.tight_layout(); plt.savefig("gallery.png", dpi=70, facecolor="#0E1116")
json.dump(out, open("driven.json", "w"), indent=1)
