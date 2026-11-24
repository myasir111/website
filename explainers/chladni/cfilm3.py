"""
Chladni film, 2:00 cut: shorter grain and fit scenes, and three new ones built from the real 967 Hz mode:
why a sensor on a nodal line sees no peak, why that matters in a modal test, and an outro that recaps and shows
how the frequency scales with the plate (f ~ h / L^2). Same engine, kit sounds and look as cfilm2.py.

    python truth_node.py                                     # node_truth.json: the 967 Hz mode along the sensor line
    manim -qh cfilm3.py CJumpS2 CFitS2 CNode CModal COutro
"""
import json
import os

import numpy as np
from cfilm2 import *                                          # noqa: F401,F403  (cfilm engine, Kenney kit sounds)

HERE = os.path.dirname(os.path.abspath(__file__))
NT = json.load(open(os.path.join(HERE, "node_truth.json")))
NX, NW = np.array(NT["x"]), np.array(NT["w"])
Wc = lambda u: float(np.interp(u, NX, NW))                    # the 967 Hz mode along y = 0, |W| max = 1
U_ANTI, U_NODE = 0.275, 0.525                                 # the two sensor spots (proj.FRF): bulge and ring
SX0, SX1 = -5.6, 5.6
ux = lambda u: SX0 + (SX1 - SX0) * (u + 1) / 2
VIS = 0.8                                                     # the picture's slow-motion rate (Hz) for the 967 Hz swing


def strip(y0, amp, c, width=5, color=INK):
    us = np.linspace(-1, 1, 241)
    return poly(np.array([[ux(u), y0 + amp * Wc(u) * c, 0] for u in us]), color, width, glow=True)


def sensor(u, y, color):
    body = Rectangle(width=0.3, height=0.34, stroke_width=0, fill_color="#9aa2ab", fill_opacity=1)
    cap = Rectangle(width=0.3, height=0.09, stroke_width=0, fill_color=color, fill_opacity=1).next_to(body, UP, buff=0)
    return VGroup(body, cap).move_to([ux(u), y + 0.24, 0])


# ---------------------------------------------------------------- why the sand moves (2:00 cut)
class CJumpS2(CFilm):
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
            g = VGroup(plate, grain)
            if (yg - yp) > 0.01:
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
            lo_ = max(0, i + 1 - 240)
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
        with self.line("A grain rides on a shaking plate.", extra=0.6):
            st["t0"] = clock.get_value()
            self.sfx("pop")
            self.play(FadeIn(R), Create(ax), Create(gl), FadeIn(glab), FadeIn(alab), run_time=0.6)
            self.add(TRc)
        with self.line("Shake harder: past g, the grain flies.", extra=1.4):
            st.update(gam=3.8, t0=clock.get_value())
            self.sfx("pop")
            self.big_maths(r"\omega^2|W|>g\;\Rightarrow\;\text{the grain jumps}", "w^2 |W| > g  =>  the grain jumps", y=2.4, size=46)
        self.play(FadeOut(R), FadeOut(TRc), FadeOut(VGroup(ax, gl, glab, alab)), run_time=0.4)
        X0, X1, Y = -5.4, 5.6, -0.6
        Wx = lambda u: np.cos(2.5 * np.pi * u)
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
        with self.line("Grains hop by |W| until somewhere still.", extra=0.9) as b:
            self.play(Create(env), FadeIn(sand), run_time=0.6)
            self.big_maths(r"\text{hop}\ \propto\ |W|", "hop ~ |W|", y=2.4, size=50)
            self.play(kk.animate.set_value(steps - 1), run_time=b.left(0.1), rate_func=linear)
        with self.line("Sand ends up where W = 0.", extra=0.5):
            self.big_maths(r"\text{sand ends where } W=0", "sand ends where W = 0", y=2.4, size=50)
            self.lag_snd(3, 0.6, 0.3)
            self.play(LaggedStart(*[GrowFromCenter(d) for d in nodes], lag_ratio=0.3), run_time=0.6)


