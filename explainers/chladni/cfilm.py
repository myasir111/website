"""
Chladni film, Manim parts: the maths shots and the transparent overlays laid on the three.js plate shots.
Same engine and look as the wavelets and sidebands films (Wiggle, sounds, wide-screen bars); captions are
recorded here and drawn at assembly, one style for every shot.

    manim -qh cfilm.py CTitle CWave CFit CLambda CClose          # full shots, 1920x1080 @ 60
    manim -qh -t cfilm.py O2 O3 O5 O7 O8                       # overlays with alpha (.mov)
Truth: every number and curve comes from truth.py / plate.py (run truth.py first).
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))   # sidebands.py (from the Sidebands page) sits beside this file
from sidebands import *                     # noqa: F401,F403  (engine: WVFilm, Wiggle, T, M, FIG, sounds, palette)
import sidebands as SB
import proj as PJ                            # where things on the 3D plate land on screen

HERE = os.path.dirname(os.path.abspath(__file__))
TR = json.load(open(os.path.join(HERE, "truth.json")))
CYAN, SENS = "#9fe8f7", "#58c4dd"           # nodal-line glow; the cyan sensor
PNG = lambda f: os.path.join(HERE, "web", "data", f"mode_{round(f)}.png")


class CFilm(WVFilm):
    """the film engine with captions recorded (drawn at assembly) instead of drawn here"""

    def construct(self):
        self.caps = []
        super().construct()
        with open(os.path.join(HERE, f"caps_{type(self).__name__}.json"), "w") as fh:
            json.dump(self.caps, fh)

    @contextmanager
    def line(self, text, extra=0.0):
        dur = read_time(text) + extra
        v = Beat(self, dur)
        self.caps.append([float(self.renderer.time), float(dur), text])
        yield v
        rest = v.start + dur - self.renderer.time
        if rest > 0.02:
            self.wait(rest)

    def say(self, text, hold=1.6):
        self.w_say(text)
        self.wait(hold)
        self.w_hush()

    def big_maths(self, tex, plain, y=1.9, size=46, rt=1.0, color=INK):
        """the derivation row: each step morphs from the last, so you can see which term went where"""
        eq = M(tex, plain, size, color).move_to([0.6, y, 0]).set_z_index(80)
        self.sfx("tick")
        if getattr(self, "deriv", None) is None:
            self.play(Write(eq), run_time=rt)
        else:
            self.play(TransformMatchingTex(self.deriv, eq) if HAS_TEX else FadeTransform(self.deriv, eq), run_time=rt)
        self.deriv = eq
        return eq


# ---------------------------------------------------------------- title card
class CTitle(CFilm):
    PARTS = ["p_title"]

    def p_title(self):
        self.add_sound(hit(0.16), time_offset=0.5)
        k = T("RESONANCE · PART 1", 30, ORANGEc, BOLD)
        t = T("Every peak has a shape", 76, INK, BOLD)
        card = VGroup(k, t).arrange(DOWN, buff=0.3).set_z_index(85)
        self.play(FadeIn(k, shift=UP * 0.2), Write(t), run_time=1.0)
        self.wait(1.4)
        self.play(FadeOut(card), run_time=0.5)


# ---------------------------------------------------------------- why the sand jumps, and where it ends up
OMV, AV = 2 * np.pi * 0.5, 0.32             # the picture's slow drive (one cycle every 2 s) and plate swing


def grain_path(gam, T_, fps=60):
    """a grain on a plate moving as AV cos(OMV t): it rides along until the plate falls away faster than g, flies, and lands"""
    gv = AV * OMV ** 2 / gam                                   # gravity in picture units, so that peak plate acceleration = gam g
    t = np.arange(int(T_ * fps) + 1) / fps; dt = 1 / fps
    yp = AV * np.cos(OMV * t); vp = -AV * OMV * np.sin(OMV * t); ap = -AV * OMV ** 2 * np.cos(OMV * t)
    y, v, on = yp[0], 0.0, True; out = []
    for i in range(len(t)):
        if on:
            y, v = yp[i], vp[i]
            if ap[i] < -gv:
                on = False
        else:
            v -= gv * dt; y += v * dt
            if y <= yp[i]:
                y, v, on = yp[i], vp[i], True
        out.append(y)
    return t, yp, np.array(out), ap / gv


class CJump(CFilm):
    PARTS = ["p_jump", "end_dip"]

    def p_jump(self):
        self.header("WHY THE SAND MOVES", "When the plate falls faster than g")
        self.deriv = None
        clock = ValueTracker(0.0)
        clock.add_updater(lambda m, dt: m.increment_value(dt)); self.add(clock)
        st = {"gam": 0.6, "t0": 0.0}
        paths = {g_: grain_path(g_, 12.0) for g_ in (0.6, 3.8)}
        PX, PY, PW = -3.9, 0.35, 2.6

        def now():
            t, yp, yg, a = paths[st["gam"]]
            i = min(len(t) - 1, int((clock.get_value() - st["t0"]) * 60))
            return i, yp[i], yg[i], a
        def rig():
            i, yp, yg, a = now()
            plate = Rectangle(width=PW, height=0.14, stroke_width=0, fill_color="#9aa2ab", fill_opacity=1).move_to([PX, PY + yp, 0])
            grain = Circle(radius=0.11, stroke_width=0, fill_color="#e9dcc0", fill_opacity=1).move_to([PX, PY + yg + 0.07 + 0.11, 0])
            gap = (yg - yp) > 0.01
            g = VGroup(plate, grain)
            if gap:
                g.add(Circle(radius=0.2, stroke_color=ORANGEc, stroke_width=4).move_to(grain))
            return g
        R = always_redraw(rig)
        ax = Axes(x_range=[0, 4, 1], y_range=[-4.2, 4.2, 1], x_length=6.0, y_length=3.4, tips=False,
                  axis_config={"stroke_color": AXc, "stroke_width": 2, "include_ticks": False}).move_to([3.1, -0.15, 0])
        gl = DashedLine(ax.c2p(0, -1), ax.c2p(4, -1), stroke_color=INK, stroke_width=3, dash_length=0.1)
        glab = M(r"-g", "-g", 34, INK).next_to(ax.c2p(0, -1), LEFT, buff=0.15)
        alab = M(r"a", "a", 34, MUTED).next_to(ax.c2p(0, 4.2), LEFT, buff=0.15)

        def trace():
            i, _, _, a = now()
            n = min(i + 1, 240); lo_ = max(0, i + 1 - 240)
            ts = np.arange(lo_, i + 1) / 60.0 - lo_ / 60.0
            if len(ts) < 2:
                return VMobject()
            seg = a[lo_:i + 1]
            g = VGroup(ax.plot_line_graph(ts, seg, add_vertex_dots=False, line_color=INK, stroke_width=3))
            below = seg < -1
            if below.any():
                pts = [ax.c2p(x, y) for x, y, b in zip(ts, seg, below) if b]
                g.add(VGroup(*[Dot(p_, radius=0.035, color=ORANGEc) for p_ in pts[::2]]))
            return g
        TRc = always_redraw(trace)
        with self.line("A grain sits on the shaking plate.", extra=0.8):
            st["t0"] = clock.get_value()
            self.sfx("pop")
            self.play(FadeIn(R), Create(ax), Create(gl), FadeIn(glab), FadeIn(alab), run_time=0.6)
            self.add(TRc)
        with self.line("The plate's acceleration, drawn as it moves.", extra=1.0):
            self.big_maths(r"a=\omega^2|W|", "a = w^2 |W|", y=2.4, size=50)
        with self.line("Gentle: it never falls away faster than g.", extra=0.8):
            pass
        with self.line("Harder: past g, the plate drops away.", extra=1.8):
            st.update(gam=3.8, t0=clock.get_value())
            self.sfx("pop")
            self.big_maths(r"\omega^2|W|>g\;\Rightarrow\;\text{the grain jumps}", "w^2 |W| > g  =>  the grain jumps", y=2.4, size=46)
        with self.line("At 967 Hz that takes a micrometre.", extra=1.0):
            self.big_maths(r"967\ \mathrm{Hz},\ |W|=1\,\mu\mathrm{m}\;\Rightarrow\;a\approx %.1f\,g" % TR["a_1um_967_g"],
                           "967 Hz, |W| = 1 um  =>  a = 3.8 g", y=2.4, size=46)
        # where the sand ends up: grains along a strip hop by how much the plate moves under them
        self.play(FadeOut(R), FadeOut(TRc), FadeOut(VGroup(ax, gl, glab, alab)), run_time=0.5)
        X0, X1, Y = -5.4, 5.6, -0.6
        Wx = lambda u: np.cos(2.5 * np.pi * u)                 # a plate line with two still points
        env = VGroup(poly(np.array([[X0 + (X1 - X0) * u, Y + 1.0 * abs(Wx(u)), 0] for u in np.linspace(0, 1, 300)]), MUTED, 2.5),
                     DashedLine([X0, Y, 0], [X1, Y, 0], stroke_color=AXc, stroke_width=2, dash_length=0.1))
        rng = np.random.default_rng(7)
        N_, steps = 70, 140
        U = np.empty((steps, N_)); u = rng.uniform(0, 1, N_)
        for k in range(steps):
            U[k] = u
            hop = 0.05 * np.maximum(np.abs(Wx(u)) - 0.08, 0)
            u = np.clip(u + hop * rng.standard_normal(N_), 0, 1)
        kk = ValueTracker(0.0)
        sand = always_redraw(lambda: VGroup(*[Dot([X0 + (X1 - X0) * U[min(steps - 1, int(kk.get_value())), j], Y, 0], radius=0.06, color="#e9dcc0")
                                              for j in range(N_)]))
        nodes = VGroup(*[Dot([X0 + (X1 - X0) * u_, Y, 0], radius=0.11, color=CYAN) for u_ in (0.2, 0.6, 1.0)])
        with self.line("Across the plate, the hop follows |W|.", extra=0.8):
            self.play(Create(env), FadeIn(sand), run_time=0.8)
            self.big_maths(r"\text{hop}\ \propto\ |W|", "hop ~ |W|", y=2.4, size=50)
        with self.line("Grains wander until they land where it's still.", extra=1.0) as b:
            self.swl(b.left(0.2), "draw", 0.04)
            self.play(kk.animate.set_value(steps - 1), run_time=b.left(0.2), rate_func=linear)
        with self.line("Sand ends up on the lines W = 0.", extra=0.8):
            self.big_maths(r"\text{sand ends where } W=0", "sand ends where W = 0", y=2.4, size=50)
            self.lag_snd(3, 0.6, 0.3)
            self.play(LaggedStart(*[GrowFromCenter(d) for d in nodes], lag_ratio=0.3), run_time=0.6)
            self.w_appear()
            self.w_say("Still spots collect the sand!")
            self.wait(0.3)
        self.w_hush()


# ---------------------------------------------------------------- why a fixed shape: two waves meet
LANE_X = (-4.1, 5.9)


def lane_wave(y0, fn, color, amp=0.55, width=4):
    xs = np.linspace(0, 1, 260)
    pts = [np.array([LANE_X[0] + (LANE_X[1] - LANE_X[0]) * x, y0 + amp * fn(x), 0]) for x in xs]
    return poly(np.array(pts), color, width, glow=True)


class CWave(CFilm):
    PARTS = ["p_wave", "end_dip"]
    K = 2 * PI * 2.5                         # 2.5 wavelengths across the lane

    def p_wave(self):
        self.header("WHY A FIXED SHAPE", "A wave that meets itself")
        tau = ValueTracker(0.0)
        k = self.K
        A = lambda x: np.sin(k * x - tau.get_value())
        B = lambda x: np.sin(k * x + tau.get_value())
        la = always_redraw(lambda: lane_wave(1.15, A, BLUEc))
        lb = always_redraw(lambda: lane_wave(-0.25, B, ORANGEc))
        with self.line("A bending wave runs across the plate.") as b:
            self.sfx("pop")
            self.play(FadeIn(la), run_time=0.4)
            self.big_maths(r"\sin(kx-\omega t)", "sin(kx - wt)", y=2.45, rt=0.8)
            self.play(tau.animate.set_value(2.2 * PI), run_time=b.left(), rate_func=linear)
        with self.line("It bounces off the edge, coming back.") as b:
            self.sfx("pop")
            self.play(FadeIn(lb), run_time=0.4)
            self.big_maths(r"\sin(kx-\omega t)", "sin(kx - wt) + sin(kx + wt)", y=2.45, rt=0.1)
            eq2 = M(r"\sin(kx-\omega t)+\sin(kx+\omega t)", "sin(kx - wt) + sin(kx + wt)", 46).move_to([0.6, 2.45, 0]).set_z_index(80)
            self.sfx("tick")
            self.play(TransformMatchingTex(self.deriv, eq2), run_time=0.8)
            self.deriv = eq2
            self.play(tau.animate.set_value(4.6 * PI), run_time=b.left(), rate_func=linear)
        S_ = lambda x: 0.5 * (A(x) + B(x))
        ls = always_redraw(lambda: lane_wave(-1.75, S_, INK, amp=0.55, width=5))
        nodes = VGroup(*[Dot([LANE_X[0] + (LANE_X[1] - LANE_X[0]) * (m * PI / k), -1.75, 0], radius=0.075, color=CYAN)
                         for m in range(0, 6) if m * PI / k <= 1.0 + 1e-9]).set_z_index(5)
        with self.line("Add the two: the travelling is gone.", extra=0.6) as b:
            ca, cb = la.copy().clear_updaters(), lb.copy().clear_updaters()
            self.add(ca, cb)
            self.sfx("pop")                      # construct: the soft click forwards
            self.play(ca.animate.shift(DOWN * 2.9).set_opacity(0.0), cb.animate.shift(DOWN * 1.5).set_opacity(0.0),
                      FadeIn(ls), run_time=1.0)
            self.remove(ca, cb)
            eq3 = M(r"\sin(kx-\omega t)+\sin(kx+\omega t)=2\sin(kx)\cos(\omega t)",
                    "sin(kx - wt) + sin(kx + wt) = 2 sin(kx) cos(wt)", 42).move_to([0.6, 2.45, 0]).set_z_index(80)
            self.sfx("tick")
            self.play(TransformMatchingTex(self.deriv, eq3), run_time=0.9)
            self.deriv = eq3
            self.play(tau.animate.set_value(7.0 * PI), run_time=b.left(), rate_func=linear)
        self.callback("HARMONICS", 1, "What the FFT actually shows")
        with self.line("A shape times a clock: sines and cosines.", extra=0.6) as b:
            eq4 = M(r"\underbrace{2\sin(kx)}_{\text{shape}}\;\underbrace{\cos(\omega t)}_{\text{clock}}",
                    "2 sin(kx) x cos(wt)", 50).move_to([0.6, 2.25, 0]).set_z_index(80)
            self.sfx("tick")
            self.play(FadeOut(self.deriv), FadeIn(eq4), run_time=0.7)
            self.deriv = eq4
            self.play(tau.animate.set_value(9.4 * PI), run_time=b.left(), rate_func=linear)
        with self.line("Where sin kx = 0, it never moves.", extra=1.4) as b:
            self.lag_snd(len(nodes), 0.8, 0.25)
            self.play(LaggedStart(*[GrowFromCenter(d) for d in nodes], lag_ratio=0.25), FadeOut(la), FadeOut(lb), run_time=0.8)
            self.callback_off()
            self.w_appear()
            self.play(tau.animate.set_value(11.0 * PI), run_time=max(0.3, b.left() - 2.0), rate_func=linear)
            self.w_say("A shape times a clock!")
            self.play(tau.animate.set_value(12.4 * PI), run_time=b.left(), rate_func=linear)
        self.w_hush()


# ---------------------------------------------------------------- why only some frequencies: the echoes have to line up
STRIP = (-3.6, 5.0, 0.55)                    # x0, x1, y of the strip (a cut through the plate, edges held)
R_ECHO, N_ECHO = 0.82, 8                     # each round trip loses a little; eight echoes drawn


def echo_sum(kap):
    """|sum of the echoes| for kap half-waves across the strip: a round trip shifts the phase by 2kL = 2 pi kap"""
    n = np.arange(N_ECHO)
    return abs(np.sum(R_ECHO ** n * np.exp(2j * np.pi * kap * n)))


class CFit(CFilm):
    PARTS = ["p_fit", "end_dip"]

    def p_fit(self):
        self.header("WHY ONLY SOME FREQUENCIES", "The echoes have to line up")
        self.deriv = None
        x0, x1, ys = STRIP
        kap = ValueTracker(2.37)
        smax = (1 - R_ECHO ** N_ECHO) / (1 - R_ECHO)
        xs = np.linspace(0, 1, 220)
        shown = ValueTracker(0.0)                                   # how many echoes are drawn (0..N)

        def strip_pts(f, amp):
            return np.array([[x0 + (x1 - x0) * u, ys + amp * f(u), 0] for u in xs])

        def echoes():
            g = VGroup()
            for n in range(N_ECHO):
                o = np.clip(shown.get_value() - n, 0, 1)
                if o <= 0:
                    continue
                f = lambda u, n=n: R_ECHO ** n * np.sin(np.pi * kap.get_value() * u + 2 * np.pi * kap.get_value() * n)
                g.add(poly(strip_pts(f, 0.42), ORANGEc, 2.2, opacity=0.55 * o, glow=False))
            return g

        def total():
            k_ = kap.get_value(); n = np.arange(min(N_ECHO, int(np.ceil(shown.get_value()))) or 1)
            f = lambda u: np.sum(R_ECHO ** n * np.sin(np.pi * k_ * u + 2 * np.pi * k_ * n)) / smax
            return poly(strip_pts(np.vectorize(f), 1.25), INK, 5, glow=True)
        clamps = VGroup(*[Line([x, ys - 0.75, 0], [x, ys + 0.75, 0], stroke_color=MUTED, stroke_width=8) for x in (x0, x1)])
        base = DashedLine([x0, ys, 0], [x1, ys, 0], stroke_color=AXc, stroke_width=2, dash_length=0.1)
        E, S = always_redraw(echoes), always_redraw(total)
        # the comb: how big the pile gets, for every wavelength
        ax = Axes(x_range=[0.5, 4.5, 1], y_range=[0, 1.05, 0.5], x_length=8.6, y_length=1.25, tips=False,
                  axis_config={"stroke_color": AXc, "stroke_width": 2, "include_ticks": False}).move_to([0.7, -1.72, 0])
        sweep = ValueTracker(0.5)
        comb = always_redraw(lambda: ax.plot(lambda k_: echo_sum(k_) / smax, x_range=[0.5, max(0.52, sweep.get_value()), 0.004],
                                             color=ORANGEc, stroke_width=3) if sweep.get_value() > 0.52 else VMobject())
        mlabs = VGroup(*[M(rf"m={m}", f"m={m}", 32, MUTED).next_to(ax.c2p(m, 0), DOWN, buff=0.12) for m in (1, 2, 3, 4)])
        with self.line("A wave bounces between two held edges.", extra=0.4) as b:
            self.play(Create(clamps), Create(base), run_time=0.6)
            self.add(E)
            self.sfx("pop")
            self.play(shown.animate.set_value(1.0), run_time=0.6)
            self.lag_snd(N_ECHO - 1, b.left(0.2), 0.0)
            self.play(shown.animate.set_value(N_ECHO), run_time=b.left(0.2), rate_func=linear)
        with self.line("Out of step, the echoes cancel.", extra=0.6):
            self.add(S)
            self.sfx("pop")
            self.play(FadeIn(S), run_time=0.6)
        with self.line("In step, every echo adds up.", extra=0.6):
            self.swl(1.4, "move", 0.05)
            self.play(kap.animate.set_value(3.0), run_time=1.4, rate_func=smooth)
            self.sfx("pop")
        with self.line("Sweep the wavelength: only fits grow.", extra=0.7) as b:
            self.play(Create(ax), kap.animate.set_value(0.5), run_time=0.5)
            self.add(comb)
            kap.add_updater(lambda m: m.set_value(sweep.get_value()))
            self.sfx("sweep")
            self.play(sweep.animate.set_value(4.5), run_time=b.left(0.6), rate_func=linear)
            kap.clear_updaters()
            self.lag_snd(4, 0.6, 0.25)
            self.play(LaggedStart(*[FadeIn(l_, shift=UP * 0.1) for l_ in mlabs], lag_ratio=0.25), run_time=0.6)
        with self.line("In step after one round trip:", extra=0.5):
            self.play(kap.animate.set_value(2.0), run_time=0.8, rate_func=smooth)
            self.big_maths(r"2kL=2\pi m", "2 k L = 2 pi m", y=2.35, size=50)
        with self.line("so only these wavenumbers fit.", extra=0.6):
            self.big_maths(r"k_m=\frac{m\pi}{L}", "k_m = m pi / L", y=2.35, size=54)
        # out with the strip; the plate equation turns each k into a frequency
        self.play(FadeOut(VGroup(E, S, clamps, base)), FadeOut(comb), FadeOut(ax), FadeOut(mlabs),
                  self.deriv.animate.move_to([-3.2, 2.35, 0]).scale(0.85), run_time=0.6)
        km = self.deriv
        self.deriv = None
        with self.line("The plate equation, for a wave:", extra=0.4):
            self.big_maths(r"D\nabla^4W=\rho h\,\omega^2W", "D grad^4 W = rho h w^2 W", y=0.9, size=50)
        with self.line("four bends bring back k to the fourth,", extra=0.4):
            self.big_maths(r"W=\sin kx\;\Rightarrow\;Dk^4=\rho h\,\omega^2", "W = sin kx  =>  D k^4 = rho h w^2", y=0.9, size=50)
        with self.line("so frequency grows with k squared.", extra=0.5):
            self.big_maths(r"\omega=k^2\sqrt{D/\rho h}", "w = k^2 sqrt(D / rho h)", y=0.9, size=56)
        # the ladder: m = 1, 2, 3, 4 ring at 1, 4, 9, 16 times the first
        lad = NumberLine(x_range=[0, 17, 1], length=9.0, include_ticks=False, stroke_color=AXc, stroke_width=2).move_to([0.9, -1.15, 0])
        rungs = VGroup()
        for m in (1, 2, 3, 4):
            p_ = lad.n2p(m * m)
            rungs.add(VGroup(Line(p_ + DOWN * 0.22, p_ + UP * 0.22, stroke_color=ORANGEc, stroke_width=6),
                             M(r"\omega_1" if m == 1 else rf"{m * m}\,\omega_1", f"{m * m} w1", 36, INK).next_to(p_, UP, buff=0.3)))
        with self.line("Each fit rings at its own frequency.", extra=0.6):
            self.play(Create(lad), run_time=0.4)
            self.big_maths(r"\omega_m=\Big(\frac{m\pi}{L}\Big)^2\sqrt{\frac{D}{\rho h}}", "w_m = (m pi / L)^2 sqrt(D / rho h)", y=0.75, size=48)
            self.play(FadeOut(km), run_time=0.3)
            self.lag_snd(4, 1.2, 0.3)
            self.play(LaggedStart(*[GrowFromCenter(r_) for r_ in rungs], lag_ratio=0.3), run_time=1.2)
        with self.line("Not evenly spaced: the gaps keep growing.", extra=0.6):
            self.w_appear()
            self.w_say("Fit, or fade away!")
            self.wait(0.4)
        self.w_hush()
        self.play(FadeOut(VGroup(lad, rungs, self.deriv)), run_time=0.4)
        self.deriv = None


# ---------------------------------------------------------------- why a peak: pushing a mode in time
ZV, WNV = 0.08, 2 * np.pi * 0.75             # the picture's damping and natural rate (slow enough to watch; the plate's own zeta is in truth.json)
X_of = lambda r: 1 / np.sqrt((1 - r * r) ** 2 + (2 * ZV * r) ** 2)   # steady amplitude over the static deflection


class CPeak(CFilm):
    PARTS = ["p_peak", "end_dip"]

    def p_peak(self):
        self.header("WHY A PEAK", "Pushing a mode in time")
        self.deriv = None
        clock = ValueTracker(0.0)
        clock.add_updater(lambda m, dt: m.increment_value(dt)); self.add(clock)
        st = {"r": 0.0, "t0": 0.0, "grow": False, "pluck": True}
        WALL, REST, SC, YM = -6.2, -3.0, 0.2, 0.75

        def q_now():
            t = clock.get_value() - st["t0"]
            if st["pluck"]:                                   # let go: it rings at its own rate and dies away
                return 1.6 * np.exp(-ZV * WNV * t) * np.cos(WNV * t), 0.0
            r = st["r"]; w = r * WNV; ph = np.arctan2(2 * ZV * r, 1 - r * r)
            env = 1 - np.exp(-ZV * WNV * t) if st["grow"] else 1.0
            return X_of(r) * env * np.sin(w * t - ph), np.sin(w * t)

        def rig():
            qv, fv = q_now()
            xm = REST + SC * qv
            wall = VGroup(Line([WALL, YM - 0.9, 0], [WALL, YM + 0.9, 0], stroke_color=MUTED, stroke_width=8),
                          *[Line([WALL, YM - 0.8 + 0.2 * i, 0], [WALL - 0.18, YM - 0.95 + 0.2 * i, 0], stroke_color=MUTED, stroke_width=3) for i in range(9)])
            left = xm - 0.45
            zz = [[WALL, YM + 0.38, 0]] + [[WALL + 0.25 + (left - WALL - 0.5) * i / 12, YM + 0.38 + (0.17 if i % 2 else -0.17), 0] for i in range(1, 12)] + [[left, YM + 0.38, 0]]
            spring = VMobject(stroke_color=INK, stroke_width=4).set_points_as_corners(zz)
            pot = VGroup(Line([WALL, YM - 0.38, 0], [WALL + 0.6, YM - 0.38, 0], stroke_color=INK, stroke_width=4),
                         Rectangle(width=0.7, height=0.42, stroke_color=INK, stroke_width=4).move_to([WALL + 0.95, YM - 0.38, 0]),
                         Line([WALL + 0.95, YM - 0.38, 0], [left, YM - 0.38, 0], stroke_color=INK, stroke_width=4),
                         Line([WALL + 0.95, YM - 0.56, 0], [WALL + 0.95, YM - 0.2, 0], stroke_color=INK, stroke_width=6))
            mass = VGroup(Square(0.9, stroke_color=SENS, stroke_width=4, fill_color=SENS, fill_opacity=0.25).move_to([xm, YM, 0]),
                          M(r"m", "m", 40, INK).move_to([xm, YM, 0]))
            g = VGroup(wall, spring, pot, mass)
            if not st["pluck"] and st["r"] > 0:
                g.add(Arrow([xm + 0.45, YM, 0], [xm + 0.45 + 0.85 * fv + (1e-3 if fv >= 0 else -1e-3), YM, 0], buff=0, color=ORANGEc,
                            stroke_width=7, max_tip_length_to_length_ratio=0.35) if abs(fv) > 0.08 else VMobject())
            return g
        R = always_redraw(rig)
        ax = Axes(x_range=[0, 2, 0.5], y_range=[0, 7, 1], x_length=5.4, y_length=3.3, tips=False,
                  axis_config={"stroke_color": AXc, "stroke_width": 2, "include_ticks": False}).move_to([3.55, -0.7, 0])
        xl = VGroup(M(r"\omega_n", "wn", 34, INK).next_to(ax.c2p(1, 0), DOWN, buff=0.15),
                    M(r"\omega", "w", 34, MUTED).next_to(ax.c2p(2, 0), DOWN, buff=0.15),
                    M(r"|Q|", "|Q|", 34, MUTED).next_to(ax.c2p(0, 7), LEFT, buff=0.15))
        dots = VGroup()

        def drive(r, grow=False):
            st.update(r=r, t0=clock.get_value(), grow=grow, pluck=False)
        with self.line("Each mode acts like a spring and mass.", extra=0.8) as b:
            st["t0"] = clock.get_value()
            self.sfx("pop")
            self.play(FadeIn(R), run_time=0.4)
            self.wait(b.left())
        with self.line("Push it slowly: it just follows.", extra=1.1) as b:
            self.play(Create(ax), FadeIn(xl), run_time=0.5)
            drive(0.45)
            self.wait(b.left(1.0))
            d = Dot(ax.c2p(0.45, X_of(0.45)), radius=0.09, color=ORANGEc); dots.add(d)
            self.sfx("tick"); self.play(GrowFromCenter(d), run_time=0.4)
            self.wait(b.left())
        with self.line("Push too fast: it can't keep up.", extra=1.1) as b:
            drive(1.7)
            self.wait(b.left(1.0))
            d = Dot(ax.c2p(1.7, X_of(1.7)), radius=0.09, color=ORANGEc); dots.add(d)
            self.sfx("tick"); self.play(GrowFromCenter(d), run_time=0.4)
            self.wait(b.left())
        grow_dot = always_redraw(lambda: Dot(ax.c2p(1.0, max(0.02, X_of(1.0) * (1 - np.exp(-ZV * WNV * (clock.get_value() - st["t0"]))))),
                                             radius=0.11, color=ORANGEc))
        with self.line("Push in time: every push adds energy.", extra=2.2) as b:
            drive(1.0, grow=True)
            self.add(grow_dot)
            self.swl(b.left(), "rise", 0.05)
            self.wait(b.left())
        with self.line("Damping takes back what each push adds.", extra=0.6) as b:
            self.wait(b.left())
        sw = ValueTracker(0.02)
        curve = always_redraw(lambda: ax.plot(X_of, x_range=[0.02, max(0.03, sw.get_value()), 0.005], color=ORANGEc, stroke_width=4))
        with self.line("Every push rate: the peak draws itself.", extra=0.8) as b:
            self.add(curve)
            self.sfx("sweep")
            self.play(sw.animate.set_value(2.0), run_time=b.left(0.3), rate_func=linear)
        with self.line("The same, in one line of maths:", extra=0.4):
            self.big_maths(r"\ddot q+2\zeta\omega_n\dot q+\omega_n^2 q=f\cos\omega t", "q'' + 2 z wn q' + wn^2 q = f cos wt", y=2.35, size=46)
        with self.line("try q swinging at the push rate:", extra=0.6):
            self.big_maths(r"|Q|=\frac{f}{\sqrt{(\omega_n^2-\omega^2)^2+(2\zeta\omega_n\omega)^2}}",
                           "|Q| = f / sqrt((wn^2 - w^2)^2 + (2 z wn w)^2)", y=2.25, size=44)
        with self.line("In time, only damping holds it back.", extra=0.6):
            self.big_maths(r"\omega=\omega_n:\quad|Q|=\frac{1}{2\zeta}\,\frac{f}{\omega_n^2}", "w = wn:  |Q| = (1 / 2z) f / wn^2", y=2.25, size=46)
        with self.line("Our plate: \u03b6 = 0.005, a hundredfold peak.", extra=0.8):
            self.big_maths(r"\zeta=0.005\;\Rightarrow\;\frac{1}{2\zeta}=100", "z = 0.005  =>  1 / 2z = 100", y=2.25, size=50)
            self.w_appear()
            self.w_say("In time, it grows!")
            self.wait(0.4)
        self.w_hush()


# ---------------------------------------------------------------- why a sensor can miss a mode
LAB8 = json.loads((lambda t: t[t.index("{"):t.rindex("}") + 1])(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.js"))   # the Lab lesson's data.js, beside this file.read()))
SENS_MODES = [(1, "#83C167"), (2, "#FFD166"), (3, "#C77DFF"), (4, SENS)]    # 196, 375, 608, 967 Hz along the axis


def mode_line(i):
    w = np.array(LAB8["sensor"][i]["w"]); return lambda u: float(np.interp(u, np.linspace(0, 1, len(w)), w))


def sensor_db(u, f):
    """dB at a point u (0 = centre, 1 = edge) along the axis: the modal sum, every mode weighted by its shape there"""
    w = 2 * np.pi * f; z = 0.0
    for md in LAB8["sensor"]:
        wn = 2 * np.pi * md["Om"] * LAB8["scale"]
        z = z + md["G"] * float(np.interp(u, np.linspace(0, 1, len(md["w"])), md["w"])) * w * w / (wn * wn - w * w + 2j * 0.005 * wn * w)
    return 20 * np.log10(np.abs(z) + 1e-12)


class CSensor(CFilm):
    PARTS = ["p_sensor", "end_dip"]

    def p_sensor(self):
        self.header("WHY A SENSOR CAN MISS ONE", "Every mode, times its shape there")
        self.deriv = None
        L0, L1, AMP = -5.1, -1.0, 0.3
        ys = [1.8, 1.05, 0.3, -0.45]
        us = ValueTracker(TR.get("u_anti", 0.275))
        lanes = VGroup()
        for (i, col), y in zip(SENS_MODES, ys):
            f_ = mode_line(i); pk = max(abs(f_(u)) for u in np.linspace(0, 1, 101))
            pts = np.array([[L0 + (L1 - L0) * u, y + AMP * f_(u) / pk, 0] for u in np.linspace(0, 1, 160)])
            lanes.add(VGroup(DashedLine([L0, y, 0], [L1, y, 0], stroke_color=AXc, stroke_width=1.5, dash_length=0.08), poly(pts, col, 4)))
        hz = VGroup(*[T(f"{LAB8['sensor'][i]['Om'] * LAB8['scale']:.0f} Hz", 22, col, BOLD).next_to([L0, y, 0], LEFT, buff=0.15)
                      for (i, col), y in zip(SENS_MODES, ys)])
        norm = {i: max(abs(mode_line(i)(u)) for u in np.linspace(0, 1, 101)) for i, _ in SENS_MODES}

        def probe():
            u = us.get_value(); x = L0 + (L1 - L0) * u
            g = VGroup(Line([x, ys[0] + 0.45, 0], [x, ys[-1] - 0.45, 0], stroke_color=ORANGEc, stroke_width=4))
            for (i, col), y in zip(SENS_MODES, ys):
                v = mode_line(i)(u) / norm[i]
                g.add(Dot([x, y + AMP * v, 0], radius=0.08, color=col))
                g.add(Rectangle(width=max(0.004, 1.1 * abs(v)), height=0.26, stroke_width=0, fill_color=col, fill_opacity=0.9)
                      .move_to([-0.55 + 0.55 * abs(v), y, 0]))
            return g
        P = always_redraw(probe)
        ax = Axes(x_range=[100, 1300, 300], y_range=[-40, 0, 10], x_length=4.0, y_length=2.9, tips=False,
                  axis_config={"stroke_color": AXc, "stroke_width": 2, "include_ticks": False}).move_to([4.55, 0.55, 0])
        fs = np.r_[np.linspace(100, 1300, 900), [196.0, 374.8, 608.2, 967.1]]; fs.sort()
        ref = max(sensor_db(0.275, f) for f in fs)
        built = ValueTracker(0.0)

        def spec():
            if built.get_value() <= 0:
                return VMobject()
            db = np.clip([sensor_db(us.get_value(), f) - ref for f in fs], -40, 0)
            k = max(2, int(len(fs) * min(1, built.get_value())))
            return ax.plot_line_graph(fs[:k], db[:k], add_vertex_dots=False, line_color=INK, stroke_width=3)
        S = always_redraw(spec)
        ft = VGroup(*[T(f"{v:,}", 18, MUTED, BOLD).move_to(ax.c2p(v, -40) + DOWN * 0.26) for v in (400, 700)],
                    T("1,300 Hz", 18, MUTED, BOLD).move_to(ax.c2p(1300, -40) + DOWN * 0.26).align_to(ax.c2p(1300, -40), RIGHT))
        with self.line("The plate's motion: a sum of modes.", extra=0.6):
            self.lag_snd(4, 1.2, 0.3)
            self.play(LaggedStart(*[Create(l_) for l_ in lanes], lag_ratio=0.3), FadeIn(hz), run_time=1.2)
            self.big_maths(r"w(x,t)=\sum_n W_n(x)\,q_n(t)", "w(x,t) = sum Wn(x) qn(t)", y=2.4, size=46)
        with self.line("A sensor reads each mode times W(x).", extra=0.8):
            self.sfx("pop")
            self.play(FadeIn(P), run_time=0.6)
        with self.line("Each bar sets the height of one peak.", extra=0.9) as b:
            self.play(Create(ax), FadeIn(ft), run_time=0.5)
            self.add(S)
            self.swl(b.left(0.3), "draw", 0.04)
            self.play(built.animate.set_value(1.0), run_time=b.left(0.3), rate_func=linear)
        with self.line("Now slide the sensor onto 967's nodal line.", extra=1.6) as b:
            self.swl(2.4, "move", 0.05)
            self.play(us.animate.set_value(TR.get("u_node", 0.525)), run_time=2.4, rate_func=smooth)
            self.wait(b.left())
        with self.line("Its bar drops to zero: no peak.", extra=0.8):
            self.big_maths(r"W_{967}(x)=0\;\Rightarrow\;\text{no peak at }967\ \mathrm{Hz}", "W967(x) = 0  =>  no 967 Hz peak", y=2.4, size=44)
            self.w_appear()
            self.w_say("Wrong spot, missing peak!")
            self.wait(0.3)
        self.w_hush()


# ---------------------------------------------------------------- why a brace can do nothing
class CBrace(CFilm):
    PARTS = ["p_brace", "end_dip"]

    def p_brace(self):
        self.header("WHY A BRACE CAN DO NOTHING", "Pin one point: who notices?")
        self.deriv = None
        X0, X1 = -2.4, 5.8
        clock = ValueTracker(0.0)
        clock.add_updater(lambda m, dt: m.increment_value(dt)); self.add(clock)
        mix = ValueTracker(0.0)                               # mode 1 -> the shape it has to take once pinned
        rows = [(1.0, ORANGEc, 1), (-1.25, SENS, 2)]
        W1 = lambda u: (1 - mix.get_value()) * np.sin(np.pi * u) + mix.get_value() * abs(np.sin(2 * np.pi * u))
        W2 = lambda u: np.sin(2 * np.pi * u)
        rate = {1: lambda: 0.35 * (1 + 3 * mix.get_value()), 2: lambda: 1.4}     # omega_1 -> 4 omega_1 when pinned (visual rates)

        def strip(y, col, k):
            def draw():
                W = W1 if k == 1 else W2
                c = np.cos(2 * np.pi * rate[k]() * clock.get_value())
                pts = np.array([[X0 + (X1 - X0) * u, y + 0.75 * W(u) * c, 0] for u in np.linspace(0, 1, 200)])
                return VGroup(DashedLine([X0, y, 0], [X1, y, 0], stroke_color=AXc, stroke_width=1.5, dash_length=0.08), poly(pts, col, 5),
                              *[Line([x, y - 0.5, 0], [x, y + 0.5, 0], stroke_color=MUTED, stroke_width=8) for x in (X0, X1)])
            return always_redraw(draw)
        A, B = strip(1.0, ORANGEc, 1), strip(-1.25, SENS, 2)
        lab1 = always_redraw(lambda: M(r"\omega_1" if mix.get_value() < 0.5 else r"4\,\omega_1", "w", 40,
                                      INK if mix.get_value() < 0.5 else ORANGEc).move_to([X0 - 0.9, 1.0, 0]))
        lab2 = M(r"4\,\omega_1", "4 w1", 40, INK).move_to([X0 - 0.9, -1.25, 0])
        pins = VGroup(*[Triangle(fill_color=ORANGEc, fill_opacity=1, stroke_width=0).scale(0.2).rotate(PI).move_to([(X0 + X1) / 2, y - 0.2, 0])
                        for y in (1.0, -1.25)])
        with self.line("A strip held at both ends.", extra=0.6):
            self.lag_snd(2, 0.8, 0.4)
            self.play(FadeIn(A), FadeIn(B), FadeIn(lab1), FadeIn(lab2), run_time=0.8)
        with self.line("Pin the middle, where mode 2 never moves.", extra=0.8):
            self.sfx("pop")
            self.play(LaggedStart(*[GrowFromCenter(p_) for p_ in pins], lag_ratio=0.3), run_time=0.7)
            ok = Circle(radius=0.32, stroke_color=SENS, stroke_width=5).move_to([(X0 + X1) / 2, -1.25, 0])
            self.play(Create(ok), run_time=0.6)
        with self.line("Mode 2 doesn't notice: same shape, same pitch.", extra=0.9):
            self.big_maths(r"W_n(x_b)=0\;\Rightarrow\;\omega_n\ \text{unchanged}", "Wn(xb) = 0  =>  wn unchanged", y=2.4, size=44)
        with self.line("Mode 1 moved there. It has to change.", extra=1.2) as b:
            self.sfx("pop")
            self.swl(2.0, "move", 0.05)
            self.play(mix.animate.set_value(1.0), run_time=2.0, rate_func=smooth)
            self.wait(b.left())
        with self.line("New shape, new frequency: four times higher.", extra=0.9):
            self.big_maths(r"W_n(x_b)\neq0\;\Rightarrow\;\omega_n\ \text{moves}", "Wn(xb) != 0  =>  wn moves", y=2.4, size=44)
        with self.line("So brace where the trouble mode moves.", extra=0.8):
            self.w_appear()
            self.w_say("Brace the bulge, not the line!")
            self.wait(0.3)
        self.w_hush()


# ---------------------------------------------------------------- why higher is busier
class CLambda(CFilm):
    PARTS = ["p_lambda", "end_dip"]

    def p_lambda(self):
        self.header("WHY HIGHER IS BUSIER", "The wavelength shrinks")
        self.deriv = None
        with self.line("Write k as 2π over λ...", extra=0.2):
            self.big_maths(r"\omega=k^2\sqrt{D/\rho h},\quad k=\frac{2\pi}{\lambda}", "w = k^2 sqrt(D / rho h),  k = 2 pi / lambda", y=2.2, size=46)
        with self.line("...and the wavelength shrinks as f rises.", extra=0.4):
            self.big_maths(r"\lambda=2\pi\left(\frac{D}{\rho h\,\omega^2}\right)^{1/4}\propto\frac{1}{\sqrt{f}}",
                           "lambda = 2 pi (D / rho h w^2)^(1/4) ~ 1/sqrt(f)", y=2.2, size=46)
        side = 3.0                                                   # 240 mm plate drawn 3.0 units wide
        u = side / 240.0
        grp = Group()
        for fq, lam in ((TR["f"][4], TR["lam967"]), (TR["f"][12], TR["lam3447"])):
            im = ImageMobject(PNG(fq)); im.set_height(side)
            bar_w = lam * 1000 * u
            bar = VGroup(Line(LEFT * bar_w / 2, RIGHT * bar_w / 2, stroke_color=ORANGEc, stroke_width=6),
                         *[Line(UP * 0.12, DOWN * 0.12, stroke_color=ORANGEc, stroke_width=6).shift(s * RIGHT * bar_w / 2) for s in (-1, 1)])
            bar.next_to(im, DOWN, buff=0.22)
            lab = T(f"λ = {lam * 1000:.0f} mm", 24, ORANGEc, BOLD).next_to(bar, DOWN, buff=0.1)
            hz = T(f"{fq:,.0f} Hz", 26, INK, BOLD).next_to(im, UP, buff=0.12)
            grp.add(Group(hz, im, bar, lab))
        grp.arrange(RIGHT, buff=1.4).move_to([1.0, -0.75, 0])
        with self.line(f"{TR['lam967'] * 1000:.0f} mm at 967 Hz, {TR['lam3447'] * 1000:.0f} at {TR['f'][12]:,.0f}.", extra=0.8):
            self.lag_snd(2, 1.0, 0.4)
            self.play(LaggedStart(*[FadeIn(g, shift=UP * 0.2) for g in grp], lag_ratio=0.4), run_time=1.0)
        with self.line("Higher frequency, shorter waves, more lines.", extra=0.3):
            self.w_appear()
            self.w_say("Higher pitch, finer pattern!")
            self.wait(0.4)
        self.w_hush()


# ---------------------------------------------------------------- close
class CClose(CFilm):
    PARTS = ["p_close"]

    def p_close(self):
        self.w_appear()
        self.w_feel("happy", "pop")
        with self.line("Every peak in a spectrum is a shape.", extra=0.6):
            self.w_say("Every peak has a shape!")
        self.w_hush()
        self.add_sound(hit(0.14), time_offset=0.3)
        a = T("See you in the Lab!", 64, INK, BOLD)
        b = T("nodallab.dev · Lab lesson 8: plate modes, derived", 28, MUTED, BOLD)
        c = T("Next: what damping does to a peak", 28, ORANGEc, BOLD)
        card = VGroup(a, b, c).arrange(DOWN, buff=0.32).move_to([0.6, 0.3, 0]).set_z_index(85)
        self.play(FadeIn(a, shift=UP * 0.2), run_time=0.7)
        self.play(FadeIn(b), FadeIn(c), run_time=0.6)
        self.wait(2.2)
        self.end_dip(0.7)


# ================================================================ overlays (render with -t: transparent)
class OScene(Scene):
    """a transparent overlay for a plate shot: maths and spectra, with its own effects track"""
    DUR = 10.0

    def construct(self):
        self._sfx = []
        self.snd = {"tick": soft_click("tick", 0.03, 3000, 700, 0.005, 0.10), "pop": soft_click("pop", 0.05, 1800, 300, 0.009, 0.16)}
        self.t0 = 0.0
        self.body()
        rest = self.DUR - self.renderer.time
        if rest > 0.01:
            self.wait(rest)
        if self._sfx:
            Scene.add_sound(self, mix_down(self._sfx, self.renderer.time, f"mix_{type(self).__name__}.wav"), time_offset=-self.renderer.time)

    def sfx(self, name, at=None):
        self._sfx.append((self.renderer.time if at is None else at, self.snd[name]))

    def until(self, t):
        if t - self.renderer.time > 0.01:
            self.wait(t - self.renderer.time)

    def panel(self, mob, buff=0.2):
        return BackgroundRectangle(mob, color="#05070a", fill_opacity=0.82, buff=buff, corner_radius=0.12)

    def eq(self, tex, plain, size, at, color=INK, aligned=None):
        e = M(tex, plain, size, color)
        e.move_to(at, aligned_edge=aligned) if aligned is not None else e.move_to(at)
        return e


PIC_TOP = FH / 2 - BAR_H - 0.25              # just under the top bar


class O2(OScene):
    """over the slow-motion sand: why a grain jumps, with a gauge: the plate's acceleration against g"""
    DUR = 10.0

    def body(self):
        x0 = -FW / 2 + 0.6
        steps = [(0.4, r"a=\omega^2\,|W|", "a = w^2 |W|"), (3.3, r"a>g\;\Rightarrow\;\text{the grain jumps}", "a > g  =>  the grain jumps"),
                 (6.3, r"967\ \mathrm{Hz},\ |W|=1\,\mu\mathrm{m}\;\Rightarrow\;a\approx %.1f\,g" % TR["a_1um_967_g"], "967 Hz, |W| = 1 um  =>  a = 3.8 g")]
        y = PIC_TOP - 0.35
        shown = []
        # the gauge: 0..4 g, bottom-left, under the formulas
        G0, GH, GX = -2.7, 2.85, x0 + 0.85
        gy = lambda a: G0 + GH * a / 4.0
        frame = RoundedRectangle(corner_radius=0.06, width=0.56, height=GH + 0.08, stroke_color=AXc, stroke_width=2).move_to([GX, G0 + GH / 2, 0])
        gline = DashedLine([GX - 0.5, gy(1), 0], [GX + 0.5, gy(1), 0], stroke_color=INK, stroke_width=3, dash_length=0.08)
        glab = M(r"g", "g", 38, INK).next_to(gline, LEFT, buff=0.12)
        acc = ValueTracker(0.0)
        fill = always_redraw(lambda: VGroup(
            Rectangle(width=0.46, height=max(1e-3, GH * min(acc.get_value(), 1) / 4), stroke_width=0, fill_color=SENS, fill_opacity=0.9)
            .move_to([GX, G0 + GH * min(acc.get_value(), 1) / 8, 0]),
            Rectangle(width=0.46, height=max(1e-3, GH * max(acc.get_value() - 1, 0) / 4), stroke_width=0, fill_color=ORANGEc, fill_opacity=0.95)
            .move_to([GX, gy(1) + GH * max(acc.get_value() - 1, 0) / 8, 0]).set_opacity(0.95 if acc.get_value() > 1.001 else 0)))
        val = always_redraw(lambda: T(f"{acc.get_value():.1f} g", 36, ORANGEc if acc.get_value() > 1.001 else SENS, BOLD)
                            .move_to([GX + 1.15, gy(min(acc.get_value(), 3.9)) + (0.3 if acc.get_value() < 1.3 else 0), 0]))
        back = self.panel(VGroup(frame, gline, glab, T("3.8 g", 36, INK, BOLD).move_to([GX + 1.15, gy(3.8), 0])), buff=0.25)
        for k, (t0, tex, plain) in enumerate(steps):
            self.until(t0)
            e = self.eq(tex, plain, 40, [x0, y, 0], aligned=LEFT)
            p = self.panel(e)
            self.sfx("tick")
            anims = [FadeIn(p), Write(e)]
            if k == 1:                                        # the gauge arrives with "a > g": the plate's acceleration rises to g
                anims += [FadeIn(back), Create(frame), Create(gline), FadeIn(glab)]
            self.play(*anims, run_time=0.8)
            if k == 1:
                self.add(fill, val)
                self.play(acc.animate.set_value(1.0), run_time=1.0, rate_func=lambda u: 1 - np.exp(-7.43 * u) * (1 + 7.43 * u))
            if k == 2:                                        # past g: the grain leaves the plate
                self.sfx("pop", at=self.renderer.time + 0.35)
                self.play(acc.animate.set_value(TR["a_1um_967_g"]), run_time=1.1, rate_func=lambda u: 1 - np.exp(-7.43 * u) * (1 + 7.43 * u))
                ring = Circle(radius=0.3, stroke_color=ORANGEc, stroke_width=6).move_to([GX, gy(TR["a_1um_967_g"]), 0])
                self.play(ring.animate.scale(2.4).set_stroke(opacity=0), run_time=0.7)
                self.remove(ring)
            shown.append(VGroup(p, e))
            y -= 0.85
        self.until(self.DUR - 0.5)
        self.play(*[FadeOut(s_) for s_ in shown], FadeOut(VGroup(back, frame, gline, glab)), FadeOut(fill), FadeOut(val), run_time=0.4)


