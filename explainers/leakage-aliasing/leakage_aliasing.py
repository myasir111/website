"""
Leakage and aliasing: the FFT's two traps.   (LinkedIn cut: captions + sound + music, no narration)

Same look as the Harmonics videos: dark surface, ink captions in a black box at the bottom, orange
kicker + title top-left, result tags top-right, Wiggle the wave mascot on the left, a 3D lane world
for the bins and flat 2D boards wherever a flat picture is clearer. Every key point gets a
"focus" moment: the screen dims, the thing that matters stays lit in a ring, a bold label, a thud.

    manim -qh leakage_aliasing.py LeakageAliasing             # 1920x1080 @ 60 fps
    PREVIEW=1 manim -qh leakage_aliasing.py LeakageAliasing   # 960x540 @ 15 fps (quick look)
    PREVIEW=1 manim -qh leakage_aliasing.py P3Window          # one part only

Parts: P1Intro, P2Leakage, P3Window, P4Aliasing, P5Fix (+ close)
All audio (music bed + effects + the audible aliasing sweep) is synthesised with NumPy into
./la_audio and mixed in by Manim, so the MP4 comes out with its soundtrack.

Story
  intro    the FFT only sees one record, and assumes it repeats forever
  trap 1   bins are lanes (whole cycles per record); 4 cycles -> one lane; 4.5 -> every lane = LEAKAGE
  why      the repeated record has a jump at every seam; a jump needs many frequencies
  fix      a window fades the ends to zero; peel again -> the leak stays near 4.5
  trap 2   a shaft turning 11/s, sampled 12/s, seems to turn backwards: 11 Hz in disguise as 1 Hz
           the spectrum folds at fs/2 like paper; hear a rising tone turn around and fall
  fix      sample faster than 2 x fmax (24/s); filter above fs/2 first
  close    two traps, two fixes; next: wavelets
"""
import os
import shutil
import textwrap
import wave
from contextlib import contextmanager

import numpy as np
from manim import *

# Each KIND of run gets its own text cache folder, e.g. media/texts/1080p30 or media/texts/480p15_STORY.
# Two renders running at the same time (e.g. -ql and -qh) used to write the same text SVG at the same
# moment, and one read it half-written ("ParseError: no element found"). The name is fixed per setting
# (not random), so re-running the same command still reuses Manim's cached clips.
_run_tag = f"{config.pixel_height}p{int(config.frame_rate)}" + "".join(
    "_" + k for k in ("PREVIEW", "CHECK", "STORY") if os.environ.get(k))   # SNAP left out: same video, reuse clips
config.text_dir = os.path.join(os.path.abspath(config.media_dir), "texts", _run_tag)
os.makedirs(config.text_dir, exist_ok=True)


def _register_dejavu():
    """The series font is DejaVu Sans. Windows doesn't ship it, but matplotlib does:
    register matplotlib's copies with Pango so Text() uses the real font, not a fallback.
    Set LA_NO_FONT_REG=1 to skip this (e.g. if DejaVu is installed system-wide)."""
    if os.environ.get("LA_NO_FONT_REG"):
        return
    try:
        import glob
        import manimpango
        import matplotlib
        names = set(manimpango.list_fonts())
        if {"DejaVu Sans", "DejaVu Sans Mono"} <= names:
            return
        for p in glob.glob(os.path.join(matplotlib.get_data_path(), "fonts", "ttf", "DejaVuSans*.ttf")):
            manimpango.register_font(p)
        if "DejaVu Sans" not in set(manimpango.list_fonts()):
            print("[fonts] could not register DejaVu Sans; install it from https://dejavu-fonts.github.io")
    except Exception as e:   # never block a render over a font
        print(f"[fonts] DejaVu registration skipped: {e!r}")


_register_dejavu()

# ----------------------------------------------------------------- theme (matches the harmonics videos)
SURF, INK, INK2, MUTED = "#111110", "#f0efec", "#c3c2b7", "#898781"
GRIDc, AXc, PANEL = "#2c2c2a", "#5a5955", "#1d1d1b"
BLUEc, ORANGEc, GOODc = "#3987e5", "#d95926", "#0ca30c"
OKc, BADc, STARc = "#2bb24c", "#e0503a", "#eda100"


def _font_works(name):
    """test-render a tiny Text; an empty/broken SVG means Pango can't use this font"""
    try:
        return len(Text("Ag", font=name, font_size=20).submobjects) > 0
    except Exception:
        return False


SANS = "DejaVu Sans" if _font_works("DejaVu Sans") else "Verdana"
MONO = "DejaVu Sans Mono"
if SANS != "DejaVu Sans":
    print("[fonts] DejaVu Sans could not be rendered; using Verdana. "
          "Install DejaVu (dejavu-fonts.github.io) and set LA_NO_FONT_REG=1 for the exact series font.")

# Resolution / fps come from the CLI flag (this file used to force 1080p60, which made -ql just as slow):
#   -ql 854x480 @ 15 (fast check)   -qm 1280x720 @ 30   -qh 1920x1080 @ 60 (LinkedIn)
if os.environ.get("PREVIEW"):
    config.pixel_width, config.pixel_height, config.frame_rate = 960, 540, 15
CHECK = bool(os.environ.get("CHECK"))    # one fast pass: small video + stills + layout & physics report
if CHECK:
    config.pixel_width, config.pixel_height, config.frame_rate = 854, 480, 12
    config.disable_caching = True        # Manim hashes the whole scene before every play(); skip it
STORY = bool(os.environ.get("STORY"))    # FASTEST check: no video, no audio, only stills + report
if STORY:
    config.pixel_width, config.pixel_height = 854, 480
    config.disable_caching = True
    config.write_to_movie = False
    config.save_last_frame = True        # = manim -s: Manim jumps through every animation (re-applied each play)
MUTE = CHECK or STORY                     # checks run silent (audio mixing is the heavy, slow step)
SNAP = CHECK or STORY or bool(os.environ.get("SNAP"))   # stills + report
SNAP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "snapshots")
config.background_color = SURF
FW, FH = config.frame_width, config.frame_height


def FIG(fx, fy):
    """figure fractions (0..1) -> frame coordinates, same layout grid as the harmonics videos"""
    return np.array([(fx - 0.5) * FW, (fy - 0.5) * FH, 0.0])


_tc = {}


def _purge_bad_text_svgs():
    """delete empty / half-written text SVGs (left by a cancelled run or two runs writing at once)"""
    import glob
    tdir = str(config.get_dir("text_dir"))
    for f in glob.glob(os.path.join(tdir, "*.svg")):
        try:
            with open(f, "rb") as fh:
                ok = b"</svg>" in fh.read()
            if not ok:
                os.remove(f)
        except OSError:
            pass


def T(s, size=30, color=INK, weight=NORMAL, font=SANS):
    key = (s, size, color, weight, font)
    if key not in _tc:
        for attempt in range(3):
            try:
                _tc[key] = Text(s, font=font, font_size=size, color=color, weight=weight)
                break
            except Exception as e:                    # xml ParseError from a damaged cache file
                if "ParseError" not in type(e).__name__ and "no element found" not in str(e) or attempt == 2:
                    raise
                _purge_bad_text_svgs()
    return _tc[key].copy()


HAS_TEX = shutil.which("latex") is not None and shutil.which("dvisvgm") is not None


def M(tex, plain, size=40, color=INK):
    """maths: LaTeX (MathTex) when installed, otherwise an equivalent bold Text"""
    if HAS_TEX:
        return MathTex(tex, font_size=size, color=color)
    return T(plain, int(size * 0.75), color, BOLD)


def poly(pts, color, width=3.0, opacity=1.0, glow=True):
    core = VMobject(stroke_color=color, stroke_width=width, stroke_opacity=opacity)
    core.set_points_as_corners(pts)
    if not glow:
        return core
    halo = VMobject(stroke_color=color, stroke_width=width * 3.4, stroke_opacity=0.11 * opacity)
    halo.set_points_as_corners(pts)
    return VGroup(halo, core)


def read_time(text):
    return max(1.9, 0.29 * len(text.split()) + 0.9)


# ----------------------------------------------------------------- the records the FFT sees
N_FFT = 64            # samples per record
A_TONE = 0.7
K = 12                # lanes (bins) shown: 1..12 cycles per record
NP = 260
TS = np.linspace(0, 1, NP)


def hann(t):
    return 0.5 * (1 - np.cos(2 * PI * np.asarray(t)))