# ---------------------------------------------------------------- why only some frequencies (2:00 cut): each fit is a mode
class CFitS2(CFilm):
    PARTS = ["p_fit", "end_dip"]

    def p_fit(self):
        self.header("WHY ONLY SOME FREQUENCIES", "The echoes have to line up")
        self.deriv = None
        x0, x1, ys = STRIP
        kap = ValueTracker(2.37)
        smax = (1 - R_ECHO ** N_ECHO) / (1 - R_ECHO)
        xs = np.linspace(0, 1, 220)
        shown = ValueTracker(0.0)

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
        ax = Axes(x_range=[0.5, 4.5, 1], y_range=[0, 1.05, 0.5], x_length=8.6, y_length=1.25, tips=False,
                  axis_config={"stroke_color": AXc, "stroke_width": 2, "include_ticks": False}).move_to([0.7, -1.72, 0])
        sweep = ValueTracker(0.5)
        comb = always_redraw(lambda: ax.plot(lambda k_: echo_sum(k_) / smax, x_range=[0.5, max(0.52, sweep.get_value()), 0.004],
                                             color=ORANGEc, stroke_width=3) if sweep.get_value() > 0.52 else VMobject())
        mlabs = VGroup(*[M(rf"m={m}", f"m={m}", 32, MUTED).next_to(ax.c2p(m, 0), DOWN, buff=0.12) for m in (1, 2, 3, 4)])
        with self.line("A wave bounces between two held edges.", extra=0.1) as b:
            self.play(Create(clamps), Create(base), run_time=0.4)
            self.add(E)
            self.sfx("pop")
            self.play(shown.animate.set_value(1.0), run_time=0.4)
            self.lag_snd(N_ECHO - 1, b.left(0.2), 0.0)
            self.play(shown.animate.set_value(N_ECHO), run_time=b.left(0.2), rate_func=linear)
        with self.line("Out of step, its echoes cancel.", extra=0.3):
            self.add(S)
            self.sfx("pop")
            self.play(FadeIn(S), run_time=0.4)
        with self.line("In step, every echo adds up.", extra=0.4):
            self.play(kap.animate.set_value(3.0), run_time=1.2, rate_func=smooth)
            self.sfx("pop")
        with self.line("Sweep it: only waves that fit grow.", extra=0.4) as b:
            self.play(Create(ax), kap.animate.set_value(0.5), run_time=0.4)
            self.add(comb)
            kap.add_updater(lambda m: m.set_value(sweep.get_value()))
            self.play(sweep.animate.set_value(4.5), run_time=b.left(0.5), rate_func=linear)
            kap.clear_updaters()
            self.lag_snd(4, 0.5, 0.25)
            self.play(LaggedStart(*[FadeIn(l_, shift=UP * 0.1) for l_ in mlabs], lag_ratio=0.25), run_time=0.5)
        with self.line("Each fit: one shape, one frequency.", extra=0.9):
            self.play(kap.animate.set_value(2.0), run_time=0.6, rate_func=smooth)
            self.big_maths(r"2kL=2\pi m", "2 k L = 2 pi m", y=2.35, size=50)
            self.w_appear()
            self.w_say("Fit, or fade away!")
            self.wait(0.2)
        self.w_hush()