class O3(OScene):
    """over the reveal: the shape and the clock; the lines that never move"""
    DUR = 16.0

    def body(self):
        at = [-FW / 2 + 0.6, PIC_TOP - 0.55, 0]
        self.until(3.4)
        e = self.eq(r"w(x,y,t)=\underbrace{W(x,y)}_{\text{shape}}\;\underbrace{\cos\omega t}_{\text{clock}}",
                    "w(x,y,t) = W(x,y) cos(wt)", 46, at, aligned=LEFT)
        p = self.panel(e)
        self.sfx("tick")
        self.play(FadeIn(p), Write(e), run_time=1.0)
        self.until(8.0)
        e2 = self.eq(r"W(x,y)=0", "W(x,y) = 0", 50, [-FW / 2 + 0.6, e.get_bottom()[1] - 0.75, 0], color=CYAN, aligned=LEFT)
        p2 = self.panel(e2)
        self.sfx("tick")
        self.play(FadeIn(p2), Write(e2), run_time=0.8)
        self.until(self.DUR - 0.6)
        self.play(FadeOut(VGroup(p, e, p2, e2)), run_time=0.5)


def hz_tick(ax, lo, size, dy):
    """the last tick carries the unit: "1,500 Hz", with the number centred on its tick (no label at the frame edge)"""
    lab, num = T("1,500 Hz", size, MUTED, BOLD), T("1,500", size, MUTED, BOLD)
    return lab.move_to(ax.c2p(1500, lo) + DOWN * dy).shift(RIGHT * (lab.width - num.width) / 2)


