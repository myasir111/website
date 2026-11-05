"""
LinkedIn PDF carousel: "The half of the FFT your analyser throws away."
FFT series, part 1 (the phase). 4:5 slides (10.8 x 13.5 in), vector PDF.
Every number and spectrum on the slides is computed here, not typed in.

Run:  python3 phase_carousel.py  ->  fft_phase_carousel.pdf
"""
import textwrap
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages

SURFACE = "#111110"
PANEL = "#1a1a19"
INK = "#f0efec"
INK2 = "#c3c2b7"
MUTED = "#898781"
GRID = "#2c2c2a"
AXIS = "#383835"
BLUE = "#3987e5"
ORANGE = "#d95926"
GREEN = "#2bb24c"

W, H = 10.8, 13.5
LEFT = 0.085
TOTAL = 16
SERIES = "THE OTHER HALF OF THE FFT"

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "mathtext.fontset": "cm",
    "text.color": INK,
    "axes.edgecolor": AXIS,
    "xtick.color": MUTED,
    "ytick.color": MUTED,
    "axes.labelcolor": MUTED,
})

# ---------------------------------------------------------------- the maths
# the three signals: square-wave harmonic sizes 4/(pi n), n odd, with three sets of phases
K = 15
ks = np.arange(1, K + 1, 2)
amp = 4 / (np.pi * ks)
rng = np.random.default_rng(7)
PHASES = {"square": np.zeros(len(ks)), "spike": np.full(len(ks), np.pi / 2),
          "noise": rng.uniform(0, 2 * np.pi, len(ks))}


def wave(key, t):
    return sum(a * np.sin(2 * np.pi * n * t + p) for a, n, p in zip(amp, ks, PHASES[key]))


NS = 4096
t1 = np.arange(NS) / NS
SPEC = {k: 2 * np.abs(np.fft.rfft(wave(k, t1))) / NS for k in PHASES}
assert all(np.allclose(SPEC["square"][:20], SPEC[k][:20], atol=1e-9) for k in PHASES)

# the worked example: x = 0.6 cos + 0.8 sin + 0.5 cos 2, 8 samples per turn
N8 = 8
k8 = np.arange(N8)
th8 = 2 * np.pi * k8 / N8
x8 = 0.6 * np.cos(th8) + 0.8 * np.sin(th8) + 0.5 * np.cos(2 * th8)
X8 = np.fft.fft(x8) / N8
assert np.isclose(X8[1], 0.3 - 0.4j) and np.isclose(X8[2], 0.25) and np.isclose(X8[7], np.conj(X8[1]))
PEAK1, PH1 = 2 * abs(X8[1]), np.degrees(np.angle(X8[1]))


def fmt(z):
    re, im = (0.0 if abs(v) < 5e-4 else v for v in (z.real, z.imag))
    sign = "−" if im < 0 else "+"
    return f"{re:.2f} {sign} {abs(im):.2f}i"


# ---------------------------------------------------------------- mascot and bubble
def draw_mascot(fig, rect, happy=False, look=(0.8, 0.3)):
    """The series mascot: a sine-wave creature (original character)."""
    ax = fig.add_axes(rect)
    ax.set_axis_off()
    ax.set_xlim(-0.2, 1.2)
    ax.set_ylim(-0.75, 1.0)
    ax.set_aspect("equal")
    x = np.linspace(0, 1, 300)
    y = 0.42 * np.sin(2 * np.pi * x)
    ax.plot(x, y, color=BLUE, lw=34, alpha=0.12, solid_capstyle="round")
    ax.plot(x, y, color=BLUE, lw=13, solid_capstyle="round")
    th = np.linspace(0, 2 * np.pi, 40)
    gx, gy = look
    g = np.hypot(gx, gy)
    for xe in (0.15, 0.35):
        ye = 0.42 * np.sin(2 * np.pi * xe) + 0.17
        r = 0.095
        if happy:
            ax.plot(xe + r * np.array([-0.9, 0, 0.9]), ye + r * np.array([-0.3, 0.45, -0.3]),
                    color=INK, lw=5, solid_capstyle="round")
            continue
        ax.fill(xe + r * np.cos(th), ye + r * np.sin(th), color=INK)
        ax.fill(xe + 0.45 * r * gx / g + 0.42 * r * np.cos(th),
                ye + 0.45 * r * gy / g + 0.42 * r * np.sin(th), color=SURFACE)
    s_ = np.linspace(-1, 1, 20)
    ax.plot(0.25 + 0.09 * s_, 0.42 - 0.2 + (0.05 + 0.07 * happy) * s_ ** 2,
            color=INK, lw=4, solid_capstyle="round")
    return ax