# ---------------------------------------------------------------- why a sensor on a nodal line sees no peak
class CNode(CFilm):
    PARTS = ["p_node", "end_dip"]

    def p_node(self):
        self.header("WHY A SENSOR MISSES A PEAK", "On a nodal line, W = 0")
        self.deriv = None
        Y0, AMP = 0.95, 0.85
        clock = ValueTracker(0.0)
        clock.add_updater(lambda m, dt: m.increment_value(dt)); self.add(clock)
        swing = lambda t: np.cos(2 * np.pi * VIS * t)
        rest = DashedLine([SX0, Y0, 0], [SX1, Y0, 0], stroke_color=AXc, stroke_width=2, dash_length=0.1)
        plate = always_redraw(lambda: strip(Y0, AMP, swing(clock.get_value())))
        bolt = Dot([0, Y0, 0], radius=0.11, color=MUTED)
        rings = VGroup(*[Dot([ux(s * U_NODE), Y0, 0], radius=0.1, color=CYAN) for s in (-1, 1)])
        on = {"a": None, "n": None}

        def sens(u, col, key):
            def f():
                if on[key] is None:
                    return VMobject()
                return sensor(u, Y0 + AMP * Wc(u) * swing(clock.get_value()), col)
            return always_redraw(f)
        SA, SN = sens(U_ANTI, ORANGEc, "a"), sens(U_NODE, SENS, "n")
        # what each sensor writes: its own point's motion, last 3 s
        LX0, LX1 = -5.3, -0.4
        lanes = {"a": -0.95, "n": -2.05}

        def trace(u, col, key):
            def f():
                if on[key] is None:
                    return VMobject()
                t = clock.get_value(); age = np.linspace(0, min(3.0, t - on[key]), 180)
                if len(age) < 2 or age[-1] <= 0.02:
                    return VMobject()
                pts = np.array([[LX1 - (LX1 - LX0) * a / 3.0, lanes[key] + 0.38 * Wc(u) * swing(t - a), 0] for a in age])
                return poly(pts, col, 3.5, glow=False)
            return always_redraw(f)
        lane_base = VGroup(*[Line([LX0, y, 0], [LX1, y, 0], stroke_color=AXc, stroke_width=2) for y in lanes.values()])
        # each sensor's spectrum around the mode: a single resonance, scaled by W at the sensor
        grow = ValueTracker(0.0)
        axs = {k: Axes(x_range=[100, 2000, 500], y_range=[0, 1.05, 0.5], x_length=4.6, y_length=0.85, tips=False,
                       axis_config={"stroke_color": AXc, "stroke_width": 2, "include_ticks": False}).move_to([3.3, y + 0.3, 0])
               for k, y in lanes.items()}
        lor = lambda f, A: A / (1 + ((f - NT["f"]) / 28.0) ** 2)

        def spec(key, u, col):
            return always_redraw(lambda: axs[key].plot(lambda f: lor(f, abs(Wc(u)) * grow.get_value()), x_range=[100, 2000, 2],
                                                       color=col, stroke_width=3))
        tick = VGroup(*[DashedLine(axs[k].c2p(NT["f"], 0), axs[k].c2p(NT["f"], 1.05), stroke_color=STARc, stroke_width=2, dash_length=0.06)
                        for k in axs])
        flab = T(f"{NT['f']:.0f} Hz", 24, STARc, BOLD).next_to(tick[0], UP, buff=0.08)
        with self.line("A cut through the plate at 967 Hz.", extra=0.1):
            self.sfx("pop")
            self.play(Create(rest), FadeIn(plate), FadeIn(bolt), run_time=0.6)
            self.lag_snd(2, 0.4, 0.5)
            self.play(LaggedStart(*[GrowFromCenter(d) for d in rings], lag_ratio=0.5), run_time=0.4)
        with self.line("On the bulge, the sensor rides with it.", extra=0.15):
            on["a"] = clock.get_value()
            self.add(SA, trace(U_ANTI, ORANGEc, "a"))
            self.sfx("pop")
            self.play(Create(lane_base[0]), run_time=0.4)
        with self.line("On the ring it never moves.", extra=0.3):
            on["n"] = clock.get_value()
            self.add(SN, trace(U_NODE, SENS, "n"))
            self.sfx("pop")
            self.play(Create(lane_base[1]), Indicate(rings[1], scale_factor=1.6, color=CYAN), run_time=0.6)
        with self.line("So its spectrum has no 967 Hz peak.", extra=1.2):
            self.play(*[Create(a) for a in axs.values()], Create(tick), FadeIn(flab), run_time=0.5)
            self.add(spec("a", U_ANTI, ORANGEc), spec("n", U_NODE, SENS))
            self.sfx("pop")
            self.play(grow.animate.set_value(1.0), run_time=0.8, rate_func=smooth)
            self.big_maths(r"\text{reading}=W(x)\times\text{swing}", "reading = W(x) x swing", y=2.45, size=48)
            self.wait(0.2)
            self.big_maths(r"W(x)=0\;\Rightarrow\;\text{reading}=0", "W(x) = 0  =>  reading = 0", y=2.45, size=48)