SWEEP_T = [0.6, 4.9, 9.2, 13.5, 17.8, 22.1]          # when each pattern's drive starts (shots_sim.py s5)


class O5(OScene):
    """beside the top-down plate: the response spectrum, drawn as the drive sweeps; a marker on each peak"""
    DUR = 26.4

    def body(self):
        d = np.load(os.path.join(HERE, "frf_sweep.npz"))
        f, Hs = d["f"], d["H"]
        db = 20 * np.log10(Hs / Hs.max() + 1e-9)
        lo = -34.0
        ax = Axes(x_range=[100, 2000, 500], y_range=[lo, 0, 10], x_length=6.4, y_length=3.1, tips=False,
                  axis_config={"stroke_color": AXc, "stroke_width": 2, "include_ticks": False}).move_to([3.45, -0.85, 0])
        ticks = VGroup(*[T(f"{v:,}", 18, MUTED, BOLD).move_to(ax.c2p(v, lo) + DOWN * 0.28) for v in (500, 1000)], hz_tick(ax, lo, 18, 0.28))
        head = self.eq(r"|H(\omega)|\ \propto\ \sum_n \frac{\dots}{\omega_n^2-\omega^2}", "|H| ~ sum 1 / (wn^2 - w^2)", 38,
                       [3.35, PIC_TOP - 0.45, 0])
        hp = self.panel(head)
        fmark = ValueTracker(100.0)
        curve = always_redraw(lambda: ax.plot_line_graph(f[f <= fmark.get_value()], np.clip(db[f <= fmark.get_value()], lo, 0),
                                                         add_vertex_dots=False, line_color=INK, stroke_width=3)
                              if fmark.get_value() > 101 else VMobject())
        mk = always_redraw(lambda: VGroup(Line(ax.c2p(fmark.get_value(), lo), ax.c2p(fmark.get_value(), 0), stroke_color=ORANGEc, stroke_width=3),
                                          Dot(ax.c2p(fmark.get_value(), float(np.clip(np.interp(fmark.get_value(), f, db), lo, 0))), radius=0.08, color=ORANGEc)))
        num = always_redraw(lambda: T(f"{int(round(fmark.get_value())):,} Hz", 34, ORANGEc, BOLD).move_to(
            ax.c2p(float(np.clip(fmark.get_value(), 420, 1680)), 0) + UP * 0.42))
        self.play(FadeIn(hp), Write(head), Create(ax), FadeIn(ticks), run_time=0.6)
        self.add(curve, mk, num)
        fs = TR["sweep_f"]
        pins = VGroup()

        def plate_outline(t):                                 # the plate's edge on screen at shot time t
            c = PJ.project("s5", t, [PJ.plate_pt(x, z, 0, 0.004) for x, z in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
            ctr = c.mean(0); c = ctr + (c - ctr) * 1.025
            return Polygon(*[[x, y, 0] for x, y in c], stroke_color=ORANGEc, stroke_width=7, fill_opacity=0).round_corners(0.05)
        for i, t0 in enumerate(SWEEP_T):
            self.until(max(self.renderer.time, t0 - 0.45))
            self.sfx("tick")
            self.play(fmark.animate.set_value(fs[i]), run_time=0.75, rate_func=smooth)
            # the lock: a pulse on the peak, a pin left behind, the plate's edge flashes as its pattern forms
            pk = ax.c2p(fs[i], float(np.clip(np.interp(fs[i], f, db), lo, 0)))
            ring = Circle(radius=0.1, stroke_color=ORANGEc, stroke_width=6).move_to(pk)
            pin = Dot(pk, radius=0.075, color=ORANGEc)
            edge = plate_outline(self.renderer.time)
            self.add(edge.set_stroke(opacity=0.0))
            self.play(ring.animate.scale(5).set_stroke(opacity=0), FadeIn(pin, scale=1.6),
                      UpdateFromAlphaFunc(edge, lambda m, u: m.set_stroke(opacity=0.9 * np.sin(np.pi * min(u * 1.6, 1)) ** 2)),
                      run_time=0.9)
            self.remove(ring, edge); pins.add(pin)
        # the aha: every peak at once
        self.play(*[Indicate(p_, scale_factor=1.9, color=ORANGEc) for p_ in pins], run_time=1.2)
        self.until(SWEEP_T[-1] + 2.4)
        self.play(fmark.animate.set_value(2000), run_time=0.8, rate_func=smooth)
        self.until(self.DUR - 0.5)
        self.play(FadeOut(VGroup(hp, head, ax, ticks, pins)), FadeOut(curve), FadeOut(mk), FadeOut(num), run_time=0.4)


class O7(OScene):
    """beside the plate with two sensors: what each one reads"""
    DUR = 20.0

    def body(self):
        d = np.load(os.path.join(HERE, "frf.npz"))
        f = d["f"]
        top = max(d["anti"].max(), d["node"].max())
        lo = -40.0
        boards = []
        for i, (key, col) in enumerate((("anti", ORANGEc), ("node", SENS))):
            ax = Axes(x_range=[100, 2000, 500], y_range=[lo, 0, 10], x_length=5.6, y_length=1.75, tips=False,
                      axis_config={"stroke_color": AXc, "stroke_width": 2, "include_ticks": False}).move_to([3.75, 0.85 - 2.35 * i, 0])
            db = np.clip(20 * np.log10(d[key] / top + 1e-9), lo, 0)
            g = ax.plot_line_graph(f, db, add_vertex_dots=False, line_color=col, stroke_width=3)
            dot = Dot(radius=0.11, color=col).move_to(ax.c2p(160, -6))
            boards.append((ax, g, dot))
        ticks = VGroup(*[T(f"{v:,}", 17, MUTED, BOLD).move_to(boards[1][0].c2p(v, lo) + DOWN * 0.26) for v in (500, 1000)], hz_tick(boards[1][0], lo, 17, 0.26))
        back = self.panel(VGroup(boards[0][0], boards[1][0], ticks), buff=0.28)          # keeps the plate's corner from showing through
        clock = ValueTracker(0.0)
        clock.add_updater(lambda m, dt: m.increment_value(dt)); self.add(clock)

        def pulse(key, col):                                  # a ring spreading from where the sensor stands on the plate
            x, z = PJ.FRF[key]
            c = PJ.screen("s7", self.renderer.time, [PJ.plate_pt(x, z)])[0]
            r = Circle(radius=0.12, stroke_color=col, stroke_width=7).move_to([c[0], c[1], 0])
            return r.animate(rate_func=linear).scale(4.5).set_stroke(opacity=0)
        lines3 = PJ.nodal967()
        ring_a, ring_p = ValueTracker(0.0), ValueTracker(0.0)

        def ring():                                           # the 967 Hz nodal lines, glowing, stuck to the plate through the push-in
            g = VGroup()
            for L in lines3:
                xy = PJ.screen("s7", clock.get_value(), L)
                k = max(2, int(len(xy) * ring_p.get_value()))
                pts = [[x, y, 0] for x, y in xy[:k]]
                for w, o in ((16, 0.22), (5, 1.0)):
                    g.add(VMobject(stroke_color=CYAN, stroke_width=w, stroke_opacity=o * ring_a.get_value()).set_points_as_corners(pts))
            return g
        glow = always_redraw(ring); self.add(glow)
        self.until(3.2)
        self.sfx("tick")
        self.play(FadeIn(back), Create(boards[0][0]), FadeIn(boards[0][2]), Create(boards[0][1]), pulse("anti", ORANGEc), run_time=1.4)
        self.until(5.2)
        self.sfx("tick")
        self.play(Create(boards[1][0]), FadeIn(boards[1][2]), Create(boards[1][1]), FadeIn(ticks), pulse("node", SENS), run_time=1.4)
        self.until(6.4)                                       # the point: the cyan sensor sits on a sand line
        self.sfx("pop")
        ring_a.set_value(1.0)
        self.play(ring_p.animate.set_value(1.0), run_time=1.1, rate_func=smooth)
        self.play(pulse("node", CYAN), run_time=0.8)
        self.until(8.0)
        f0 = TR["f"][4]
        guide = VGroup(*[DashedLine(b[0].c2p(f0, lo), b[0].c2p(f0, 0), stroke_color=STARc, stroke_width=3, dash_length=0.08) for b in boards])
        lab = T(f"{f0:.0f} Hz", 26, STARc, BOLD).next_to(guide[0], UP, buff=0.12)
        self.sfx("tick")
        self.play(Create(guide), FadeIn(lab), run_time=0.7)
        # how much lower: the orange peak's height carried down onto the cyan board, then the drop to what the cyan sensor reads
        dA = float(np.interp(f0, f, np.clip(20 * np.log10(d["anti"] / top + 1e-9), lo, 0)))
        dN = float(np.interp(f0, f, np.clip(20 * np.log10(d["node"] / top + 1e-9), lo, 0)))
        ax2 = boards[1][0]
        ghost = DashedLine(ax2.c2p(f0 - 330, dA), ax2.c2p(f0 + 330, dA), stroke_color=ORANGEc, stroke_width=4, dash_length=0.1)
        drop = Arrow(ax2.c2p(f0 + 60, dA), ax2.c2p(f0 + 60, max(dN, lo + 2)), buff=0, stroke_width=7, color=INK, max_tip_length_to_length_ratio=0.25)
        gap = T(f"\u2212{dA - dN:.0f} dB", 40, INK, BOLD).next_to(drop, RIGHT, buff=0.16).shift(UP * 0.12)
        self.until(8.9)
        self.sfx("tick")
        self.play(Create(ghost), run_time=0.5)
        self.play(GrowArrow(drop), FadeIn(gap, shift=DOWN * 0.15), run_time=0.8)
        self.until(11.0)
        self.play(ring_a.animate.set_value(0.4), run_time=0.8)
        self.until(10.6)
        e = self.eq(r"a(x,\omega)=\sum_n W_n(x)\,(\dots)", "a(x, w) = sum Wn(x) (...)", 38, [-FW / 2 + 0.6, PIC_TOP - 0.45, 0], aligned=LEFT)
        p = self.panel(e)
        self.sfx("tick")
        self.play(FadeIn(p), Write(e), run_time=0.8)
        self.until(13.6)
        e2 = self.eq(r"W_n(x)=0\;\Rightarrow\;\text{no peak}", "Wn(x) = 0  =>  no peak", 38, [-FW / 2 + 0.6, e.get_bottom()[1] - 0.7, 0],
                     color=SENS, aligned=LEFT)
        p2 = self.panel(e2)
        self.sfx("tick")
        self.play(FadeIn(p2), Write(e2), run_time=0.8)
        self.until(self.DUR - 0.5)
        self.play(*[FadeOut(m) for b in boards for m in b], FadeOut(VGroup(back, ticks, guide, lab, p, e, p2, e2, ghost, drop, gap)), FadeOut(glow), run_time=0.4)


class O8(OScene):
    """over the two braced plates: where each brace sits against the 967 Hz nodal ring, and what that does"""
    DUR = 12.0

    def body(self):
        clock = ValueTracker(0.0)
        clock.add_updater(lambda m, dt: m.increment_value(dt)); self.add(clock)
        bp = {k: PJ.plate_pt(PJ.FRF[k][0], PJ.FRF[k][1], PJ.S8_AT[k], 0.02) for k in ("node", "out")}
        at = lambda k: (lambda c: np.array([c[0], c[1], 0]))(PJ.screen("s8", clock.get_value(), [bp[k]])[0])
        rings = {k: always_redraw(lambda k=k: Circle(radius=0.2, stroke_color=ORANGEc, stroke_width=5).move_to(at(k))) for k in bp}

        def pulse(k):
            return Circle(radius=0.12, stroke_color=ORANGEc, stroke_width=7).move_to(at(k)).animate(rate_func=linear).scale(4.5).set_stroke(opacity=0)
        lines = {k: PJ.nodal967(PJ.S8_AT[k]) for k in bp}
        vis = {k: ValueTracker(0.0) for k in bp}

        def ring(k, col, dashed):
            def draw():
                g = VGroup()
                for L in lines[k]:
                    xy = PJ.screen("s8", clock.get_value(), L)
                    k_ = max(2, int(len(xy) * vis[k].get_value()))
                    v = VMobject(stroke_color=col, stroke_width=5).set_points_as_corners([[x, y, 0] for x, y in xy[:k_]])
                    g.add(DashedVMobject(v, num_dashes=max(2, k_ // 6)) if dashed else v)
                return g
            return always_redraw(draw)
        self.until(0.8)                                        # "A brace pins one point of the plate."
        self.sfx("pop")
        self.play(pulse("node"), pulse("out"), run_time=0.9)
        self.add(*rings.values())
        self.until(3.6)                                        # left: the brace sits on the ring
        self.add(ring("node", CYAN, False))
        self.sfx("tick")
        self.play(vis["node"].animate.set_value(1.0), run_time=1.0, rate_func=smooth)
        yb = -2.35
        cl = self.label(r"W_{967}=0\ \Rightarrow\ \text{still }967\ \mathrm{Hz}", "W = 0 => still 967 Hz", SENS, [self.mid("node", clock.get_value()), yb, 0], True)
        self.play(FadeIn(cl[0]), Write(cl[1]), Create(cl[2]), pulse("node"), run_time=0.9)
        self.until(6.8)                                        # right: the same ring, and the brace off it
        self.add(ring("out", MUTED, True))
        self.sfx("tick")
        self.play(vis["out"].animate.set_value(1.0), run_time=1.0, rate_func=smooth)
        cr = self.label(r"W_{967}\neq 0\ \Rightarrow\ \text{no mode at }967\ \mathrm{Hz}", "W != 0 => no mode at 967 Hz", ORANGEc,
                        [self.mid("out", clock.get_value()), yb, 0], False)
        self.play(FadeIn(cr[0]), Write(cr[1]), Create(cr[2]), pulse("out"), run_time=0.9)
        self.until(9.6)                                        # "Brace where it moves."
        self.sfx("pop")
        self.play(pulse("out"), run_time=0.9)
        self.until(self.DUR - 0.5)
        self.play(FadeOut(VGroup(cl, cr, *rings.values())), run_time=0.4)

    def mid(self, k, t):                                       # the plate's centre on screen
        return float(PJ.screen("s8", t, [PJ.plate_pt(0, 0, PJ.S8_AT[k])])[0][0])

    def label(self, tex, plain, col, xy, ok):
        e = self.eq(tex, plain, 34, xy, color=col)
        mark = (VMobject(stroke_color=col, stroke_width=8).set_points_as_corners([[-0.2, 0, 0], [-0.05, -0.16, 0], [0.24, 0.2, 0]]) if ok else
                VGroup(Line([-0.17, -0.17, 0], [0.17, 0.17, 0]), Line([-0.17, 0.17, 0], [0.17, -0.17, 0])).set_stroke(col, 8))
        mark.next_to(e, LEFT, buff=0.25)
        VGroup(mark, e).move_to([xy[0], xy[1], 0])
        return VGroup(self.panel(VGroup(mark, e), buff=0.22), e, mark)