def bubble(fig, x, y, text, size=20):
    fig.text(x, y, text, fontsize=size, color=INK, fontweight="bold",
             ha="center", va="center", linespacing=1.25,
             bbox=dict(boxstyle="round,pad=0.5", facecolor="#1d1d1b",
                       edgecolor=BLUE, linewidth=2))


# ---------------------------------------------------------------- slide kit
class Slide:
    def __init__(self, pdf, num, title, kicker=None):
        self.pdf = pdf
        self.fig = plt.figure(figsize=(W, H), facecolor=SURFACE)
        f = self.fig
        f.text(LEFT, 0.955, f"{num:02d} / {TOTAL:02d}", fontsize=15, color=MUTED,
               family="DejaVu Sans Mono")
        f.text(1 - LEFT, 0.955, SERIES, fontsize=13, color=MUTED, ha="right", fontweight="bold")
        self.y = 0.905
        if kicker:
            f.text(LEFT, self.y, kicker.upper(), fontsize=16, color=ORANGE,
                   fontweight="bold", va="top")
            self.y -= 0.035
        f.text(LEFT, self.y, title, fontsize=38, fontweight="bold",
               color=INK, va="top", linespacing=1.2)
        n_lines = title.count("\n") + 1
        self.y -= n_lines * 38 * 1.2 / 72 / H + 0.025
        f.add_artist(plt.Line2D([LEFT, LEFT + 0.08], [self.y, self.y],
                                color=BLUE, lw=4, transform=f.transFigure))
        self.y -= 0.035

    def par(self, text, size=22, color=INK2, width=50, weight="normal", gap=0.022):
        lines = []
        for p in text.split("\n"):
            lines += textwrap.wrap(p, width) or [""]
        self.fig.text(LEFT, self.y, "\n".join(lines), fontsize=size, color=color, va="top",
                      linespacing=1.45, fontweight=weight)
        self.y -= len(lines) * size * 1.45 / 72 / H + gap

    def eq(self, tex, size=30, color=INK, height=None, x=None, ha="left", gap=0.02):
        h = height if height else size * 2.0 / 72 / H
        self.fig.text(x if x is not None else LEFT + 0.02, self.y - h / 2, tex,
                      fontsize=size, color=color, va="center", ha=ha)
        self.y -= h + gap

    def box(self, text, size=22, color=INK, accent=BLUE, width=46):
        lines = []
        for p in text.split("\n"):
            lines += textwrap.wrap(p, width) or [""]
        h = len(lines) * size * 1.45 / 72 / H + 0.035
        f = self.fig
        f.add_artist(plt.Rectangle((LEFT, self.y - h), 1 - 2 * LEFT, h, transform=f.transFigure,
                                   facecolor=PANEL, edgecolor="none"))
        f.add_artist(plt.Rectangle((LEFT, self.y - h), 0.008, h, transform=f.transFigure,
                                   facecolor=accent, edgecolor="none"))
        f.text(LEFT + 0.035, self.y - 0.0175, "\n".join(lines), fontsize=size,
               color=color, va="top", linespacing=1.45, fontweight="bold")
        self.y -= h + 0.025

    def axes(self, height, gap=0.03, label_room=0.03, left=None, width=None):
        l = LEFT + 0.07 if left is None else left
        w = (1 - 2 * LEFT - 0.07) if width is None else width
        ax = self.fig.add_axes([l, self.y - height, w, height - label_room], facecolor=SURFACE)
        style(ax)
        self.y -= height + gap
        return ax

    def plane(self, height, gap=0.03, cx=0.5):
        """a square complex-plane axes, centred"""
        hw = height * H / W
        ax = self.fig.add_axes([cx - hw / 2, self.y - height, hw, height], facecolor=SURFACE)
        ax.set_aspect("equal")
        ax.set_axis_off()
        self.y -= height + gap
        return ax

    def save(self):
        self.pdf.savefig(self.fig, facecolor=SURFACE)
        plt.close(self.fig)