# ---------------------------------------------------------------- why it matters in a modal test
class CModal(CFilm):
    PARTS = ["p_modal", "end_dip"]

    def p_modal(self):
        self.header("IN A MODAL TEST", "Hit and measure off the nodal lines")
        self.deriv = None
        Y0, AMP = 0.2, 1.0
        clock = ValueTracker(0.0)
        clock.add_updater(lambda m, dt: m.increment_value(dt)); self.add(clock)
        hit = {"t": None, "A": 0.0}

        def ring(t):
            if hit["t"] is None or t < hit["t"]:
                return 0.0
            s = t - hit["t"]
            return hit["A"] * np.exp(-s / 1.4) * np.sin(2 * np.pi * 1.1 * s)
        rest = DashedLine([SX0, Y0, 0], [SX1, Y0, 0], stroke_color=AXc, stroke_width=2, dash_length=0.1)
        plate = always_redraw(lambda: strip(Y0, AMP, ring(clock.get_value())))
        bolt = Dot([0, Y0, 0], radius=0.11, color=MUTED)
        rings = VGroup(*[Dot([ux(s * U_NODE), Y0, 0], radius=0.1, color=CYAN) for s in (-1, 1)])
        lift = ValueTracker(1.3); at = {"u": U_NODE}

        def hammer():
            x = ux(at["u"]); yb = Y0 + AMP * Wc(at["u"]) * ring(clock.get_value()) + 0.08 + lift.get_value()
            head = RoundedRectangle(width=0.62, height=0.3, corner_radius=0.06, stroke_width=0, fill_color="#c9ccd1", fill_opacity=1)
            head.move_to([x, yb + 0.15, 0])
            handle = Line([x, yb + 0.3, 0], [x + 0.9, yb + 1.1, 0], stroke_color="#8a6d4b", stroke_width=9)
            return VGroup(handle, head)
        H = always_redraw(hammer)

        def tap(u):
            at["u"] = u
            self.play(lift.animate.set_value(1.3), run_time=0.01)
            self.play(lift.animate.set_value(0.0), run_time=0.28, rate_func=rush_into)
            self.sfx("pop")
            hit.update(t=clock.get_value(), A=Wc(u))               # the force reaches this mode through W at the hit point
            self.play(lift.animate.set_value(1.0), run_time=0.35, rate_func=rush_from)
        self.play(Create(rest), FadeIn(plate), FadeIn(bolt), FadeIn(rings), FadeIn(H), run_time=0.5)
        with self.line("Hit the node: this mode stays silent.", extra=0.2) as b:
            tap(U_NODE)
            self.play(Indicate(rings[1], scale_factor=1.6, color=CYAN), run_time=0.5)
        with self.line("Hit the bulge: the mode rings.", extra=0.6):
            tap(U_ANTI)
        with self.line("So test at several points, off the nodes.", extra=0.6):
            self.play(FadeOut(H), run_time=0.3)
            self.big_maths(r"\text{response}\ \propto\ W(\text{hit})\times W(\text{sensor})", "response ~ W(hit) x W(sensor)", y=2.2, size=46)
            self.play(Indicate(rings, scale_factor=1.5, color=CYAN), run_time=0.7)


