"""Sidebands film, the 3D shots (Manim ThreeDScene). Each shot is rendered on its own and joined with the 2D parts:
    manim -qh scenes3d.py Opener3D Why3D Waterfall3D Crack3D
Sounds are made to measure: every camera move gets an air sound exactly as long as the move, as loud as the move is big."""
from sidebands import *

# ---------------------------------------------------------------- the gearbox model (scene units)
G3 = 0.12                                      # gear module
R3P, R3G = G3 * 16 / 2, G3 * 32 / 2            # pitch radii: 16-tooth pinion, 32-tooth gear
CD3 = R3P + R3G
W3 = 0.34                                      # face width
AXP, AXG = np.array([-CD3 / 2, 0.0, 0.0]), np.array([CD3 / 2, 0.0, 0.0])
MESH3 = np.array([-CD3 / 2 + R3P, 0.0, W3 / 2])


def gear3d(n, r, centre, top_c, side_c, mark_c=ORANGEc):
    """an extruded spur gear; the top face is one wedge per tooth so the painter's sort stays right"""
    ra, rd = r + G3, r - 1.25 * G3
    prof = ((-0.5, rd), (-0.27, rd), (-0.19, r), (-0.12, ra), (0.12, ra), (0.19, r), (0.27, rd), (0.5, rd))
    zt, zb = W3 / 2, -W3 / 2
    P = lambda p, z: np.array([centre[0] + p[0], centre[1] + p[1], z])
    ring, wedges = [], VGroup()
    for k in range(n):
        a0 = 2 * PI * k / n
        tooth = [(rad * np.cos(a0 + fr * 2 * PI / n), rad * np.sin(a0 + fr * 2 * PI / n)) for fr, rad in prof]
        ring += tooth[:-1]
        wedges.add(Polygon(P((0, 0), zt), *[P(q, zt) for q in tooth], fill_color=mark_c if k == 0 else top_c, fill_opacity=1,
                           stroke_color=mark_c if k == 0 else top_c, stroke_width=0.6))
    sides = VGroup(*[Polygon(P(ring[i], zt), P(ring[(i + 1) % len(ring)], zt), P(ring[(i + 1) % len(ring)], zb), P(ring[i], zb),
                             fill_color=side_c, fill_opacity=1, stroke_width=0) for i in range(len(ring))])
    g = VGroup(sides, wedges)
    g.set_shade_in_3d(True)
    return g


def flag(attr, *mobs):
    for m in mobs:
        for f in m.get_family():
            setattr(f, attr, True)


