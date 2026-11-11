"""
Wavelets: which frequencies, and when.   Cinematic cut, 90 s target, 120 s hard cap. Captions + music + sound, no voice.

Built on wavelets.py (same maths, theme, Wiggle, focus/stamp, check modes); that file is not changed.
New here: a cold open that teases the answer, a "boxes in time and frequency" act (STFT tiles morph into
wavelet tiles of the same area), and your own music track, cut so its big swell lands on the machine reveal.

    STORY=1 manim -ql wavelets_film.py WaveletsFilm     # fastest check: stills + report.txt + contact_sheet.png
    manim -ql wavelets_film.py WaveletsFilm             # draft video, 480p15
    manim -qh wavelets_film.py WaveletsFilm             # final, 1080p60
    manim -qh wavelets_film.py TilesOnly                # one act only (also ColdOpenOnly)

Music: WV_TRACK=spread (default) | subtle | sunflower.  MUSIC_GAIN=0.35 (track level).
The mp3 is found automatically next to or below the parent folder; WV_MUSIC_DIR overrides that.
"""
import json
import os
import subprocess
import sys
import time as _time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))   # so 'import wavelets' works from any folder

import numpy as np
import wavelets as wv
from wavelets import *  # noqa: F401,F403  theme, maths, WVFilm, helpers, manim

HERE = os.path.dirname(os.path.abspath(__file__))
MAX_LEN = 120.0
MUSIC_DIR = os.environ.get("WV_MUSIC_DIR", "")   # optional; otherwise the mp3 is searched for (see find_track)
MUSIC_GAIN = float(os.environ.get("MUSIC_GAIN", "0.35"))
# file, and the time (s) in the track where its main swell comes back (measured from per-second loudness)
TRACKS = {
    "spread": ("spread-the-light-vocalista-main-version-48048-02-20.mp3", 87.0),
    "subtle": ("subtle-resolve-enrique-molano-main-version-45946-02-55.mp3", 98.0),
    "sunflower": ("sunflower-ra-main-version-38935-02-39.mp3", 126.0),
}

# tilings of the time-frequency plane: 30 boxes each, all with the same area (W*H/30)
TILE_COLS, TILE_ROWS = 6, 5                    # short FFT: one box shape everywhere
WAVE_ROWS = 4                                  # wavelet: row k has 2^(k+1) boxes, height 2^k units, 15 units total


def stft_tiles(W, H):
    return [(c * W / TILE_COLS, r * H / TILE_ROWS, W / TILE_COLS, H / TILE_ROWS)
            for r in range(TILE_ROWS) for c in range(TILE_COLS)]


def wavelet_tiles(W, H):
    unit = H / (2 ** WAVE_ROWS - 1)
    out, y = [], 0.0
    for k in range(WAVE_ROWS):
        h, n = unit * 2 ** k, 2 ** (k + 1)
        out += [(c * W / n, y, W / n, h) for c in range(n)]
        y += h
    return out


# the 'multiply and add up the area' beat: a 25 Hz burst centred where the 25 Hz part peaks, then over the 10 Hz part
B_IN, B_OUT = 0.75, 0.25            # sin(2 pi 25 (0.75 - 0.5)) = 1, so the burst and the signal are in step at 0.75


def match_product(b, f=F_HI, n=300):
    a = scale_of(f)
    ts = np.linspace(max(0.0, b - 3.3 * a), min(1.0, b + 3.3 * a), n)
    return ts, sig_a(ts) * morlet((ts - b) / a)


def match_area(b, f=F_HI):
    ts, pr = match_product(b, f)
    return float(pr.sum() * (ts[1] - ts[0]))


# ----------------------------------------------------------------- physics check: add the tiling claims
_base_check = wv.physics_check


