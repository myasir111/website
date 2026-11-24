"""
Chladni film, 2-minute cut: the maths shots rebuilt short, and every effect taken from the measured CC0 kit
(Kenney packs in frame-grabber/sfx) instead of being synthesised in numpy.

    manim -qh cfilm2.py CQTitle CJumpS CFitS CRecap          # the maths shots, 1920x1080 @ 60
    manim -ql cfilm2.py O3 O5 O7 O8                          # overlays re-run only for their effect tracks (k2_mix_O*.wav)
Same engine, look and truth as cfilm.py (run truth.py first).
"""
import os
import subprocess

import numpy as np
import cfilm as CF
import sidebands as SB

KEN = os.environ.get("KENNEY", "sfx/")       # CC0 (Kenney), measured in sfx/index.csv


def _kload(rel):
    raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", KEN + rel, "-f", "f32le", "-ac", "1", "-ar", str(SB.SR), "-"],
                         capture_output=True, check=True).stdout
    y = np.frombuffer(raw, np.float32).astype(np.float64)
    return y / (np.abs(y).max() + 1e-9)


_kc = {}


def kwav(name, rel, vol, rev=False):
    key = (name, rel, round(vol, 3), rev)
    if key not in _kc:
        y = _kload(rel)
        _kc[key] = SB.wav(f"k_{name}_{vol:.3f}{'_r' if rev else ''}.wav", vol * (y[::-1] if rev else y))
    return _kc[key]


# which kit file plays each house role (picked by length, attack and brightness; everything audible above 200 Hz)
POP = "kenney-impact-sounds/impactWood_light_002.ogg"       # construct: a light wooden knock (0.26 s, centroid ~400 Hz)
TICK = "kenney-impact-sounds/impactGeneric_light_002.ogg"   # a formula step: a lighter tap (0.16 s, ~750 Hz)
HIT = "kenney-impact-sounds/impactWood_medium_002.ogg"      # a big moment (title, recap box)


def k_soft_click(name, dur, fc, body, decay, vol):
    return kwav("tick", TICK, 0.22) if name.startswith("tick") else kwav("pop", POP, 0.30)


def k_soft_click_rev(name, *a, **k):
    return kwav("pop", POP, 0.30, rev=True)                  # deconstruct: the same knock, reversed


def k_silent(*a, **k):                                       # no air or swell sounds: no whoosh in the kit, and they read as noise
    return SB.wav("k_silence.wav", np.zeros(441))


def k_hit(vol=0.22):
    return kwav("hit", HIT, min(0.5, 1.6 * vol))


def k_thud(vol=0.32):
    return kwav("thud", HIT, min(0.5, 1.2 * vol))


def k_stamp(vol=0.35):
    return kwav("stamp", "kenney-impact-sounds/impactPlank_medium_002.ogg", vol)


def k_mesh(level):
    return kwav("mesh", TICK, 0.05 + 0.01 * level)


_mix = SB.mix_down


def k_mix_down(events, total, name="mix.wav"):
    return _mix(events, total, "k2_" + name)                 # keep the old film's mixes intact


for mod in (SB, CF):
    mod.soft_click, mod.soft_click_rev, mod.hit, mod.thud, mod.stamp_snd, mod.mesh_tick = (
        k_soft_click, k_soft_click_rev, k_hit, k_thud, k_stamp, k_mesh)
    mod.noise_swell = mod.swell = k_silent
    mod.mix_down = k_mix_down

from cfilm import *                                           # noqa: E402,F401,F403  (after the patch: the kit versions)


# ---------------------------------------------------------------- the title, as a question
class CQTitle(CFilm):
    PARTS = ["p_title"]

    def p_title(self):
        self.add_sound(k_hit(0.2), time_offset=0.35)
        t1 = T("Why does the sand", 74, INK, BOLD)
        t2 = T("draw a ring?", 74, ORANGEc, BOLD)
        card = VGroup(t1, t2).arrange(DOWN, buff=0.22).set_z_index(85)
        self.play(Write(t1), run_time=0.9)
        self.play(Write(t2), run_time=0.6)
        self.wait(1.7)
        self.play(FadeOut(card), run_time=0.5)


# ---------------------------------------------------------------- why the sand moves (short)
class CJumpS(CFilm):
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
        with self.line("A grain rides on a shaking plate.", extra=0.3):
            st["t0"] = clock.get_value()
            self.sfx("pop")
            self.play(FadeIn(R), Create(ax), Create(gl), FadeIn(glab), FadeIn(alab), run_time=0.6)
            self.add(TRc)
        with self.line("Gentle: it never drops faster than g.", extra=0.6):
            self.big_maths(r"a=\omega^2|W|", "a = w^2 |W|", y=2.4, size=50)
        with self.line("Harder: past g, the grain flies.", extra=1.7):
            st.update(gam=3.8, t0=clock.get_value())
            self.sfx("pop")
            self.big_maths(r"\omega^2|W|>g\;\Rightarrow\;\text{the grain jumps}", "w^2 |W| > g  =>  the grain jumps", y=2.4, size=46)
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
        with self.line("Across the plate, grains hop by |W|.", extra=0.4):
            self.play(Create(env), FadeIn(sand), run_time=0.8)
            self.big_maths(r"\text{hop}\ \propto\ |W|", "hop ~ |W|", y=2.4, size=50)
        with self.line("They wander until they land somewhere still.", extra=0.9) as b:
            self.play(kk.animate.set_value(steps - 1), run_time=b.left(0.2), rate_func=linear)
        with self.line("Sand ends up where W = 0.", extra=0.8):
            self.big_maths(r"\text{sand ends where } W=0", "sand ends where W = 0", y=2.4, size=50)
            self.lag_snd(3, 0.6, 0.3)
            self.play(LaggedStart(*[GrowFromCenter(d) for d in nodes], lag_ratio=0.3), run_time=0.6)
            self.w_appear()
            self.w_say("Still spots collect the sand!")
            self.wait(0.3)
        self.w_hush()