class Film3D(ThreeDScene):
    """house style for the 3D shots: wide-screen bars, header, captions and maths fixed to the screen,
    camera moves with matched air sounds"""

    def setup(self):
        super().setup()
        cam = self.renderer.camera
        orig = cam.get_mobjects_to_display

        def ordered(*a, **k):               # draw order: floor parts, 3D (sorted), loose lines, then the screen overlay
            mobs = orig(*a, **k)
            first = [m for m in mobs if getattr(m, "draw_first", False)]
            hud = [m for m in mobs if getattr(m, "hud", False)]
            mid = [m for m in mobs if not getattr(m, "draw_first", False) and not getattr(m, "hud", False)]
            return first + mid + hud

        cam.get_mobjects_to_display = ordered
        self.cap = self.hdr = self.eqn = None
        self.cuts = []
        self.bars = VGroup(*[Rectangle(width=FW + 1, height=BAR_H + 0.5, stroke_width=0, fill_color="#000000", fill_opacity=1)
                             .move_to([0, s_ * (FH / 2 - BAR_H / 2 + 0.25), 0]) for s_ in (1, -1)])
        self.hud(self.bars)

    def tear_down(self):
        super().tear_down()
        import json
        json.dump({"cuts": self.cuts, "total": float(self.renderer.time), "bar_h": BAR_H / FH},
                  open(os.path.join(os.path.dirname(os.path.abspath(__file__)), f"cuts_{type(self).__name__}.json"), "w"))

    def hud(self, *mobs):
        flag("hud", *mobs)
        self.add_fixed_in_frame_mobjects(*mobs)

    def snd(self, path, at=0.0):
        Scene.add_sound(self, path, time_offset=at)

    def fade_in(self, rt=0.6):
        veil = Rectangle(width=FW + 1, height=FH + 1, stroke_width=0, fill_color="#000000", fill_opacity=1)
        self.hud(veil)
        self.play(FadeOut(veil), run_time=rt)

    def dip_out(self, rt=0.45):
        veil = Rectangle(width=FW + 1, height=FH + 1, stroke_width=0, fill_color="#000000", fill_opacity=1)
        self.hud(veil)
        self.remove(veil)
        anims = [FadeIn(veil)]
        for m in (self.cap, self.eqn):
            if m is not None:
                anims.append(FadeOut(m))
        self.play(*anims, run_time=rt)

    def header(self, kicker, title, kcolor=ORANGEc):
        k = T(kicker, 17, kcolor, BOLD).move_to(FIG(0.03, 0.966), aligned_edge=LEFT)
        t = T(title, 30, INK, BOLD).move_to(FIG(0.03, 0.915), aligned_edge=LEFT)
        g = VGroup(k, t)
        self.hud(g)
        self.remove(g)
        anims = [FadeIn(g, shift=RIGHT * 0.2)]
        if self.hdr is not None:
            anims.append(FadeOut(self.hdr))
        self.cuts.append(float(self.renderer.time))
        self.play(*anims, run_time=0.5)
        self.hdr = g

    @contextmanager
    def line(self, text, extra=0.0):
        dur = read_time(text) + extra
        t0 = self.renderer.time
        cap = caption_mob(text)
        if self.cap is not None:
            self.play(FadeOut(self.cap), run_time=0.15)
        self.hud(cap)
        self.remove(cap)
        self.play(FadeIn(cap), run_time=0.2)
        self.cap = cap
        yield dur
        rest = t0 + dur - self.renderer.time
        if rest > 0.02:
            self.wait(rest)

    def callback(self, series, part, title):
        k = T(f"FROM {series} · PART {part}", 15, ORANGEc, BOLD)
        t = T(title, 20, INK, BOLD)
        g = VGroup(k, t).arrange(DOWN, aligned_edge=RIGHT, buff=0.06)
        rule = Line(g.get_corner(UL) + LEFT * 0.15 + UP * 0.03, g.get_corner(DL) + LEFT * 0.15 + DOWN * 0.03, stroke_color=ORANGEc,
                    stroke_width=4)
        box = VGroup(rule, g).move_to(FIG(0.975, 0.94), aligned_edge=RIGHT)
        self.hud(box)
        self.remove(box)
        self.snd(self_tick())
        self.play(FadeIn(box, shift=LEFT * 0.3), run_time=0.4)
        self.cb = box

    def callback_off(self):
        if getattr(self, "cb", None) is not None:
            self.play(FadeOut(self.cb), run_time=0.3)
            self.cb = None

    def maths(self, tex, plain, y=2.45, size=38, rt=0.9):
        eq = M(tex, plain, size, INK)
        eq.move_to([0, y, 0])
        bg = BackgroundRectangle(eq, color=SURF, fill_opacity=0.75, buff=0.14)
        g = VGroup(bg, eq)
        self.hud(g)
        self.remove(g)
        anims = [FadeIn(bg), Write(eq)]
        if self.eqn is not None:
            anims.append(FadeOut(self.eqn))
        self.snd(self_tick())
        self.play(*anims, run_time=rt)
        self.eqn = g

    def maths_clear(self):
        if self.eqn is not None:
            self.play(FadeOut(self.eqn), run_time=0.3)
            self.eqn = None

    def cam(self, run_time, added_anims=(), rate_func=smooth, air=False, **kw):
        """move the camera; with air=True a soft air sound as long as the move and as loud as it is big"""
        phi0, th0, z0 = self.camera.get_phi(), self.camera.get_theta(), self.camera.get_zoom()
        c0 = np.array(self.renderer.camera.frame_center)
        d = (abs(kw.get("phi", phi0) - phi0) + abs(kw.get("theta", th0) - th0)) / (PI / 2) \
            + abs(np.log(kw.get("zoom", z0) / z0)) + np.linalg.norm(np.array(kw.get("frame_center", c0)) - c0) / 3
        if air and d > 0.02:
            vol = float(np.clip(0.02 + 0.03 * d, 0.02, 0.06))
            self.snd(swell(run_time, "move" if rate_func is smooth else "draw", vol, 7))
        self.move_camera(run_time=run_time, rate_func=rate_func, added_anims=list(added_anims), **kw)


_TICK = None


def self_tick():
    global _TICK
    if _TICK is None:
        _TICK = soft_click("tick3d", 0.03, 3000, 700, 0.005, 0.10)
    return _TICK