def physics_check():
    out = _base_check()
    W, H = 8.6, 3.3
    a_s = [w * h for _, _, w, h in stft_tiles(W, H)]
    a_w = [w * h for _, _, w, h in wavelet_tiles(W, H)]
    same = np.allclose(a_s, a_s[0]) and np.allclose(a_w, a_s[0]) and len(a_s) == len(a_w) == 30
    out.append((same, "short-FFT boxes and wavelet boxes all have the same area (30 each)",
                f"{a_s[0]:.4f} vs {min(a_w):.4f} to {max(a_w):.4f}"))
    covers = abs(sum(a_w) - W * H) < 1e-9 and abs(sum(a_s) - W * H) < 1e-9
    out.append((covers, "both tilings cover the whole plane exactly", f"{sum(a_s):.4f} = {sum(a_w):.4f} = {W * H:.4f}"))
    s_in, s_out = match_area(B_IN), match_area(B_OUT)
    out.append((s_in > 0 and abs(s_out / s_in) < 0.05,
                "25 Hz burst x signal: big positive area in step, near zero over the 10 Hz part",
                f"in step {s_in:.4f}, over the slow part {s_out / s_in:+.3f} of that"))
    return out


wv.physics_check = physics_check            # write_snap_index() in wavelets.py looks this name up at run time


# ----------------------------------------------------------------- music: your track, trimmed to the film
def _decode(path):
    """mp3 -> mono float32 at SR. PyAV first (it ships with Manim), then the ffmpeg command line."""
    if not os.path.exists(path):
        return None
    try:
        import av
        parts = []
        with av.open(path) as c:
            rs = av.AudioResampler(format="s16", layout="mono", rate=SR)
            for fr in c.decode(c.streams.audio[0]):
                parts += [o.to_ndarray().reshape(-1) for o in rs.resample(fr)]
            parts += [o.to_ndarray().reshape(-1) for o in rs.resample(None)]
        return np.concatenate(parts).astype(np.float32) / 32768
    except Exception as e:
        print(f"[music] PyAV decode failed ({e!r}); trying ffmpeg")
    try:
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                             capture_output=True, check=True).stdout
        return np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    except Exception as e:
        print(f"[music] ffmpeg decode failed ({e!r})")
        return None


def find_track(fname):
    """the mp3 can sit in WV_MUSIC_DIR, ../audio_files, ./audio_files, this folder, the parent folder,
    or anywhere below the parent folder (e.g. Downloads/project/wavelets + Downloads/project/audio_files)"""
    parent = os.path.abspath(os.path.join(HERE, ".."))
    for d in (MUSIC_DIR, os.path.join(parent, "audio_files"), os.path.join(HERE, "audio_files"), HERE, parent):
        if d and os.path.isfile(os.path.join(d, fname)):
            return os.path.join(d, fname)
    for root, dirs, files in os.walk(parent):
        if fname in files:
            return os.path.join(root, fname)
        if root[len(parent):].count(os.sep) >= 2:      # search at most 3 levels deep, never a whole drive
            dirs[:] = []
    return None


def film_music(total, t_hit=None):
    """the chosen track, cut to the film length; the track's swell is placed on t_hit (the machine reveal)"""
    name = os.environ.get("WV_TRACK", "spread").lower()
    fname, swell = TRACKS.get(name, TRACKS["spread"])
    path = find_track(fname)
    y = _decode(path) if path else None
    if y is None or len(y) < SR:
        print(f"[music] {fname} not found next to or below {os.path.abspath(os.path.join(HERE, '..'))}; "
              f"using the synthesised score instead (set WV_MUSIC_DIR to the folder with the mp3)")
        return wv.music(total)
    L = len(y) / SR
    off = 0.0 if t_hit is None else swell - t_hit
    # swell earlier in the track than the reveal in the film: the cold open plays without music (knocks only)
    # and the track comes in later, so the swell still lands on the reveal
    lead = float(np.clip(-off, 0.0, 15.0))
    start = float(np.clip(off, 0.0, max(0.0, L - (total - lead) - 0.5)))
    n = int((total - lead) * SR)
    seg = y[int(start * SR):int(start * SR) + n]
    seg = np.pad(seg, (0, max(0, n - len(seg))))
    t = np.arange(n) / SR
    seg = seg * np.minimum(1, t / (2.5 if lead > 0 else 1.5)) * np.clip((total - lead - t) / 3.5, 0, 1) * MUSIC_GAIN
    out = np.zeros(int(total * SR), dtype=np.float32)
    i0 = int(lead * SR)
    out[i0:i0 + len(seg)] = seg[:len(out) - i0]
    hit = f", machine reveal at {t_hit:.1f} s" if t_hit is not None else ""
    print(f"[music] {fname}: enters at {lead:.1f} s of the film from {start:.1f} s of the track; "
          f"swell lands at {lead + swell - start:.1f} s{hit}")
    return wav("track.wav", out)