# ---------------------------------------------------------------- why only some frequencies (short)
class CFitS(CFilm):
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
        with self.line("A wave bounces between two held edges.", extra=0.2) as b:
            self.play(Create(clamps), Create(base), run_time=0.5)
            self.add(E)
            self.sfx("pop")
            self.play(shown.animate.set_value(1.0), run_time=0.5)
            self.lag_snd(N_ECHO - 1, b.left(0.2), 0.0)
            self.play(shown.animate.set_value(N_ECHO), run_time=b.left(0.2), rate_func=linear)
        with self.line("Out of step, its echoes cancel.", extra=0.4):
            self.add(S)
            self.sfx("pop")
            self.play(FadeIn(S), run_time=0.5)
        with self.line("In step, every echo adds up.", extra=0.5):
            self.play(kap.animate.set_value(3.0), run_time=1.3, rate_func=smooth)
            self.sfx("pop")
        with self.line("Sweep the wavelength: only fits grow.", extra=0.5) as b:
            self.play(Create(ax), kap.animate.set_value(0.5), run_time=0.5)
            self.add(comb)
            kap.add_updater(lambda m: m.set_value(sweep.get_value()))
            self.play(sweep.animate.set_value(4.5), run_time=b.left(0.6), rate_func=linear)
            kap.clear_updaters()
            self.lag_snd(4, 0.6, 0.25)
            self.play(LaggedStart(*[FadeIn(l_, shift=UP * 0.1) for l_ in mlabs], lag_ratio=0.25), run_time=0.6)
        with self.line("In step after one round trip:", extra=0.4):
            self.play(kap.animate.set_value(2.0), run_time=0.7, rate_func=smooth)
            self.big_maths(r"2kL=2\pi m", "2 k L = 2 pi m", y=2.35, size=50)
        with self.line("so only these wavenumbers fit.", extra=0.8):
            self.big_maths(r"k_m=\frac{m\pi}{L}", "k_m = m pi / L", y=2.35, size=54)
            self.w_appear()
            self.w_say("Fit, or fade away!")
            self.wait(0.3)
        self.w_hush()


# ---------------------------------------------------------------- the recap card: stacked, the key line boxed
class CRecap(CFilm):
    PARTS = ["p_recap"]

    def p_recap(self):
        self.header("RECAP", "Why the sand draws a ring")
        rows = [(r"\omega^2|W|>g\;\Rightarrow\;\text{grains fly}", "w^2|W| > g => grains fly", INK),
                (r"W=0\;\Rightarrow\;\text{sand rests}", "W = 0 => sand rests", INK),
                (r"2kL=2\pi m\;\Rightarrow\;\text{only fits ring}", "2kL = 2 pi m => only fits ring", INK),
                (r"\text{every peak}\;=\;\text{a shape}", "every peak = a shape", ORANGEc),
                (r"W_n(x)=0\;\Rightarrow\;\text{no peak at }x", "Wn(x) = 0 => no peak at x", SENS)]
        eqs = VGroup(*[M(t, p, 50 if c != ORANGEc else 58, c) for t, p, c in rows]).arrange(DOWN, buff=0.36, aligned_edge=LEFT)
        eqs.move_to([0.9, -0.05, 0]).set_z_index(80)
        box = SurroundingRectangle(eqs[3], color=ORANGEc, buff=0.2, stroke_width=4, corner_radius=0.12).set_z_index(80)
        with self.line("Every peak in a spectrum is a shape.", extra=2.6) as b:
            self.lag_snd(5, 2.0, 0.45, "tick")
            self.play(LaggedStart(*[FadeIn(e, shift=RIGHT * 0.25) for e in eqs], lag_ratio=0.45), run_time=2.0)
            self.add_sound(k_hit(0.18))
            self.play(Create(box), Indicate(eqs[3], scale_factor=1.08, color=ORANGEc), run_time=0.8)
            self.w_appear()
            self.w_say("Derived step by step in the Lab!")
            self.wait(b.left(0.2))
        self.w_hush()
        self.end_dip(0.5)


# ---------------------------------------------------------------- overlays: re-run only for their effect tracks
class O3(CF.O3):
    pass


class O5(CF.O5):
    pass


class O7(CF.O7):
    pass


class O8(CF.O8):
    pass