def lag_times(n, run_time, lag_ratio):
    """start time of each part of a LaggedStart, so a sound can land on each one"""
    d = run_time / (1 + lag_ratio * (n - 1))
    return [i * lag_ratio * d for i in range(n)]


# =====================================================================
# Shot 1: the gearbox, drone-style
# =====================================================================
class Opener3D(Film3D):
    E3 = 0.09                                  # off-centre, exaggerated

    def gearbox(self, pin_mark=ORANGEc, glow_col=STARc):
        base = Prism(dimensions=[7.6, 4.6, 0.25], fill_color="#262b31", fill_opacity=1, stroke_width=0).move_to([0, 0, -1.15])
        peds = VGroup(*[Prism(dimensions=[1.0, 1.0, 0.75], fill_color="#3a414b", fill_opacity=1, stroke_width=0)
                        .move_to(a + np.array([0, 0, -0.66])) for a in (AXP, AXG)])
        shafts = VGroup(*[Cylinder(radius=0.17, height=0.5, direction=OUT, resolution=(2, 18), fill_color="#8a94a0", fill_opacity=1,
                                   stroke_width=0, checkerboard_colors=False).move_to(a + np.array([0, 0, W3 / 2 + 0.25]))
                          for a in (AXP, AXG)])
        sensor = Prism(dimensions=[0.34, 0.34, 0.26], fill_color="#1c1f24", fill_opacity=1, stroke_width=0)\
            .move_to(AXP + np.array([0, -0.68, -0.15]))
        gear = gear3d(32, R3G, AXG, "#6b7684", "#414953", mark_c="#8d98a6")
        pin = gear3d(16, R3P, AXP + np.array([self.E3, 0, 0]), "#8f9cab", "#59636f", mark_c=pin_mark)
        glow = VGroup(*[Dot3D(MESH3 + OUT * 0.05, radius=r, color=glow_col) for r in (0.08, 0.16, 0.26)])
        for d in glow:
            d.set_opacity(0)
        gear.rotate(PI - PI / 32, axis=OUT, about_point=AXG)
        flag("draw_first", base, peds, sensor)
        self.pin, self.gear, self.glow, self.pin_shaft = pin, gear, glow, shafts[0]
        return VGroup(base, peds, shafts, gear, pin, sensor, glow)

    def spin(self, tt0=0.0, glow_fn=None):
        """turn the gears in slow motion; tt = real time (s). glow_fn(tt) -> glow strength 0..1"""
        self.tt = tt0
        th0 = 2 * PI * F_SHAFT * tt0
        self.pin.rotate(th0, axis=OUT, about_point=AXP)
        self.gear.rotate(-th0 / 2, axis=OUT, about_point=AXG)

        def turn(m, dt):
            d = 2 * PI * F_SHAFT * dt / SLOW
            self.tt += dt / SLOW
            self.pin.rotate(d, axis=OUT, about_point=AXP)
            self.gear.rotate(-d / 2, axis=OUT, about_point=AXG)
            self.pin_shaft.rotate(d, axis=OUT, about_point=AXP)
            th = 2 * PI * F_SHAFT * self.tt
            gl = glow_fn(self.tt) if glow_fn else 0.0
            mp = AXP + np.array([R3P + self.E3 * np.cos(th), 0, W3 / 2 + 0.06])
            for d_, o in zip(self.glow, (1.0, 0.5, 0.25)):
                d_.move_to(mp).set_opacity(o * gl)

        sp = Mobject().add_updater(turn)
        self.add(sp)
        return sp

    def mesh_ticks(self, t_from, t_to, level_fn, tt0=0.0):
        """schedule one soft tick per tooth mesh (400 per real second = one every 0.125 s on screen)
        between scene times t_from and t_to; level_fn(tt, scene_t) -> 0..1"""
        n0 = int(np.ceil((t_from / SLOW + tt0) * F_MESH))
        n1 = int(np.floor((t_to / SLOW + tt0) * F_MESH))
        for n in range(n0, n1 + 1):
            tt = n / F_MESH
            st = (tt - tt0) * SLOW
            lv = float(np.clip(level_fn(tt, st), 0, 1))
            if lv > 0.02:
                self.snd(mesh_tick(int(round(lv * 7))), at=st)

    def construct(self):
        self.glow_on = 0.0
        rig = self.gearbox()
        self.set_camera_orientation(phi=48 * DEGREES, theta=-130 * DEGREES, zoom=0.55)
        self.add(rig)
        am_glow = lambda tt: self.glow_on * (1 + M_AM * np.cos(2 * PI * F_SHAFT * tt)) / (1 + M_AM) * \
            (0.5 + 0.5 * np.cos(2 * PI * F_MESH * tt)) ** 2
        self.spin(0.0, am_glow)
        ramp = lambda st: float(np.clip((st - 4.5) / 4.0, 0.15, 1.0))           # far away at first, close after the swoop
        self.mesh_ticks(1.5, 17.0, lambda tt, st: ramp(st) * (1 + M_AM * np.cos(2 * PI * F_SHAFT * tt)) / (1 + M_AM))
        self.fade_in(1.5)
        with self.line("A gearbox at 1,500 rpm.", extra=-0.3) as d:
            self.cam(2.2, theta=-95 * DEGREES, zoom=0.75)
        with self.line("Slowed down 50 times.") as d:
            self.cam(3.3, phi=63 * DEGREES, theta=-72 * DEGREES, zoom=1.45, frame_center=MESH3 + np.array([0.1, 0, -0.1]))
        self.glow_on = 1.0
        with self.line("Nothing is made perfect: this pinion sits a hair off-centre.") as d:
            self.cam(3.6, phi=57 * DEGREES, theta=-88 * DEGREES, zoom=1.75, frame_center=MESH3 + np.array([-0.2, 0, -0.1]))
        with self.line("Every turn, it bites harder, then softer.") as d:
            self.cam(3.2, theta=-104 * DEGREES, zoom=1.9, rate_func=linear)
        self.dip_out(0.45)