class Rec:
    """One record of a tone with f cycles, optionally Hann-windowed (amplitude-corrected x2)."""

    def __init__(self, f, win=False):
        self.f, self.win = f, win
        n = np.arange(N_FFT)
        w = 2 * hann(n / N_FFT) if win else np.ones(N_FFT)
        X = np.fft.rfft(A_TONE * np.cos(2 * PI * f * n / N_FFT) * w) / N_FFT
        self.dc = float(X[0].real)
        a, b = 2 * X[1:].real, -2 * X[1:].imag
        a[-1], b[-1] = a[-1] / 2, 0.0          # Nyquist bin
        self.amp = np.hypot(a, b)
        ph = 2 * PI * np.outer(np.arange(1, N_FFT // 2 + 1), TS)
        self.C = a[:, None] * np.cos(ph) + b[:, None] * np.sin(ph)    # every bin as a curve
        self.F = self.dc + self.C.sum(0)        # what the FFT 'believes' the record is

    def cont(self, t):
        """the recorded signal for flat 2D plots (window shown un-corrected, peak = A_TONE)"""
        t = np.asarray(t, dtype=float)
        return A_TONE * np.cos(2 * PI * self.f * t) * (hann(t) if self.win else 1.0)

    def db(self, ks):
        return 20 * np.log10(max(self.amp[k - 1] for k in ks) / self.amp.max())


REC = {"4": Rec(4.0), "45": Rec(4.5), "45w": Rec(4.5, win=True)}
FAR = range(9, K + 1)
DB_RECT, DB_HANN = REC["45"].db(FAR), REC["45w"].db(FAR)

# ----------------------------------------------------------------- 3D world (drawn by our own projector)
XL, DY, FLOOR, BAR_S = 6.6, 0.6, -1.55, 1.5


def wx(t):
    return (np.asarray(t) - 0.5) * XL


def lane_y(k):
    return (k - K / 2) * DY


FRONT_Y = lane_y(0)
BAR_X = XL / 2 + 0.45
# free screen area for the 3D world: right of Wiggle, below the header + maths row, above the captions
WORLD_BOX = (-3.7, 6.75, -2.25, 1.95)       # x0, x1, y0, y1 in frame units


def _fit_view(e_deg, th_deg, fill=0.96):
    """auto-frame: project the world's bounding points (zoom 1, no offset), then pick the zoom and
    offset that centre it in WORLD_BOX. No hand-tuned camera numbers."""
    e, th = np.radians(e_deg), np.radians(th_deg)
    xs = [wx(0) - 0.1, BAR_X + 0.75]
    ys = [lane_y(0) - 0.3, lane_y(K) + 0.3]
    zs = [FLOOR, 1.6]
    P = np.array([[x, y, z] for x in xs for y in ys for z in zs], dtype=float)
    x1 = P[:, 0] * np.cos(th) + P[:, 1] * np.sin(th)
    y1 = -P[:, 0] * np.sin(th) + P[:, 1] * np.cos(th)
    sy = P[:, 2] * np.cos(e) + y1 * np.sin(e)
    s = 18.0 / (18.0 + y1 * np.cos(e) - P[:, 2] * np.sin(e))
    sx, sy = x1 * s, sy * s
    bx0, bx1, by0, by1 = WORLD_BOX
    zoom = fill * min((bx1 - bx0) / (sx.max() - sx.min()), (by1 - by0) / (sy.max() - sy.min()))
    ox = (bx0 + bx1) / 2 - zoom * (sx.max() + sx.min()) / 2
    oy = (by0 + by1) / 2 - zoom * (sy.max() + sy.min()) / 2
    return (e_deg, th_deg, float(zoom), float(ox), float(oy))


VIEWS = {   # elevation, azimuth, zoom, screen offset x, y  (zoom/offsets auto-fitted)
    "front": _fit_view(0.0, 0.0),
    "persp": _fit_view(14.0, 48.0),     # chosen by search: biggest world, long time axis, readable lanes
    "side": _fit_view(2.0, 88.0),
}


def mix_down(events, total):
    """mix [(time, wav path)] into ONE wav with numpy (fast, low memory)"""
    out = np.zeros(int(SR * (total + 2.0)), dtype=np.float32)
    cache = {}
    for t, p in events:
        if p not in cache:
            with wave.open(p, "rb") as w:
                y = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32767
                if w.getnchannels() == 2:
                    y = y.reshape(-1, 2).mean(1)
            cache[p] = y
        y, i = cache[p], max(0, int(round(t * SR)))
        n = min(len(y), len(out) - i)
        if n > 0:
            out[i:i + n] += y[:n]
    peak = float(np.abs(out).max()) if len(out) else 0.0
    if peak > 0.98:
        out *= 0.98 / peak
    return wav("mix.wav", out)


# ----------------------------------------------------------------- sanity & physics check
def physics_check():
    """Every claim the captions/equations make, re-derived numerically. Returns [(ok, claim, detail)]."""
    out = []

    def chk(ok, claim, detail=""):
        out.append((bool(ok), claim, detail))

    r4, r45, r45w, r4w = REC["4"], REC["45"], REC["45w"], Rec(4.0, win=True)
    rest4 = np.delete(r4.amp[:K], 3)
    chk(abs(r4.amp[3] - A_TONE) < 1e-9 and rest4.max() < 1e-9, "4 cycles -> exactly one bin (bin 4)",
        f"bin 4 = {r4.amp[3]:.3f}, others max {rest4.max():.1e}")
    chk(r45.amp[:K].min() > 0.02, "4.5 cycles -> energy in every lane 1..12", f"smallest lane = {r45.amp[:K].min():.3f}")
    chk(r45.amp[K:].max() > 0.005, "... and beyond lane 12", f"largest above 12 = {r45.amp[K:].max():.3f}")
    k = np.arange(1, K + 1)
    err = np.abs(A_TONE * np.abs(np.sinc(k - 4.5)) - r45.amp[:K]).max()
    chk(err < 0.06, "maths row |Xk| ~ A|sin pi(k-f) / pi(k-f)| is a fair approximation", f"max error {err:.3f}")
    chk(abs(np.cos(2 * np.pi * 4.5) + 1) < 1e-12, "seam: x(T) = A cos(2 pi 4.5) = -A, a jump of 2A")
    chk(hann(0.0) == 0 and abs(hann(1.0)) < 1e-12, "Hann window is zero at both ends (no seam jump)")
    chk(DB_HANN < DB_RECT - 20, "window cuts far-lane leakage", f"{DB_RECT:.0f} dB -> {DB_HANN:.0f} dB")
    wide = lambda r: int(np.sum(r.amp[:K] > 0.3 * r.amp.max()))
    chk(wide(r4w) > wide(r4), "the price: the windowed peak is wider", f"bins over 30%: {wide(r4)} -> {wide(r4w)}")
    n = np.arange(13)
    chk(np.allclose(np.sin(2 * np.pi * 11 * n / 12), -np.sin(2 * np.pi * n / 12)),
        "11 Hz sampled 12/s gives the same samples as a backwards 1 Hz")
    chk(np.isclose(360 * 11 / 12, 330) and np.isclose(360 - 330, 360 / 12), "330 deg forward per sample = 30 deg back")
    al = lambda f, fs=12: abs(f - fs * round(f / fs))
    chk(al(11) == 1 and al(9) == 3 and al(15) == 3, "folding at fs = 12: 11->1, 9->3, 15->3")
    chk(all(al(f) <= 6 + 1e-9 for f in np.linspace(0, 30, 301)), "every alias lands between 0 and fs/2")
    chk(24 > 2 * 11, "24 samples/s satisfies fs > 2 x 11 Hz")
    chk(360 * 11 / 24 < 180, "at 24/s each step is under half a turn, so the motion reads correctly",
        f"{360 * 11 / 24:.0f} deg per sample")
    resp = lambda x: 1 / np.sqrt(1 + (x / 5.0) ** 10)          # same filter as in p_fix
    chk(resp(3) > 0.99 and resp(15) < 0.01, "anti-alias filter keeps 3 Hz, removes 15 Hz",
        f"{resp(3) * 100:.1f}% / {resp(15) * 100:.2f}%")
    chk(resp(6) < 0.5, "filter is already well down at fs/2 = 6 Hz", f"{resp(6) * 100:.0f}% at 6 Hz")
    f = np.linspace(1, 11, 1001)
    seen = np.abs(f - 12 * np.round(f / 12))
    chk(abs(f[np.argmax(seen)] - 6) < 0.02 and seen[-1] < 1.01, "rising tone: heard pitch climbs to fs/2, then falls back",
        f"peak at {f[np.argmax(seen)]:.2f} Hz, ends at {seen[-1]:.2f} Hz")
    chk(np.isclose(REC["45w"].F[0], 0, atol=0.05), "windowed record starts at zero")
    return out

# ----------------------------------------------------------------- audio
SR = 44100
AUD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "la_audio")


def _t(d):
    return np.arange(int(SR * d)) / SR


def wav(name, y):
    os.makedirs(AUD, exist_ok=True)
    p = os.path.join(AUD, name)
    if MUTE:            # silent check runs never touch la_audio -> safe beside a final render
        return p
    with wave.open(p, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
    return p


def env(t, a=0.005, d=None, dur=None):
    e = np.minimum(1, t / a)
    if d is not None:
        e = e * np.exp(-t * d)
    if dur is not None:
        e = e * np.minimum(1, (dur - t) / 0.05)
    return e


def ping(f, vol=0.15):
    t = _t(0.9)
    y = (np.sin(2 * PI * f * t) + 0.25 * np.sin(4 * PI * f * t)) * env(t, d=5)
    return wav(f"ping_{f:.0f}_{int(vol * 100)}.wav", vol * y / 1.25)


def chirp(name, f0, f1, dur=0.25, vol=0.18, vib=0.0):
    t = _t(dur)
    f = f0 + (f1 - f0) * (t / dur) ** 0.8 + vib * np.sin(2 * PI * 16 * t)
    y = np.sin(2 * PI * np.cumsum(f) / SR) * env(t, 0.01, dur=dur)
    return wav(name + ".wav", vol * y)


def noise_swell(name, dur, vol, smooth=40, seed=0):
    t = _t(dur)
    n = np.random.default_rng(seed).standard_normal(len(t))
    y = np.convolve(n, np.ones(smooth) / smooth, mode="same") * np.sin(PI * t / dur) ** 2
    return wav(name + ".wav", vol * y / np.abs(y).max())


def thud(vol=0.32):
    t = _t(0.6)
    y = np.sin(2 * PI * (70 * t - 25 * t ** 2)) * env(t, d=7) + 0.2 * np.sin(2 * PI * 660 * t) * env(t, d=9)
    return wav("thud.wav", vol * y / np.abs(y).max())


def stamp_snd(vol=0.35):
    t = _t(0.7)
    crack = np.random.default_rng(3).standard_normal(len(t)) * env(t, d=40)
    y = np.sin(2 * PI * (55 * t - 15 * t ** 2)) * env(t, d=5) + 0.5 * crack
    return wav("stamp.wav", vol * y / np.abs(y).max())


def chime(vol=0.2):
    t = _t(1.3)
    y = np.zeros_like(t)
    for i, f in enumerate([659.25, 783.99, 987.77, 1318.5]):
        s = int(i * 0.07 * SR)
        y[s:] += np.sin(2 * PI * f * t[: len(t) - s]) * np.exp(-t[: len(t) - s] * 4)
    return wav("chime.wav", vol * y / np.abs(y).max())


def uhoh(vol=0.2):
    t = _t(0.22)
    note = lambda f: (np.sin(2 * PI * f * t) + 0.3 * np.sin(6 * PI * f * t)) * env(t, d=8)
    y = np.concatenate([note(587), note(440)])
    return wav("uhoh.wav", vol * y / np.abs(y).max())


def smear_snd(vol=0.16):
    """a cluster of detuned tones blooming out of one: leakage, heard"""
    t = _t(1.6)
    y = sum(np.sin(2 * PI * f * t) * (1 / (1 + abs(i))) for i, f in
            zip(range(-5, 6), 440 * 2 ** (np.arange(-5, 6) * 0.9 / 12)))
    y *= np.minimum(1, t / 0.5) * np.minimum(1, (1.6 - t) / 0.6)
    return wav("smear.wav", vol * y / np.abs(y).max())


def shutter(vol=0.2):
    t = _t(0.045)
    y = np.random.default_rng(1).standard_normal(len(t)) * np.exp(-t * 110)
    return wav("shutter.wav", vol * y / np.abs(y).max())


def alias_sweep(dur, f0=1.0, f1=11.0, fs=12.0, scale=140.0, vol=0.2):
    """a tone whose TRUE frequency rises f0->f1 Hz, heard as the sampled (aliased) frequency x scale"""
    t = _t(dur)
    f_true = f0 + (f1 - f0) * t / dur
    f_seen = np.abs(f_true - fs * np.round(f_true / fs)) * scale
    y = np.sin(2 * PI * np.cumsum(f_seen) / SR) + 0.3 * np.sin(4 * PI * np.cumsum(f_seen) / SR)
    y *= np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.3)
    return wav("alias_sweep.wav", vol * y / np.abs(y).max())


def music(dur, vol=0.1):
    """quiet bed: slow pad + soft pulse, generated to the exact film length"""
    L = int(SR * dur)
    y = np.zeros(L, dtype=np.float32)
    beat = 60 / 80
    bar = 4 * beat
    chords = [[146.83, 220.0, 293.66], [123.47, 185.0, 246.94], [110.0, 164.81, 220.0], [130.81, 196.0, 261.63]]
    for b in range(int(np.ceil(dur / bar))):
        s, e = int(b * bar * SR), min(int((b + 1) * bar * SR), L)
        if s >= L:
            break
        tt = np.arange(e - s) / SR
        ch = chords[b % 4]
        pad = sum(np.sin(2 * PI * f * tt) + 0.4 * np.sin(2 * PI * f * 1.004 * tt) for f in ch)
        seg = 0.14 * pad * np.minimum(1, tt / 0.8) * np.minimum(1, (bar - tt) / 0.8)
        for i in range(4):
            ps = int(i * beat * SR)
            pe = min(ps + int(0.5 * SR), e - s)
            if ps < pe:
                tp = tt[ps:pe] - tt[ps]
                seg[ps:pe] += 0.08 * np.sin(2 * PI * ch[i % 3] * 2 * tp) * np.exp(-tp * 6)
        bs, be = 0, min(int(beat * 2 * SR), e - s)
        seg[bs:be] += 0.25 * np.sin(2 * PI * ch[0] / 2 * tt[bs:be]) * np.exp(-tt[bs:be] * 1.5)
        tg = (s + np.arange(e - s)) / SR
        seg *= np.minimum(1, tg / 2.5) * np.minimum(1, (dur - tg) / 2.5)
        y[s:e] = seg
    return wav("music.wav", vol * y / (np.abs(y).max() + 1e-9))


# ----------------------------------------------------------------- mascot shapes (one period, -1..1)
WX = np.linspace(0, 1, 300)


def _norm(y):
    y = y - (y.max() + y.min()) / 2
    return y / (np.abs(y).max() + 1e-9)


SHAPES = {
    "sine": np.sin(2 * PI * WX),
    "smear": _norm(np.sin(2 * PI * WX) + 0.22 * np.sin(2 * PI * 4 * WX) + 0.12 * np.sin(2 * PI * 7 * WX)),
    "window": _norm(hann(WX) * np.sin(2 * PI * 2 * WX)),
    "slow": _norm(np.sin(PI * WX) - 0.5),
    "fast": np.sin(2 * PI * 3 * WX),
}


class Beat:
    """timing handle for one caption"""

    def __init__(self, scene, dur):
        self.scene, self.dur, self.start = scene, dur, scene.renderer.time

    def frac(self, x, minimum=0.3):
        return max(minimum, self.dur * x)

    def left(self, pad=0.0, minimum=0.3):
        return max(minimum, self.start + self.dur - self.scene.renderer.time - pad)


# =====================================================================
# The film
# =====================================================================
class LAFilm(Scene):
    PARTS = []

    def construct(self):
        self.t_anim = 0.0
        clock = Mobject()
        clock.add_updater(lambda m, dt: setattr(self, "t_anim", self.t_anim + dt))
        self.add(clock)
        self.snd = {"pop": chirp("pop", 320, 900, 0.12), "tick": chirp("tick", 1800, 1700, 0.05, 0.12),
                    "whoosh": noise_swell("whoosh", 0.8, 0.18), "fold": noise_swell("fold", 1.5, 0.16, 25, 2),
                    "swoosh": noise_swell("swoosh", 0.6, 0.14, 15, 4), "thud": thud(), "stamp": stamp_snd(),
                    "chime": chime(), "uhoh": uhoh(), "smear": smear_snd(), "shutter": shutter(),
                    "boing": chirp("boing", 260, 620, 0.35, 0.16, vib=60), "huh": chirp("huh", 650, 340, 0.3, 0.15)}
        self.cap = None
        self.hdr = None
        self.badges = []
        self.eqn = None
        self.snap_n, self.snap_log, self.part, self.wig_mob = 0, [], "", None
        self._sfx = []
        self.snap_dir = os.path.join(SNAP_DIR, type(self).__name__)   # one folder per scene: parallel runs don't clash
        self.setup_world()
        self.setup_wiggle()
        veil = Rectangle(width=FW + 1, height=FH + 1, stroke_width=0, fill_color=SURF, fill_opacity=1).set_z_index(99)
        self.add(veil)
        self.play(FadeOut(veil), run_time=0.6)
        import time as _time
        self.part_times = {}
        for p in self.PARTS:
            self.part = p
            t0 = _time.time()
            getattr(self, p)()
            self.part_times[p] = (_time.time() - t0, self.renderer.time)
            print(f"[part done] {p:11s} {_time.time() - t0:7.1f} s", flush=True)
        self.write_snap_index()
        total = self.renderer.time
        if total > 1 and not MUTE:          # silent check runs: no music, no mix
            # one pre-mixed track instead of hundreds of overlays (the overlays were the slow / RAM-heavy step)
            self._sfx.append((0.0, music(total)))
            Scene.add_sound(self, mix_down(self._sfx, total), time_offset=-total)

    def add_sound(self, sound_file, time_offset=0, gain=None, **kwargs):
        """collect every sound with its time; they are mixed into one wav at the end"""
        if MUTE or self.renderer.skip_animations:
            return
        self._sfx.append((self.renderer.time + time_offset, sound_file))

    def sfx(self, name, offset=0.0):
        self.add_sound(self.snd[name], time_offset=offset)

    # ------------------------------------------------------------ captions & headers (house style)
    @contextmanager
    def line(self, text, extra=0.0):
        dur = read_time(text) + extra
        v = Beat(self, dur)
        rows = textwrap.wrap(text, 52)
        txt = VGroup(*[T(r, 28, INK, BOLD) for r in rows]).arrange(DOWN, buff=0.12)
        box = RoundedRectangle(corner_radius=0.12, width=txt.width + 0.6, height=txt.height + 0.4,
                               fill_color="#000000", fill_opacity=0.62, stroke_width=0)
        cap = VGroup(box, txt.move_to(box)).move_to(FIG(0.56, 0.075)).set_z_index(80)
        if cap.get_right()[0] > FW / 2 - 0.3:
            cap.shift(LEFT * (cap.get_right()[0] - (FW / 2 - 0.3)))
        if cap.get_bottom()[1] < -FH / 2 + 0.2:            # never let a 2-line caption touch the bottom edge
            cap.shift(UP * (-FH / 2 + 0.2 - cap.get_bottom()[1]))
        anims = [FadeIn(cap, shift=UP * 0.15)]
        if self.cap is not None:
            anims.append(FadeOut(self.cap))
        self.play(*anims, run_time=0.3)
        self.cap = cap
        yield v
        rest = v.start + dur - self.renderer.time
        if rest > 0.02:
            self.wait(rest)
        self.snapshot(text)

    def drop_caption(self):
        if self.cap is not None:
            self.play(FadeOut(self.cap), run_time=0.3)
            self.cap = None

    def _hdr(self, kicker, title, kcolor):
        k = T(kicker, 17, kcolor, BOLD)
        k.move_to(FIG(0.03, 0.966), aligned_edge=LEFT)
        t = T(title, 36, INK, BOLD)
        t.move_to(FIG(0.03, 0.905), aligned_edge=LEFT)
        return VGroup(k, t).set_z_index(80)

    def header(self, kicker, title, kcolor=ORANGEc):
        self.maths_clear()
        g = self._hdr(kicker, title, kcolor)
        anims = [FadeIn(g, shift=RIGHT * 0.2)]
        if self.hdr is not None:
            anims.append(FadeOut(self.hdr))
        self.sfx("swoosh")
        self.play(*anims, run_time=0.5)
        self.hdr = g

    def part_card(self, kicker, title, kcolor=ORANGEc):
        """big title card that shrinks into the header"""
        self.drop_caption()
        self.maths_clear()
        self.sfx("whoosh")
        dim = Rectangle(width=FW + 1, height=FH + 1, stroke_width=0, fill_color=SURF, fill_opacity=0.93).set_z_index(84)
        k = T(kicker, 30, kcolor, BOLD)
        t = T(title, 76, INK, BOLD)
        card = VGroup(k, t).arrange(DOWN, buff=0.3).set_z_index(85)
        anims = [FadeIn(dim), FadeIn(k, shift=UP * 0.2), Write(t)]
        if self.hdr is not None:
            anims.append(FadeOut(self.hdr))
        self.play(*anims, run_time=1.0)
        self.wait(0.9)
        self.play(FadeOut(dim), Transform(card, self._hdr(kicker, title, kcolor)), run_time=0.8)
        self.hdr = card

    # ------------------------------------------------------------ snapshot mode:  SNAP=1  manim -s -qh ...
    def snapshot(self, tag, top_only=False):
        """save the real Manim frame as a 1080p PNG and record any layout problems in it"""
        if not SNAP:
            return
        from PIL import Image
        os.makedirs(self.snap_dir, exist_ok=True)
        self.snap_n += 1
        self.renderer.update_frame(self)
        img = Image.fromarray(self.renderer.get_frame()).convert("RGB")
        slug = "".join(ch if ch.isalnum() else "_" for ch in tag[:42]).strip("_")
        name = f"{self.snap_n:03d}_{self.part}_{slug}.png"
        img.save(os.path.join(self.snap_dir, name))
        probs = self._layout_problems(top_only)
        self.snap_log.append((name, tag, probs))
        now = __import__("time").time()
        gap = now - getattr(self, "_last_snap", now)
        self._last_snap = now
        print(f"[{self.snap_n:03d}] +{gap:5.1f}s {self.part:10s} {'OK   ' if not probs else 'CHECK'} {tag[:55]}", flush=True)

    @staticmethod
    def _txt(m):
        s = getattr(m, "text", None) or getattr(m, "tex_string", None) or type(m).__name__
        return str(s)[:40].replace("\n", " ")

    def _layout_problems(self, top_only=False):
        """text overlapping text, text on Wiggle, text off the frame (measured on the actual mobjects).
        top_only: during focus/stamp moments only the lit layer counts (z >= 60)."""
        texts = []
        for top in self.mobjects:
            for sm in top.get_family():
                if isinstance(sm, (Text, MathTex)) and sm.family_members_with_points() and self._visible(sm):
                    if top_only and sm.z_index < 60:
                        continue
                    texts.append(sm)
        box = lambda m: (m.get_left()[0], m.get_right()[0], m.get_bottom()[1], m.get_top()[1])
        inter = lambda a, b: max(0, min(a[1], b[1]) - max(a[0], b[0])) * max(0, min(a[3], b[3]) - max(a[2], b[2]))
        area = lambda a: max((a[1] - a[0]) * (a[3] - a[2]), 1e-6)
        bx = [box(t) for t in texts]
        out = []
        for i, a in enumerate(bx):
            if a[0] < -FW / 2 - 0.02 or a[1] > FW / 2 + 0.02 or a[2] < -FH / 2 - 0.02 or a[3] > FH / 2 + 0.02:
                out.append(f"off-frame: '{self._txt(texts[i])}'")
            for j in range(i + 1, len(bx)):
                if inter(a, bx[j]) > 0.03 * min(area(a), area(bx[j])):
                    out.append(f"text on text: '{self._txt(texts[i])}'  x  '{self._txt(texts[j])}'")
        if not top_only and self.wig_mob is not None and self.wig_mob.family_members_with_points():
            w = box(self.wig_mob)
            for t, a in zip(texts, bx):
                if inter(a, w) > 0.01:
                    out.append(f"text on Wiggle: '{self._txt(t)}'")
        return out

    def write_snap_index(self):
        """report.txt (every still, OK or what to check) + contact_sheet.png (all stills, problems outlined red)"""
        if not SNAP or not self.snap_log:
            return
        from PIL import Image, ImageDraw
        phys = physics_check()
        n_bad_phys = sum(1 for ok, _, _ in phys if not ok)
        lines = ["=== SANITY & PHYSICS ==="]
        lines += [f"  {'OK  ' if ok else 'FAIL'}  {claim}" + (f"   ({det})" if det else "") for ok, claim, det in phys]
        lines += ["", "=== TIME PER PART (wall clock, video time at end of part) ==="]
        lines += [f"  {p:11s} {w:7.1f} s   video at {vt:6.1f} s" for p, (w, vt) in getattr(self, "part_times", {}).items()]
        lines += ["", "=== LAYOUT (every still) ==="]
        bad = 0
        for name, tag, probs in self.snap_log:
            lines.append(f"{name}   {'OK   ' if not probs else 'CHECK'}   {tag}")
            for p in probs:
                lines.append(f"        - {p}")
                bad += 1
        with open(os.path.join(self.snap_dir, "report.txt"), "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
        tw, th, cols = 480, 270, 4
        rows = (len(self.snap_log) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * tw, rows * (th + 26)), (40, 40, 40))
        d = ImageDraw.Draw(sheet)
        for i, (name, tag, probs) in enumerate(self.snap_log):
            x, y = (i % cols) * tw, (i // cols) * (th + 26)
            sheet.paste(Image.open(os.path.join(self.snap_dir, name)).resize((tw, th)), (x, y))
            d.text((x + 6, y + th + 6), f"{name[:3]}  {'OK' if not probs else 'CHECK: ' + probs[0][:52]}",
                   fill=(230, 230, 230) if not probs else (255, 120, 100))
            if probs:
                d.rectangle([x + 1, y + 1, x + tw - 2, y + th - 2], outline=(255, 90, 70), width=4)
        sheet.save(os.path.join(self.snap_dir, "contact_sheet.png"))
        print(f"[check] {len(self.snap_log)} stills | {bad} layout warnings | {n_bad_phys} physics failures  ->  {self.snap_dir}")

    def maths(self, tex, plain, pos=None, size=40, color=INK, rt=1.0):
        """the maths row: an equation that writes itself on (replaces the previous one)"""
        eq = M(tex, plain, size, color)
        want = FIG(0.6, 0.8) if pos is None else np.asarray(pos, dtype=float)
        spot = self.free_spot(eq, [want, np.array([want[0], 2.55, 0]), np.array([1.2, 2.55, 0]),
                                   np.array([want[0], -1.9, 0])],
                              exclude=[self.eqn])
        eq.move_to(spot).set_z_index(80)
        bg = BackgroundRectangle(eq, color=SURF, fill_opacity=0.7, buff=0.14).set_z_index(79)
        self.sfx("tick")
        anims = [FadeIn(bg), Write(eq)]
        if self.eqn is not None:
            anims.append(FadeOut(self.eqn))
        self.play(*anims, run_time=rt)
        self.eqn = VGroup(bg, eq)
        return eq

    def maths_clear(self):
        if self.eqn is not None:
            self.play(FadeOut(self.eqn), run_time=0.3)
            self.eqn = None

    def badge(self, text, color):
        """a result tag that stays top-right for the rest of the film"""
        b = T(text, 24, color, BOLD)
        b.move_to(FIG(0.97, 0.912) + DOWN * 0.48 * len(self.badges), aligned_edge=RIGHT).set_z_index(80)
        self.sfx("chime")
        self.play(FadeIn(b, shift=LEFT * 0.3, scale=1.2), run_time=0.6)
        self.badges.append(b)

    # ------------------------------------------------------------ emphasis: the visual connection
    def focus(self, heroes, label, color=ORANGEc, hold=1.0):
        """dim everything; keep `heroes` lit inside a ring; bold label; thud."""
        dim = Rectangle(width=FW + 1, height=FH + 1, stroke_width=0, fill_color="#000000",
                        fill_opacity=0.74).set_z_index(50)
        grp = VGroup(*heroes).set_z_index(60)
        ring = SurroundingRectangle(grp, color=color, buff=0.2, corner_radius=0.15, stroke_width=4).set_z_index(61)
        lab = T(label, 30, color, BOLD)
        if lab.width > FW - 1.2:
            lab.scale_to_fit_width(FW - 1.2)
        # the label must not sit on anything that stays lit: header, badges, maths row, caption, the heroes
        lit = [m for m in [self.hdr, self.eqn, self.cap, ring, *self.badges] if m is not None]
        boxes = [(m.get_left()[0], m.get_right()[0], m.get_bottom()[1], m.get_top()[1]) for m in lit]
        h2, w2 = lab.height / 2 + 0.12, lab.width / 2 + 0.12
        cands = [ring.get_top() + UP * (h2 + 0.1), ring.get_bottom() + DOWN * (h2 + 0.1),
                 ring.get_left() + LEFT * (w2 + 0.1), ring.get_right() + RIGHT * (w2 + 0.1)]
        best, best_ov = None, np.inf
        for c in cands:
            cx = float(np.clip(c[0], -FW / 2 + w2 + 0.2, FW / 2 - w2 - 0.2))
            cy = float(np.clip(c[1], -FH / 2 + 1.7 + h2, FH / 2 - 0.2 - h2))
            ov = sum(max(0, min(cx + w2, r) - max(cx - w2, l)) * max(0, min(cy + h2, t) - max(cy - h2, b))
                     for l, r, b, t in boxes)
            if ov < best_ov - 1e-9:
                best, best_ov = (cx, cy), ov
            if ov <= 1e-9:
                break
        lab.move_to([best[0], best[1], 0])
        lb = VGroup(BackgroundRectangle(lab, color="#000000", fill_opacity=0.6, buff=0.1), lab).set_z_index(62)
        self.sfx("thud")
        self.play(FadeIn(dim), FadeIn(grp), Create(ring), FadeIn(lb, shift=UP * 0.12), run_time=0.45)
        self.play(grp.animate(rate_func=there_and_back).scale(1.06), ring.animate(rate_func=there_and_back).set_stroke(width=9),
                  run_time=0.55)
        self.wait(hold)
        self.snapshot("FOCUS " + label, top_only=True)
        self.play(FadeOut(dim), FadeOut(grp), FadeOut(ring), FadeOut(lb), run_time=0.4)

    def stamp(self, word, color=ORANGEc, hold=0.7):
        w = T(word, 120, color, BOLD).rotate(-4 * DEGREES).move_to(UP * 0.4).set_z_index(90)
        sh = Rectangle(width=FW + 1, height=FH + 1, stroke_width=0, fill_color="#000000", fill_opacity=0.55).set_z_index(89)
        self.sfx("stamp")
        self.play(FadeIn(sh), FadeIn(w, scale=1.9), run_time=0.22)
        self.play(Flash(w.get_center(), color=color, num_lines=18, flash_radius=w.width / 2 + 0.25, line_length=0.5),
                  w.animate(rate_func=there_and_back).scale(1.05), run_time=0.55)
        self.wait(hold)
        self.snapshot("STAMP " + word, top_only=True)
        self.play(FadeOut(w, scale=0.6), FadeOut(sh), run_time=0.35)

    def clear_board(self, *mobs, run_time=0.5):
        mobs = [m for m in mobs if m is not None]
        if mobs:
            self.play(*[FadeOut(m) for m in mobs], run_time=run_time)

    # ------------------------------------------------------------ 3D lane world (own projector)
    def setup_world(self):
        e, th, zm, ox, oy = VIEWS["front"]
        self.ce, self.cth, self.czm, self.cox, self.coy = [ValueTracker(v) for v in (e, th, zm, ox, oy)]
        self.world_op = ValueTracker(0.0)
        self.front_op = ValueTracker(1.0)
        self.lane_op = ValueTracker(1.0)
        self.ghost_op = ValueTracker(0.0)
        self.gap_op = ValueTracker(0.0)
        self.lbl_op = ValueTracker(0.0)
        self.prev = self.cur = REC["4"]
        self.mix = ValueTracker(1.0)
        self.m = [ValueTracker(0.0) for _ in range(K)]
        self.add(always_redraw(self.draw_world))
        self.lbls = []
        for k in range(1, K + 1):
            lab = T(str(k), 15, MUTED, BOLD)
            lab.add_updater(lambda mob, k=k: self._place_lbl(mob, k))
            self.lbls.append(lab)
            self.add(lab)

    def proj(self, P):
        P = np.atleast_2d(np.asarray(P, dtype=float))
        e, th = np.radians(self.ce.get_value()), np.radians(self.cth.get_value())
        x, y, z = P[:, 0], P[:, 1], P[:, 2]
        x1 = x * np.cos(th) + y * np.sin(th)
        y1 = -x * np.sin(th) + y * np.cos(th)
        sy = z * np.cos(e) + y1 * np.sin(e)
        d = y1 * np.cos(e) - z * np.sin(e)
        s = 18.0 / (18.0 + d) * self.czm.get_value()
        return np.stack([x1 * s + self.cox.get_value(), sy * s + self.coy.get_value(), 0 * x], 1)

    def _place_lbl(self, mob, k):
        mob.move_to(self.proj([BAR_X + 0.5, lane_y(k), 0.0])[0])     # beside the bar, not under it
        # angled view: lanes sit close on screen, so number every other lane; side view: all 12
        show = 1.0 if (k % 2 == 1 or self.cth.get_value() > 70) else 0.0
        mob.set_opacity(self.world_op.get_value() * self.lbl_op.get_value() * show)

    def view(self, name, rt=1.5, extra=()):
        vals = VIEWS[name]
        trk = (self.ce, self.cth, self.czm, self.cox, self.coy)
        self.play(*[t.animate.set_value(v) for t, v in zip(trk, vals)], *extra, run_time=rt)

    def seg(self, a, b, color, width, opacity=1.0):
        p = self.proj([a, b])
        return Line(p[0], p[1], stroke_color=color, stroke_width=width, stroke_opacity=opacity)

    def front_z(self):
        mx = self.mix.get_value()
        z = (1 - mx) * self.prev.F + mx * self.cur.F
        for k in range(1, K + 1):
            mk = self.m[k - 1].get_value()
            if mk > 0:
                z = z - mk * self.cur.C[k - 1]
        return z

    def draw_front(self):
        op = self.world_op.get_value() * self.front_op.get_value()
        P = np.stack([wx(TS), np.full(NP, FRONT_Y), self.front_z()], 1)
        return poly(self.proj(P), INK, 3.4, op)

    def draw_lane(self, k):
        mk = self.m[k - 1].get_value()
        if mk < 0.004 or self.cur.amp[k - 1] < 0.004:
            return VMobject()
        y = FRONT_Y + (lane_y(k) - FRONT_Y) * mk
        P = np.stack([wx(TS), np.full(NP, y), self.cur.C[k - 1]], 1)
        op = self.world_op.get_value() * self.lane_op.get_value() * min(1.0, 3 * mk)
        return poly(self.proj(P), ORANGEc, 2.6, op)

    def draw_bar(self, k):
        h = self.cur.amp[k - 1] * self.m[k - 1].get_value() * BAR_S
        if h < 0.008:
            return VMobject()
        return self.seg([BAR_X, lane_y(k), 0], [BAR_X, lane_y(k), h], ORANGEc, 12, self.world_op.get_value())

    def draw_gap(self):
        g = VGroup()
        a = self.world_op.get_value() * self.gap_op.get_value()
        if a < 0.01:
            return g
        y = lane_y(4.5)
        for t0 in np.arange(0, 1, 0.06):
            g.add(self.seg([wx(t0), y, FLOOR], [wx(t0 + 0.035), y, FLOOR], BADc, 4, a))
        g.add(self.seg([BAR_X, y, 0], [BAR_X, y, 1.1], BADc, 4, a))
        g.add(T("4.5 ?", 24, BADc, BOLD).set_opacity(a).move_to(self.proj([BAR_X, y, 1.7])[0]))
        return g

    def draw_world(self):
        op = self.world_op.get_value()
        g = VGroup()
        if op < 0.01:
            return g
        for k in range(0, K + 1):
            g.add(self.seg([wx(0), lane_y(k), FLOOR], [wx(1), lane_y(k), FLOOR], GRIDc, 1.4, op))
        for t0 in np.linspace(0, 1, 9):
            g.add(self.seg([wx(t0), lane_y(0) - 0.25, FLOOR], [wx(t0), lane_y(K) + 0.25, FLOOR], GRIDc, 1.4, op))
        g.add(self.seg([wx(0), FRONT_Y, 0], [wx(1) + 0.15, FRONT_Y, 0], AXc, 2, op))
        g.add(self.seg([wx(0), FRONT_Y, -1.2], [wx(0), FRONT_Y, 1.2], AXc, 2, op))
        g.add(self.seg([BAR_X, lane_y(0) - 0.2, 0], [BAR_X, lane_y(K) + 0.25, 0], AXc, 2, op))
        go = self.ghost_op.get_value()
        if go > 0.01:
            for k in range(1, K + 1):
                P = np.stack([wx(TS), np.full(NP, lane_y(k)), 0.28 * np.sin(2 * PI * k * TS)], 1)
                g.add(poly(self.proj(P), ORANGEc, 1.8, 0.4 * go * op, glow=False))
        g.add(self.draw_gap())
        for k in range(1, K + 1):
            g.add(self.draw_lane(k), self.draw_bar(k))
        g.add(self.draw_front())
        return g

    def peel(self, ks=None, rt=2.4, lag=0.35):
        ks = [k for k in (ks or range(1, K + 1)) if self.cur.amp[k - 1] > 0.004 and self.m[k - 1].get_value() < 0.99]
        if not ks:
            return
        n = len(ks)
        d = rt / (1 + lag * (n - 1))
        amax = self.cur.amp[:K].max()
        for i, k in enumerate(ks):
            self.add_sound(ping(110 * k, 0.05 + 0.15 * self.cur.amp[k - 1] / amax), time_offset=i * lag * d + 0.08)
        self.play(LaggedStart(*[self.m[k - 1].animate.set_value(1) for k in ks], lag_ratio=lag), run_time=rt)

    def home(self, rt=0.9):
        live = [m for m in self.m if m.get_value() > 0]
        if live:
            self.play(*[m.animate.set_value(0) for m in live], run_time=rt)

    def morph(self, key, rt=1.4):
        self.home()
        self.prev, self.cur = self.cur, REC[key]
        self.mix.set_value(0)
        self.play(self.mix.animate.set_value(1), run_time=rt)

    def bars_now(self, ks=range(1, K + 1)):
        return VGroup(*[self.draw_bar(k) for k in ks])

    # ------------------------------------------------------------ Wiggle (house mascot)
    def setup_wiggle(self):
        self.w_from = self.w_to = SHAPES["sine"]
        self.w_mix = ValueTracker(1.0)
        self.w_pop = ValueTracker(0.0)
        self.w_hop = ValueTracker(0.0)
        self.w_disg = ValueTracker(0.0)
        self.w_mood = "neutral"
        self.bubble = None
        self.wig_mob = always_redraw(self.draw_wiggle)
        self.add(self.wig_mob)

    def draw_wiggle(self):
        g = VGroup()
        pop = self.w_pop.get_value()
        if pop < 0.01:
            return g
        base, sc, A, t = FIG(0.105, 0.31), 1.55, 0.42, self.t_anim
        Q = lambda x, y: base + np.array([(x - 0.5) * sc, y * sc, 0])
        mx_ = self.w_mix.get_value()
        y = A * ((1 - mx_) * self.w_from + mx_ * self.w_to)
        mood = self.w_mood
        wob = 0.0
        if mood == "dizzy":
            y = y + 0.05 * np.sin(2 * PI * 3 * WX + 9 * t)
            wob = 0.04 * np.sin(7 * t)
        yy = (y + 0.03 * np.sin(2 * PI * 0.55 * t) + 0.16 * self.w_hop.get_value()) * pop
        xx = 0.5 + (WX - 0.5) * pop + wob
        body = np.array([Q(a, b) for a, b in zip(xx, yy)])
        g.add(poly(body, BLUEc, 34, 0.12, glow=False), poly(body, BLUEc, 14, 1.0, glow=False))
        xe = np.array([0.15, 0.35])
        eye_y = np.interp(xe, WX, yy / max(pop, 1e-3)) * pop + 0.17 * pop
        exe = 0.5 + (xe - 0.5) * pop + wob
        rr = 0.095 * pop * (1.35 if mood == "surprised" else 1.0)
        blink = 0.12 if ((t + 0.7) % 3.6) < 0.13 else 1.0
        for i, (ex_, ey_) in enumerate(zip(exe, eye_y)):
            if mood == "happy" or (mood == "wink" and i == 1):
                g.add(poly(np.array([Q(ex_ - 0.9 * rr, ey_ - 0.3 * rr), Q(ex_, ey_ + 0.45 * rr),
                                     Q(ex_ + 0.9 * rr, ey_ - 0.3 * rr)]), INK, 6, glow=False))
            elif mood == "dizzy":
                for s_ in (1, -1):
                    g.add(Line(Q(ex_ - 0.7 * rr, ey_ - 0.7 * rr * s_), Q(ex_ + 0.7 * rr, ey_ + 0.7 * rr * s_),
                               stroke_color=INK, stroke_width=5))
            elif blink > 0.3:
                pr = rr * (0.3 if mood == "surprised" else 0.42)
                g.add(Ellipse(width=2 * rr * sc, height=2 * rr * sc, fill_color=INK, fill_opacity=1, stroke_width=0).move_to(Q(ex_, ey_)),
                      Circle(radius=pr * sc, fill_color=SURF, fill_opacity=1, stroke_width=0).move_to(Q(ex_ + 0.3 * rr, ey_ + 0.2 * rr)))
            else:
                g.add(Line(Q(ex_ - 0.9 * rr, ey_), Q(ex_ + 0.9 * rr, ey_), stroke_color=INK, stroke_width=5))
        mx, my = 0.5 + (0.25 - 0.5) * pop + wob, np.interp(0.25, WX, yy / max(pop, 1e-3)) * pop - 0.2 * pop
        if mood == "surprised":
            g.add(Ellipse(width=0.09 * sc, height=0.12 * sc, fill_color=INK, fill_opacity=1, stroke_width=0).move_to(Q(mx, my)))
        else:
            cv = {"happy": 0.12, "wink": 0.1, "dizzy": -0.01, "worried": -0.04}.get(mood, 0.05)
            s_ = np.linspace(-1, 1, 16)
            g.add(poly(np.array([Q(mx + 0.09 * a * pop, my + cv * a ** 2 * pop) for a in s_]), INK, 5, glow=False))
        if mood == "dizzy":
            for i in range(3):
                ang = 4 * t + i * 2 * PI / 3
                g.add(Star(n=5, outer_radius=0.07, fill_color=STARc, fill_opacity=1, stroke_width=0)
                      .move_to(Q(0.25 + 0.26 * np.cos(ang), eye_y.max() + 0.25 + 0.07 * np.sin(ang))))
        d = self.w_disg.get_value()
        if d > 0.01:   # the disguise: glasses + moustache
            for ex_, ey_ in zip(exe, eye_y):
                g.add(Circle(radius=rr * sc * 1.45, stroke_color=INK2, stroke_width=4, stroke_opacity=d).move_to(Q(ex_, ey_)))
            g.add(Line(Q(exe[0] + rr * 1.45, eye_y[0]), Q(exe[1] - rr * 1.45, eye_y[1]), stroke_color=INK2, stroke_width=4,
                       stroke_opacity=d))
            for s_ in (-1, 1):
                g.add(Ellipse(width=0.16 * sc, height=0.055 * sc, fill_color=MUTED, fill_opacity=d, stroke_width=0)
                      .rotate(s_ * 18 * DEGREES).move_to(Q(mx + s_ * 0.07, my + 0.05)))
        return g.set_z_index(40)

    def w_appear(self):
        self.sfx("pop")
        self.play(self.w_pop.animate(rate_func=rate_functions.ease_out_back).set_value(1), run_time=0.5)

    def ensure_wiggle(self):
        if self.w_pop.get_value() < 0.5:
            self.w_pop.set_value(1)

    def w_shape(self, name, rt=0.8):
        mx_ = self.w_mix.get_value()
        self.w_from = (1 - mx_) * self.w_from + mx_ * self.w_to
        self.w_to = SHAPES[name]
        self.w_mix.set_value(0)
        self.play(self.w_mix.animate.set_value(1), run_time=rt)

    def w_feel(self, mood, sound=None, hop=True):
        self.w_mood = mood
        if sound:
            self.sfx(sound)
        if hop:
            self.play(self.w_hop.animate(rate_func=there_and_back).set_value(1), run_time=0.4)

    # ------------------------------------------------------------ layout guard: no text on top of anything
    @staticmethod
    def _visible(m):
        for sm in m.family_members_with_points():
            if not isinstance(sm, VMobject):        # ValueTrackers etc. have points but no fill/stroke
                continue
            if sm.get_fill_opacity() > 0.05 or sm.get_stroke_opacity() > 0.05:
                return True
        return False

    def _boxes(self, exclude=()):
        """bounding boxes of everything visible on screen (minus full-screen rects and the caption)"""
        skip = {id(m) for m in exclude if m is not None} | {id(self.cap)}
        out = []
        for m in self.mobjects:
            if id(m) in skip or not m.family_members_with_points() or not self._visible(m):
                continue
            l, r = m.get_left()[0], m.get_right()[0]
            b, t = m.get_bottom()[1], m.get_top()[1]
            if (r - l) > FW * 0.95 and (t - b) > FH * 0.95:
                continue
            if (r - l) < 1e-3 and (t - b) < 1e-3:
                continue
            out.append((l, r, b, t))
        return out

    def free_spot(self, mob, candidates, pad=0.12, exclude=()):
        """first candidate centre where `mob` overlaps nothing (kept on screen, clear of the caption
        band and the header); otherwise the candidate with the least overlap"""
        boxes = self._boxes(exclude)
        w, h = mob.width, mob.height
        best, best_ov = None, np.inf
        for c in candidates:
            cx = float(np.clip(c[0], -FW / 2 + w / 2 + 0.2, FW / 2 - w / 2 - 0.2))
            cy = float(np.clip(c[1], -FH / 2 + 1.7 + h / 2, FH / 2 - 0.25 - h / 2))   # bottom band = captions only
            if cx - w / 2 < -FW / 2 + 5.0 and cy + h / 2 > FH / 2 - 1.3:     # header zone (top-left)
                cy = FH / 2 - 1.3 - h / 2 - pad
            L, R, B, Tp = cx - w / 2 - pad, cx + w / 2 + pad, cy - h / 2 - pad, cy + h / 2 + pad
            ov = sum(max(0, min(R, r) - max(L, l)) * max(0, min(Tp, t) - max(B, b)) for l, r, b, t in boxes)
            if ov < best_ov - 1e-9:
                best, best_ov = np.array([cx, cy, 0.0]), ov
            if ov <= 1e-9:
                break
        return best

    def w_say(self, text):
        rows = textwrap.wrap(text, 20)            # short lines: the bubble stays compact
        t = VGroup(*[T(r_, 22, INK, BOLD) for r_ in rows]).arrange(DOWN, buff=0.1)
        box = RoundedRectangle(corner_radius=0.16, width=t.width + 0.5, height=t.height + 0.4, stroke_color=BLUEc,
                               stroke_width=2.5, fill_color=PANEL, fill_opacity=1)
        b = VGroup(box, t.move_to(box))
        head = FIG(0.105, 0.31)
        cands = [head + np.array([0.3, 1.75, 0]),        # above Wiggle (house position)
                 head + np.array([0.3, 2.6, 0]),         # higher up the left column
                 head + np.array([2.9, 0.15, 0]),        # beside Wiggle, to the right
                 head + np.array([3.4, -0.9, 0]),        # low, beside Wiggle
                 head + np.array([0.6, 3.4, 0])]         # top of the left column
        b.move_to(self.free_spot(b, cands, exclude=[self.bubble]))
        b.set_z_index(45)
        anims = [FadeIn(b, shift=UP * 0.12, scale=0.9)]
        if self.bubble is not None:
            anims.append(FadeOut(self.bubble))
        self.bubble = b
        self.play(*anims, run_time=0.3)

    def w_hush(self):
        if self.bubble is not None:
            self.play(FadeOut(self.bubble), run_time=0.25)
            self.bubble = None

    # =================================================================
    # P1  Intro: one record, repeated forever
    # =================================================================
    def p_intro(self):
        self.part_card("SIGNAL PROCESSING", "The FFT's two traps")
        ax = Axes(x_range=[-1.75, 2.75, 0.5], y_range=[-1.3, 1.3, 1], x_length=12.0, y_length=2.6, tips=False,
                  axis_config={"stroke_color": AXc, "stroke_width": 2}).move_to(RIGHT * 0.6 + UP * 0.45)
        sig = lambda t: 0.9 * np.cos(2 * PI * 3.3 * t + 0.4)
        long = ax.plot(sig, x_range=[-1.75, 2.75, 0.003], color=INK, stroke_width=3)
        with self.line("An FFT never sees your whole signal.") as v:
            self.play(Create(ax), Create(long), run_time=v.frac(0.75))
        u = ax.c2p(1, 0)[0] - ax.c2p(0, 0)[0]
        box = Rectangle(width=u, height=3.0, stroke_color=BLUEc, stroke_width=3, fill_color=BLUEc,
                        fill_opacity=0.08).move_to(ax.c2p(0.5, 0))
        piece = ax.plot(sig, x_range=[0, 1, 0.003], color=BLUEc, stroke_width=5)
        rec_lbl = T("one record", 22, BLUEc, BOLD).next_to(box, UP, buff=0.1)
        with self.line("It sees one record: a short slice of time.", extra=0.5) as v:
            self.sfx("tick")
            self.play(FadeIn(box), Create(piece), FadeIn(rec_lbl), long.animate.set_stroke(opacity=0.2), run_time=v.frac(0.35))
            self.focus([box.copy(), piece.copy(), rec_lbl.copy()], "this is all the FFT gets", BLUEc, hold=0.7)
        copies = VGroup(*[ax.plot(lambda t, s=s: sig(t - s), x_range=[max(s, -1.75), min(s + 1, 2.75), 0.003],
                                  color=INK2, stroke_width=3) for s in (-2, -1, 1, 2)])
        seams = VGroup(*[Circle(radius=0.32, color=BADc, stroke_width=4).move_to(ax.c2p(s, (sig(1) + sig(0)) / 2))
                         for s in (0, 1, 2)])
        with self.line("And it quietly assumes that slice repeats. Forever.", extra=1.2) as v:
            self.play(FadeOut(long), run_time=0.4)
            for c in copies:
                self.sfx("pop")
                self.play(TransformFromCopy(piece, c), run_time=v.frac(0.11))
            self.play(Create(seams), run_time=v.frac(0.15))
        self.w_appear()
        with self.line("That one assumption is behind both traps.", extra=0.9) as v:
            self.w_say("Hi! Keep an eye on those seams.")
            self.play(Indicate(seams, color=BADc, scale_factor=1.3), run_time=v.frac(0.3))
        self.w_hush()
        self.clear_board(ax, box, piece, rec_lbl, copies, seams)

    # =================================================================
    # P2  Trap 1: leakage (3D lanes)
    # =================================================================
    def p_leakage(self):
        self.ensure_wiggle()
        self.part_card("TRAP 1", "Leakage")
        self.prev = self.cur = REC["4"]
        self.mix.set_value(1)
        self.front_op.set_value(0)
        for mt in self.m:
            mt.set_value(0)
        with self.line("The FFT's bins are lanes: whole numbers of cycles per record.", extra=0.6) as v:
            self.play(self.world_op.animate.set_value(1), run_time=0.6)
            for k in range(1, K + 1):
                self.add_sound(ping(110 * k, 0.08), time_offset=0.1 * k)
            self.view("persp", rt=v.frac(0.4), extra=[self.ghost_op.animate.set_value(1), self.lbl_op.animate.set_value(1)])
        lbls = self.lbls
        with self.line("1, 2, 3, 4… cycles. Only those fit the record exactly.") as v:
            self.maths(r"f_k = k\,\frac{f_s}{N}, \qquad k = 1, 2, 3, \dots", "fₖ = k · fs / N,   k = 1, 2, 3 …",
                       rt=v.frac(0.3))
            if lbls:
                self.play(LaggedStart(*[Indicate(l, color=ORANGEc, scale_factor=1.7) for l in lbls[:6]], lag_ratio=0.25),
                          run_time=v.frac(0.6))
        with self.line("Take a tone with exactly 4 cycles…") as v:
            self.play(self.ghost_op.animate.set_value(0), self.front_op.animate.set_value(1), run_time=v.frac(0.5))
        with self.line("…it fits lane 4. One lane, one bar.", extra=0.8) as v:
            self.peel([4], rt=v.frac(0.35))
            self.w_feel("happy", "boing")
            self.w_say("I fit! One lane.")
            self.focus([self.draw_lane(4), self.draw_bar(4)], "4 cycles  →  exactly one bin", OKc, hold=0.6)
        with self.line("Now give it 4.5 cycles.", extra=0.4) as v:
            self.w_hush()
            self.morph("45", rt=v.frac(0.5))
            self.w_feel("neutral", hop=False)
        with self.line("There's no lane at 4.5.", extra=0.6) as v:
            self.sfx("uhoh")
            self.play(self.gap_op.animate.set_value(1), run_time=v.frac(0.25))
            self.w_feel("surprised", "huh")
            self.w_say("Uh… where's my lane?")
            self.focus([self.draw_gap(), self.draw_front()], "4.5 falls between lanes 4 and 5", BADc, hold=0.6)
        with self.line("So it spills into every lane.", extra=1.8) as v:
            self.w_hush()
            self.sfx("smear")
            self.peel(rt=max(2.6, v.frac(0.6)), lag=0.22)
            self.maths(r"|X_k| \approx A\,\left|\frac{\sin \pi (k - f)}{\pi (k - f)}\right|, \qquad f = 4.5",
                       "|Xₖ| ≈ A · | sin π(k−f) / π(k−f) |,   f = 4.5", rt=0.9)
            self.w_feel("dizzy", hop=False)
            self.w_shape("smear", rt=0.6)
            self.w_say("I'm… everywhere?!")
        with self.line("That's leakage.", extra=1.2) as v:
            self.stamp("LEAKAGE", ORANGEc)
        with self.line(f"Energy that belongs at 4.5 lands in lanes 1 to {K}, and beyond.", extra=1.0) as v:
            self.view("side", rt=1.4, extra=[self.lane_op.animate.set_value(0.2), self.front_op.animate.set_value(0.2),
                                             self.gap_op.animate.set_value(0)])
            self.focus([self.bars_now()], "one tone, smeared across every bin", ORANGEc, hold=0.8)
        self.view("persp", rt=1.2, extra=[self.lane_op.animate.set_value(1), self.front_op.animate.set_value(1)])
        self.w_hush()

    # =================================================================
    # P3  Why it leaks (2D) + the fix: a window
    # =================================================================
    def p_window(self):
        self.ensure_wiggle()
        if self.world_op.get_value() < 0.5:     # standalone render
            self.prev = self.cur = REC["45"]
        self.header("TRAP 1  ·  WHY", "The seam")
        self.home(0.8)
        self.play(self.world_op.animate.set_value(0), run_time=0.6)
        rec = REC["45"]
        ax = Axes(x_range=[-1, 2, 0.5], y_range=[-1.0, 1.0, 1], x_length=11.6, y_length=2.4, tips=False,
                  axis_config={"stroke_color": AXc, "stroke_width": 2}).move_to(RIGHT * 0.7 + UP * 0.9)
        piece = ax.plot(rec.cont, x_range=[0, 1, 0.002], color=INK, stroke_width=4)
        copies = VGroup(*[ax.plot(lambda t, s=s: rec.cont(t - s), x_range=[s, s + 1, 0.002], color=INK2, stroke_width=3,
                                  stroke_opacity=0.85) for s in (-1, 1)])
        seams = VGroup(*[Circle(radius=0.4, color=BADc, stroke_width=5).move_to(ax.c2p(s, 0)) for s in (0, 1)])
        with self.line("Why? Remember: the FFT repeats the record.") as v:
            self.play(Create(ax), Create(piece), run_time=v.frac(0.35))
            for c in copies:
                self.sfx("pop")
                self.play(TransformFromCopy(piece, c), run_time=v.frac(0.2))
        with self.line("4.5 cycles don't line up. Every seam has a jump.", extra=0.6) as v:
            self.sfx("uhoh")
            self.play(Create(seams), run_time=v.frac(0.25))
            self.maths(r"x(0) = A, \qquad x(T) = A\cos(2\pi \cdot 4.5) = -A", "x(0) = A,   x(T) = A·cos(2π·4.5) = −A",
                       pos=np.array([0.9, 2.6, 0]), size=36, rt=0.8)
            self.focus([piece.copy(), copies.copy(), seams.copy()], "a jump at every seam", BADc, hold=0.6)

        ax2 = Axes(x_range=[-0.5, 0.5, 0.25], y_range=[-1.2, 1.2, 1], x_length=4.0, y_length=1.8, tips=False,
                   axis_config={"stroke_color": AXc, "stroke_width": 1.5}).move_to(RIGHT * 4.2 + DOWN * 1.55)
        frame2 = SurroundingRectangle(ax2, color=AXc, buff=0.15, corner_radius=0.12)
        lab2 = T("building a jump", 18, MUTED, BOLD).next_to(frame2, UP, buff=0.08)
        arrow = Arrow(seams[1].get_bottom(), frame2.get_top() + UP * 0.35, color=BADc, buff=0.1, stroke_width=4)
        partial = lambda m: (lambda t: 0.7 * (4 / PI) * sum(np.sin(2 * PI * (2 * j + 1) * t) / (2 * j + 1) for j in range(m)))
        build = ax2.plot(partial(1), x_range=[-0.5, 0.5, 0.002], color=ORANGEc, stroke_width=3.5)
        with self.line("A jump is sharp, and sharp things need lots of frequencies to build.", extra=1.0) as v:
            self.play(GrowArrow(arrow), Create(frame2), Create(ax2), FadeIn(lab2), run_time=v.frac(0.18))
            self.play(Create(build), run_time=v.frac(0.1))
            for m in (2, 3, 5, 8, 14):
                self.add_sound(ping(110 * (2 * m - 1), 0.07))
                self.play(Transform(build, ax2.plot(partial(m), x_range=[-0.5, 0.5, 0.002], color=ORANGEc, stroke_width=3.5)),
                          run_time=v.frac(0.1))
        ax3 = Axes(x_range=[0, K + 1, 1], y_range=[0, 0.5, 0.25], x_length=4.6, y_length=1.7, tips=False,
                   axis_config={"stroke_color": AXc, "stroke_width": 1.5}).move_to(LEFT * 0.9 + DOWN * 1.6)
        bars3 = VGroup(*[Line(ax3.c2p(k, 0), ax3.c2p(k, max(rec.amp[k - 1], 0.005)), color=ORANGEc, stroke_width=9)
                         for k in range(1, K + 1)])
        lab3 = T("the leaked bins", 18, MUTED, BOLD).next_to(ax3, UP, buff=0.1)
        arrow2 = Arrow(frame2.get_left(), ax3.get_right() + RIGHT * 0.1, color=ORANGEc, buff=0.1, stroke_width=4)
        with self.line("Those extra frequencies are the leaked bins.", extra=0.6) as v:
            self.play(GrowArrow(arrow2), Create(ax3), FadeIn(lab3), run_time=v.frac(0.2))
            self.play(LaggedStart(*[GrowFromEdge(b, DOWN) for b in bars3], lag_ratio=0.08), run_time=v.frac(0.3))
            self.focus([seams[1].copy(), build.copy(), bars3.copy()], "the jump's frequencies = the leak", ORANGEc, hold=0.6)
        self.clear_board(ax2, frame2, lab2, arrow, build, ax3, bars3, lab3, arrow2)

        # ---- the fix
        self.header("THE FIX", "A window", GOODc)
        recw = REC["45w"]
        env_ = VGroup(*[DashedVMobject(ax.plot(lambda t, s=s, sg=sg: sg * A_TONE * hann(t - s), x_range=[s, s + 1, 0.01],
                                               color=GOODc, stroke_width=2.5), num_dashes=30)
                        for s in (-1, 0, 1) for sg in (1, -1)])
        piece_w = ax.plot(recw.cont, x_range=[0, 1, 0.002], color=INK, stroke_width=4)
        copies_w = VGroup(*[ax.plot(lambda t, s=s: recw.cont(t - s), x_range=[s, s + 1, 0.002], color=INK2, stroke_width=3,
                                    stroke_opacity=0.85) for s in (-1, 1)])
        with self.line("The fix: a window. Fade the record in and out…", extra=0.4) as v:
            self.play(Create(env_), run_time=v.frac(0.35))
            self.maths(r"w[n] = \tfrac{1}{2}\left(1 - \cos\frac{2\pi n}{N}\right)", "w[n] = ½ (1 − cos(2πn / N))",
                       pos=np.array([0.8, -1.25, 0]), color=GOODc, rt=0.8)
            self.play(Transform(piece, piece_w), Transform(copies, copies_w), run_time=v.frac(0.45))
        with self.line("…so its ends meet at zero. No more jump.", extra=0.8) as v:
            self.sfx("chime")
            self.play(seams.animate.set_color(OKc).scale(0.7), run_time=v.frac(0.25))
            self.w_shape("window", rt=0.6)
            self.w_feel("happy")
            self.w_say("Ahh. Much tidier.")
            self.focus([piece.copy(), copies.copy(), seams.copy()], "smooth seams", OKc, hold=0.5)
        self.w_hush()
        self.clear_board(ax, piece, copies, seams, env_)
        self.maths_clear()

        self.prev = self.cur = recw
        self.mix.set_value(1)
        with self.line("Peel it again.") as v:
            self.play(self.world_op.animate.set_value(1), run_time=0.6)
            self.peel(rt=v.left(0.2), lag=0.22)
        with self.line(f"The energy stays near 4.5. Far lanes: {DB_RECT:.0f} dB → {DB_HANN:.0f} dB.", extra=1.0) as v:
            self.view("side", rt=1.3, extra=[self.lane_op.animate.set_value(0.2), self.front_op.animate.set_value(0.2)])
            self.focus([self.bars_now()], "leak pulled back to the neighbours", OKc, hold=0.8)
        with self.line("The price: a slightly wider peak. Worth it, almost every time.", extra=0.6) as v:
            self.view("persp", rt=1.2, extra=[self.lane_op.animate.set_value(1), self.front_op.animate.set_value(1)])
        self.badge("Leakage → window it", ORANGEc)
        self.home(0.8)
        self.play(self.world_op.animate.set_value(0), run_time=0.6)
        self.w_shape("sine", rt=0.5)
        self.w_feel("neutral", hop=False)

    # =================================================================
    # P4  Trap 2: aliasing (2D)
    # =================================================================
    def shaft_board(self, fs, f_true=11):
        c, r = np.array([-3.4, 0.45, 0.0]), 1.45
        tau = ValueTracker(0.0)
        ring = Circle(radius=r, stroke_color=AXc, stroke_width=3).move_to(c)
        hub = Dot(c, radius=0.06, color=MUTED)
        ax = Axes(x_range=[0, 1, 0.25], y_range=[-1.2, 1.2, 1], x_length=6.2, y_length=2.9, tips=False,
                  axis_config={"stroke_color": AXc, "stroke_width": 2}).move_to(RIGHT * 3.05 + UP * 0.45)
        tlab = T("1 second", 18, MUTED, BOLD).next_to(ax, DOWN, buff=0.1).align_to(ax, RIGHT)
        ang = lambda tt: 2 * PI * f_true * tt
        on_ring = lambda a: c + r * np.array([np.cos(a), np.sin(a), 0])

        def live():
            tt = tau.get_value()
            p = on_ring(ang(tt))
            g = VGroup(Line(c, p, stroke_color=INK2, stroke_width=3), Dot(p, radius=0.1, color=BLUEc),
                       DashedLine(p, ax.c2p(tt, np.sin(ang(tt))), stroke_color=MUTED, stroke_width=1.5, dash_length=0.06))
            if tt > 0.004:
                g.add(ax.plot(lambda s: np.sin(ang(s)), x_range=[0, tt, 0.0012], color=INK2, stroke_width=2,
                              stroke_opacity=0.45))
            return g

        def caps():
            tt = tau.get_value()
            g = VGroup()
            if self.sampling_off:
                return g
            for n in range(0, int(np.floor(tt * fs + 1e-9)) + 1):
                ts = n / fs
                age = tt - ts
                p = on_ring(ang(ts))
                g.add(Dot(p, radius=0.075, color=INK).set_opacity(max(0.3, 1 - age * 2.5)),
                      Dot(ax.c2p(ts, np.sin(ang(ts))), radius=0.07, color=INK))
                if age < 0.05:
                    g.add(Circle(radius=0.12 + 5 * age, stroke_color=INK, stroke_width=3, stroke_opacity=1 - age / 0.05).move_to(p))
            return g

        self.sampling_off = True
        return dict(c=c, r=r, tau=tau, ring=ring, hub=hub, ax=ax, tlab=tlab, ang=ang, fs=fs,
                    live=always_redraw(live), caps=always_redraw(caps))

    def run_samples(self, S, rt):
        self.sampling_off = False
        S["tau"].set_value(0)
        for n in range(S["fs"] + 1):
            self.sfx("shutter", offset=rt * n / S["fs"])
        self.play(S["tau"].animate.set_value(1.0), run_time=rt, rate_func=linear)

    def p_aliasing(self):
        self.ensure_wiggle()
        self.part_card("TRAP 2", "Aliasing", BLUEc)
        # smear vs move
        ax0 = Axes(x_range=[0, 12, 1], y_range=[0, 1.1, 0.5], x_length=8, y_length=2.4, tips=False,
                   axis_config={"stroke_color": AXc, "stroke_width": 2}).move_to(RIGHT * 0.7 + UP * 0.4)
        nums = VGroup(*[T(str(k), 16, MUTED).next_to(ax0.c2p(k, 0), DOWN, buff=0.1) for k in range(0, 13, 3)])
        bar = Line(ax0.c2p(4, 0), ax0.c2p(4, 1), color=BLUEc, stroke_width=16)
        smear = VGroup(*[Line(ax0.c2p(k, 0), ax0.c2p(k, 0.85 / (1 + 2.5 * abs(k - 4))), color=ORANGEc, stroke_width=12)
                         for k in range(1, 12)])
        with self.line("Leakage smears a frequency…") as v:
            self.play(Create(ax0), FadeIn(nums), GrowFromEdge(bar, DOWN), run_time=v.frac(0.3))
            self.sfx("smear")
            self.play(ReplacementTransform(bar, smear), run_time=v.frac(0.4))
        bar2 = Line(ax0.c2p(9, 0), ax0.c2p(9, 1), color=BLUEc, stroke_width=16)
        with self.line("…aliasing moves it somewhere else entirely.", extra=0.8) as v:
            self.play(FadeOut(smear), GrowFromEdge(bar2, DOWN), run_time=v.frac(0.25))
            self.sfx("swoosh")
            self.play(bar2.animate(path_arc=-1.3).move_to(ax0.c2p(3, 0.5)), run_time=v.frac(0.3))
            self.focus([bar2.copy(), nums.copy()], "9 shows up at 3", BLUEc, hold=0.5)
        self.clear_board(ax0, nums, bar2)

        S = self.shaft_board(12)
        with self.line("A point on a shaft, turning 11 times a second.", extra=0.8) as v:
            self.play(Create(S["ring"]), FadeIn(S["hub"]), Create(S["ax"]), FadeIn(S["tlab"]), run_time=v.frac(0.25))
            self.add(S["live"], S["caps"])
            self.play(S["tau"].animate.set_value(0.45), run_time=v.left(0.15), rate_func=linear)
        fs_lbl = T("sensor: 12 samples / s", 22, INK, BOLD).next_to(S["ring"], UP, buff=0.3)
        with self.line("A sensor samples it 12 times a second. Click, click, click.", extra=4.0) as v:
            self.play(FadeIn(fs_lbl), run_time=0.4)
            self.run_samples(S, rt=v.left(0.4))
        c, r = S["c"], S["r"]
        fwd = Arc(radius=r + 0.22, start_angle=0, angle=TAU * 11 / 12, arc_center=c, color=BLUEc, stroke_width=6)
        back = Arc(radius=r + 0.45, start_angle=0, angle=-TAU / 12, arc_center=c, color=BADc, stroke_width=7).add_tip(tip_length=0.2)
        with self.line("Between two samples it turns almost all the way round…", extra=0.6) as v:
            self.play(Create(fwd), run_time=v.frac(0.35))
            self.play(Create(back), run_time=v.frac(0.2))
            self.focus([S["ring"].copy(), fwd.copy(), back.copy()], "11/12 of a turn forward  =  1/12 back", BADc, hold=0.6)
        alias_c = S["ax"].plot(lambda s: -np.sin(2 * PI * s), x_range=[0, 1, 0.004], color=BADc, stroke_width=5)
        spin_back = Arc(radius=r - 0.4, start_angle=PI / 2, angle=-PI * 0.7, arc_center=c, color=BADc, stroke_width=6).add_tip(tip_length=0.22)
        with self.line("…so the samples see it turning backwards. Once a second.", extra=1.2) as v:
            self.sfx("uhoh")
            self.play(Create(alias_c), FadeOut(fwd), FadeOut(back), Create(spin_back), run_time=v.frac(0.4))
            self.maths(r"\sin\!\left(2\pi \cdot 11 \cdot \tfrac{n}{12}\right) = -\sin\!\left(2\pi \cdot \tfrac{n}{12}\right)",
                       "sin(2π · 11 · n/12) = −sin(2π · n/12)", pos=np.array([2.9, 2.55, 0]), size=34, rt=0.9)
            self.play(self.w_disg.animate.set_value(1), run_time=0.4)
            self.w_shape("slow", rt=0.6)
            self.w_feel("wink")
            self.w_say("I'm 1 Hz. Honest.")
            self.focus([S["caps"].copy().clear_updaters(), alias_c.copy(), spin_back.copy()],
                       "11 Hz in disguise as 1 Hz", BADc, hold=0.8)
        with self.line("That's aliasing.", extra=1.0) as v:
            self.w_hush()
            self.stamp("ALIASING", BLUEc)
        self.sampling_off = True
        self.clear_board(S["ring"], S["hub"], S["ax"], S["tlab"], S["live"], S["caps"], fs_lbl, alias_c, spin_back)

        # ---- the spectrum folds like paper at fs/2
        X = lambda f: -4.6 + f * 0.86
        y0 = -0.3
        base = Line([X(0), y0, 0], [X(6), y0, 0], stroke_color=INK2, stroke_width=4)
        btick = VGroup(*[VGroup(Line([X(f), y0 - 0.08, 0], [X(f), y0 + 0.08, 0], stroke_color=INK2, stroke_width=2),
                                T(str(f), 18, INK2).move_to([X(f), y0 - 0.3, 0])) for f in range(0, 7)])
        nyq = DashedLine([X(6), y0 - 0.6, 0], [X(6), y0 + 1.6, 0], color=BADc, dash_length=0.1)
        nyq_l = T("fs/2 = 6 Hz", 20, BADc, BOLD).next_to(nyq, UP, buff=0.08)
        fs_l2 = T("sample rate fs = 12 Hz", 22, INK, BOLD).move_to(UP * 2.1 + RIGHT * 0.6)
        s = ValueTracker(1.0)

        def strip():
            sv = s.get_value()
            p = lambda f: 6 + sv * (f - 6)
            h = 0.55 * (0.35 + 0.65 * abs(sv))
            g = VGroup(Polygon([X(6), y0 - h / 2, 0], [X(p(12)), y0 - h / 2, 0], [X(p(12)), y0 + h / 2, 0], [X(6), y0 + h / 2, 0],
                               stroke_color=BLUEc, stroke_width=2, fill_color=BLUEc, fill_opacity=0.12 + 0.1 * (1 - abs(sv))))
            for f in range(7, 13):
                g.add(Line([X(p(f)), y0 - 0.08, 0], [X(p(f)), y0 + 0.08, 0], stroke_color=BLUEc, stroke_width=2),
                      T(str(f), 18, BLUEc).set_opacity(0.4 + 0.6 * abs(sv)).move_to([X(p(f)), y0 + 0.32, 0]))
            mk = X(p(11))
            g.add(Triangle(color=BLUEc, fill_opacity=1, stroke_width=0).scale(0.13).rotate(PI).move_to([mk, y0 + 0.75, 0]),
                  T("11 Hz", 22, BLUEc, BOLD).move_to([mk, y0 + 1.1, 0]))
            return g

        strip_m = always_redraw(strip)
        with self.line("In the spectrum, everything above half the sample rate folds back. Like paper.", extra=0.6) as v:
            self.play(Create(base), FadeIn(btick), Create(nyq), FadeIn(nyq_l), FadeIn(fs_l2), run_time=v.frac(0.25))
            self.add(strip_m)
            self.play(FadeIn(strip_m), run_time=0.4)
            self.sfx("fold")
            self.play(s.animate.set_value(-1), run_time=v.frac(0.35), rate_func=smooth)
            self.maths(r"f_{\text{seen}} = \left|\, f - f_s \cdot \mathrm{round}(f / f_s) \,\right| \;\Rightarrow\; |11 - 12| = 1",
                       "f seen = | f − fs · round(f / fs) |   →   |11 − 12| = 1", pos=np.array([0.8, -1.75, 0]),
                       size=36, rt=0.9)
            self.focus([strip_m.copy().clear_updaters(), btick.copy()], "11 Hz lands on 1 Hz", BADc, hold=0.6)
        self.clear_board(strip_m)
        self.remove(strip_m)

        # ---- hear it: a rising tone that turns around
        DUR = 5.5
        f = ValueTracker(1.0)
        fa = lambda: abs(f.get_value() - 12 * np.round(f.get_value() / 12))
        ghost = Line([X(0), y0 + 1.25, 0], [X(12), y0 + 1.25, 0], stroke_color=MUTED, stroke_width=2, stroke_opacity=0.6)
        ghost_l = T("true", 18, MUTED, BOLD).next_to(ghost, LEFT, buff=0.15)
        seen_l = T("seen", 18, BLUEc, BOLD).next_to(base, LEFT, buff=0.15)
        true_dot = always_redraw(lambda: Dot([X(f.get_value()), y0 + 1.25, 0], radius=0.1, color=INK2))
        seen_dot = always_redraw(lambda: Dot([X(fa()), y0, 0], radius=0.13, color=BLUEc))
        link = always_redraw(lambda: DashedLine([X(f.get_value()), y0 + 1.15, 0], [X(fa()), y0 + 0.12, 0],
                                                 stroke_color=MUTED, stroke_width=1.5, dash_length=0.06))
        with self.line("Listen: a rising tone, sampled too slowly, turns around and falls.", extra=DUR - 1.6) as v:
            self.play(Create(ghost), FadeIn(ghost_l), FadeIn(seen_l), FadeIn(true_dot), FadeIn(seen_dot), FadeIn(link), run_time=0.5)
            self.add_sound(alias_sweep(DUR))
            self.play(f.animate.set_value(6), run_time=DUR * 0.5, rate_func=linear)
            # rate_func goes on the tracker only: a play-level rate_func=linear would stop Indicate
            # from shrinking back (it would end the sweep stuck at 1.4x)
            self.play(Indicate(nyq_l, color=BADc, scale_factor=1.4), f.animate(rate_func=linear).set_value(11),
                      run_time=DUR * 0.5)
        self.maths_clear()
        self.clear_board(base, btick, nyq, nyq_l, fs_l2, ghost, ghost_l, seen_l, true_dot, seen_dot, link)
        self.remove(true_dot, seen_dot, link)

    # =================================================================
    # P5  The fix for aliasing + close
    # =================================================================
    def p_fix(self):
        self.ensure_wiggle()
        self.header("THE FIX", "Sample fast enough", GOODc)
        rule = VGroup(M(r"f_s \;>\; 2\,f_{\max}", "fs > 2 × fmax", 72, INK),
                      T("sample rate  >  2 × highest frequency", 26, INK2, BOLD)).arrange(DOWN, buff=0.3).move_to(UP * 0.6)
        rule[0].set_color(INK)
        with self.line("Sample faster than twice the highest frequency.", extra=0.8) as v:
            self.sfx("stamp")
            self.play(FadeIn(rule, scale=1.4), run_time=0.4)
            self.focus([rule.copy()], "the Nyquist rule", GOODc, hold=0.6)
            # park the rule small at the top; drop its subtitle so it can't touch the sensor label
            self.play(rule[1].animate.set_opacity(0), rule[0].animate.scale(0.5).move_to(UP * 2.6 + RIGHT * 1.6),
                      run_time=0.6)
        S = self.shaft_board(24)
        fs_lbl = T("sensor: 24 samples / s", 22, OKc, BOLD).next_to(S["ring"], UP, buff=0.3)
        with self.line("At 24 a second, each step is less than half a turn…", extra=4.0) as v:
            self.play(Create(S["ring"]), FadeIn(S["hub"]), Create(S["ax"]), FadeIn(S["tlab"]), FadeIn(fs_lbl),
                      run_time=0.6)
            self.add(S["live"], S["caps"])
            self.run_samples(S, rt=v.left(0.3))
        truth = S["ax"].plot(lambda t: np.sin(2 * PI * 11 * t), x_range=[0, 1, 0.002], color=OKc, stroke_width=4)
        with self.line("…and the samples follow the real 11 Hz.", extra=1.0) as v:
            self.play(Create(truth), run_time=v.frac(0.4))
            self.play(self.w_disg.animate.set_value(0), run_time=0.4)
            self.w_shape("fast", rt=0.5)
            self.w_feel("surprised", "huh")
            self.w_say("Busted.")
            self.focus([S["caps"].copy().clear_updaters(), truth.copy()], "no disguise at 24 / s", OKc, hold=0.6)
        self.sampling_off = True
        self.w_hush()
        self.clear_board(S["ring"], S["hub"], S["ax"], S["tlab"], S["live"], S["caps"], fs_lbl, truth)

        # ---- anti-alias filter
        ax = Axes(x_range=[0, 18, 3], y_range=[0, 1.2, 0.5], x_length=9, y_length=2.8, tips=False,
                  axis_config={"stroke_color": AXc, "stroke_width": 2}).move_to(RIGHT * 0.8 + DOWN * 0.1)
        nums = VGroup(*[T(str(k), 16, MUTED).next_to(ax.c2p(k, 0), DOWN, buff=0.1) for k in range(0, 19, 3)])
        nyq = DashedLine(ax.c2p(6, 0), ax.c2p(6, 1.2), color=BADc, dash_length=0.1)
        nyq_l = T("fs/2", 18, BADc, BOLD).next_to(nyq, UP, buff=0.05)
        sigb = Line(ax.c2p(3, 0), ax.c2p(3, 1.0), color=BLUEc, stroke_width=14)
        noise = Line(ax.c2p(15, 0), ax.c2p(15, 0.8), color=BADc, stroke_width=14)
        sig_l = T("signal 3 Hz", 18, BLUEc, BOLD).next_to(sigb, UP, buff=0.08)
        noise_l = T("noise 15 Hz", 18, BADc, BOLD).next_to(noise, UP, buff=0.08)
        hop = CurvedArrow(ax.c2p(15, 0.85), ax.c2p(3.3, 1.05), angle=0.9, color=BADc, stroke_width=4)
        resp = lambda x: 1 / np.sqrt(1 + (x / 5.0) ** 10)
        filt = ax.plot(resp, x_range=[0, 18, 0.05], color=OKc, stroke_width=3)
        filt_area = ax.get_area(filt, x_range=[0, 18], color=OKc, opacity=0.12)
        with self.line("One more trap: noise at 15 Hz would fold right onto a 3 Hz signal.", extra=0.8) as v:
            self.play(Create(ax), FadeIn(nums), Create(nyq), FadeIn(nyq_l), GrowFromEdge(sigb, DOWN), FadeIn(sig_l),
                      GrowFromEdge(noise, DOWN), FadeIn(noise_l), run_time=v.frac(0.35))
            self.sfx("uhoh")
            self.play(Create(hop), run_time=v.frac(0.25))
            self.maths(r"15\ \text{Hz} - 12\ \text{Hz} = 3\ \text{Hz}", "15 Hz − 12 Hz = 3 Hz", pos=np.array([4.6, 1.9, 0]),
                       size=36, color=BADc, rt=0.8)
        with self.line("So filter out everything above fs/2 before you sample.", extra=1.2) as v:
            self.play(Create(filt), FadeIn(filt_area), run_time=v.frac(0.35))
            self.sfx("chime")
            self.play(noise.animate.put_start_and_end_on(ax.c2p(15, 0), ax.c2p(15, max(0.8 * resp(15), 0.01))),
                      FadeOut(hop), noise_l.animate.set_opacity(0.4), run_time=v.frac(0.3))
            self.focus([filt.copy(), sigb.copy(), noise.copy()], "anti-alias filter: nothing left to fold", OKc, hold=0.6)
        self.maths_clear()
        self.badge("Aliasing → sample faster, filter first", BLUEc)
        self.clear_board(ax, nums, nyq, nyq_l, sigb, noise, sig_l, noise_l, filt, filt_area, rule)
        self.p_close()

    def p_close(self):
        self.header("RECAP", "Two traps, two fixes")

        def card(title, color, rows):
            box = RoundedRectangle(corner_radius=0.18, width=5.3, height=3.0, stroke_color=color, stroke_width=3,
                                   fill_color=PANEL, fill_opacity=1)
            tt = T(title, 34, color, BOLD)
            body = VGroup(*[T(rw, 22, c_, BOLD) for rw, c_ in rows]).arrange(DOWN, aligned_edge=LEFT, buff=0.18)
            inner = VGroup(tt, body).arrange(DOWN, aligned_edge=LEFT, buff=0.3)
            if inner.width > box.width - 0.5:
                inner.scale_to_fit_width(box.width - 0.5)
            inner.move_to(box)
            return VGroup(box, tt, body)

        left = card("LEAKAGE", ORANGEc, [("between two bins", INK), ("→ smears across all of them", INK2),
                                          ("fix: window it", OKc)])
        right = card("ALIASING", BLUEc, [("above half the sample rate", INK), ("→ shows up somewhere else", INK2),
                                          ("fix: sample faster, filter first", OKc)])
        VGroup(left, right).arrange(RIGHT, buff=0.4).move_to(RIGHT * 1.3 + UP * 0.2)   # clear of Wiggle
        with self.line("Two traps. Two fixes.", extra=1.6) as v:
            anims = [FadeIn(left, shift=UP * 0.2), FadeIn(right, shift=UP * 0.2)]
            if len(self.badges) >= 2:
                anims = [ReplacementTransform(self.badges[0], left), ReplacementTransform(self.badges[1], right)]
                self.badges = []
            self.sfx("whoosh")
            self.play(*anims, run_time=v.frac(0.35))
            self.w_feel("happy", "boing")
        site = T("nodallab.dev", 22, MUTED, BOLD).move_to(FIG(0.94, 0.03))
        with self.line("Next: wavelets, for when one spectrum isn't enough.", extra=1.4) as v:
            self.play(FadeIn(site), run_time=0.4)
            self.w_shape("sine", rt=0.5)
            self.w_feel("wink")
            self.w_say("See you at the wavelets!")
        self.drop_caption()
        self.wait(0.8)
        veil = Rectangle(width=FW + 1, height=FH + 1, stroke_width=0, fill_color=SURF, fill_opacity=1).set_z_index(99)
        self.play(FadeIn(veil), run_time=0.9)
        self.wait(0.4)


# =====================================================================
# Scenes to render
# =====================================================================
class LeakageAliasing(LAFilm):
    PARTS = ["p_intro", "p_leakage", "p_window", "p_aliasing", "p_fix"]


class P1Intro(LAFilm):
    PARTS = ["p_intro"]


class P2Leakage(LAFilm):
    PARTS = ["p_leakage"]


class P3Window(LAFilm):
    PARTS = ["p_window"]


class P4Aliasing(LAFilm):
    PARTS = ["p_aliasing"]


class P5Fix(LAFilm):
    PARTS = ["p_fix"]