def style(ax):
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    ax.spines["left"].set_color(AXIS)
    ax.spines["bottom"].set_color(AXIS)
    ax.tick_params(labelsize=14, length=0, pad=6)
    ax.grid(axis="y", color=GRID, lw=1)
    ax.set_axisbelow(True)


def plane_axes(ax, R=1.25, labels=True, real_above=False):
    ax.plot([-R, R], [0, 0], color=AXIS, lw=1.5)
    ax.plot([0, 0], [-R, R], color=AXIS, lw=1.5)
    if labels:
        ax.text(R, 0.08 if real_above else -0.08, "real", color=BLUE, fontsize=15, ha="right", va="bottom" if real_above else "top", fontweight="bold")
        ax.text(0.06, R - 0.05, "imaginary", color=GREEN, fontsize=15, va="top", fontweight="bold")
    ax.set_xlim(-R - 0.05, R + 0.05)
    ax.set_ylim(-R - 0.05, R + 0.05)


def arrow(ax, z, color, lw=4, origin=0j):
    ax.annotate("", xy=((origin + z).real, (origin + z).imag), xytext=(origin.real, origin.imag),
                arrowprops=dict(arrowstyle="-|>", color=color, lw=lw, mutation_scale=22, shrinkA=0, shrinkB=0))


def spectrum(ax, values, labels, colors, ymax=None, fmt_val="{:.2f}"):
    pos = np.arange(len(values))
    ax.bar(pos, values, width=0.45, color=colors, zorder=3)
    for p, v in zip(pos, values):
        if v > 0.01:
            ax.text(p, v + 0.03 * (ymax or max(values)), fmt_val.format(v), ha="center", fontsize=13, color=INK2)
    ax.set_xticks(pos)
    ax.set_xticklabels(labels)
    ax.set_ylim(0, ymax or max(values) * 1.25)
    ax.set_xlim(-0.6, len(values) - 0.4)