# =====================================================================
# Shot 3: why they are there - pull the swell apart, then look along time
# =====================================================================
SPAN3 = 0.08                         # seconds of signal drawn (two turns)
XS3 = 4.6                            # half-length of the time axis
YS3 = 1.9                            # depth between neighbouring frequency lanes (25 Hz)
ZS3 = 1.0                            # height per unit amplitude
x_of_t = lambda t: -XS3 + 2 * XS3 * t / SPAN3
y_of_f = lambda f: (f - F_MESH) / F_SHAFT * YS3


def curve3d(fn, y, color, width=2.6, n=1400, z0=0.0):
    ts = np.linspace(0, SPAN3, n)
    pts = np.array([[x_of_t(t), y, z0 + ZS3 * fn(t)] for t in ts])
    c = VMobject(stroke_color=color, stroke_width=width)
    c.set_points_as_corners(pts)
    return c


def face_x(mob):
    """turn flat text so it reads from a camera on the +x axis (looking back along time)"""
    return mob.rotate(PI / 2, axis=RIGHT).rotate(PI / 2, axis=OUT)


def face_front(mob):
    return mob.rotate(PI / 2, axis=RIGHT)


class Why3D(Film3D):
    def construct(self):
        self.set_camera_orientation(phi=90 * DEGREES, theta=-90 * DEGREES, zoom=1.0, frame_center=[0, 0, 0.15])
        env = lambda t: 1 + M_AM * np.cos(2 * PI * F_SHAFT * t)
        full = curve3d(lambda t: env(t) * np.cos(2 * PI * F_MESH * t), 0.0, INK)
        e_up = curve3d(env, 0.0, STARc, 3.0)
        e_dn = curve3d(lambda t: -env(t), 0.0, STARc, 3.0)
        lanes_spec = [(F_MESH - F_SHAFT, M_AM / 2, C_LO), (F_MESH, 1.0, C_CAR), (F_MESH + F_SHAFT, M_AM / 2, C_UP)]
        lanes = [curve3d(lambda t, f=f, a=a: a * np.cos(2 * PI * f * t), y_of_f(f), c, 2.6) for f, a, c in lanes_spec]
        t_axis = Line([-XS3 - 0.2, 0, 0], [XS3 + 0.2, 0, 0], stroke_color=AXc, stroke_width=2)
        f_axis = Line([XS3 + 0.45, -2.7, 0], [XS3 + 0.45, 2.7, 0], stroke_color=AXc, stroke_width=2)
        self.add(t_axis)
        self.fade_in(0.5)
        self.header("WHY THEY ARE THERE", "A slow wobble on a fast tone")
        with self.line("The 400 Hz mesh tone, its size wobbling once per turn.", extra=0.0) as d:
            self.play(Create(full), run_time=1.3, rate_func=linear)
            self.play(full.animate.set_stroke(opacity=0.45), Create(e_up), Create(e_dn), run_time=0.9)
        with self.line("Tone times wobble: engineers call it amplitude modulation.", extra=0.1) as d:
            self.maths(r"(1 + m\cos\Omega t)\,\cos\omega t", "(1 + m cos Ωt) cos ωt")
        eq2 = r"(1 + m\cos\Omega t)\cos\omega t = \cos\omega t + \tfrac{m}{2}\cos(\omega+\Omega)t + \tfrac{m}{2}\cos(\omega-\Omega)t"
        with self.line("And a product of cosines is a sum of cosines.", extra=0.3) as d:
            self.maths(eq2, "(1 + m cos Ωt) cos ωt = cos ωt + (m/2)cos(ω+Ω)t + (m/2)cos(ω−Ω)t", size=30, rt=1.2)
        copies = [full.copy() for _ in lanes]
        with self.line("Pull it apart: three steady tones, side by side in frequency.", extra=0.4) as d:
            self.snd(soft_click_rev("unclick3d", 0.05, 1800, 300, 0.009, 0.16), at=0.0)
            self.add(*copies)
            self.remove(full)
            self.cam(2.6, phi=66 * DEGREES, theta=-58 * DEGREES, zoom=0.82, frame_center=[0.3, 0, 0.1],
                     added_anims=[*[Transform(c_, l_) for c_, l_ in zip(copies, lanes)], FadeOut(e_up), FadeOut(e_dn), FadeIn(f_axis)])
        self.maths_clear()
        stems3 = VGroup(*[Line([XS3 + 0.45, y_of_f(f), 0], [XS3 + 0.45, y_of_f(f), ZS3 * a], stroke_color=c, stroke_width=9)
                          for f, a, c in lanes_spec])
        labels = VGroup(*[face_x(T(s, 26, MUTED, BOLD)).move_to([XS3 + 0.5, y_of_f(f), -0.32])
                          for s, f in (("375", 375), ("400", 400), ("425 Hz", 425))])
        gap = VGroup(DoubleArrow([XS3 + 0.5, y_of_f(375), 0.62], [XS3 + 0.5, y_of_f(400), 0.62], color=STARc, buff=0, stroke_width=4,
                                 tip_length=0.18), face_x(T("25 Hz", 26, STARc, BOLD)).move_to([XS3 + 0.5, y_of_f(387.5), 0.95]))
        with self.line("Seen end-on, like in the first video: each tone is one line.", extra=0.9) as d:
            self.callback("HARMONICS", 1, "What the FFT actually shows")
            self.cam(3.0, phi=86 * DEGREES, theta=0 * DEGREES, zoom=1.15, frame_center=[XS3, 0, 0.35],
                     added_anims=[*[c_.animate.set_stroke(opacity=0.12) for c_ in copies]])
            for i, tt in enumerate(lag_times(3, 0.9, 0.3)):
                self.snd(self_tick(), at=tt)
            self.play(LaggedStart(*[GrowFromPoint(s_, s_.get_start()) for s_ in stems3], lag_ratio=0.3), FadeIn(labels), run_time=0.9)
            self.snd(self_tick())
            self.play(GrowFromCenter(gap), run_time=0.5)
        self.callback_off()
        with self.line("Add them back together, and the swell returns.", extra=0.2) as d:
            self.snd(soft_click("click3d", 0.05, 1800, 300, 0.009, 0.16), at=2.75)
            self.cam(2.8, phi=90 * DEGREES, theta=-90 * DEGREES, zoom=1.0, frame_center=[0, 0, 0.15],
                     added_anims=[FadeOut(stems3), FadeOut(labels), FadeOut(gap), FadeOut(f_axis),
                                  *[c_.animate.set_stroke(opacity=1).shift(np.array([0, -y_of_f(f), 0]))
                                    for c_, (f, a, c) in zip(copies, lanes_spec)]])
            self.add(full.set_stroke(opacity=1))
            self.remove(*copies)
            self.play(Indicate(full, color=INK, scale_factor=1.02), run_time=0.6)
        self.dip_out()


