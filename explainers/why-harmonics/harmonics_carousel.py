"""
LinkedIn PDF carousel: "Why do we see harmonics?  A mathematical answer."
4:5 slides (10.8 x 13.5 in), vector PDF. Every spectrum shown is computed
with an FFT of the function on the slide, not drawn by hand.

Run:  python3 harmonics_carousel.py  ->  harmonics_carousel.pdf
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

W, H = 10.8, 13.5
LEFT = 0.085
TOTAL = 17

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "mathtext.fontset": "cm",
    "text.color": INK,
    "axes.edgecolor": AXIS,
    "xtick.color": MUTED,
    "ytick.color": MUTED,
    "axes.labelcolor": MUTED,
})

# ---------------------------------------------------------------- functions
N = 4096
t1 = np.arange(N) / N                   # exactly one period, T = 1
w0 = 2 * np.pi


def sq(t):   return np.sign(np.sin(w0 * t))
def saw(t):  return 2 * (t - np.floor(t + 0.5))
def tri(t):  return (2 / np.pi) * np.arcsin(np.sin(w0 * t))
def hw(t):   return np.maximum(np.sin(w0 * t), 0)
def sine(t): return np.sin(w0 * t)


def harmonic_amps(f, n_max=10):
    X = np.fft.rfft(f(t1))
    return 2 * np.abs(X[1:n_max + 1]) / N


def real_sig(t):
    """Messy but periodic machine signal: imbalance (1X), misalignment (2X)
    and an impact once per revolution that rings and decays."""
    tau_ = (t % 1.0 - 0.32) % 1.0
    ring = np.exp(-tau_ / 0.15) * np.sin(2 * np.pi * 6.0 * tau_)
    y = 0.55 * np.sin(w0 * t) + 0.3 * np.sin(2 * w0 * t + 0.9) + 1.4 * ring
    return y / 1.16


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
        f.text(1 - LEFT, 0.955, "WHY WE SEE HARMONICS", fontsize=13,
               color=MUTED, ha="right", fontweight="bold")
        self.y = 0.905
        if kicker:
            f.text(LEFT, self.y, kicker.upper(), fontsize=16, color=ORANGE,
                   fontweight="bold", va="top")
            self.y -= 0.035
        t = f.text(LEFT, self.y, title, fontsize=38, fontweight="bold",
                   color=INK, va="top", linespacing=1.2)
        n_lines = title.count("\n") + 1
        self.y -= n_lines * 38 * 1.2 / 72 / H + 0.025
        f.add_artist(plt.Line2D([LEFT, LEFT + 0.08], [self.y, self.y],
                                color=BLUE, lw=4, transform=f.transFigure))
        self.y -= 0.035

    # flow helpers ---------------------------------------------------
    def par(self, text, size=22, color=INK2, width=50, weight="normal", gap=0.022):
        lines = []
        for p in text.split("\n"):
            lines += textwrap.wrap(p, width) or [""]
        body = "\n".join(lines)
        self.fig.text(LEFT, self.y, body, fontsize=size, color=color, va="top",
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
        f.add_artist(plt.Rectangle((LEFT, self.y - h), 1 - 2 * LEFT, h,
                                   transform=f.transFigure, facecolor=PANEL,
                                   edgecolor="none"))
        f.add_artist(plt.Rectangle((LEFT, self.y - h), 0.008, h,
                                   transform=f.transFigure, facecolor=accent,
                                   edgecolor="none"))
        f.text(LEFT + 0.035, self.y - 0.0175, "\n".join(lines), fontsize=size,
               color=color, va="top", linespacing=1.45, fontweight="bold")
        self.y -= h + 0.025

    def axes(self, height, gap=0.03, label_room=0.03):
        ax = self.fig.add_axes([LEFT + 0.07, self.y - height,
                                1 - 2 * LEFT - 0.07, height - label_room],
                               facecolor=SURFACE)
        style(ax)
        self.y -= height + gap
        return ax

    def wave_spec(self, f, title_w="Time  (one period = T)", height=0.17,
                  orders=10, color=INK):
        ax = self.axes(height)
        tt = np.linspace(0, 2, 2000)
        ax.plot(tt, f(tt), color=color, lw=3)
        ax.axhline(0, color=AXIS, lw=1)
        ax.set_xlim(0, 2)
        ax.set_xticks([0, 1, 2])
        ax.set_xticklabels(["0", "T", "2T"])
        ax.set_ylim(-1.25, 1.25)
        ax.set_yticks([-1, 0, 1])
        ax.set_title(title_w, loc="left", fontsize=15, color=MUTED, pad=8)
        ax2 = self.axes(height)
        A = harmonic_amps(f, orders)
        k = np.arange(1, orders + 1)
        ax2.bar(k, A, width=0.38, color=[BLUE] + [ORANGE] * (orders - 1), zorder=3)
        for kk, a in zip(k, A):
            if a > 0.01:
                ax2.text(kk, a + 0.03, f"{a:.2f}", ha="center", fontsize=12,
                         color=INK2)
        ax2.set_xlim(0.4, orders + 0.6)
        ax2.set_ylim(0, max(1.1, A.max() * 1.18))
        ax2.set_xticks(k)
        ax2.set_xticklabels([f"{i}X" for i in k])
        ax2.set_title("Spectrum: amplitude of each harmonic  (FFT of the curve above)",
                      loc="left", fontsize=15, color=MUTED, pad=8)
        return ax, ax2

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


# ---------------------------------------------------------------- slides
def build(path="harmonics_carousel.pdf"):
    with PdfPages(path) as pdf:
        meta = pdf.infodict()
        meta["Title"] = "Why do we see harmonics? A mathematical answer"
        meta["Subject"] = "Fourier series and harmonics for vibration engineers"

        # 1 cover --------------------------------------------------------
        fig = plt.figure(figsize=(W, H), facecolor=SURFACE)
        ax = fig.add_axes([0, 0.18, 1, 0.34], facecolor=SURFACE)
        ax.set_axis_off()
        tt = np.linspace(0, 2, 3000)
        ax.plot(tt, sine(tt), color=BLUE, lw=3, alpha=0.35)
        part = sum((4 / (np.pi * n)) * np.sin(w0 * n * tt) for n in range(1, 30, 2))
        ax.plot(tt, part, color=INK, lw=3.5)
        ax.set_xlim(-0.05, 2.05)
        ax.set_ylim(-1.5, 1.5)
        fig.text(LEFT, 0.86, "Why do we see\nharmonics?", fontsize=62,
                 fontweight="bold", va="top", linespacing=1.12)
        fig.text(LEFT, 0.635, "A mathematical answer,\nwith functions you can check yourself.",
                 fontsize=26, color=INK2, va="top", linespacing=1.4)
        fig.text(LEFT, 0.09, "Fourier series  ·  symmetry  ·  smoothness  ·  nonlinearity  ·  the FFT",
                 fontsize=16, color=MUTED)
        fig.text(1 - LEFT, 0.05, "Swipe  →", fontsize=22, color=ORANGE,
                 ha="right", fontweight="bold")
        draw_mascot(fig, [0.70, 0.47, 0.24, 0.17], look=(0.4, -0.9))
        bubble(fig, 0.82, 0.69, "Let's take some\nsignals apart!", 18)
        pdf.savefig(fig, facecolor=SURFACE)
        plt.close(fig)

        # 2 the only assumption ------------------------------------------
        s = Slide(pdf, 2, "Start with one\nassumption", "The setup")
        s.par("A rotating machine running at constant speed produces motion "
              "that repeats every revolution. Mathematically, the signal is periodic:")
        s.eq(r"$f(t+T) = f(t)$", size=44)
        s.par("T is the period (one revolution). It defines the fundamental "
              "frequency:")
        s.eq(r"$f_0 = \dfrac{1}{T}, \qquad \omega_0 = \dfrac{2\pi}{T}$", size=36,
             height=0.075)
        s.par("We assume nothing about the SHAPE of f(t). It can be smooth, "
              "flattened, spiky, lopsided. Only that it repeats.")
        s.box("Everything that follows, including where harmonics appear "
              "and how strong they are, follows from that one line.")
        s.save()

        # 3 which sines are allowed --------------------------------------
        s = Slide(pdf, 3, "Which sines and\ncosines are allowed?", "Why integer multiples")
        s.par("If a sine or cosine at frequency ω is part of a signal with "
              "period T, it must also repeat after T:")
        s.eq(r"$\sin(\omega(t+T)) = \sin(\omega t) \;\;\Rightarrow\;\; \omega T = 2\pi n$",
             size=32)
        s.eq(r"$\Rightarrow\;\; \omega = n\,\omega_0, \qquad n = 1, 2, 3, \dots$",
             size=32)
        ax = s.axes(0.24)
        tt = np.linspace(0, 1, 1000)
        for n, c, lw, a in ((1, BLUE, 3, 1), (2, ORANGE, 2.5, 1), (3, ORANGE, 2, 0.6)):
            ax.plot(tt, np.sin(w0 * n * tt) + (3 - n) * 2.4, color=c, lw=lw, alpha=a)
            ax.text(1.02, (3 - n) * 2.4, f"{n}X  ✓", color=INK2, fontsize=15,
                    va="center")
        ax.plot(tt, np.sin(w0 * 1.5 * tt) - 2.4, color=MUTED, lw=2, ls=(0, (5, 4)))
        ax.text(1.02, -2.4, "1.5X  ✗", color=MUTED, fontsize=15, va="center")
        ax.axvline(1, color=AXIS, lw=1.5)
        ax.set_xlim(0, 1.18)
        ax.set_xticks([0, 1])
        ax.set_xticklabels(["0", "T"])
        ax.set_yticks([])
        ax.grid(False)
        ax.spines["left"].set_visible(False)
        ax.set_title("Only whole numbers of cycles fit into one period",
                     loc="left", fontsize=15, color=MUTED, pad=8)
        s.box("Harmonics sit at EXACT integer multiples of running speed, "
              "not by convention, but because nothing else can fit.")
        s.save()

        # 4 Fourier series -----------------------------------------------
        s = Slide(pdf, 4, "The Fourier series", "Fourier, 1822")
        s.par("Any reasonable periodic function can be written as a sum of "
              "exactly those allowed sines and cosines:")
        s.eq(r"$f(t) = a_0 + \sum_{n=1}^{\infty} \left[\, a_n \cos(n\omega_0 t) "
             r"+ b_n \sin(n\omega_0 t) \,\right]$", size=29, height=0.08)
        s.par("Each coefficient measures how much of f(t) looks like the n-th "
              "harmonic, a projection:")
        s.eq(r"$a_n = \dfrac{2}{T}\int_0^T f(t)\cos(n\omega_0 t)\,dt, \quad "
             r"b_n = \dfrac{2}{T}\int_0^T f(t)\sin(n\omega_0 t)\,dt$",
             size=25, height=0.08)
        s.par("This works because different harmonics are orthogonal: over one "
              "period they don't overlap at all.")
        s.eq(r"$\int_0^T \sin(m\omega_0 t)\,\sin(n\omega_0 t)\,dt = 0 \quad (m \neq n)$",
             size=28)
        s.box("The amplitude at nX on your spectrum is\n"
              "√(aₙ² + bₙ²). That's all a harmonic is.", accent=ORANGE)
        s.save()

        # 5 pure sine ------------------------------------------------------
        s = Slide(pdf, 5, "Example 1:\na pure sine", "Baseline")
        s.eq(r"$f(t) = \sin(\omega_0 t) \;\;\Rightarrow\;\; b_1 = 1,\;\; "
             r"\mathrm{all\ others} = 0$", size=29)
        s.wave_spec(sine, height=0.19, color=BLUE)
        s.par("One line in the spectrum. Not approximately one: exactly one. "
              "A sine is already a harmonic, so the series has a single term.")
        s.save()

        # 6 square ---------------------------------------------------------
        s = Slide(pdf, 6, "Example 2:\na square wave", "Odd harmonics only")
        s.eq(r"$\mathrm{sgn}(\sin\omega_0 t) = \dfrac{4}{\pi}\left[\sin\omega_0 t "
             r"+ \dfrac{1}{3}\sin 3\omega_0 t + \dfrac{1}{5}\sin 5\omega_0 t + \dots\right]$",
             size=27, height=0.08)
        s.wave_spec(sq, height=0.18)
        s.par("Every odd harmonic, falling off as 1/n. Check: 4/π = 1.27, "
              "then 1.27/3 = 0.42, 1.27/5 = 0.25.\nAnd not a single even one. Why?")
        s.save()

        # 7 symmetry -------------------------------------------------------
        s = Slide(pdf, 7, "Why only odd?\nSymmetry.", "Half-wave symmetry")
        s.par("The square wave has half-wave symmetry: the second half-cycle is "
              "the first one flipped upside down.")
        s.eq(r"$f(t + T/2) = -f(t)$", size=40)
        s.par("Now shift an even harmonic (n = 2, 4, ...) by half a period:")
        s.eq(r"$\sin\!\left(n\omega_0 (t + T/2)\right) = \sin(n\omega_0 t + n\pi) "
             r"= +\sin(n\omega_0 t)$", size=28)
        s.par("An even harmonic does NOT flip sign, so it can never contribute "
              "to a function that does. Its coefficient is forced to zero. "
              "Odd harmonics flip, so they survive.")
        s.box("Symmetric distortion → odd harmonics only.\n"
              "Break the symmetry → even harmonics appear.")
        s.save()

        # 8 sawtooth -------------------------------------------------------
        s = Slide(pdf, 8, "Example 3:\na sawtooth", "All harmonics")
        s.eq(r"$f(t) = \dfrac{2}{\pi}\sum_{n=1}^{\infty} (-1)^{n+1}\,"
             r"\dfrac{\sin(n\omega_0 t)}{n}$", size=30, height=0.085)
        s.wave_spec(saw, height=0.18)
        s.par("No half-wave symmetry, so every harmonic is present: "
              "0.64, 0.32, 0.21, 0.16 ... still 1/n, because the wave still "
              "has a jump.")
        s.save()

        # 9 triangle -------------------------------------------------------
        s = Slide(pdf, 9, "Example 4:\na triangle wave", "Smoother shape")
        s.eq(r"$f(t) = \dfrac{8}{\pi^2}\sum_{n\ \mathrm{odd}} (-1)^{(n-1)/2}\,"
             r"\dfrac{\sin(n\omega_0 t)}{n^2}$", size=30, height=0.085)
        s.wave_spec(tri, height=0.18)
        s.par("Same symmetry as the square wave, so again only odd harmonics. "
              "But no jump, only corners, and the harmonics fall as 1/n²: "
              "3X is 1/9 of 1X, 5X is 1/25.")
        s.save()

        # 10 smoothness rule ----------------------------------------------
        s = Slide(pdf, 10, "Sharper shape,\nmore harmonics", "The decay rule")
        s.par("Integrate the coefficient formula by parts: each step pulls out "
              "a factor 1/n, until you hit a discontinuity. So:")
        rows = [("Jump in f(t)", r"$\sim 1/n$", "square, sawtooth"),
                ("Corner (jump in f′)", r"$\sim 1/n^2$", "triangle, clipped sine"),
                ("Jump in f″", r"$\sim 1/n^3$", "smoother still"),
                ("Infinitely smooth", r"$\ll 1/n^k$", "a pure sine")]
        for a, b, c in rows:
            s.fig.text(LEFT, s.y, a, fontsize=20, color=INK, va="top")
            s.fig.text(0.44, s.y + 0.004, b, fontsize=24 if "$" in b else 18,
                       color=ORANGE, va="top")
            s.fig.text(0.70, s.y, c, fontsize=17, color=MUTED, va="top")
            s.y -= 0.042
        s.y -= 0.01
        ax = s.axes(0.20, gap=0.05)
        n = np.arange(1, 32, 2)
        Aq = harmonic_amps(sq, 31)[n - 1]
        At = harmonic_amps(tri, 31)[n - 1]
        ax.loglog(n, Aq, "o-", color=ORANGE, lw=2, ms=8, label="square (jump): 1/n")
        ax.loglog(n, At, "o-", color=BLUE, lw=2, ms=8, label="triangle (corner): 1/n²")
        ax.set_xlabel("harmonic number n (odd)", fontsize=15)
        ax.set_title("Harmonic amplitude, log–log", loc="left", fontsize=15,
                     color=MUTED, pad=8)
        ax.grid(True, which="major", color=GRID)
        leg = ax.legend(frameon=False, fontsize=15, labelcolor=INK2)
        ax.tick_params(which="minor", length=0)
        s.box("Sharp features in time live at high frequency. Impacts and "
              "sudden stops push energy far up the harmonic series.")
        s.save()

        # 11 half-wave rectified -------------------------------------------
        s = Slide(pdf, 11, "Example 5:\ncut a sine on one side", "One-sided truncation")
        s.eq(r"$\max(\sin\omega_0 t,\,0) = \dfrac{1}{\pi} + \dfrac{1}{2}\sin\omega_0 t "
             r"- \dfrac{2}{\pi}\sum_{n\ \mathrm{even}} \dfrac{\cos(n\omega_0 t)}{n^2-1}$",
             size=26, height=0.085)
        s.wave_spec(hw, height=0.18)
        s.par("Flatten one side and the symmetry breaks: 2X, 4X, 6X appear "
              "immediately (0.21, 0.04, 0.02). This is the extreme case of "
              "motion that is limited in one direction only.")
        s.save()

        # 12 real machine signal --------------------------------------------
        s = Slide(pdf, 12, "Example 6:\na real machine signal", "In real life")
        s.par("Real signals are messier: imbalance, misalignment, and an "
              "impact every revolution that rings and decays.", gap=0.008)
        s.wave_spec(real_sig, height=0.135)
        s.par("No neat formula, but it repeats every revolution, so it is "
              "still a Fourier series: imbalance on 1X, misalignment on 2X, "
              "the ringing impact spread across 4X–7X.", gap=0.012)
        s.box("If it repeats and isn't a pure sine, you will see harmonics.",
              size=21)
        s.save()

        # 13 nonlinearity ---------------------------------------------------
        s = Slide(pdf, 13, "Where harmonics\nare born", "Nonlinearity")
        s.par("A linear system driven at ω₀ responds only at ω₀. Harmonics "
              "need a nonlinearity: a response not proportional to the input.",
              gap=0.012)
        s.eq(r"$y = x + \alpha x^2 + \beta x^3, \qquad x = \sin\omega_0 t$", size=30)
        s.par("Two identities you can check by hand:", gap=0.008)
        s.eq(r"$\sin^2\omega_0 t = \dfrac{1}{2} - \dfrac{1}{2}\cos 2\omega_0 t$",
             size=30, height=0.07)
        s.eq(r"$\sin^3\omega_0 t = \dfrac{3}{4}\sin\omega_0 t - \dfrac{1}{4}\sin 3\omega_0 t$",
             size=30, height=0.07)
        s.par("The x² term creates 2X (and a DC shift). The x³ term creates 3X.")
        s.box("Even-order (asymmetric) → even harmonics.\n"
              "Odd-order (symmetric) → odd harmonics.", size=21, width=50)
        s.par("Clearances, impacts, and stiffness that differs in each "
              "direction are all nonlinearities.", size=19, gap=0.01)
        s.save()

        # 14 FFT ------------------------------------------------------------
        s = Slide(pdf, 14, "What the FFT\nactually computes", "Cooley & Tukey, 1965")
        s.par("Your analyser doesn't see a formula, it sees N samples x[m]. "
              "The FFT is a fast way to compute the discrete Fourier transform:")
        s.eq(r"$X[k] = \sum_{m=0}^{N-1} x[m]\, e^{-i 2\pi k m / N}$", size=34,
             height=0.085)
        s.par("If the record holds exactly P periods, harmonic n lands on bin "
              "k = nP, and (2/N)·|X[k]| equals the Fourier amplitude "
              "√(aₙ² + bₙ²). Same numbers as the series.")
        s.par("Two real-world caveats:", color=INK, weight="bold", gap=0.01)
        s.par("• Leakage: a non-integer number of periods smears peaks into "
              "neighbouring bins. A window (e.g. Hanning) controls it.\n"
              "• Aliasing: harmonics above fs/2 fold back to false "
              "frequencies. Anti-alias filtering prevents it.", size=19, width=54)
        s.save()

        # 15 takeaways ----------------------------------------------------
        s = Slide(pdf, 15, "What this means\nfor the analyst", "Takeaways")
        items = [
            ("Harmonics aren't extra signals.",
             "They are the Fourier description, in sines and cosines, of one "
             "periodic waveform that isn't a pure sine."),
            ("Position is forced by periodicity.",
             "Exactly n × running speed. Peaks off those lines come from "
             "something else."),
            ("Which harmonics tells you symmetry.",
             "Odd only: symmetric distortion. Evens present: something is "
             "one-sided."),
            ("How far they extend tells you sharpness.",
             "Long harmonic families mean jumps or impacts in the waveform."),
            ("Rule out the measurement first.",
             "Sensor saturation, a loose mount or a clipped input range "
             "distort the waveform too, and produce harmonics that aren't "
             "in the machine."),
        ]
        for head, body in items:
            s.par(head, size=22, color=INK, weight="bold", gap=0.006)
            s.par(body, size=18, color=INK2, width=60, gap=0.022)
        s.save()

        # 16 sources ------------------------------------------------------
        s = Slide(pdf, 16, "Sources &\nfurther reading", "References")
        refs = [
            ("J. Fourier (1822).", "Théorie analytique de la chaleur. Paris: Firmin Didot."),
            ("J. W. Cooley & J. W. Tukey (1965).", "An algorithm for the machine "
             "calculation of complex Fourier series. Mathematics of Computation, "
             "19(90), 297–301."),
            ("R. N. Bracewell.", "The Fourier Transform and Its Applications. "
             "McGraw-Hill."),
            ("E. O. Brigham (1988).", "The Fast Fourier Transform and Its "
             "Applications. Prentice Hall."),
            ("E. M. Stein & R. Shakarchi (2003).", "Fourier Analysis: An "
             "Introduction. Princeton University Press. (Decay of coefficients "
             "vs smoothness.)"),
            ("R. B. Randall.", "Vibration-based Condition Monitoring: "
             "Industrial, Automotive and Aerospace Applications. Wiley."),
        ]
        for a, b in refs:
            s.par(a, size=19, color=INK, weight="bold", gap=0.004)
            s.par(b, size=17, color=INK2, width=62, gap=0.014)
        s.save()

        # 17 teaser for Friday's video -----------------------------------------
        s = Slide(pdf, 17, "Now watch them\ncome apart", "Coming Friday")
        s.par("Every function in this carousel, pulled apart into its harmonic "
              "lanes and rebuilt, in 3D, with sound.")
        import os
        if os.path.exists("teaser_frame.png"):          # a still from the video, if you have one
            img = plt.imread("teaser_frame.png")
            h_img = (1 - 2 * LEFT) * W * img.shape[0] / img.shape[1] / H
            iax = s.fig.add_axes([LEFT, s.y - h_img, 1 - 2 * LEFT, h_img])
            iax.imshow(img)
            iax.set_axis_off()
            s.y -= h_img + 0.04
        draw_mascot(s.fig, [LEFT - 0.02, 0.05, 0.3, 0.22], happy=True)
        bubble(s.fig, 0.56, 0.17, "See you Friday!", 24)
        s.save()


if __name__ == "__main__":
    build()
    print("done")
