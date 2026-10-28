"""
What is the FFT actually showing you?  (3D, pure maths)
1920x1080 (16:9), 60 fps, 72 s, rendered 2x and downscaled.

Space:  x = time, y = frequency (lanes 1f..10f), z = amplitude.
Front view = time domain.  Side view = frequency domain (spectrum).

Run:  python3 fourier_3d.py [out.mp4]
"""
import sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.animation import FFMpegWriter

# ------------------------------------------------------------------ style
SURFACE = "#111110"
INK = "#f0efec"
INK2 = "#c3c2b7"
MUTED = "#898781"
GRID = "#2c2c2a"
BLUE = "#3987e5"
ORANGE = "#d95926"

FPS, DURATION = 60, 72.0
SS = 2                      # supersampling factor (render 2x, downscale)
W, H, DPI = 19.2, 10.8, 100          # 1920x1080 landscape
K = 10                     # number of harmonics
X_LEN = 6.5                # length of time axis in plot units (2 periods)
N_PTS = 1000

plt.rcParams.update({"font.family": "DejaVu Sans", "text.color": INK,
                     "mathtext.fontset": "dejavusans"})

# ------------------------------------------------------------------ maths
tau = np.linspace(0, 2, N_PTS)          # time in periods
x_of_tau = tau / 2 * X_LEN

ks = np.arange(1, K + 1)
b = 2 / (np.pi * ks) * (-1.0) ** (ks + 1)          # sawtooth Fourier series
grid_tau = np.linspace(0, 1, 4000)
_peak = np.max(np.abs((b[:, None] * np.sin(2 * np.pi * ks[:, None] * grid_tau)).sum(0)))
b = b / _peak                                       # partial sum peaks at 1.0
AMP = np.abs(b)


def comps(tt):
    """(K, N) array: each harmonic's contribution."""
    return b[:, None] * np.sin(2 * np.pi * ks[:, None] * tt[None, :])