# =====================================================================
# Shot 5: are they normal? when to worry? a waterfall of monthly spectra
# =====================================================================
XW = 4.6
YW = 0.55                                         # depth per month
ZW = 2.4                                          # height of 60 dB
xw = lambda f: (f - F_MESH) / 150.0 * XW
zw = lambda d: max(0.0, (d - DB_FLOOR) / -DB_FLOOR * ZW)


def month_slice(mo):
    sig = gear_signal(TS_, M_OF_MONTH(mo), CRACK_A[mo])
    y = mo * YW
    g = VGroup(Line([-XW - 0.1, y, 0], [XW + 0.1, y, 0], stroke_color=AXc, stroke_width=1.6))
    for f, d, c in db_lines(sig):
        g.add(Line([xw(f), y, 0], [xw(f), y, zw(d)], stroke_color=c, stroke_width=5))
    return g


class Waterfall3D(Film3D):
    def construct(self):
        self.set_camera_orientation(phi=80 * DEGREES, theta=-90 * DEGREES, zoom=1.35, frame_center=[0, 0, 1.0])
        slices = [month_slice(m) for m in range(13)]
        lab0 = face_front(T("month 0", 22, MUTED, BOLD)).move_to([-XW + 0.2, 0, -0.32])
        self.fade_in(0.5)
        self.header("ARE THEY NORMAL?", "Yes: small and steady")
        with self.line("Nothing is made perfect: a healthy gearbox shows small sidebands.", extra=0.6) as d:
            for tt in lag_times(len(slices[0]), 1.0, 0.12):
                self.snd(self_tick(), at=tt)
            self.play(LaggedStart(*[Create(s_) for s_ in slices[0]], lag_ratio=0.12), FadeIn(lab0), run_time=1.0)
        with self.line("That is normal. What matters is how they change.", extra=-0.4) as d:
            pass
        self.snd(hit(0.24), at=0.05)
        self.header("WHEN TO WORRY", "When they grow")
        labs = VGroup(*[face_front(T(s, 24, MUTED, BOLD)).move_to([-XW - 0.45, m * YW, 0.12]) for s, m in (("6", 6), ("12", 12))])
        trend = VMobject(stroke_color=STARc, stroke_width=4)
        tops = [[xw(425), m * YW, zw(TREND_FULL[m])] for m in range(13)]
        with self.line("Stack a spectrum every month: a waterfall plot. Wear makes them grow.", extra=0.8) as d:
            ts = lag_times(9, 3.2, 0.45)
            for tt in ts:
                self.snd(self_tick(), at=tt + 0.1)
            self.cam(3.2, phi=62 * DEGREES, theta=-58 * DEGREES, zoom=0.78, frame_center=[0.2, 3.4, 0.9],
                     added_anims=[LaggedStart(*[FadeIn(s_, shift=OUT * 0.2) for s_ in slices[1:10]], lag_ratio=0.45), FadeIn(labs[0])])
            trend.set_points_as_corners(tops[:10])
            self.play(Create(trend), run_time=0.8)
        with self.line("Then they multiply: something has started to knock.", extra=1.0) as d:
            for i, at in enumerate(lag_times(3, 2.8, 0.75)):
                self.snd(thud(0.12 + 0.04 * i), at=at + 0.2)
            self.cam(2.8, theta=-42 * DEGREES, zoom=1.0, frame_center=[0.2, 5.4, 0.9],
                     added_anims=[LaggedStart(*[FadeIn(s_, shift=OUT * 0.3) for s_ in slices[10:]], lag_ratio=0.75), FadeIn(labs[1])])
        self.dip_out()