# ---------------------------------------------------------------- outro: the recap, then the same shapes on other plates
class COutro(CFilm):
    PARTS = ["p_outro"]

    def p_outro(self):
        self.header("RECAP", "Why the sand draws a ring")
        rows = [(r"\omega^2|W|>g\;\Rightarrow\;\text{grains fly}", "w^2|W| > g => grains fly", INK),
                (r"2kL=2\pi m\;\Rightarrow\;\text{only fits ring}", "2kL = 2 pi m => only fits ring", INK),
                (r"\text{every peak}\;=\;\text{a shape}", "every peak = a shape", ORANGEc),
                (r"W(x)=0\;\Rightarrow\;\text{no peak at }x", "W(x) = 0 => no peak at x", SENS)]
        eqs = VGroup(*[M(t, p, 50 if c != ORANGEc else 58, c) for t, p, c in rows]).arrange(DOWN, buff=0.38, aligned_edge=LEFT)
        eqs.move_to([0.6, 0.0, 0]).set_z_index(80)
        box = SurroundingRectangle(eqs[2], color=ORANGEc, buff=0.2, stroke_width=4, corner_radius=0.12).set_z_index(80)
        with self.line("Every peak in a spectrum is a shape.", extra=0.6):
            self.lag_snd(4, 1.6, 0.45, "tick")
            self.play(LaggedStart(*[FadeIn(e, shift=RIGHT * 0.25) for e in eqs], lag_ratio=0.45), run_time=1.6)
            self.add_sound(k_hit(0.18))
            self.play(Create(box), run_time=0.5)
        self.play(FadeOut(VGroup(eqs, box)), run_time=0.4)
        # the same shapes on other plates: f ~ h / L^2 (same edges, same bolt)
        img = PNG(NT["f"])
        p1 = ImageMobject(img).set_height(1.6).move_to([-3.6, -0.45, 0])
        p2 = ImageMobject(img).set_height(3.0).move_to([1.9, -0.3, 0])
        l1 = T(f"{NT['L_mm']:.0f} mm:  {NT['f']:.0f} Hz", 26, INK, BOLD).next_to(p1, DOWN, buff=0.2)
        l2 = T(f"{2 * NT['L_mm']:.0f} mm:  {NT['f_2L']:.0f} Hz", 26, ORANGEc, BOLD).next_to(p2, DOWN, buff=0.2)
        self.header("SAME SHAPE, OTHER PLATES", "The frequency moves with the size")
        with self.line("Twice as wide: a quarter of the frequency.", extra=0.3):
            self.big_maths(r"f\;\propto\;\frac{h}{L^2}", "f ~ h / L^2", y=2.2, size=56)
            self.sfx("pop")
            self.play(FadeIn(p1), FadeIn(l1), run_time=0.4)
            self.sfx("pop")
            self.play(FadeIn(p2, scale=0.5), FadeIn(l2), run_time=0.6)
        thick = M(r"h\times 2:\ \ %s\ \text{Hz}" % f"{NT['f_2h']:,.0f}".replace(",", "{,}"), "h x 2: 1934 Hz", 40, INK).move_to([-3.6, 1.05, 0])
        with self.line("Twice as thick: twice the frequency.", extra=0.5):
            self.sfx("tick")
            self.play(FadeIn(thick, shift=UP * 0.15), run_time=0.5)
        self.end_dip(0.5)


# ---------------------------------------------------------------- the sweep overlay, without the formula
import proj as PJ  # noqa: E402
class O5S(OScene):
    """O5 without the modal-sum formula (2:00 cut: teach with the picture, no scary maths): spectrum, marker, pins"""
    DUR = 26.4

    def body(self):
        d = np.load(os.path.join(HERE, "frf_sweep.npz"))
        f, Hs = d["f"], d["H"]
        db = 20 * np.log10(Hs / Hs.max() + 1e-9)
        lo = -34.0
        ax = Axes(x_range=[100, 2000, 500], y_range=[lo, 0, 10], x_length=6.4, y_length=3.1, tips=False,
                  axis_config={"stroke_color": AXc, "stroke_width": 2, "include_ticks": False}).move_to([3.45, -0.85, 0])
        ticks = VGroup(*[T(f"{v:,}", 18, MUTED, BOLD).move_to(ax.c2p(v, lo) + DOWN * 0.28) for v in (500, 1000)], hz_tick(ax, lo, 18, 0.28))
        fmark = ValueTracker(100.0)
        curve = always_redraw(lambda: ax.plot_line_graph(f[f <= fmark.get_value()], np.clip(db[f <= fmark.get_value()], lo, 0),
                                                         add_vertex_dots=False, line_color=INK, stroke_width=3)
                              if fmark.get_value() > 101 else VMobject())
        mk = always_redraw(lambda: VGroup(Line(ax.c2p(fmark.get_value(), lo), ax.c2p(fmark.get_value(), 0), stroke_color=ORANGEc, stroke_width=3),
                                          Dot(ax.c2p(fmark.get_value(), float(np.clip(np.interp(fmark.get_value(), f, db), lo, 0))), radius=0.08, color=ORANGEc)))
        num = always_redraw(lambda: T(f"{int(round(fmark.get_value())):,} Hz", 34, ORANGEc, BOLD).move_to(
            ax.c2p(float(np.clip(fmark.get_value(), 420, 1680)), 0) + UP * 0.42))
        self.play(Create(ax), FadeIn(ticks), run_time=0.6)
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
        self.play(FadeOut(VGroup(ax, ticks, pins)), FadeOut(curve), FadeOut(mk), FadeOut(num), run_time=0.4)