# ------------------------------------------------------------------ easing
def ease(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def ramp(t, t0, t1):
    return float(ease((t - t0) / (t1 - t0)))


def fade(t, t_in, t_out, d=0.45):
    return min(ramp(t, t_in, t_in + d), 1 - ramp(t, t_out - d, t_out))


# ------------------------------------------------------------------ step schedules
def make_steps(t0, slow, fast, n_slow=4):
    """Start time and duration of each of the K steps: first n_slow slow."""
    out, tc = [], t0
    for i in range(K):
        d = slow if i < n_slow else fast
        out.append((tc, d))
        tc += d
    return out


DECON = make_steps(22.0, 2.6, 0.75)      # peel harmonics off one at a time
RECON = make_steps(50.0, 2.4, 0.70)      # add them back one at a time
DECON_END = DECON[-1][0] + DECON[-1][1]
RECON_END = RECON[-1][0] + RECON[-1][1]

# ------------------------------------------------------------------ camera keys
FRONT = (0.0, -90.0)
PERSP = (24.0, -58.0)
SIDE = (0.0, 0.0)
CAM_KEYS = [  # (time, (elev, azim))
    (0.0, FRONT), (18.5, FRONT), (21.5, PERSP), (DECON_END + 0.6, PERSP),
    (DECON_END + 4.0, SIDE), (46.5, SIDE), (49.5, PERSP), (RECON_END + 0.8, PERSP),
    (RECON_END + 3.8, FRONT), (DURATION, FRONT),
]


def camera(t):
    for (t0, a), (t1, bb) in zip(CAM_KEYS, CAM_KEYS[1:]):
        if t0 <= t <= t1:
            s = ramp(t, t0, t1)
            return a[0] + (bb[0] - a[0]) * s, a[1] + (bb[1] - a[1]) * s
    return CAM_KEYS[-1][1]


# ------------------------------------------------------------------ figure
fig = plt.figure(figsize=(W, H), dpi=DPI, facecolor=SURFACE)
# 3D axes draw in a square viewport: make it larger than the frame,
# centred on the area below the captions, so the scene can fill the width.
_S = 1.6                                   # viewport height (figure fractions)
_CX, _CY = 0.5, 0.35                      # where the scene is centred
ax = fig.add_axes([_CX - _S * H / W / 2, _CY - _S / 2, _S * H / W, _S], projection="3d",
                  facecolor=SURFACE)
ax.set_axis_off()
ax.set_proj_type("persp", focal_length=1.1)
ax.set_xlim(0, X_LEN)
ax.set_ylim(-0.6, K + 0.6)
ax.set_zlim(-1.25, 1.25)
ZOOM_FLAT, ZOOM_PERSP = 0.98, 0.74
ax.set_box_aspect((X_LEN, 5.2, 3.0), zoom=ZOOM_FLAT)

# floor grid (depth cue)
Z_FLOOR = -1.25
for yy in range(0, K + 1):
    ax.plot([0, X_LEN], [yy, yy], [Z_FLOOR] * 2, color=GRID, lw=0.8)
for xx in np.linspace(0, X_LEN, 9):
    ax.plot([xx, xx], [-0.6, K + 0.6], [Z_FLOOR] * 2, color=GRID, lw=0.8)

# axes
AX_C = "#5a5955"
ax.plot([0, X_LEN + 0.2], [0, 0], [0, 0], color=AX_C, lw=1.2)          # time
ax.plot([0, 0], [0, K + 0.6], [0, 0], color=AX_C, lw=1.2)              # freq
ax.plot([0, 0], [0, 0], [-1.15, 1.15], color=AX_C, lw=1.2)             # amp
lbl_time = ax.text(X_LEN + 0.25, 0, -0.15, "time", color=MUTED, fontsize=17)
lbl_freq = ax.text(0, K + 0.9, -0.15, "frequency", color=MUTED, fontsize=17)
lbl_amp = ax.text(0, 0, 1.3, "amplitude", color=MUTED, fontsize=17)
lane_lbls = [ax.text(X_LEN + 0.15, k, -0.3, f"{k}f", color=MUTED,
                     fontsize=14, alpha=0) for k in ks]


def glow_line(color, lw=2.8, halo_k=4.0):
    halo, = ax.plot([], [], [], color=color, lw=lw * halo_k, alpha=0.12,
                    solid_capstyle="round")
    core, = ax.plot([], [], [], color=color, lw=lw, solid_capstyle="round")
    return halo, core


def set_glow(pair, x, y, z, alpha, color=None):
    halo, core = pair
    for ln, a in ((halo, 0.12 * alpha), (core, alpha)):
        ln.set_data_3d(x, y, z)
        ln.set_alpha(max(a, 0.0))
        if color is not None:
            ln.set_color(color)


sum_line = glow_line(BLUE, 3.4)
comp_lines = [glow_line(BLUE if k == 1 else ORANGE, 2.4) for k in ks]
# spectrum bars, drawn on the near wall in side view
BAR_X = X_LEN + 0.05
bar_lines = [glow_line(BLUE if k == 1 else ORANGE, 11, 1.8) for k in ks]
# dashed ghost of the original shape (the target) at the front
ghost_line, = ax.plot([], [], [], color=MUTED, lw=1.8, ls=(0, (5, 4)), alpha=0)

# ------------------------------------------------------------------ text
caption = fig.text(0.5, 0.915, "", ha="center", va="center", fontsize=34,
                   fontweight="bold", color=INK, linespacing=1.3)
sub = fig.text(0.5, 0.815, "", ha="center", va="center", fontsize=21,
               color=INK2, linespacing=1.4)
eq = fig.text(0.5, 0.73, "", ha="center", va="center", fontsize=25,
              color=INK)

# energy meter (bottom)
M_X0, M_X1, M_Y = 0.045, 0.285, 0.06
meter_lbl = fig.text(M_X0, M_Y + 0.035, "", ha="left", va="center",
                     fontsize=19, color=INK2)
meter_bg = plt.Rectangle((M_X0, M_Y - 0.006), M_X1 - M_X0, 0.012,
                         transform=fig.transFigure, facecolor=GRID, alpha=0)
meter_fg = plt.Rectangle((M_X0, M_Y - 0.006), 0, 0.012,
                         transform=fig.transFigure, facecolor=BLUE, alpha=0)
fig.add_artist(meter_bg)
fig.add_artist(meter_fg)

T_PEEL2 = DECON[1][0]
T_FAST = DECON[4][0]
R_FAST = RECON[4][0]
CAPTIONS = [
    (0.0, 5.0, "What is the FFT\nactually showing you?", "", ""),
    (5.1, 11.5, "Start with one function.",
     "A pure sine. It repeats every period,\nat exactly one frequency.",
     r"$f(t) = \sin(t)$"),
    (11.6, 18.0, "Now distort it.",
     "Same period. Same repeat.\nBut it's no longer a sine.", r"$f(t) = \;?$"),
    (18.1, 22.0, "Fourier's idea:",
     "any repeating shape is a sum of sines,\nat 1×, 2×, 3× ... the base frequency.",
     r"$f(t) = a_1\sin t + a_2\sin 2t + a_3\sin 3t + \dots$"),
    (22.1, T_PEEL2, "Take it apart, one sine at a time.",
     "Find how much of sin(t) is hidden in f(t).\nLift it out into its own lane.", None),
    (T_PEEL2 + 0.1, T_FAST, "Subtract it. Repeat.",
     "Now find the 2× sine in what's left.\nThen 3×. Then 4× ...", None),
    (T_FAST + 0.1, DECON_END + 0.6, "Until nothing is left.",
     "Every piece of f(t) now sits\nin its own frequency lane.", None),
    (DECON_END + 0.7, 43.0, "Now look from the side.",
     "Time disappears. Each sine collapses\nto a single number: its height.", ""),
    (43.1, 49.4, "That's the spectrum.",
     "Not a different signal. The SAME function,\nviewed along the time axis.",
     r"$|a_1|,\ |a_2|,\ |a_3|,\ \dots$"),
    (49.5, RECON[1][0], "Now build it back.",
     "Start from nothing.\n1× alone gives the rhythm, not the shape.", None),
    (RECON[1][0] + 0.1, R_FAST, "Add the harmonics, one by one.",
     "Each one bends the curve\ncloser to the dashed target.", None),
    (R_FAST + 0.1, RECON_END + 1.0, "All ten together: f(t) again.",
     "Nothing was lost.\nSame information, two views.", None),
    (RECON_END + 1.1, DURATION + 1, "Time and frequency are\none object, seen from two sides.",
     "Harmonics aren't extra signals.\nThey're how the FFT describes SHAPE.", ""),
]


def series(n, lead, sign):
    """mathtext like  lead a1 sin t + a2 sin 2t ... (n terms)."""
    def term(k):
        return rf"a_{{{k}}}\sin {'' if k == 1 else k}t"
    if n == 0:
        return lead
    if n <= 3:
        terms = [term(k) for k in range(1, n + 1)]
    else:
        terms = [term(1), term(2), r"\dots", term(n)]
    return lead + "".join(f" {sign} {x}" for x in terms)


def set_text(t, dyn_eq):
    for art in (caption, sub, eq):
        art.set_text("")
    for t_in, t_out, head, s, e in CAPTIONS:
        if t_in <= t < t_out:
            a = fade(t, t_in, t_out)
            if t_in == 0.0:
                a = 1 - ramp(t, t_out - 0.45, t_out)
            if e is None:
                e = dyn_eq
                ea = a
            for art, txt in ((caption, head), (sub, s), (eq, e)):
                art.set_text(txt)
                art.set_alpha(a)


# ------------------------------------------------------------------ timeline
DIST_T0, DIST_T1 = 12.5, 16.5          # sine -> distorted shape
BAR_T0, BAR_T1 = DECON_END + 4.0, DECON_END + 6.0
BAR_OUT = (46.5, 48.0)


def decon_state(t, i):
    """(appear, moved) for harmonic i (0-based) during the peeling."""
    t0, d = DECON[i]
    return ramp(t, t0, t0 + 0.35 * d), ramp(t, t0 + 0.35 * d, t0 + 0.8 * d)


def recon_state(t, i):
    """(arrived, merged) for harmonic i during the rebuild."""
    t0, d = RECON[i]
    return ramp(t, t0, t0 + 0.6 * d), ramp(t, t0 + 0.55 * d, t0 + 0.9 * d)


def draw(t):
    elev, azim = camera(t)
    ax.view_init(elev=elev, azim=azim)
    # zoom follows the camera: tight for flat views, wider for the angled one
    p = elev / PERSP[0]
    ax.set_box_aspect((X_LEN, 5.2, 3.0), zoom=ZOOM_FLAT + (ZOOM_PERSP - ZOOM_FLAT) * p)

    tt = tau + 0.22 * t                     # the function "plays"
    C = comps(tt)
    full = C.sum(0)
    E_full = np.mean(full ** 2)
    s = ramp(t, DIST_T0, DIST_T1)
    f = (1 - s) * np.sin(2 * np.pi * tt) + s * full

    side = ramp(t, DECON_END + 0.8, DECON_END + 3.5) * (1 - ramp(t, 46.5, 49.0))
    bar_s = ramp(t, BAR_T0, BAR_T1) * (1 - ramp(t, *BAR_OUT))
    in_recon = t >= 49.5

    front = f.copy()
    dyn_eq = ""
    meter = None
    n_done = 0
    for i, (k, ln, bl, lab) in enumerate(zip(ks, comp_lines, bar_lines, lane_lbls)):
        c = C[i]
        if not in_recon:
            appear, moved = decon_state(t, i)
            y = k * moved
            front = front - moved * c          # leftover shrinks as it leaves
            alpha = appear
            n_done += moved > 0.5
            # brighter while it's being lifted out of the signal
            lw_boost = 1.0
        else:
            arrived, merged = recon_state(t, i)
            y = k * (1 - arrived)
            alpha = 1 - merged
            n_done += arrived > 0.5
        alpha *= (1 - 0.88 * bar_s)
        set_glow(ln, x_of_tau, np.full(N_PTS, y), c, alpha)
        h = AMP[i] * bar_s
        set_glow(bl, [BAR_X, BAR_X], [k, k], [0, h], bar_s)
        lab.set_alpha(0.9 * min(1.0, y / k) * (alpha > 0.05))

    if in_recon:
        front = sum(recon_state(t, i)[0] * C[i] for i in range(K))
        dyn_eq = series(n_done, r"$S(t) =", "+").replace("= +", "=") + "$"
        if n_done == 0:
            dyn_eq = r"$S(t) = 0$"
        rebuilt = 1 - np.mean((full - front) ** 2) / E_full
        meter = (f"shape rebuilt:  {100 * max(rebuilt, 0):.0f}%", max(rebuilt, 0), BLUE,
                 ramp(t, 49.6, 50.3) * (1 - ramp(t, RECON_END + 1.0, RECON_END + 1.6)))
    elif t >= 21.8:
        dyn_eq = series(n_done, r"$\mathrm{leftover} = f(t)", "-") + "$"
        left = np.mean(front ** 2) / E_full
        meter = (f"energy still in the leftover:  {100 * left:.0f}%", left, ORANGE,
                 ramp(t, 22.0, 22.6) * (1 - ramp(t, DECON_END + 0.6, DECON_END + 1.2)))

    # front curve: the signal / the leftover / the partial sum
    front_alpha = 1 - 0.9 * side
    col = BLUE if s < 0.5 else INK
    set_glow(sum_line, x_of_tau, np.zeros(N_PTS), front, front_alpha, col)

    # dashed target: the original shape, shown while taking apart / rebuilding
    g = (ramp(t, 22.0, 22.8) * (1 - ramp(t, DECON_END + 0.5, DECON_END + 1.5))
         + ramp(t, 49.5, 50.3) * (1 - ramp(t, RECON_END + 0.3, RECON_END + 1.0)))
    ghost_line.set_data_3d(x_of_tau, np.zeros(N_PTS), full)
    ghost_line.set_alpha(0.75 * g)

    if meter:
        txt, frac, colr, a = meter
        meter_lbl.set_text(txt)
        meter_lbl.set_alpha(a)
        meter_bg.set_alpha(a)
        meter_fg.set_alpha(a)
        meter_fg.set_width((M_X1 - M_X0) * min(max(frac, 0), 1))
        meter_fg.set_facecolor(colr)
    else:
        for art in (meter_lbl, meter_bg, meter_fg):
            art.set_alpha(0)

    lbl_time.set_alpha(1 - side)
    lbl_freq.set_alpha(ramp(t, 18.5, 21.5) * (1 - ramp(t, RECON_END + 0.8, RECON_END + 3.8)))

    set_text(t, dyn_eq)


# ------------------------------------------------------------------ render
if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "fourier_3d.mp4"
    # render at SS x resolution, Lanczos-downscale to 1080x1350: smooth edges
    writer = FFMpegWriter(fps=FPS, codec="libx264", bitrate=-1,
                          extra_args=["-vf", "scale=1920:1080:flags=lanczos",
                                      "-pix_fmt", "yuv420p", "-profile:v", "high",
                                      "-preset", "slow", "-crf", "14",
                                      "-movflags", "+faststart"])
    n = int(DURATION * FPS)
    with writer.saving(fig, out, dpi=DPI * SS):
        for i in range(n):
            draw(i / FPS)
            writer.grab_frame(facecolor=SURFACE)
            if i % 600 == 0:
                print(f"frame {i}/{n}", flush=True)
    print("done:", out)