# =====================================================================
# Shot 6: the cracked tooth, close up
# =====================================================================
class Crack3D(Opener3D):
    E3 = 0.0

    def construct(self):
        rig = self.gearbox(pin_mark=BADc, glow_col=BADc)
        self.set_camera_orientation(phi=58 * DEGREES, theta=-98 * DEGREES, zoom=1.7, frame_center=MESH3 + np.array([0.0, 0, -0.1]))
        self.add(rig)
        tt0 = -0.03                                    # real time at the start: the red tooth meets the gear at tt = k / 25 s
        def flash(tt):                                 # the knock lasts ~1 ms; on screen it is held ~0.2 s so the eye catches it
            ph = np.mod(tt, 1 / F_SHAFT)
            d = min(ph, 1 / F_SHAFT - ph)
            return float(np.exp(-d ** 2 / (2 * 0.004 ** 2)))

        self.spin(tt0, flash)
        self.mesh_ticks(0.3, 13.0, lambda tt, st: 0.45, tt0=tt0)
        knock = thud(0.24)
        for k in range(0, 8):                          # one knock sound each time the red tooth meshes (every 2 s on screen)
            at = (k / F_SHAFT - tt0) * SLOW
            self.snd(knock, at=at)
        self.fade_in(0.5)
        self.header("ONE CRACKED TOOTH", "Short knock, many sidebands")
        with self.line("A cracked tooth: one knock, once per turn.", extra=2.0) as d:
            self.cam(3.6, zoom=2.05, theta=-90 * DEGREES, rate_func=linear)
        self.dip_out()