# ---------------------------------------------------------------- slides
def build(path="fft_phase_carousel.pdf"):
    with PdfPages(path) as pdf:
        meta = pdf.infodict()
        meta["Title"] = "The half of the FFT your analyser throws away"
        meta["Subject"] = "Real and imaginary parts, the mirror, size and phase, for vibration engineers"

        # 1 cover --------------------------------------------------------
        fig = plt.figure(figsize=(W, H), facecolor=SURFACE)
        fig.text(LEFT, 0.86, "The half of\nthe FFT your\nanalyser throws\naway", fontsize=58,
                 fontweight="bold", va="top", linespacing=1.1)
        fig.text(LEFT, 0.5, "Real and imaginary parts, the mirror,\nand why phase is the shape.",
                 fontsize=25, color=INK2, va="top", linespacing=1.4)
        ax = fig.add_axes([0.06, 0.12, 0.88, 0.25], facecolor=SURFACE)
        ax.set_axis_off()
        tt = np.linspace(0, 2, 3000)
        for key, c, a in (("noise", ORANGE, 0.55), ("spike", BLUE, 0.7), ("square", INK, 1)):
            ax.plot(tt, wave(key, tt), color=c, lw=3 if key == "square" else 2.2, alpha=a)
        ax.set_xlim(0, 2)
        ax.set_ylim(-3, 3)
        fig.text(LEFT, 0.07, "FFT series · Part 1", fontsize=16, color=MUTED)
        fig.text(1 - LEFT, 0.05, "Swipe  →", fontsize=22, color=ORANGE, ha="right", fontweight="bold")
        draw_mascot(fig, [0.71, 0.36, 0.22, 0.15], look=(-0.5, -0.9))
        bubble(fig, 0.83, 0.545, "Where did the\nshape go?", 17)
        pdf.savefig(fig, facecolor=SURFACE)
        plt.close(fig)

        # 2 the puzzle ---------------------------------------------------
        s = Slide(pdf, 2, "Three signals,\none spectrum", "The puzzle")
        s.par("A square wave, a sharp spike and something that looks like noise. "
              "Run all three through an FFT:", gap=0.012)
        tt = np.linspace(0, 2, 2000)
        for key, c in (("square", INK), ("spike", BLUE), ("noise", ORANGE)):
            ax = s.axes(0.085, gap=0.004, label_room=0.0)
            ax.plot(tt, wave(key, tt), color=c, lw=2.6)
            ax.axhline(0, color=AXIS, lw=1)
            ax.set_xlim(0, 2); ax.set_ylim(-3, 3); ax.set_axis_off()
        s.y -= 0.02
        ax = s.axes(0.16)
        sp = SPEC["square"][1:12]
        spectrum(ax, sp, [f"{n}X" for n in range(1, 12)], [BLUE] + [ORANGE] * 10, ymax=1.55)
        ax.set_title("The amplitude spectrum of all three: identical, peak for peak", loc="left",
                     fontsize=15, color=MUTED, pad=8)
        s.box("Same harmonics, same heights, three different shapes. "
              "So the spectrum can't be the whole story.", size=21)
        s.save()

        # 3 two numbers per bin --------------------------------------------
        s = Slide(pdf, 3, "Every bin is\ntwo numbers", "What the FFT returns")
        s.par("An FFT doesn't return heights. For each frequency bin it returns a "
              "complex number: a real part and an imaginary part.", gap=0.012)
        s.eq(r"$X_n = \frac{1}{N}\sum_{k=0}^{N-1} x_k\, e^{-i2\pi nk/N}$", size=34, height=0.08)
        s.par("Eight samples of x(t) = 0.6 cos ω₀t + 0.8 sin ω₀t + 0.5 cos 2ω₀t give:", size=19,
              width=58, gap=0.012)
        rows = [("bin", "real", "imaginary", "size |Xₙ|")]
        for n in range(N8):
            z = X8[n]
            rows.append((f"X{n}", f"{0 if abs(z.real) < 5e-4 else z.real:+.2f}",
                         f"{0 if abs(z.imag) < 5e-4 else z.imag:+.2f}", f"{abs(z):.2f}"))
        for i, r in enumerate(rows):
            col = MUTED if i == 0 else (INK if i in (2, 3) else INK2)
            if i in (6, 7, 8):
                col = MUTED
            for x0, txt in zip((LEFT + 0.02, 0.33, 0.55, 0.78), r):
                s.fig.text(x0, s.y, txt, fontsize=18 if i else 15, color=col, va="top",
                           family="DejaVu Sans Mono", fontweight="bold" if i == 0 else "normal")
            s.y -= 0.03
        s.y -= 0.01
        s.box("A spectrum plot shows only the size column (doubled, slide 5). "
              "The other two columns are where the shape lives.", size=21)
        s.save()

        # 4 an arrow -------------------------------------------------------
        s = Slide(pdf, 4, "Each frequency\nis an arrow", "Euler’s formula")
        s.par("Think of one frequency as an arrow turning round a circle. Its "
              "shadow along the real axis is a cosine; its shadow up the imaginary "
              "axis is a sine.", gap=0.01)
        s.eq(r"$e^{i\omega t} = \cos\omega t + i\,\sin\omega t$", size=38)
        ax = s.plane(0.34)
        plane_axes(ax)
        circ = np.linspace(0, 2 * np.pi, 200)
        ax.plot(np.cos(circ), np.sin(circ), color=MUTED, lw=1.5, alpha=0.6)
        a = np.radians(40)
        z = np.exp(1j * a)
        ax.plot([z.real, z.real], [0, z.imag], color=GREEN, lw=3, ls=(0, (4, 3)))
        ax.plot([0, z.real], [0, 0], color=BLUE, lw=6, solid_capstyle="butt")
        arrow(ax, z, ORANGE, lw=4)
        ax.text(z.real / 2, -0.12, "cos ωt", color=BLUE, fontsize=17, ha="center", va="top")
        ax.text(z.real + 0.06, z.imag / 2, "sin ωt", color=GREEN, fontsize=17, va="center")
        ax.text(0.27 * np.cos(a / 2), 0.27 * np.sin(a / 2), "ωt", color=INK, fontsize=17, va="center")
        s.box("One turning arrow, two shadows: a cosine on the real axis and a "
              "sine on the imaginary axis.", size=21)
        s.save()

        # 5 the mirror -----------------------------------------------------
        s = Slide(pdf, 5, "Why half the FFT\nis a mirror", "Two arrows")
        s.par("A real vibration moves along one line. One spinning arrow can’t: its "
              "tip also goes up and down. Add a twin spinning the other way, and "
              "the ups and downs always cancel:", gap=0.008)
        s.eq(r"$\cos\omega t = \frac{1}{2}\,e^{i\omega t} + \frac{1}{2}\,e^{-i\omega t}$", size=34,
             height=0.07)
        for j, (ang, cap) in enumerate(((0, "on top of each other:\none arrow, twice as long"),
                                        (90, "a quarter turn later:\none up, one down, zero"))):
            cx = 0.29 + 0.42 * j
            hgt = 0.22
            hw = hgt * H / W
            ax = s.fig.add_axes([cx - hw / 2, s.y - hgt, hw, hgt], facecolor=SURFACE)
            ax.set_aspect("equal"); ax.set_axis_off()
            plane_axes(ax, R=1.08, labels=False)
            ax.plot(0.5 * np.cos(circ), 0.5 * np.sin(circ), color=MUTED, lw=1.2, alpha=0.5)
            e1 = 0.52 * np.exp(1j * np.radians(ang))
            e2 = np.conj(e1)
            off = 0.05j if ang == 0 else 0.05
            arrow(ax, e1, BLUE, lw=5, origin=off if ang == 0 else -0.05 + 0j)
            arrow(ax, e2, ORANGE, lw=5, origin=e1 - off if ang == 0 else e1 + 0.05)
            ax.plot((e1 + e2).real, (e1 + e2).imag, "o", color=INK, ms=11, zorder=5)
            s.fig.text(cx, s.y - hgt - 0.012, cap, fontsize=16, color=INK2, ha="center", va="top",
                       linespacing=1.3)
        s.y -= 0.22 + 0.07
        s.par("So every peak appears twice, at +f and −f, each half the size. For a "
              "real signal the second half of the FFT is the mirror image (complex "
              "conjugate) of the first:", size=20, width=56, gap=0.006)
        s.eq(r"$X_{N-n} = \overline{X_n}, \qquad \mathrm{peak} = 2\,|X_n|$", size=30)
        s.save()

        # 6 real and imaginary = a and b -----------------------------------
        s = Slide(pdf, 6, "What the two\nnumbers measure", "Real and imaginary")
        s.par("Write a harmonic the usual way, as a cosine part and a sine part:", gap=0.008)
        s.eq(r"$a_n\cos(n\omega_0 t) + b_n\sin(n\omega_0 t)$", size=32)
        s.par("Put Euler’s formula into the FFT and it splits into two sums. "
              "Compared with the Fourier coefficients:", gap=0.008)
        s.eq(r"$X_n = \frac{1}{2}\,(a_n - i\,b_n)$", size=40, height=0.08)
        ax = s.plane(0.22)
        plane_axes(ax, R=1.0, real_above=True)
        z = 0.3 - 0.4j
        sc = 1.9
        ax.plot([0, z.real * sc], [0, 0], color=BLUE, lw=6, solid_capstyle="butt")
        ax.plot([z.real * sc] * 2, [0, z.imag * sc], color=GREEN, lw=3, ls=(0, (4, 3)))
        arrow(ax, z * sc, ORANGE)
        ax.text(z.real * sc / 2, 0.08, "½aₙ", color=BLUE, fontsize=18, ha="center")
        ax.text(z.real * sc + 0.05, z.imag * sc / 2, "−½bₙ", color=GREEN, fontsize=18, va="center")
        s.box("Real part = half the cosine amount.\nImaginary part = minus half the sine amount.",
              size=21)
        s.save()

        # 7 size and phase -------------------------------------------------
        s = Slide(pdf, 7, "Size and phase", "Length and angle")
        s.par("Write the same harmonic as one cosine with a size and a phase, and "
              "match it to the arrow:", gap=0.008)
        s.eq(r"$a_n\cos n\omega_0 t + b_n\sin n\omega_0 t = c_n\cos(n\omega_0 t + \theta_n)$",
             size=27, height=0.065)
        s.eq(r"$c_n = \sqrt{a_n^2 + b_n^2} = 2\,|X_n|$", size=34, height=0.07)
        s.eq(r"$\theta_n = \arg X_n, \qquad \tan\theta_n = \frac{\mathrm{Im}\,X_n}{\mathrm{Re}\,X_n}$",
             size=32, height=0.085)
        s.par("The arrow’s length is the peak on your spectrum. Its angle is the "
              "phase: when in each turn that harmonic peaks.", gap=0.02)
        s.box("Watch the quadrant. If the real part is negative, a calculator’s "
              "tan⁻¹ is 180° out. Use the signs of both parts (atan2).", size=20, accent=ORANGE,
              width=50)
        s.save()

        # 8 worked bin -----------------------------------------------------
        s = Slide(pdf, 8, "One bin, by hand", "Worked example")
        s.par("Same signal as slide 3, eight samples at 45° steps. For bin 1, "
              "multiply each sample by cos θₖ and sin θₖ and add:", gap=0.008)
        sc_ = float(np.sum(x8 * np.cos(th8)))
        ss_ = float(np.sum(x8 * np.sin(th8)))
        s.eq(r"$\sum x_k\cos\theta_k = %.1f, \qquad \sum x_k\sin\theta_k = %.1f$" % (sc_, ss_), size=28)
        s.eq(r"$X_1 = \frac{%.1f}{8} - i\,\frac{%.1f}{8} = %.1f - %.1f\,i$" % (sc_, ss_, X8[1].real,
             -X8[1].imag), size=30, height=0.075)
        s.eq(r"$2|X_1| = 2\sqrt{0.3^2 + 0.4^2} = %.1f$" % PEAK1, size=30)
        s.eq(r"$\theta_1 = \tan^{-1}\!\left(\frac{-0.4}{0.3}\right) = %.1f^\circ$" % PH1, size=30,
             height=0.08)
        s.par("Check: ½(a₁ − i b₁) = ½(0.6 − 0.8i) = 0.3 − 0.4i ✓", color=INK, weight="bold", gap=0.015)
        s.box(f"So the 1X part is {PEAK1:.1f}·cos(ω₀t − {abs(PH1):.1f}°). "
              "The spectrum keeps the 1.0. The phase keeps the −53.1°.", size=21)
        s.par("Every line of this, step by step, with your own numbers: "
              "nodallab.dev → Lab → An FFT by hand.", size=17, color=MUTED, width=64)
        s.save()

        # 9 phase is the shape ---------------------------------------------
        s = Slide(pdf, 9, "Phase is\nthe shape", "Back to the puzzle")
        s.par("The three signals from slide 2 share every size. Only the phases differ:",
              gap=0.012)
        tt = np.linspace(0, 1, 1200)
        for key, c, desc in (("square", INK, "all phases 0: the sines start together"),
                             ("spike", BLUE, "all shifted 90°: every peak lines up"),
                             ("noise", ORANGE, "random phases: no pattern")):
            ax = s.axes(0.09, gap=0.0, label_room=0.0, width=0.5)
            ax.plot(tt, wave(key, tt), color=c, lw=2.6)
            ax.set_xlim(0, 1); ax.set_ylim(-3, 3); ax.set_axis_off()
            s.fig.text(0.68, s.y + 0.045, desc, fontsize=16, color=INK2, va="center", wrap=True)
            s.y -= 0.025
        s.y -= 0.01
        s.eq(r"$|X_n|\ \mathrm{fixed}, \qquad \arg X_n\ \mathrm{changed} \;\Rightarrow\; \mathrm{a\ different\ waveform}$",
             size=24)
        s.box("The amplitude spectrum keeps the sizes and drops the timing. "
              "Phase is what tells a spike from noise.", size=21)
        s.save()

        # 10 phase needs a reference ----------------------------------------
        s = Slide(pdf, 10, "Phase needs\na reference", "Measuring it")
        s.par("Shift the same signal later in time by τ, and every bin turns:", gap=0.008)
        s.eq(r"$x(t-\tau) \;\Rightarrow\; X_n\,e^{-i\,n\omega_0\tau}$", size=36, height=0.075)
        s.par("The sizes don’t change, but each phase moves by nω₀τ: twice as far at "
              "2X as at 1X. So a phase on its own means nothing. It only means "
              "something against a fixed reference:", gap=0.015)
        s.par("• Absolute phase: a once-per-revolution mark (tachometer or keyphasor) "
              "starts the clock at the same shaft angle every time.\n"
              "• Relative phase: two sensors measured at the same moment. The record "
              "start cancels in the difference.", size=19, width=56, gap=0.02)
        s.box("Read the phase difference between points, or against the shaft, "
              "never a single phase on its own.", size=21)
        s.save()

        # 11 balancing -------------------------------------------------------
        s = Slide(pdf, 11, "In the field:\nbalancing", "Where the heavy spot is")
        s.par("An unbalanced rotor vibrates at 1X. Measured against the keyphasor, "
              "the 1X phase tells you where, round the rotor, the heavy spot is, "
              "allowing for the lag between the force and the response.", gap=0.012)
        ax = s.plane(0.3)
        circ = np.linspace(0, 2 * np.pi, 200)
        ax.plot(np.cos(circ), np.sin(circ), color=MUTED, lw=3)
        hs = np.radians(60)
        ax.plot(0.85 * np.cos(hs), 0.85 * np.sin(hs), "o", color=ORANGE, ms=22)
        ax.text(0.85 * np.cos(hs) + 0.14, 0.85 * np.sin(hs) + 0.1, "heavy spot", color=ORANGE, fontsize=16)
        ax.plot(0.85 * np.cos(hs + np.pi), 0.85 * np.sin(hs + np.pi), "s", color=GREEN, ms=16)
        ax.text(0.85 * np.cos(hs + np.pi) - 0.05, 0.85 * np.sin(hs + np.pi) - 0.42, "correction weight",
                color=GREEN, fontsize=16, ha="center")
        ax.plot([1.0, 1.18], [0, 0], color=INK, lw=4)
        ax.text(1.2, 0.08, "keyphasor\nmark", color=MUTED, fontsize=13)
        ax.set_xlim(-1.4, 1.6); ax.set_ylim(-1.45, 1.3)
        s.box("No phase, no balancing. With a trial weight to calibrate the rotor, "
              "the size sets how much correction and the phase sets where it goes.", size=20, width=50)
        s.save()

        # 12 coupling ---------------------------------------------------------
        s = Slide(pdf, 12, "In the field:\nacross a coupling", "Misalignment")
        s.par("Measure 1X on both sides of a coupling at the same time and compare "
              "the phases.", gap=0.012)
        for j, (deg, lab, col) in enumerate(((20, "drive end\nof motor", BLUE), (200, "drive end\nof pump", ORANGE))):
            cx = 0.27 + 0.46 * j
            hgt = 0.17
            hw = hgt * H / W
            ax = s.fig.add_axes([cx - hw / 2, s.y - hgt, hw, hgt], facecolor=SURFACE)
            ax.set_aspect("equal"); ax.set_axis_off()
            ax.plot(np.cos(circ), np.sin(circ), color=MUTED, lw=1.5)
            arrow(ax, 0.9 * np.exp(1j * np.radians(deg)), col)
            ax.set_xlim(-1.1, 1.1); ax.set_ylim(-1.1, 1.1)
            s.fig.text(cx, s.y - hgt - 0.01, lab, fontsize=16, color=INK2, ha="center", va="top")
        s.fig.text(0.5, s.y - 0.085, "≈ 180°", fontsize=26, color=INK, ha="center", fontweight="bold")
        s.y -= 0.17 + 0.09
        s.par("A phase shift of about 180° across the coupling, especially in the "
              "axial direction, is a classic sign of misalignment. Read it together "
              "with the amplitudes and directions, not on its own.", gap=0.02)
        s.box("Why phase can tell imbalance from misalignment is a story for "
              "another post.", size=21, accent=ORANGE)
        s.save()

        # 13 resonance --------------------------------------------------------
        s = Slide(pdf, 13, "In the field:\nthrough a resonance", "The 90° clue")
        s.par("Run a machine up through a natural frequency and plot 1X size and "
              "phase against speed (a Bode plot):", gap=0.01)
        r = np.linspace(0.2, 2.2, 600)
        z = 0.08
        A = 1 / np.sqrt((1 - r ** 2) ** 2 + (2 * z * r) ** 2)
        P = np.degrees(np.arctan2(2 * z * r, 1 - r ** 2))
        ax = s.axes(0.17)
        ax.plot(r, A, color=BLUE, lw=3)
        ax.axvline(1, color=MUTED, lw=1.5, ls=(0, (4, 4)))
        ax.set_xlim(0.2, 2.2); ax.set_xticks([1]); ax.set_xticklabels([""]); ax.set_yticks([])
        ax.set_title("1X size", loc="left", fontsize=15, color=MUTED, pad=8)
        ax = s.axes(0.17)
        ax.plot(r, P, color=ORANGE, lw=3)
        ax.axvline(1, color=MUTED, lw=1.5, ls=(0, (4, 4)))
        ax.axhline(90, color=GRID, lw=1)
        ax.set_xlim(0.2, 2.2); ax.set_ylim(0, 185)
        ax.set_yticks([0, 90, 180]); ax.set_yticklabels(["0°", "90°", "180°"])
        ax.set_xticks([1]); ax.set_xticklabels(["natural frequency"])
        ax.set_title("1X phase lag", loc="left", fontsize=15, color=MUTED, pad=8)
        s.par("The phase swings by about 180°, passing 90° at the natural frequency, "
              "close to the amplitude peak.", gap=0.015)
        s.box("A peak with a big phase swing is a resonance. A peak without one "
              "probably isn’t.", size=21)
        s.save()

        # 14 takeaways ---------------------------------------------------------
        s = Slide(pdf, 14, "What this means\nfor the analyst", "Takeaways")
        items = [
            ("Every bin is two numbers.", "Real: half the cosine part. Imaginary: minus half the sine part."),
            ("The top half is a mirror.", "Real signals give Xₙ and its conjugate. Analysers drop one and double the other."),
            ("Size is the peak, angle is the phase.", "2|Xₙ| is what you see. arg Xₙ is what usually gets thrown away."),
            ("Phase is the shape.", "Same sizes, different phases, different waveform."),
            ("Phase needs a reference.", "A keyphasor or a second sensor. Compare phases, don’t read one alone."),
        ]
        for head, body in items:
            s.par(head, size=22, color=INK, weight="bold", gap=0.006)
            s.par(body, size=18, color=INK2, width=60, gap=0.022)
        s.par("Size tells you how much. Phase tells you where and why.", size=22, color=ORANGE,
              weight="bold", width=50)
        s.save()

        # 15 sources -----------------------------------------------------------
        s = Slide(pdf, 15, "Sources &\nfurther reading", "References")
        refs = [
            ("E. O. Brigham (1988).", "The Fast Fourier Transform and Its Applications. Prentice Hall. "
             "(Complex output, symmetry of real signals.)"),
            ("R. N. Bracewell.", "The Fourier Transform and Its Applications. McGraw-Hill. "
             "(Shift theorem: a time delay rotates the phase.)"),
            ("J. W. Cooley & J. W. Tukey (1965).", "An algorithm for the machine calculation of complex "
             "Fourier series. Mathematics of Computation, 19(90), 297–301."),
            ("R. B. Randall.", "Vibration-based Condition Monitoring: Industrial, Automotive and "
             "Aerospace Applications. Wiley. (Phase in machine diagnostics.)"),
            ("S. S. Rao.", "Mechanical Vibrations. Pearson. (Single-degree-of-freedom response: "
             "90° phase at the natural frequency.)"),
        ]
        for a, b in refs:
            s.par(a, size=19, color=INK, weight="bold", gap=0.004)
            s.par(b, size=17, color=INK2, width=62, gap=0.016)
        s.save()

        # 16 next: leakage ------------------------------------------------------
        s = Slide(pdf, 16, "Next: when the signal\ndoesn’t fit the window", "Coming Saturday")
        s.par("Everything here assumed the record holds a whole number of turns. "
              "When it doesn’t, one clean peak smears across its neighbours. That’s leakage.",
              gap=0.015)
        Nl = 64
        nn = np.arange(Nl)
        for j, (cyc, col, lab) in enumerate(((8.0, BLUE, "8 whole cycles in the record"),
                                              (8.5, ORANGE, "8.5 cycles: the peak leaks"))):
            ax = s.axes(0.14, gap=0.015)
            sp = 2 * np.abs(np.fft.rfft(np.sin(2 * np.pi * cyc * nn / Nl))) / Nl
            ax.bar(np.arange(len(sp))[:20], sp[:20], width=0.6, color=col, zorder=3)
            ax.set_xlim(-0.6, 19.6); ax.set_ylim(0, 1.15); ax.set_yticks([])
            ax.set_xticks([8]); ax.set_xticklabels(["bin 8"])
            ax.set_title(lab, loc="left", fontsize=15, color=MUTED, pad=8)
        draw_mascot(s.fig, [LEFT - 0.02, 0.04, 0.28, 0.2], happy=True)
        bubble(s.fig, 0.58, 0.15, "See you Saturday!", 24)
        s.save()


if __name__ == "__main__":
    build()
    print("done")