# =====================================================================
# The film
# =====================================================================
class WaveletsFilm(WVFilm):
    PARTS = ["f_cold", "p_hook", "p_stft", "f_tiles", "p_wavelet", "p_machine"]

    def construct(self):
        # same start-up as WVFilm.construct; only the music and the runtime guard differ
        self.t_anim = 0.0
        clock = Mobject()
        clock.add_updater(lambda m, dt: setattr(self, "t_anim", self.t_anim + dt))
        self.add(clock)
        self.snd = {"pop": soft_click("pop", 0.05, 1800, 300, 0.009, 0.16), "tick": soft_click("tick", 0.03, 3000, 700, 0.005, 0.10),
                    "whoosh": noise_swell("whoosh", 0.8, 0.12), "swoosh": noise_swell("swoosh", 0.6, 0.09, 15, 4),
                    "sweep": noise_swell("sweep", 2.2, 0.07, 30, 5), "thud": thud(0.2), "stamp": stamp_snd(0.22)}
        self.cap = self.hdr = self.eqn = None
        self.badges = []
        self.snap_n, self.snap_log, self.part, self.wig_mob = 0, [], "", None
        self._sfx = []
        self.snap_dir = os.path.join(SNAP_DIR, type(self).__name__)
        self.setup_wiggle()
        self.cuts = []
        self.t_machine = None
        self.add(*[Rectangle(width=FW + 1, height=BAR_H + 0.5, stroke_width=0, fill_color="#000000", fill_opacity=1)
                   .move_to([0, s_ * (FH / 2 - BAR_H / 2 + 0.25), 0]).set_z_index(70) for s_ in (1, -1)])
        veil = Rectangle(width=FW + 1, height=FH + 1, stroke_width=0, fill_color="#000000", fill_opacity=1).set_z_index(99)
        self.add(veil)
        self.play(FadeOut(veil), run_time=1.2)
        self.part_times = {}
        for p in self.PARTS:
            self.part = p
            t0 = _time.time()
            getattr(self, p)()
            self.part_times[p] = (_time.time() - t0, self.renderer.time)
            print(f"[part done] {p:11s} {_time.time() - t0:7.1f} s   film at {self.renderer.time:6.1f} s", flush=True)
        total = float(self.renderer.time)
        flag = "OK" if total <= MAX_LEN else f"TOO LONG by {total - MAX_LEN:.1f} s"
        print(f"[runtime] {total:.1f} s (target 90, cap {MAX_LEN:.0f}): {flag}", flush=True)
        self.write_snap_index()
        if not STORY:
            with open(os.path.join(HERE, "cuts.json"), "w") as fh:
                json.dump({"cuts": self.cuts, "total": total, "bar_h": BAR_H / FH, "t_machine": self.t_machine}, fh)
        if total > 1 and not MUTE:
            self._sfx.append((0.0, film_music(total, self.t_machine)))
            Scene.add_sound(self, mix_down(self._sfx, total), time_offset=-total)

    # ------------------------------------------------------------ act 1: cold open with a glimpse of the answer
    def f_cold(self):
        W = self.WIDE["w"]
        span = M_SHOW[1] - M_SHOW[0]
        ax = self.axes([0, span, span], [-2.8, 2.8, 1], W + 2.4, 2.4, [0, 0.1, 0])
        i0, i1 = int(M_SHOW[0] * FS_M), int(M_SHOW[1] * FS_M)
        pts = np.array([ax.c2p(a, y) for a, y in zip(T_M[i0:i1] - M_SHOW[0], X_M[i0:i1])])
        p = ValueTracker(0.0)
        sig = always_redraw(lambda: poly(pts[:max(2, int(p.get_value() * len(pts)))], INK, 3.0))
        self.cuts.append(float(self.renderer.time))
        with self.line("A machine knocks. Once every turn.", extra=1.0) as v:
            self.add(sig)
            rt = v.left(0.5)
            for k in range(6):
                self.add_sound(self.snd["thud"], time_offset=0.3 + rt * (0.012 + k * T_TURN) / span)
            self.play(FadeIn(ax), run_time=0.3)
            self.play(p.animate(rate_func=linear).set_value(1), run_time=rt)
        sig.clear_updaters()
        im, frame, _cover = self.heat(CWT_M, W + 2.4, 2.4, [0, 0.1, 0], gamma=0.38)
        with self.line("A spectrum tells you what rings, not when. This picture shows both.", extra=0.3) as v:
            self.play(sig.animate.set_stroke(opacity=0.3), ax.animate.set_stroke(opacity=0.3), run_time=v.frac(0.3))
            self.sfx("whoosh")
            self.play(FadeOut(sig), FadeOut(ax), FadeIn(im, scale=1.06), FadeIn(frame), run_time=0.8)
            self.play(im.animate(rate_func=linear).scale(1.03), frame.animate(rate_func=linear).scale(1.03),
                      run_time=v.left(0.6))
        self.play(FadeOut(im), FadeOut(frame), run_time=0.5)
        self.part_card("WHICH, AND WHEN", "Wavelets")

    # ------------------------------------------------------------ act 3b: boxes in time and frequency
    def _tile(self, L, B, x, y, w, h, color):
        return Rectangle(width=max(w - 0.06, 0.02), height=max(h - 0.06, 0.02), stroke_color=color, stroke_width=2.5,
                         fill_color=color, fill_opacity=0.18).move_to([L + x + w / 2, B + y + h / 2, 0])

    def f_tiles(self):
        self.ensure_wiggle()
        self.w_feel("neutral", hop=False)
        self.header("THE TRADE", "Boxes in time and frequency")
        W, X0 = self.WIDE["w"], self.WIDE["x"]
        H, Y0 = 3.3, -0.25
        L, B = X0 - W / 2, Y0 - H / 2
        plane = Rectangle(width=W, height=H, stroke_color=AXc, stroke_width=2).move_to([X0, Y0, 0])
        xl = T("time", 18, MUTED, BOLD).next_to(plane, DOWN, buff=0.12)
        yl = T("frequency", 18, MUTED, BOLD).rotate(PI / 2).next_to(plane, LEFT, buff=0.15)
        grid = VGroup(*[self._tile(L, B, *t, BLUEc) for t in stft_tiles(W, H)])
        wave = VGroup(*[self._tile(L, B, *t, ORANGEc) for t in wavelet_tiles(W, H)])
        with self.line("Each short FFT paints the same box in time and frequency.") as v:
            self.play(Create(plane), FadeIn(xl), FadeIn(yl), run_time=0.5)
            self.sfx("pop")
            self.play(LaggedStart(*[FadeIn(t, scale=0.6) for t in grid], lag_ratio=0.04), run_time=v.frac(0.45))
        hero = grid[14].copy().set_stroke(INK, 4).set_fill(INK, 0.3).set_z_index(5)
        with self.line("Squash one side and the other grows. Same area.", extra=0.3) as v:
            self.add(hero)
            self.sfx("tick")
            self.play(hero.animate.stretch(0.5, 0).stretch(2.0, 1), run_time=0.6)
            self.sfx("tick")
            self.play(hero.animate.stretch(4.0, 0).stretch(0.25, 1), run_time=0.7)
            self.play(hero.animate.stretch(0.5, 0).stretch(2.0, 1), run_time=0.5)
            self.w_feel("worried", hop=False)
        self.remove(hero)
        fast = T("fast", 20, ORANGEc, BOLD).next_to(plane, RIGHT, buff=0.15).align_to(plane, UP)
        slow = T("slow", 20, ORANGEc, BOLD).next_to(plane, RIGHT, buff=0.15).align_to(plane, DOWN)
        with self.line("Wavelets reshape the boxes: thin for fast notes, wide for slow ones.", extra=0.2) as v:
            self.sfx("sweep")
            self.play(Transform(grid, wave), run_time=1.6)
            self.play(FadeIn(fast, shift=LEFT * 0.2), FadeIn(slow, shift=LEFT * 0.2), run_time=0.4)
            self.w_feel("happy")
        n_top = 2 ** WAVE_ROWS
        top_tile, low_tile = grid[len(grid) - n_top], grid[0]
        self.focus([top_tile.copy(), low_tile.copy()], "same area, different shape", OKc, hold=0.35)
        self.w_feel("neutral", hop=False)
        self.clear_board(plane, xl, yl, grid, fast, slow)

    # ------------------------------------------------------------ act 4: the wavelet, now with 'multiply and add the area'
    def p_wavelet(self):
        """wavelets.py's act with one new beat (why the score is high) and the 'short bursts / long' line
        dropped, because the boxes act already shows it"""
        self.ensure_wiggle()
        self.w_feel("neutral", hop=False)
        self.header("THE IDEA", "A wavelet")
        if getattr(self, "ax", None) is None:
            self.ax, self.sig = self.wide_signal()
            self.add(self.ax, self.sig)
        ax, sig = self.ax, self.sig
        W, X0 = self.WIDE["w"], self.WIDE["x"]
        us = np.linspace(-3.6, 3.6, 400)
        big_pts = lambda fn: np.array([[X0 + 0.85 * u, 0.15 + 1.25 * fn(u), 0] for u in us])
        big = poly(big_pts(morlet), INK, 4.5)
        envl = VGroup(*[DashedVMobject(VMobject(stroke_color=MUTED, stroke_width=2).set_points_as_corners(
            big_pts(lambda u, s=s: s * np.exp(-u ** 2 / 2))), num_dashes=40) for s in (1, -1)])
        with self.line("A wavelet is a short burst of a wave.", extra=0.9) as v:
            self.play(FadeOut(ax), FadeOut(sig), run_time=0.4)
            self.sfx("pop")
            self.play(Create(big), run_time=v.frac(0.3))
            self.play(FadeIn(envl), run_time=0.4)
            self.maths(r"\psi(t) = e^{-t^{2}/2}\; e^{\,i\omega_0 t}", "ψ(t) = e^(−t²/2) · e^(iω₀t)", size=42, rt=0.8)
            self.w_shape("burst", rt=0.6)
            self.w_say("Short and wiggly. Like me!")
        self.w_hush()

        b, fq = ValueTracker(B_IN), ValueTracker(F_HI)

        def glyph():
            f = fq.get_value()
            a = scale_of(f)
            mixc = interpolate_color(ManimColor(BLUEc), ManimColor(ORANGEc), (f - F_LO) / (F_HI - F_LO))
            ts = b.get_value() + a * np.linspace(-3.3, 3.3, 260)
            keep = (ts > -0.03) & (ts < 1.03)
            pts = np.array([ax.c2p(t_, 0.95 * morlet((t_ - b.get_value()) / a)) for t_ in ts[keep]])
            return poly(pts, mixc, 4.2)

        # the new beat: the product of burst and signal, its area shaded (orange above zero, blue below)
        aP = self.axes([0, 1, 0.5], [-1.1, 1.1, 1], W, 1.25, [X0, -1.15, 0])
        p_lab = T("signal × wavelet", 18, MUTED, BOLD).next_to(aP, UP, buff=0.05).align_to(aP, LEFT)
        s_ref = match_area(B_IN)

        def prod_mob():
            ts, pr = match_product(b.get_value(), fq.get_value())
            base = [aP.c2p(t_, 0) for t_ in ts[::-1]]
            up = [aP.c2p(t_, max(v_, 0.0)) for t_, v_ in zip(ts, pr)]
            dn = [aP.c2p(t_, min(v_, 0.0)) for t_, v_ in zip(ts, pr)]
            return VGroup(Polygon(*up, *base, stroke_width=0, fill_color=ORANGEc, fill_opacity=0.55),
                          Polygon(*dn, *base, stroke_width=0, fill_color=BLUEc, fill_opacity=0.55),
                          poly(np.array([aP.c2p(t_, v_) for t_, v_ in zip(ts, pr)]), INK, 2.6, glow=False))

        def score_mob():
            s = match_area(b.get_value(), fq.get_value()) / s_ref
            s = 0.0 if abs(s) < 0.005 else s            # no "-0.00"
            col = OKc if s > 0.5 else MUTED
            return T(f"area = {s:+.2f}", 22, col, BOLD).next_to(aP, UP, buff=0.05).align_to(aP, RIGHT)

        g0 = glyph()
        prod, num = always_redraw(prod_mob), always_redraw(score_mob)
        with self.line("Multiply burst and signal. In step, the area piles up: high score.", extra=0.6) as v:
            self.play(FadeOut(envl), FadeIn(ax), FadeIn(sig.set_stroke(opacity=0.45)), ReplacementTransform(big, g0),
                      FadeIn(aP), FadeIn(p_lab), run_time=0.8)
            self.remove(g0)
            gl = always_redraw(glyph)
            self.add(gl)
            self.sfx("pop")
            self.play(FadeIn(prod), FadeIn(num), run_time=0.6)
            self.w_feel("happy", hop=False)
        with self.line("Over the slow part, plus and minus cancel: score near zero.", extra=0.5) as v:
            self.sfx("swoosh")
            self.play(b.animate.set_value(B_OUT), run_time=1.4)
            self.w_feel("worried", hop=False)
        prod.clear_updaters()
        num.clear_updaters()
        self.play(FadeOut(prod), FadeOut(num), FadeOut(aP), FadeOut(p_lab), b.animate.set_value(0.06), run_time=0.6)
        self.w_feel("neutral", hop=False)

        aS = self.axes([0, 1, 0.5], [0, 1.2, 1], W, 1.25, [X0, -1.15, 0])
        s_lab = T("score", 18, MUTED, BOLD).move_to([aS.get_left()[0] - 0.15, aS.get_center()[1], 0], aligned_edge=RIGHT)

        def trace(f, color):
            row = ROW[f] / ROW[f].max()
            n = max(2, int(np.clip(b.get_value(), 0, 1) * (len(TT) - 1)))
            return poly(np.array([aS.c2p(TT[i], row[i]) for i in range(0, n, 4)] + [aS.c2p(TT[n], row[n])]), color, 3.4)

        with self.line("Now slide it along and record the score.", extra=0.6) as v:
            self.play(FadeIn(aS), FadeIn(s_lab), run_time=0.4)
            tr_hi = always_redraw(lambda: trace(F_HI, ORANGEc))
            self.add(tr_hi)
            self.sfx("sweep")
            self.play(b.animate(rate_func=linear).set_value(0.94), run_time=v.left(0.4))
            tr_hi.clear_updaters()
        with self.line("Stretch it, and it finds the slow part instead.", extra=1.6) as v:
            self.sfx("swoosh")
            self.play(b.animate.set_value(0.06), fq.animate.set_value(F_LO), run_time=0.9)
            self.maths(r"W(a, b) = \frac{1}{\sqrt{a}} \int x(t)\; \psi^{*}\!\left(\frac{t - b}{a}\right) dt",
                       "W(a, b) = 1/√a ∫ x(t) ψ*((t−b)/a) dt", size=36, rt=0.8)
            tr_lo = always_redraw(lambda: trace(F_LO, BLUEc))
            self.add(tr_lo)
            self.sfx("sweep")
            self.play(b.animate(rate_func=linear).set_value(0.94), run_time=v.left(0.3))
            tr_lo.clear_updaters()
        gl.clear_updaters()
        im, frame, cover = self.heat(CWT_A, W, 2.1, [X0, -0.95, 0])
        ticks = self.f_ticks(frame, (10, 25), log_range=(F_LOG[0], F_LOG[-1]))
        with self.line("Do that for every stretch: a map of which, and when.", extra=0.8) as v:
            self.play(FadeOut(tr_hi), FadeOut(tr_lo), FadeOut(aS), FadeOut(s_lab), FadeOut(gl), sig.animate.set_stroke(opacity=1),
                      run_time=0.5)
            self.add(im, cover)
            self.sfx("sweep")
            self.play(FadeIn(frame), FadeIn(ticks), self.reveal(cover), run_time=v.frac(0.45))
            self.remove(cover)
            self.w_feel("happy")
            self.w_say("Which, and when!")
        self.w_hush()
        self.maths_clear()
        self.clear_board(ax, sig, im, frame, ticks)
        self.ax = None

    # ------------------------------------------------------------ act 5: remember when the machine appears
    def p_machine(self):
        self.t_machine = float(self.renderer.time)
        super().p_machine()


class ColdOpenOnly(WaveletsFilm):
    PARTS = ["f_cold"]


class TilesOnly(WaveletsFilm):
    PARTS = ["f_tiles"]


class WaveletOnly(WaveletsFilm):
    PARTS = ["p_wavelet"]
