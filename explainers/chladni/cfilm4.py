"""
Chladni film, cinematic 2:00 cut: the maths scenes again, quieter. No tick per dot, pin or echo (Yasir: "some dot
noise"); one soft kit sound where something new appears. Scenes are played to their end.
    manim -qh cfilm4.py CJumpOnly CFitQ CRecapQ
    manim -qh -t cfilm4.py O7S
"""
import numpy as np
import cfilm2 as K2
import sidebands as SB
import cfilm as CF


def _no_lag(self, n, run, lag, name="tick"):              # no burst of ticks for groups of dots
    return None


SB.WVFilm.lag_snd = _no_lag
_k = K2.k_soft_click


def quiet_click(name, dur, fc, body, decay, vol):         # the same kit sounds, about 5 dB softer
    return K2.kwav("tick", K2.TICK, 0.12) if name.startswith("tick") else K2.kwav("pop", K2.POP, 0.17)


for mod in (SB, CF, K2):
    mod.soft_click = quiet_click

from cfilm2 import *                                      # noqa: E402,F401,F403
import proj as PJ                                         # noqa: E402,F401


class CJumpOnly(CFilm):
    """why a grain jumps, and only that: the migration is shown on the real plate (cinematic shot c2)"""
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
        with self.line("A grain rides on a shaking plate.", extra=0.5):
            st["t0"] = clock.get_value()
            self.sfx("pop")
            self.play(FadeIn(R), Create(ax), Create(gl), FadeIn(glab), FadeIn(alab), run_time=0.6)
            self.add(TRc)
        with self.line("Gentle: it never drops faster than g.", extra=0.8):
            self.big_maths(r"a=\omega^2|W|", "a = w^2 |W|", y=2.4, size=50)
        with self.line("Harder: past g, the grain flies.", extra=2.2):
            st.update(gam=3.8, t0=clock.get_value())
            self.sfx("pop")
            self.big_maths(r"\omega^2|W|>g\;\Rightarrow\;\text{the grain jumps}", "w^2 |W| > g  =>  the grain jumps", y=2.4, size=46)
        with self.line("Bigger |W|, bigger hops.", extra=1.0):
            self.w_appear()
            self.w_say("Still spots keep the sand!")
            self.wait(0.3)
        self.w_hush()


class CFitQ(CFitS):
    pass


class CRecapQ(CRecap):
    pass


# ---------------------------------------------------------------- the sensors overlay, with simple maths
class O7S(OScene):
    """beside the plate with two sensors: what each one reads"""
    DUR = 17.5                                            # the s7 render's length: fades out before the cut

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
        self.play(Create(guide), FadeIn(lab), run_time=0.7)
        # how much lower: the orange peak's height carried down onto the cyan board, then the drop to what the cyan sensor reads
        dA = float(np.interp(f0, f, np.clip(20 * np.log10(d["anti"] / top + 1e-9), lo, 0)))
        dN = float(np.interp(f0, f, np.clip(20 * np.log10(d["node"] / top + 1e-9), lo, 0)))
        ax2 = boards[1][0]
        ghost = DashedLine(ax2.c2p(f0 - 330, dA), ax2.c2p(f0 + 330, dA), stroke_color=ORANGEc, stroke_width=4, dash_length=0.1)
        drop = Arrow(ax2.c2p(f0 + 60, dA), ax2.c2p(f0 + 60, max(dN, lo + 2)), buff=0, stroke_width=7, color=INK, max_tip_length_to_length_ratio=0.25)
        gap = T(f"\u2212{dA - dN:.0f} dB", 40, INK, BOLD).next_to(drop, RIGHT, buff=0.16).shift(UP * 0.12)
        self.until(8.9)
        self.play(Create(ghost), run_time=0.5)
        self.play(GrowArrow(drop), FadeIn(gap, shift=DOWN * 0.15), run_time=0.8)
        self.until(11.0)
        self.play(ring_a.animate.set_value(0.4), run_time=0.8)
        self.until(10.6)
        e = self.eq(r"\text{reading}=W(x)\times\text{swing}", "reading = W(x) x swing", 38, [-FW / 2 + 0.6, PIC_TOP - 0.45, 0], aligned=LEFT)
        p = self.panel(e)
        self.sfx("tick")
        self.play(FadeIn(p), Write(e), run_time=0.8)
        self.until(13.6)
        e2 = self.eq(r"W(x)=0\;\Rightarrow\;\text{no peak}", "W(x) = 0  =>  no peak", 38, [-FW / 2 + 0.6, e.get_bottom()[1] - 0.7, 0],
                     color=SENS, aligned=LEFT)
        p2 = self.panel(e2)
        self.sfx("tick")
        self.play(FadeIn(p2), Write(e2), run_time=0.8)
        self.until(self.DUR - 0.5)
        self.play(*[FadeOut(m) for b in boards for m in b], FadeOut(VGroup(back, ticks, guide, lab, p, e, p2, e2, ghost, drop, gap)), FadeOut(glow), run_time=0.4)


