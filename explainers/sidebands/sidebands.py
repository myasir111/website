"""
Sidebands: why the twins appear, why they are evenly spaced, why they ring every harmonic.
(LinkedIn cut, about 2 min: captions + soft sound, no narration. Same engine and look as the wavelets film.)

    manim -qh sidebands.py Sidebands              # 1920x1080 @ 60 fps
    manim -ql sidebands.py Sidebands              # fast draft
    STORY=1 manim -ql sidebands.py Sidebands      # no video: stills + layout & physics report in ./snapshots

Story
  cold     slow-motion gear mesh: an off-centre pinion bites harder, then softer; spectrum shows twins
  product  a wobbling tone is a PRODUCT; a product of cosines is a SUM: three plain tones (twins at w +/- W)
  pulse    wavelets show the same fact as a band that pulses every 40 ms
  even     the gap is the wobble frequency and nothing else; a cosine is two mirror lines
  stamp    multiply in time = stamp the wobble's spectrum on every line (every harmonic gets twins)
  leak     the record must hold more than ~2 wobbles or the twins blur into one lump
  phase    a phase wobble makes twins too (one flipped), wider at higher harmonics; both together: uneven twins
  field    the gap names the source: gear shaft speed, motor slip, bearing shaft rate
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
    Set WV_NO_FONT_REG=1 to skip this (e.g. if DejaVu is installed system-wide)."""
    if os.environ.get("WV_NO_FONT_REG"):
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
          "Install DejaVu (dejavu-fonts.github.io) and set WV_NO_FONT_REG=1 for the exact series font.")

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
BAR_H = 1.0                              # height of each wide-screen bar (frame units): 135 px at 1080p


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

def soft_click_rev(name, dur, fc, body, decay, vol):
    """the same soft click played backwards: the sound of taking a signal apart"""
    t = _t(dur)
    n = np.random.default_rng(7).standard_normal(len(t))
    k = max(2, int(SR / fc))
    n = np.convolve(n, np.ones(k) / k, mode="same")
    y = (n / np.abs(n).max() + 0.5 * np.sin(2 * PI * body * t)) * np.exp(-t / decay) * np.minimum(1, t / 0.001)
    return wav(name + ".wav", vol * (y / np.abs(y).max())[::-1])


# ---- audio ----

# ----------------------------------------------------------------- audio
SR = 44100
AUD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sb_audio")


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


def soft_click(name, dur, fc, body, decay, vol):
    """a soft click: low-passed noise + a short low body tone (no ringing, no pitch sweep)"""
    t = _t(dur)
    n = np.random.default_rng(7).standard_normal(len(t))
    k = max(2, int(SR / fc))
    n = np.convolve(n, np.ones(k) / k, mode="same")
    y = (n / np.abs(n).max() + 0.5 * np.sin(2 * PI * body * t)) * np.exp(-t / decay) * np.minimum(1, t / 0.001)
    return wav(name + ".wav", vol * y / np.abs(y).max())






def swell(dur, shape="move", vol=0.10, seed=5):
    """an air-movement sound made to measure: it lasts exactly `dur` seconds (plus a short tail) and its loudness
    follows the motion it accompanies.
      move  - a camera move or slide with Manim's smooth rate: silent, peaks mid-move, silent (velocity bell)
      draw  - a line drawing at constant speed: fades in, holds, fades out
      rise  - builds into a hit at the end (e.g. into a title card)
    The noise brightens with the loudness, the way air rushing past does."""
    dur = max(0.15, round(float(dur), 2))
    name = f"sw_{shape}_{dur:.2f}_{vol:.3f}_{seed}.wav"
    t = _t(dur + 0.25)
    u = np.clip(t / dur, 0, 1)
    if shape == "move":
        e = np.sin(PI * u) ** 2
    elif shape == "draw":
        e = np.minimum(1, t / 0.12) * np.clip((dur - t) / 0.25, 0, 1)
    else:                                             # rise
        e = u ** 2.2 * np.clip((dur + 0.18 - t) / 0.18, 0, 1)
    rng = np.random.default_rng(seed)
    n = rng.standard_normal(len(t))
    dark = np.convolve(n, np.ones(60) / 60, mode="same")
    bright = np.convolve(n, np.ones(9) / 9, mode="same")
    dark /= np.abs(dark).max() + 1e-9
    bright /= np.abs(bright).max() + 1e-9
    y = e * ((1 - 0.6 * e) * dark + 0.6 * e * bright)
    return wav(name, vol * y / (np.abs(y).max() + 1e-9))


def hit(vol=0.22):
    """a soft, low impact for big moments (title card, 'when to worry'): a deep thump with a short rumble tail"""
    t = _t(2.2)
    body = np.sin(2 * PI * (52 * t - 6 * t ** 2)) * np.exp(-t * 2.2) * np.minimum(1, t / 0.004)
    n = np.random.default_rng(17).standard_normal(len(t))
    rumble = np.convolve(n, np.ones(220) / 220, mode="same") * np.exp(-t * 3.0)
    y = body + 0.6 * rumble / (np.abs(rumble).max() + 1e-9)
    return wav(f"hit_{vol:.2f}.wav", vol * y / np.abs(y).max())


def mesh_tick(level):
    """one gear tooth meeting its partner: a short, dull mechanical tick (low-passed, no ring). level 0..7"""
    t = _t(0.03)
    n = np.random.default_rng(23).standard_normal(len(t))
    n = np.convolve(n, np.ones(14) / 14, mode="same")
    y = (n / np.abs(n).max() + 0.35 * np.sin(2 * PI * 620 * t)) * np.exp(-t / 0.0045) * np.minimum(1, t / 0.0006)
    vol = 0.018 + 0.012 * level
    return wav(f"mesh_{level}.wav", vol * y / np.abs(y).max())


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












def music(dur, vol=0.07):
    """a quiet score that builds: one soft pad at first, a second voice an octave up from a quarter in,
    a gentle pulse from halfway, then everything settles for the ending. Made to the exact film length."""
    L = int(SR * dur)
    y = np.zeros(L, dtype=np.float32)
    beat = 60 / 80
    bar = 4 * beat
    chords = [[146.83, 220.0, 293.66], [123.47, 185.0, 246.94], [110.0, 164.81, 220.0], [130.81, 196.0, 261.63]]
    ramp = lambda t, a_, b_: float(np.clip((t / dur - a_) / (b_ - a_), 0, 1))
    for b in range(int(np.ceil(dur / bar))):
        s, e = int(b * bar * SR), min(int((b + 1) * bar * SR), L)
        if s >= L:
            break
        tt = np.arange(e - s) / SR
        t0 = b * bar
        ch = chords[b % 4]
        swell = np.minimum(1, tt / 0.9) * np.minimum(1, (bar - tt) / 0.9)
        pad = sum(np.sin(2 * PI * f * tt) + 0.4 * np.sin(2 * PI * f * 1.004 * tt) for f in ch)
        seg = (0.09 + 0.05 * ramp(t0, 0.0, 0.7)) * pad * swell
        high = sum(np.sin(2 * PI * 2 * f * tt + 0.3) for f in ch[1:])
        seg += 0.035 * ramp(t0, 0.22, 0.6) * high * swell
        g3 = ramp(t0, 0.5, 0.75) * (1 - ramp(t0, 0.93, 1.0))
        for i in range(4):                               # the pulse: a soft-edged low note on each beat
            ps = int(i * beat * SR)
            pe = min(ps + int(0.6 * SR), e - s)
            if ps < pe and g3 > 0:
                tp = tt[ps:pe] - tt[ps]
                seg[ps:pe] += 0.07 * g3 * np.sin(2 * PI * ch[i % 3] * tp) * np.minimum(1, tp / 0.04) * np.exp(-tp * 4)
        be = min(int(beat * 2 * SR), e - s)
        seg[:be] += 0.12 * np.sin(2 * PI * ch[0] / 2 * tt[:be]) * np.minimum(1, tt[:be] / 0.03) * np.exp(-tt[:be] * 1.5)
        tg = (s + np.arange(e - s)) / SR
        seg *= np.minimum(1, tg / 3.0) * np.minimum(1, (dur - tg) / 3.5)
        y[s:e] = seg
    return wav("music.wav", vol * y / (np.abs(y).max() + 1e-9))


def mix_down(events, total, name="mix.wav"):
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
    return wav(name, out)


WX = np.linspace(0, 1, 300)


def _norm(y):
    y = y - (y.max() + y.min()) / 2
    return y / (np.abs(y).max() + 1e-9)


SHAPES = {
    "sine": np.sin(2 * PI * WX),
    "wobble": _norm((1 + 0.55 * np.cos(2 * PI * 2 * WX)) * np.cos(2 * PI * 9 * WX)),     # Wiggle wears a size wobble
}


# ----------------------------------------------------------------- the signals: a gearbox with a wobble
from scipy.special import jv

N_TEETH, F_SHAFT = 16, 25.0       # a 16-tooth pinion on a shaft at 1,500 rpm = 25 turns per second
F_MESH = N_TEETH * F_SHAFT        # gear mesh 400 Hz (the same 25 Hz and 400 Hz as the wavelets film)
M_AM = 0.5                        # depth of the size wobble
B_PM = 0.4                        # size of the phase wobble (radians)
AMF_M = 0.3                       # the both-at-once example
HARM = (1.0, 0.5, 0.3)            # amplitudes of mesh, 2x mesh, 3x mesh
C_CAR, C_LO, C_UP, C_MOD = INK, BLUEc, ORANGEc, STARc     # colour = role, all film: carrier, lower twin, upper twin, wobble

FS_S = 16384.0                    # 1 s records: every line sits exactly on a 1 Hz bin
TS_ = np.arange(int(FS_S)) / FS_S


def am_signal(t, m=M_AM, harm=HARM, fc=F_MESH, om=F_SHAFT):
    t = np.asarray(t, dtype=float)
    return (1 + m * np.cos(2 * PI * om * t)) * sum(a * np.cos(2 * PI * k * fc * t) for k, a in enumerate(harm, 1))


def pm_signal(t, b=B_PM, harm=HARM, fc=F_MESH, om=F_SHAFT):
    t = np.asarray(t, dtype=float)
    ph = b * np.sin(2 * PI * om * t)
    return sum(a * np.cos(2 * PI * k * fc * t + k * ph) for k, a in enumerate(harm, 1))


def amfm_signal(t, m, b, fc=F_MESH, om=F_SHAFT):
    t = np.asarray(t, dtype=float)
    return (1 + m * np.cos(2 * PI * om * t)) * np.cos(2 * PI * fc * t + b * np.sin(2 * PI * om * t))


def bins(x):
    """complex line amplitudes of a 1 s record; index = frequency in Hz (cos with phase 0 gives a real positive number)"""
    return np.fft.rfft(x) / len(x) * 2


def am_lines(m=M_AM, harm=HARM, fc=F_MESH, om=F_SHAFT):
    out = []
    for k, a in enumerate(harm, 1):
        out += [(k * fc - om, a * m / 2, C_LO), (k * fc, a, C_CAR), (k * fc + om, a * m / 2, C_UP)]
    return out


def pm_lines(b, harm=HARM, fc=F_MESH, om=F_SHAFT, nmax=3, floor=0.012):
    out = []
    for k, a in enumerate(harm, 1):
        for n in range(-nmax, nmax + 1):
            h = a * abs(jv(n, k * b))
            if n == 0 or h > floor:
                out.append((k * fc + n * om, h, C_CAR if n == 0 else (C_LO if n < 0 else C_UP)))
    return out


# a record of length T: do the twins survive? (carrier only, Hann window, amplitude-scaled)
LEAK_T = (0.40, 0.12, 0.06)
LEAK_F = np.linspace(340, 460, 481)


def leak_curve(T):
    n = int(round(T * FS_S))
    t = np.arange(n) / FS_S
    w = np.hanning(n)
    x = am_signal(t, harm=(1.0,)) * w
    E = np.exp(-2j * PI * np.outer(LEAK_F, t))
    return 2 * np.abs(E @ x) / w.sum()


LEAK = [leak_curve(T) for T in LEAK_T]


def n_peaks(y, rel=0.1):
    return int(sum(1 for i in range(1, len(y) - 1) if y[i] > y[i - 1] and y[i] >= y[i + 1] and y[i] > rel * y.max()))


# a phase wobble and a size wobble together: the twins stop being equal
AMF_B = np.linspace(0, AMF_M, 25)
AMF_LO, AMF_UP, AMF_CAR = [], [], []
for _b in AMF_B:
    _X = bins(amfm_signal(TS_, AMF_M, _b))
    AMF_LO.append(abs(_X[int(F_MESH - F_SHAFT)]))
    AMF_UP.append(abs(_X[int(F_MESH + F_SHAFT)]))
    AMF_CAR.append(abs(_X[int(F_MESH)]))
AMF_LO, AMF_UP, AMF_CAR = np.array(AMF_LO), np.array(AMF_UP), np.array(AMF_CAR)

# wavelet map of the same gearbox signal (Morlet, as in the wavelets film)
W0 = 6.0


def scale_of(f):
    return W0 / (2 * PI * f)


def cwt(x, fs, freqs):
    n = len(x)
    xp = np.concatenate([np.zeros(n), x, np.zeros(n)])
    X = np.fft.fft(xp)
    om = 2 * PI * np.fft.fftfreq(len(xp), 1 / fs)
    out = np.zeros((len(freqs), n))
    for i, f in enumerate(freqs):
        a = scale_of(f)
        H = np.sqrt(a) * np.exp(-(a * om - W0) ** 2 / 2) * (om > 0)
        out[i] = np.abs(np.fft.ifft(X * H))[n:2 * n]
    return out


FS_W = 4000.0
T_W = np.arange(int(FS_W * 0.6)) / FS_W
X_W = am_signal(T_W)
F_WLOG = np.geomspace(150, 1800, 100)
W_SHOW = (0.22, 0.38)             # 0.16 s = four turns (a pulse peak falls at 0.24, 0.28, 0.32, 0.36)
_w0, _w1 = int(W_SHOW[0] * FS_W), int(W_SHOW[1] * FS_W)
CWT_W = cwt(X_W, FS_W, F_WLOG)[:, _w0:_w1]
ROW_W = cwt(X_W, FS_W, np.array([F_MESH]))[0, _w0:_w1]

HEAT = [(0.0, "#111110"), (0.3, "#4a2466"), (0.62, "#c2541f"), (0.85, "#eda100"), (1.0, "#fff3cf")]


def heat_rgb(Z, gamma=0.7, px=(720, 260)):
    from PIL import Image
    v = np.clip(Z / Z.max(), 0, 1) ** gamma
    xs = np.array([s for s, _ in HEAT])
    cols = np.array([[int(c[i:i + 2], 16) for i in (1, 3, 5)] for _, c in HEAT], dtype=float)
    rgb = np.stack([np.interp(v, xs, cols[:, i]) for i in range(3)], -1)[::-1]
    return np.asarray(Image.fromarray(rgb.astype(np.uint8)).resize(px, Image.BICUBIC))


# field examples (generic machines, no client data)
SLIP, F_LINE = 0.02, 50.0
GAP_MOTOR = 2 * SLIP * F_LINE     # 2 Hz around the line frequency (broken-bar signature)
F_BPFI = 135.0                    # a bearing inner-race tone of a 25 Hz shaft (fictional bearing)


# ----------------------------------------------------------------- sanity & physics check
def physics_check():
    out = []

    def chk(ok, claim, detail=""):
        out.append((bool(ok), claim, detail))

    X = bins(am_signal(TS_, harm=(1.0,)))
    c, lo, up = abs(X[400]), abs(X[375]), abs(X[425])
    chk(abs(c - 1) < 1e-9 and abs(lo - M_AM / 2) < 1e-9 and abs(up - M_AM / 2) < 1e-9,
        "(1 + m cos Wt) cos wt = cos wt + (m/2) cos(w+W)t + (m/2) cos(w-W)t : twins m/2 as tall", f"{lo:.4f}, {up:.4f} vs {M_AM / 2}")
    t = np.linspace(0, 0.08, 4001)
    prod = (1 + M_AM * np.cos(2 * PI * F_SHAFT * t)) * np.cos(2 * PI * F_MESH * t)
    three = np.cos(2 * PI * F_MESH * t) + M_AM / 2 * np.cos(2 * PI * (F_MESH + F_SHAFT) * t) + M_AM / 2 * np.cos(2 * PI * (F_MESH - F_SHAFT) * t)
    chk(np.abs(prod - three).max() < 1e-12, "the product and the three tones are the same curve", f"{np.abs(prod - three).max():.1e}")
    chk(N_TEETH * F_SHAFT == 400.0 and abs(60 / 1500 - 1 / F_SHAFT) < 1e-12, "16 teeth x 25 turns/s = 400 Hz mesh; 1,500 rpm = 25 Hz")
    ok = True
    for om in (10, 25, 60):
        Xo = bins(am_signal(TS_, harm=(1.0,), om=om))
        pk = sorted(np.where(abs(Xo) > 0.05)[0])
        ok &= pk == [400 - om, 400, 400 + om]
    chk(ok, "the gap equals the wobble frequency (10, 25, 60 Hz tested), whatever the tone")
    Xc = bins(am_signal(TS_, harm=(1.0,), fc=450.0))
    chk(sorted(np.where(abs(Xc) > 0.05)[0]) == [425, 450, 475], "change the tone to 450 Hz: the gap stays 25 Hz")
    Xh = bins(am_signal(TS_))
    rel = [abs(Xh[k * 400 + 25]) / abs(Xh[k * 400]) for k in (1, 2, 3)]
    chk(np.allclose(rel, M_AM / 2), "size wobble: every harmonic gets twins of the same relative size", f"{np.round(rel, 4)}")
    Xp = bins(pm_signal(TS_))
    meas = [abs(Xp[k * 400 + 25]) / abs(Xp[k * 400]) for k in (1, 2, 3)]
    pred = [abs(jv(1, k * B_PM) / jv(0, k * B_PM)) for k in (1, 2, 3)]
    chk(np.allclose(meas, pred, atol=1e-3) and meas[0] < meas[1] < meas[2],
        "phase wobble: harmonic k has index k x beta, so higher harmonics get bigger twins", f"{np.round(meas, 3)} vs Bessel {np.round(pred, 3)}")
    Xq = bins(np.cos(2 * PI * 400 * TS_ + B_PM * np.sin(2 * PI * 25 * TS_)))
    Xa = bins(am_signal(TS_, harm=(1.0,)))
    chk(Xq[375].real < 0 < Xq[425].real and Xa[375].real > 0 and Xa[425].real > 0,
        "phase-wobble twins have opposite signs (one flipped); size-wobble twins have the same sign")
    chk(abs(AMF_LO[-1]) < 0.01 and AMF_UP[-1] > 0.25, "size + phase wobble at once (m = beta): one twin cancels, the other doubles",
        f"lower {AMF_LO[-1]:.3f}, upper {AMF_UP[-1]:.3f}")
    chk(n_peaks(LEAK[0]) == 3 and n_peaks(LEAK[1]) == 3 and n_peaks(LEAK[2]) == 1,
        "record of 10 or 3 wobbles shows three lines; of 1.5 wobbles, one lump (Hann window)",
        f"peaks {[n_peaks(y) for y in LEAK]} for T = {LEAK_T}")
    chk(n_peaks(leak_curve(0.10)) == 3 and n_peaks(leak_curve(2 / F_SHAFT)) == 1,
        "the twins separate once the record holds more than 2 wobbles (T > 2 / 25 Hz = 0.08 s)")
    r = ROW_W
    pk = np.array([i for i in range(1, len(r) - 1) if r[i] > r[i - 1] and r[i] >= r[i + 1]])
    gaps = np.diff(pk) / FS_W
    chk(len(pk) == 4 and np.allclose(gaps, 1 / F_SHAFT, atol=0.001) and r.max() / r.min() > 1.8,
        "wavelet map: the 400 Hz band pulses every 40 ms (four pulses in 0.16 s)",
        f"{len(pk)} pulses, gaps {gaps.min() * 1000:.1f}-{gaps.max() * 1000:.1f} ms, max/min {r.max() / r.min():.2f}")
    Xb = bins(np.cos(2 * PI * 400 * TS_ + 1.5 * np.sin(2 * PI * 25 * TS_)))
    chk(np.allclose([abs(Xb[400 + 25 * n]) for n in range(4)], [abs(jv(n, 1.5)) for n in range(4)], atol=1e-3),
        "FM: cos(wt + beta sin Wt) = sum J_n(beta) cos(w + nW)t (beta = 1.5, n = 0..3)")
    N_, e_ = 16, 0.07
    th = np.linspace(0, 2 * PI, 20001)
    c_ = np.stack([-1.08 + e_ * np.cos(th), e_ * np.sin(th)], 1)
    psi = np.arctan2(-c_[:, 1], 1.08 - c_[:, 0])
    dev = -N_ * psi
    d_ = np.hypot(1.08 - c_[:, 0], c_[:, 1])
    chk(abs((dev.max() - dev.min()) / 2 - N_ * e_ / 2.16) < 0.002 and abs((d_.max() - d_.min()) / 2 - e_) < 1e-4,
        "an off-centre pinion: centre distance swings +/- e (AM) and tooth timing wobbles with index N e / CD (FM), once per turn",
        f"beta {(dev.max() - dev.min()) / 2:.3f} vs {N_ * e_ / 2.16:.3f}")
    nn = np.arange(17)
    tt_ = nn / 400.0
    for _ in range(80):
        tt_ = (nn - 2.5 / (2 * PI) * np.sin(2 * PI * 25 * tt_)) / 400
    chk(np.allclose(2 * PI * 400 * tt_ + 2.5 * np.sin(2 * PI * 25 * tt_), 2 * PI * nn, atol=1e-9),
        "tick picture: each tooth arrives where the mesh phase is a whole number of teeth")
    lo_both = float(bins(amfm_signal(TS_, 0.5, 0.5))[375].real)
    chk(abs(lo_both) < 1e-3, "AM row + FM row = both row (m = beta = 0.5): lower twin cancels", f"{lo_both:.4f}")
    chk(abs(GAP_MOTOR - 2.0) < 1e-12, "motor current: line frequency +/- 2 x slip x 50 Hz = +/- 2 Hz")
    return out




def lag_times(n, run_time, lag_ratio):
    """start time of each part of a LaggedStart"""
    d = run_time / (1 + lag_ratio * (n - 1))
    return [i * lag_ratio * d for i in range(n)]


def caption_mob(text):
    """a caption that always sits wholly inside the bottom bar (never in the picture, where the film push-in would
    stretch it): one row at 26 pt; two rows at 23 pt; shrunk if it still does not fit"""
    rows = textwrap.wrap(text, 72)
    size = 26 if len(rows) == 1 else 23
    txt = VGroup(*[T(r, size, INK, BOLD) for r in rows]).arrange(DOWN, buff=0.06)
    if txt.width > FW - 0.8:
        txt.scale_to_fit_width(FW - 0.8)
    if txt.height > BAR_H - 0.16:
        txt.scale_to_fit_height(BAR_H - 0.16)
    return txt.move_to([0, -FH / 2 + BAR_H / 2, 0])


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
class WVFilm(Scene):
    PARTS = []

    def construct(self):
        self.t_anim = 0.0
        clock = Mobject()
        clock.add_updater(lambda m, dt: setattr(self, "t_anim", self.t_anim + dt))
        self.add(clock)
        self.snd = {"pop": soft_click("pop", 0.05, 1800, 300, 0.009, 0.16), "tick": soft_click("tick", 0.03, 3000, 700, 0.005, 0.10),
                    "whoosh": noise_swell("whoosh", 0.8, 0.12), "swoosh": noise_swell("swoosh", 0.6, 0.09, 15, 4),
                    "sweep": noise_swell("sweep", 2.2, 0.07, 30, 5), "thud": thud(0.2), "stamp": stamp_snd(0.22),
                    "unpop": soft_click_rev("unpop", 0.05, 1800, 300, 0.009, 0.16)}
        self.cap = None
        self.hdr = None
        self.badges = []
        self.eqn = None
        self.snap_n, self.snap_log, self.part, self.wig_mob = 0, [], "", None
        self._sfx = []
        self.snap_dir = os.path.join(SNAP_DIR, type(self).__name__)   # one folder per scene: parallel runs don't clash
        self.setup_wiggle()
        self.cuts = []                       # times of the scene changes (used by film.py for the slow camera pushes)
        # wide-screen bars: the picture lives between them, the title sits in the top bar, captions in the bottom one
        self.add(*[Rectangle(width=FW + 1, height=BAR_H + 0.5, stroke_width=0, fill_color="#000000", fill_opacity=1)
                   .move_to([0, s_ * (FH / 2 - BAR_H / 2 + 0.25), 0]).set_z_index(70) for s_ in (1, -1)])
        veil = Rectangle(width=FW + 1, height=FH + 1, stroke_width=0, fill_color="#000000", fill_opacity=1).set_z_index(99)
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
        if not STORY:
            import json
            with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), f"cuts_{type(self).__name__}.json"), "w") as fh:
                json.dump({"cuts": self.cuts, "total": float(self.renderer.time), "bar_h": BAR_H / FH}, fh)
        total = self.renderer.time
        if total > 1 and not MUTE:          # silent check runs: no music, no mix
            # one pre-mixed track instead of hundreds of overlays (the overlays were the slow / RAM-heavy step)
            # effects only: the music is laid in afterwards (fit_music / score_acts)
            Scene.add_sound(self, mix_down(self._sfx, total, f"mix_{type(self).__name__}.wav"), time_offset=-total)

    def add_sound(self, sound_file, time_offset=0, gain=None, **kwargs):
        """collect every sound with its time; they are mixed into one wav at the end"""
        if MUTE or self.renderer.skip_animations:
            return
        self._sfx.append((self.renderer.time + time_offset, sound_file))

    def sfx(self, name, offset=0.0):
        self.add_sound(self.snd[name], time_offset=offset)

    def swl(self, dur, shape="move", vol=0.06, seed=5, offset=0.0):
        """an air sound made to measure for the animation that starts now and lasts `dur` s"""
        self.add_sound(swell(dur, shape, vol, seed), time_offset=offset)

    def lag_snd(self, n, run_time, lag_ratio, name="tick"):
        """one sound on the start of each part of a LaggedStart"""
        d = run_time / (1 + lag_ratio * (max(n, 1) - 1))
        for i in range(n):
            self.sfx(name, offset=i * lag_ratio * d)

    def callback(self, series, part, title):
        """'from the series' tag in the top bar: shows which earlier video this idea comes from"""
        k = T(f"FROM {series} · PART {part}", 15, ORANGEc, BOLD)
        t = T(title, 20, INK, BOLD)
        g = VGroup(k, t).arrange(DOWN, aligned_edge=RIGHT, buff=0.06)
        rule = Line(g.get_corner(UL) + LEFT * 0.15 + UP * 0.03, g.get_corner(DL) + LEFT * 0.15 + DOWN * 0.03, stroke_color=ORANGEc,
                    stroke_width=4)
        box = VGroup(rule, g).move_to(FIG(0.975, 0.94), aligned_edge=RIGHT).set_z_index(81)
        self.sfx("tick")
        anims = [FadeIn(box, shift=LEFT * 0.3)]
        if getattr(self, "cb", None) is not None:
            anims.append(FadeOut(self.cb))
        self.play(*anims, run_time=0.4)
        self.cb = box

    def callback_off(self):
        if getattr(self, "cb", None) is not None:
            self.play(FadeOut(self.cb), run_time=0.3)
            self.cb = None

    def end_dip(self, rt=0.45):
        veil = Rectangle(width=FW + 1, height=FH + 1, stroke_width=0, fill_color="#000000", fill_opacity=1).set_z_index(99)
        self.play(FadeIn(veil), run_time=rt)

    # ------------------------------------------------------------ captions & headers (house style)
    @contextmanager
    def line(self, text, extra=0.0):
        dur = read_time(text) + extra
        v = Beat(self, dur)
        cap = caption_mob(text).set_z_index(80)
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
        t = T(title, 30, INK, BOLD)
        t.move_to(FIG(0.03, 0.915), aligned_edge=LEFT)
        return VGroup(k, t).set_z_index(80)

    def header(self, kicker, title, kcolor=ORANGEc):
        self.maths_clear()
        g = self._hdr(kicker, title, kcolor)
        self.cuts.append(float(self.renderer.time))
        anims = [FadeIn(g, shift=RIGHT * 0.2)]
        if self.hdr is not None:
            anims.append(FadeOut(self.hdr))
        self.play(*anims, run_time=0.5)
        self.hdr = g

    def part_card(self, kicker, title, kcolor=ORANGEc):
        """big title card that shrinks into the header"""
        self.drop_caption()
        self.maths_clear()
        self.add_sound(hit(0.16), time_offset=0.95)
        dim = Rectangle(width=FW + 1, height=FH + 1, stroke_width=0, fill_color="#000000", fill_opacity=1.0).set_z_index(84)
        k = T(kicker, 30, kcolor, BOLD)
        t = T(title, 76, INK, BOLD)
        card = VGroup(k, t).arrange(DOWN, buff=0.3).set_z_index(85)
        anims = [FadeIn(dim), FadeIn(k, shift=UP * 0.2), Write(t)]
        if self.hdr is not None:
            anims.append(FadeOut(self.hdr))
        self.play(*anims, run_time=1.0)
        self.wait(0.9)
        self.cuts.append(float(self.renderer.time))
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
                              exclude=[self.eqn, *(self.eqn or [])])
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
        self.sfx("tick")
        self.play(FadeIn(b, shift=LEFT * 0.3, scale=1.2), run_time=0.6)
        self.badges.append(b)

    # ------------------------------------------------------------ emphasis: the visual connection
    def focus(self, heroes, label, color=ORANGEc, hold=1.0):
        """dim everything; keep `heroes` lit inside a ring; bold label; thud."""
        dim = Rectangle(width=FW + 1, height=FH + 1, stroke_width=0, fill_color="#000000",
                        fill_opacity=0.74).set_z_index(50)
        grp = Group(*heroes).set_z_index(60)
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
            cy = float(np.clip(c[1], -FH / 2 + BAR_H + 0.15 + h2, FH / 2 - BAR_H - 0.1 - h2))
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
            cy = float(np.clip(c[1], -FH / 2 + BAR_H + 0.4 + h / 2, FH / 2 - BAR_H - 0.12 - h / 2))   # well inside the picture (film push-in)
            L, R, B, Tp = cx - w / 2 - pad, cx + w / 2 + pad, cy - h / 2 - pad, cy + h / 2 + pad
            ov = sum(max(0, min(R, r) - max(L, l)) * max(0, min(Tp, t) - max(B, b)) for l, r, b, t in boxes)
            if ov < best_ov - 1e-9:
                best, best_ov = np.array([cx, cy, 0.0]), ov
            if ov <= 1e-9:
                break
        return best

    def w_say(self, text, at=None):
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
        b.move_to(self.free_spot(b, cands, exclude=[self.bubble]) if at is None else at)
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

    # ------------------------------------------------------------ boards (flat 2D pictures)
    WIDE = dict(w=8.6, x=1.5)          # the wide time axis: 1 second = 9 units, clear of Wiggle

    def axes(self, x_range, y_range, w, h, at):
        return Axes(x_range=x_range, y_range=y_range, x_length=w, y_length=h, tips=False,
                    axis_config={"stroke_color": AXc, "stroke_width": 2, "include_ticks": False}).move_to(at)

    def two_tone(self, ax, fn, lo_first=True, width=3.2):
        """signal drawn in two colours: 10 Hz part blue, 25 Hz part orange (same meaning all film)"""
        c1, c2 = (BLUEc, ORANGEc) if lo_first else (ORANGEc, BLUEc)
        return VGroup(ax.plot(fn, x_range=[0, 0.5, 0.001], color=c1, stroke_width=width),
                      ax.plot(fn, x_range=[0.5, 1, 0.001], color=c2, stroke_width=width))

    def tone_tags(self, ax, lo_first=True):
        a, b = ("10 Hz", BLUEc), ("25 Hz", ORANGEc)
        if not lo_first:
            a, b = b, a
        y = ax.get_bottom()[1] - 0.2
        return VGroup(*[T(s, 18, c, BOLD).move_to([ax.c2p(x, 0)[0], y, 0]) for (s, c), x in zip((a, b), (0.25, 0.75))])

    def spectrum_board(self, amp, at):
        ax = self.axes([0, 40, 10], [0, 0.6, 0.5], 3.2, 1.4, at)
        col = lambda k: BLUEc if abs(k - F_LO) <= 4 else ORANGEc if abs(k - F_HI) <= 4 else MUTED
        stems = VGroup(*[Line(ax.c2p(k, 0), ax.c2p(k, amp[k]), stroke_color=col(k), stroke_width=4)
                         for k in range(1, 40) if amp[k] > 0.004])
        y = ax.get_bottom()[1] - 0.2
        nums = VGroup(*[T(s, 18, c, BOLD).move_to([ax.c2p(f, 0)[0], y, 0]) for s, c, f in
                        (("10", BLUEc, F_LO), ("25", ORANGEc, F_HI), ("Hz", MUTED, 38))])
        return ax, stems, nums

    def heat(self, Z, w, h, at, gamma=0.7):
        """a time-frequency picture + its frame + a cover that slides away to reveal it left to right"""
        im = ImageMobject(heat_rgb(Z, gamma))
        im.stretch_to_fit_width(w)
        im.stretch_to_fit_height(h)
        im.move_to(at)
        cover = Rectangle(width=w, height=h, stroke_width=0, fill_color=SURF, fill_opacity=1).move_to(at).set_z_index(1)
        frame = Rectangle(width=w, height=h, stroke_color=AXc, stroke_width=2).move_to(at).set_z_index(2)
        return im, frame, cover

    @staticmethod
    def reveal(cover):
        return cover.animate(rate_func=linear).stretch_to_fit_width(0.001, about_edge=RIGHT)

    @staticmethod
    def f_ticks(frame, marks, log_range=None, lin_max=None):
        """frequency labels on the left edge of a time-frequency picture"""
        g = VGroup()
        for f in marks:
            fr = np.log(f / log_range[0]) / np.log(log_range[1] / log_range[0]) if log_range else f / lin_max
            y = frame.get_bottom()[1] + fr * frame.height
            g.add(T(f"{f:g} Hz", 16, MUTED, BOLD).move_to([frame.get_left()[0] - 0.12, y, 0], aligned_edge=RIGHT))
        return g




# ---- monitoring examples (fictional gearbox; levels in dB re the mesh line) ----
DB_FLOOR = -60.0
SIG_K_SIGMA = 0.0010            # a cracked tooth's knock: Gaussian pulse, 1 ms wide, once per turn
SIG_K_A = 1.0


def knock_train(t):
    t = np.asarray(t, dtype=float)
    ph = np.mod(t, 1 / F_SHAFT)                 # tooth 0 meets the gear at t = k / 25 s
    d = np.minimum(ph, 1 / F_SHAFT - ph)
    return np.exp(-d ** 2 / (2 * SIG_K_SIGMA ** 2))


def gear_signal(t, m, a=0.0):
    t = np.asarray(t, dtype=float)
    return (1 + m * np.cos(2 * PI * F_SHAFT * t) + a * knock_train(t)) * np.cos(2 * PI * F_MESH * t)


def crack_signal(t):
    return gear_signal(t, 0.05, SIG_K_A)


# the cracked tooth seen by wavelets (as in the wavelets film): a flash per knock, 40 ms apart
FS_K = 4000.0
T_K = np.arange(int(FS_K * 0.6)) / FS_K
X_K = crack_signal(T_K)
F_KLOG = np.geomspace(150, 1200, 110)
K_SHOW = (0.22, 0.38)                    # four turns; knocks at 0.24, 0.28, 0.32, 0.36 s
_q0, _q1 = int(K_SHOW[0] * FS_K), int(K_SHOW[1] * FS_K)
CWT_K = cwt(X_K, FS_K, F_KLOG)[:, _q0:_q1]

TREND_M = np.arange(0, 13, 2)
M_OF_MONTH = lambda mo: 0.05 * (1 + (mo / 6.0) ** 2)            # example wear trend
SIG_MONTH = [gear_signal(TS_, M_OF_MONTH(0)), gear_signal(TS_, M_OF_MONTH(12)), gear_signal(TS_, M_OF_MONTH(12), SIG_K_A)]
SIG_CRACK = crack_signal(TS_)


def db_lines(x, f_lo=255, f_hi=545):
    X = np.abs(bins(x))
    ref = X[int(F_MESH)]
    out = []
    for f in range(int(F_MESH) - 25 * int((F_MESH - f_lo) // 25), f_hi + 1, 25):
        d = 20 * np.log10(X[f] / ref + 1e-12)
        if d > DB_FLOOR:
            out.append((f, d, C_CAR if f == F_MESH else (C_LO if f < F_MESH else C_UP)))
    return out


CRACK_A = [0.0] * 10 + [0.35, 0.7, 1.0]           # waterfall example: a crack starts in month 10
TREND_FULL = [20 * np.log10(abs(bins(gear_signal(TS_, M_OF_MONTH(mo), CRACK_A[mo])))[425] /
                            abs(bins(gear_signal(TS_, M_OF_MONTH(mo), CRACK_A[mo])))[400]) for mo in range(13)]
TREND_DB = np.array([20 * np.log10(abs(bins(gear_signal(TS_, M_OF_MONTH(mo))))[425] / abs(bins(gear_signal(TS_, M_OF_MONTH(mo))))[400])
                     for mo in TREND_M])

_pc_base = physics_check


def physics_check():
    out = _pc_base()

    def chk(ok, claim, detail=""):
        out.append((bool(ok), claim, detail))

    h = db_lines(SIG_MONTH[0])
    n_h = sum(1 for f, d, c in h if f != F_MESH and d > -40)
    chk(n_h == 2 and abs(max(d for f, d, c in h if f != F_MESH) - 20 * np.log10(0.025)) < 0.1,
        "healthy example: one pair of small twins at -32 dB", f"{n_h} lines above -40 dB")
    chk(np.all(np.diff(TREND_DB) > 0) and TREND_DB[-1] - TREND_DB[0] > 10, "wear example: twins grow every month",
        f"{TREND_DB[0]:.1f} -> {TREND_DB[-1]:.1f} dB")
    cl = db_lines(SIG_CRACK)
    n_c = sum(1 for f, d, c in cl if f != F_MESH and d > -40)
    chk(n_c == 10, "a 1 ms knock once per turn: every line in the 255-545 Hz window is a sideband above -40 dB, 25 Hz apart",
        f"{n_c} lines (5 pairs) shown")
    X = np.abs(bins(SIG_CRACK))
    lv = [20 * np.log10(X[400 + 25 * n] / X[400]) for n in (1, 3, 5)]
    chk(lv[0] - lv[2] < 6, "short knock: the family is wide (levels fall slowly away from the mesh)", f"{np.round(lv, 1)} dB at +25, +75, +125 Hz")
    w1 = np.abs(bins(gear_signal(TS_, 0.05, 1.0)))
    k2 = SIG_K_SIGMA
    globals()["SIG_K_SIGMA"] = 2 * k2
    w2 = np.abs(bins(gear_signal(TS_, 0.05, 1.0)))
    globals()["SIG_K_SIGMA"] = k2
    spread = lambda W: sum(1 for n in range(1, 30) if 20 * np.log10(W[400 + 25 * n] / W[400]) > -40)
    chk(spread(w1) > spread(w2), "short in time, wide in frequency: a 1 ms knock spreads wider than a 2 ms one",
        f"{spread(w1)} vs {spread(w2)} upper lines above -40 dB")
    row = CWT_K[np.argmin(np.abs(F_KLOG - 400))]
    pk = [i for i in range(1, len(row) - 1) if row[i] > row[i - 1] and row[i] >= row[i + 1] and row[i] > 0.6 * row.max()]
    hi = CWT_K[np.argmin(np.abs(F_KLOG - 650))]
    chk(len(pk) == 4 and np.allclose(np.diff(pk) / FS_K, 0.040, atol=0.001) and hi.max() > 3 * hi.min(),
        "wavelet map of the cracked tooth: 4 flashes 40 ms apart, each spreading up and down in frequency",
        f"{len(pk)} flashes, gaps {np.round(np.diff(pk) / FS_K * 1000, 1)} ms; at 650 Hz max/min {hi.max() / hi.min():.1f}")
    chk(abs(1 / 0.040 - F_SHAFT) < 1e-9, "40 ms between knocks <=> 25 Hz between sidebands")
    th_ = np.linspace(0, 2 * PI, 721)
    am = 1 + M_AM / 2 * np.exp(1j * th_) + M_AM / 2 * np.exp(-1j * th_)
    fm = 1 + M_AM / 2 * np.exp(1j * th_) - M_AM / 2 * np.exp(-1j * th_)
    chk(np.allclose(np.abs(am), 1 + M_AM * np.cos(th_)) and np.allclose(np.angle(am), 0),
        "phasors: carrier + two mirror arrows = an arrow that only stretches (AM)")
    chk(np.allclose(fm.real, 1) and (np.abs(fm).max() - np.abs(fm).min()) < 0.25 * (np.abs(am).max() - np.abs(am).min())
        and np.angle(fm).max() > 0.4,
        "flip one twin: the arrow mostly swings (about +/-0.46 rad); its length changes 9x less than with AM",
        f"length {np.abs(fm).min():.3f}-{np.abs(fm).max():.3f}, angle +/-{np.angle(fm).max():.2f} rad")
    nwf = []
    for mo in range(13):
        L = db_lines(gear_signal(TS_, M_OF_MONTH(mo), CRACK_A[mo]))
        nwf.append(sum(1 for f, d, c in L if f != F_MESH and d > -40))
    chk(all(n == 2 for n in nwf[:10]) and all(n >= 8 for n in nwf[10:]),
        "waterfall example: one pair of twins for months 0-9, a wide family once the crack starts", f"lines above -40 dB per month {nwf}")
    return out


# =====================================================================
# Helpers and the film: Sidebands
# =====================================================================
def stems(ax, lines, width=5.0):
    g = VGroup()
    for f, a, c in lines:
        a = a if abs(a) > 0.004 else (0.004 if a >= 0 else -0.004)
        g.add(Line(ax.c2p(f, 0), ax.c2p(f, a), stroke_color=c, stroke_width=width))
    return g


def freq_labels(ax, freqs, unit=True, size=18, dy=0.22):
    g = VGroup()
    for i, f in enumerate(freqs):
        s = f"{f:g}" + (" Hz" if unit and i == len(freqs) - 1 else "")
        g.add(T(s, size, MUTED, BOLD).move_to([ax.c2p(f, 0)[0], ax.get_bottom()[1] - dy, 0]))
    return g


# ---- the gear rig (a drawing: a 16-tooth pinion on an off-centre shaft driving a 32-tooth gear) ----
GMOD = 0.09
NP, NG = N_TEETH, 32
RP, RG = GMOD * NP / 2, GMOD * NG / 2          # pitch radii
CD = RP + RG                                    # centre distance
ECC = 0.07                                      # off-centre, exaggerated for the eye
SLOW = 50.0                                     # slow motion
TH_G0 = PI - PI / NG                            # gear phase so a gap meets the pinion's tooth 0
CASE_W, CASE_H = CD + RP + RG + 2 * GMOD + 0.7, 2 * (RG + GMOD) + 0.5
SCOPE_T = 2 / F_SHAFT                           # the scope shows two turns


def gear_poly(n, r, th, centre, P, s, fill, holes=0):
    ra, rd = r + GMOD, r - 1.25 * GMOD
    prof = ((-0.5, rd), (-0.27, rd), (-0.19, r), (-0.12, ra), (0.12, ra), (0.19, r), (0.27, rd))
    pts = []
    for k in range(n):
        a0 = th + 2 * PI * k / n
        for fr, rad in prof:
            a = a0 + fr * 2 * PI / n
            pts.append(P(centre[0] + rad * np.cos(a), centre[1] + rad * np.sin(a)))
    pts.append(pts[0])
    body = VMobject(stroke_color=INK2, stroke_width=1.6, stroke_opacity=0.9, fill_color=fill, fill_opacity=1)
    body.set_points_as_corners(pts)
    g = VGroup(body)
    c = P(*centre)
    g.add(Circle(radius=0.36 * r * s, stroke_color=INK2, stroke_width=1.4, stroke_opacity=0.6, fill_opacity=0).move_to(c))
    for k in range(holes):
        a = th + 2 * PI * (k + 0.5) / holes
        g.add(Circle(radius=0.17 * r * s, stroke_width=0, fill_color=SURF, fill_opacity=1)
              .move_to(P(centre[0] + 0.62 * r * np.cos(a), centre[1] + 0.62 * r * np.sin(a))))
    mark = Line(P(centre[0] + 0.16 * r * np.cos(th), centre[1] + 0.16 * r * np.sin(th)),
                P(centre[0] + 0.5 * r * np.cos(th), centre[1] + 0.5 * r * np.sin(th)), stroke_color=ORANGEc, stroke_width=4)
    g.add(mark)
    return g


def tooth_times(beta, n_max, f=F_MESH, om=F_SHAFT):
    """times at which tooth n passes the mesh when the mesh phase is 2 pi f t + beta sin(2 pi om t)"""
    n = np.arange(n_max + 1, dtype=float)
    t = n / f
    for _ in range(80):
        t = (n - beta / (2 * PI) * np.sin(2 * PI * om * t)) / f
    return t


BETA_VIS = 2.5          # tick picture only: timing wobble exaggerated so the eye can see it


def signed_lines(x, freqs, cols):
    X = bins(x)
    return [(f, float(X[int(f)].real), c) for f, c in zip(freqs, cols)]


M_BOTH = 0.3            # AM depth and FM index of the 'both at once' example (m = beta)
ROW_AM = signed_lines(am_signal(TS_, m=M_BOTH, harm=(1.0,)), (375, 400, 425), (C_LO, C_CAR, C_UP))
ROW_FM = signed_lines(np.cos(2 * PI * F_MESH * TS_ + M_BOTH * np.sin(2 * PI * F_SHAFT * TS_)), (375, 400, 425), (C_LO, C_CAR, C_UP))
ROW_BOTH = signed_lines(amfm_signal(TS_, M_BOTH, M_BOTH), (375, 400, 425), (C_LO, C_CAR, C_UP))
ROW_FM04 = signed_lines(np.cos(2 * PI * F_MESH * TS_ + B_PM * np.sin(2 * PI * F_SHAFT * TS_)), (350, 375, 400, 425, 450),
                        (C_LO, C_LO, C_CAR, C_UP, C_UP))


class SBFilm(WVFilm):
    PARTS = []

    def gap_marker(self, ax, f0, f1, y_val, label, color=C_MOD, size=20):
        y = ax.c2p(f0, y_val)[1] + 0.2
        arr = DoubleArrow([ax.c2p(f0, 0)[0], y, 0], [ax.c2p(f1, 0)[0], y, 0], color=color, buff=0, stroke_width=3.5,
                          tip_length=0.12, max_tip_length_to_length_ratio=0.35)
        lab = T(label, size, color, BOLD).next_to(arr, UP, buff=0.06)
        return VGroup(arr, lab)

    # ------------------------------------------------------------ the gear rig
    def rig_setup(self):
        self.rig_tt = ValueTracker(0.0)          # real time (s); the picture runs SLOW times slower
        self.rig_x, self.rig_y, self.rig_s = ValueTracker(0.0), ValueTracker(0.25), ValueTracker(1.25)
        self.rig_op, self.rig_orbit, self.rig_glow = ValueTracker(0.0), ValueTracker(0.0), ValueTracker(0.0)
        self.spin = Mobject()
        self.spin.add_updater(lambda m, dt: self.rig_tt.increment_value(dt / SLOW))

    def draw_rig(self):
        op = self.rig_op.get_value()
        g = VGroup()
        if op < 0.01:
            return g
        t, s = self.rig_tt.get_value(), self.rig_s.get_value()
        O = np.array([self.rig_x.get_value(), self.rig_y.get_value(), 0.0])
        P = lambda x, y: O + s * np.array([x, y, 0.0])
        th = 2 * PI * F_SHAFT * t
        pa, ga = np.array([-CD / 2, 0.0]), np.array([CD / 2, 0.0])
        pc = pa + ECC * np.array([np.cos(th), np.sin(th)])
        g.add(RoundedRectangle(corner_radius=0.3 * s, width=CASE_W * s, height=CASE_H * s, stroke_color=AXc, stroke_width=2,
                               fill_color=PANEL, fill_opacity=0.9).move_to(P(0, 0)))
        g.add(gear_poly(NG, RG, TH_G0 - th * NP / NG, ga, P, s, "#30353c", holes=5))
        g.add(gear_poly(NP, RP, th, pc, P, s, "#4d5764"))
        orb = self.rig_orbit.get_value()
        if orb > 0.01:
            g.add(Circle(radius=ECC * s, stroke_color=STARc, stroke_width=2.5, stroke_opacity=orb).move_to(P(*pa)))
            for d in (RIGHT, UP):
                g.add(Line(P(*pa) - d * 0.16 * s, P(*pa) + d * 0.16 * s, stroke_color=INK, stroke_width=2.5, stroke_opacity=orb))
            g.add(Dot(P(*pc), radius=0.05 * s, color=STARc).set_opacity(orb))
        env_ = (1 + M_AM * np.cos(th)) / (1 + M_AM)
        flash = (0.5 + 0.5 * np.cos(2 * PI * F_MESH * t)) ** 2
        gl = self.rig_glow.get_value() * env_ * flash
        mp = P(-CD / 2 + RP + ECC * np.cos(th), 0.0)
        if gl > 0.01:
            for rr, oo in ((0.34, 0.12), (0.22, 0.25), (0.11, 0.8)):
                g.add(Dot(mp, radius=rr * s * (0.5 + 0.5 * env_), color=STARc).set_opacity(oo * gl))
        ck = getattr(self, "rig_crack", None)
        if ck is not None and ck.get_value() > 0.01:
            tip = pc + (RP + 0.5 * GMOD) * np.array([np.cos(th), np.sin(th)])
            g.add(Dot(P(*tip), radius=0.07 * s, color=BADc))
            kn = float(knock_train(np.array([t]))[0])
            if kn > 0.02:
                for rr, oo in ((0.5, 0.15), (0.3, 0.35), (0.14, 0.9)):
                    g.add(Dot(mp, radius=rr * s, color=BADc).set_opacity(oo * kn))
        sx, sy = -CD / 2, CASE_H / 2 + 0.13
        g.add(RoundedRectangle(corner_radius=0.04, width=0.36 * s, height=0.26 * s, stroke_color=INK2, stroke_width=1.5,
                               fill_color="#262a30", fill_opacity=1).move_to(P(sx, sy)))
        if gl > 0.01:
            g.add(Dot(P(sx + 0.09, sy), radius=0.035 * s, color=STARc).set_opacity(0.3 + 0.7 * gl))
        for m in g.family_members_with_points():
            m.set_fill(opacity=m.get_fill_opacity() * op)
            m.set_stroke(opacity=m.get_stroke_opacity() * op)
        return g

    def sensor_point(self):
        s = self.rig_s.get_value()
        return np.array([self.rig_x.get_value() - s * CD / 2, self.rig_y.get_value() + s * (CASE_H / 2 + 0.26), 0.0])

    def scope(self, centre, w, h, fn=None):
        frame = RoundedRectangle(corner_radius=0.1, width=w, height=h, stroke_color=AXc, stroke_width=2, fill_color=PANEL,
                                 fill_opacity=0.9).move_to(centre)
        mid = Line(frame.get_left() + RIGHT * 0.15, frame.get_right() + LEFT * 0.15, stroke_color=GRIDc, stroke_width=1.5)

        def trace():
            t = self.rig_tt.get_value()
            ts = np.linspace(t - SCOPE_T, t, 900)
            y = am_signal(ts, harm=(1.0,)) if fn is None else fn(ts)
            x0 = frame.get_left()[0] + 0.15
            ww = w - 0.3
            pts = np.array([[x0 + (u - ts[0]) / SCOPE_T * ww, centre[1] + yy * (h / 2 - 0.12) / (1 + M_AM if fn is None else 2.1), 0] for u, yy in zip(ts, y)])
            return poly(pts, INK, 2.2)

        return VGroup(frame, mid), always_redraw(trace)

    # =================================================================
    # P0  after the 3D opening: what the sensor hears
    # =================================================================
    def p_hear(self):
        self.rig_setup()
        self.add(self.spin)
        self.cuts.append(float(self.renderer.time))
        sc_frame, sc_trace = self.scope(np.array([0.0, 1.3, 0]), 11.0, 1.6)
        with self.line("A sensor on the casing hears 400 Hz, swelling once per turn.", extra=0.5) as v:
            self.play(FadeIn(sc_frame), run_time=0.4)
            self.add(sc_trace)
        sax = self.axes([300, 500, 25], [0, 1.15, 1], 7.0, 1.6, [0.0, -1.25, 0])
        st = stems(sax, am_lines(harm=(1.0,)), 7)
        lab = freq_labels(sax, (350, 400, 450))
        gap = self.gap_marker(sax, 375, 400, M_AM / 2, "25 Hz")
        with self.line("Its spectrum: 400 Hz, with a twin 25 Hz either side.", extra=0.4) as v:
            self.play(FadeIn(sax), FadeIn(lab), run_time=0.3)
            self.lag_snd(3, 0.9, 0.25, "pop")
            self.play(LaggedStart(*[GrowFromEdge(s_, DOWN) for s_ in st], lag_ratio=0.25), run_time=0.9)
            self.sfx("tick")
            self.play(GrowFromCenter(gap), run_time=0.4)
        with self.line("Why are they there? Are they normal? When should you worry?", extra=0.3) as v:
            self.play(Indicate(VGroup(st[0], st[2]), color=STARc, scale_factor=1.08), run_time=1.0)
        sc_trace.clear_updaters()
        self.clear_board(sc_frame, sc_trace, sax, st, lab, gap)
        self.remove(self.spin)
        self.part_card("VIBRATION", "Sidebands")

    # =================================================================
    # P1  why they are there: a slow wobble on a fast tone
    # =================================================================
    def p_why(self):
        SPAN = 0.08
        X0, W = self.WIDE["x"], self.WIDE["w"]
        ax = self.axes([0, SPAN, 0.02], [-1.6, 1.6, 1], W, 2.0, [X0, 1.75, 0])
        xs = lambda t: ax.c2p(t, 0)[0]
        UNIT = 2.0 / 3.2

        def tr(fn, y0, sc, color, width=2.4, n=1300):
            ts = np.linspace(0, SPAN, n)
            return poly(np.array([[xs(t), y0 + sc * fn(t), 0] for t in ts]), color, width, glow=False)

        cw = lambda f: (lambda t: np.cos(2 * PI * f * t))
        env = lambda t: 1 + M_AM * np.cos(2 * PI * F_SHAFT * t)
        carrier = tr(cw(F_MESH), 1.75, UNIT, C_CAR)
        e_up = tr(env, 1.75, UNIT, C_MOD, 2.8)
        e_dn = tr(lambda t: -env(t), 1.75, UNIT, C_MOD, 2.8)
        prod = tr(lambda t: env(t) * np.cos(2 * PI * F_MESH * t), 1.75, UNIT, C_CAR, 2.6)
        self.header("WHY THEY ARE THERE", "A slow wobble on a fast tone")
        self.w_appear()
        with self.line("The 400 Hz mesh tone, its size wobbling once per turn.", extra=0.5) as v:
            self.play(FadeIn(ax), run_time=0.3)
            self.sfx("sweep")
            self.play(Create(carrier), run_time=0.9, rate_func=linear)
            self.sfx("tick")
            self.play(carrier.animate.set_stroke(opacity=0.28), Create(e_up), Create(e_dn), run_time=0.9)
        with self.line("Tone times wobble. Engineers call it amplitude modulation.", extra=0.6) as v:
            self.w_shape("wobble", 0.6)
            self.maths(r"(1 + m\cos\Omega t)\,\cos\omega t", "(1 + m cos Ωt) cos ωt", pos=[X0, 0.42, 0], size=38, rt=0.8)
            self.play(Create(prod), run_time=0.9, rate_func=linear)
            self.play(FadeOut(carrier), FadeOut(e_up), FadeOut(e_dn), run_time=0.3)
        eq2 = r"\cos\omega t + \tfrac{m}{2}\cos(\omega+\Omega)t + \tfrac{m}{2}\cos(\omega-\Omega)t"
        with self.line("And a product of cosines is a sum of cosines.", extra=0.4) as v:
            self.maths(eq2, "cos ωt + (m/2)cos(ω+Ω)t + (m/2)cos(ω−Ω)t", pos=[X0, 0.42, 0], size=32, rt=1.1)
        ys = (-0.15, -1.25, -2.35)
        lane_c = [(F_MESH + F_SHAFT, M_AM / 2, C_UP), (F_MESH, 1.0, C_CAR), (F_MESH - F_SHAFT, M_AM / 2, C_LO)]
        lanes = VGroup(*[tr(lambda t, f=f, a=a: a * np.cos(2 * PI * f * t), y, 0.5, c, 2.6) for (f, a, c), y in zip(lane_c, ys)])
        with self.line("Pull it apart: three steady tones. Add them: the swell is back.", extra=0.9) as v:
            self.add_sound(self.snd["unpop"], time_offset=0.1)
            self.play(prod.animate.set_stroke(opacity=0.28), FadeIn(lanes), run_time=1.0)
            self.wait(0.3)
            self.sfx("pop")
            self.play(*[ln.animate.shift(UP * (1.75 - y)) for ln, y in zip(lanes, ys)], run_time=0.9)
            self.play(prod.animate.set_stroke(opacity=1.0), FadeOut(lanes), run_time=0.4)
        sax = self.axes([340, 460, 20], [0, 1.15, 1], 5.6, 1.8, [X0, -1.55, 0])
        st = stems(sax, [(F_MESH - F_SHAFT, M_AM / 2, C_LO), (F_MESH, 1.0, C_CAR), (F_MESH + F_SHAFT, M_AM / 2, C_UP)], 7)
        lab = freq_labels(sax, (375, 400, 425))
        with self.line("So the twins are real tones, at 375 and 425 Hz.", extra=0.6) as v:
            self.maths(r"\omega \pm \Omega", "ω ± Ω", pos=[X0 + 3.4, -0.2, 0], size=40, rt=0.6)
            self.play(FadeIn(sax), FadeIn(lab), run_time=0.3)
            self.sfx("pop")
            self.play(LaggedStart(*[GrowFromEdge(s_, DOWN) for s_ in st], lag_ratio=0.25), run_time=0.8)
            self.w_shape("sine", 0.4)
            self.w_feel("happy")
            self.w_say("Twins!")
        self.w_hush()
        self.maths_clear()
        self.clear_board(ax, prod, sax, st, lab)

    # =================================================================
    # P2  why so even
    # =================================================================
    def p_even(self):
        self.header("WHY SO EVEN", "The gap is the wobble")
        self.w_appear()
        X0 = self.WIDE["x"]
        ax = self.axes([300, 560, 50], [0, 1.15, 1], 8.2, 2.6, [X0, 0.0, 0])
        fc, g = ValueTracker(F_MESH), ValueTracker(F_SHAFT)
        a = M_AM / 2
        st = always_redraw(lambda: stems(ax, [(fc.get_value() - g.get_value(), a, C_LO), (fc.get_value(), 1.0, C_CAR),
                                              (fc.get_value() + g.get_value(), a, C_UP)], 7))
        gp = always_redraw(lambda: self.gap_marker(ax, fc.get_value() - g.get_value(), fc.get_value(), a, f"{g.get_value():.0f} Hz"))
        nums = freq_labels(ax, (300, 400, 500))
        with self.line("Faster wobble, wider gap. Move the tone: the gap stays.", extra=0.5) as v:
            self.play(FadeIn(ax), FadeIn(nums), run_time=0.3)
            self.add(st, gp)
            self.sfx("tick")
            self.play(g.animate.set_value(60), run_time=0.7)
            self.play(g.animate.set_value(F_SHAFT), run_time=0.5)
            self.sfx("tick")
            self.play(fc.animate.set_value(480), run_time=0.7)
            self.play(fc.animate.set_value(F_MESH), run_time=0.5)
        st.clear_updaters()
        gp.clear_updaters()
        self.clear_board(ax, st, gp, nums)
        self.p_phasor()

    def p_phasor(self):
        """why the twins are mirror images: a cosine is two arrows spinning opposite ways (FFT part 1: the mirror half)"""
        O = np.array([-2.5, -0.1, 0.0])
        L = 2.7                                       # carrier arrow length
        th, sgn = ValueTracker(0.0), ValueTracker(1.0)
        trail = []

        def tips():
            a, sg = th.get_value(), sgn.get_value()
            c = O + np.array([L, 0, 0])
            u = c + L * M_AM / 2 * np.array([np.cos(a), np.sin(a), 0])
            lo = u + sg * L * M_AM / 2 * np.array([np.cos(-a), np.sin(-a), 0])
            return c, u, lo

        def draw():
            c, u, lo = tips()
            g = VGroup(Arrow(O, c, buff=0, color=C_CAR, stroke_width=6, max_tip_length_to_length_ratio=0.08),
                       Arrow(c, u, buff=0, color=C_UP, stroke_width=5, max_tip_length_to_length_ratio=0.3),
                       Arrow(u, lo, buff=0, color=C_LO, stroke_width=5, max_tip_length_to_length_ratio=0.3),
                       DashedLine(O, lo, color=STARc, stroke_width=3, dash_length=0.08),
                       Dot(lo, radius=0.06, color=STARc))
            return g

        def track_line():
            a, sg = th.get_value(), sgn.get_value()
            aa = np.linspace(max(0, a - 2 * PI), a, 120)
            pts = [O + np.array([L, 0, 0]) + L * M_AM / 2 * (np.array([np.cos(x), np.sin(x), 0]) + sg * np.array([np.cos(-x), np.sin(-x), 0]))
                   for x in aa]
            return VMobject(stroke_color=STARc, stroke_width=2.5, stroke_opacity=0.6).set_points_as_corners(pts) if len(pts) > 1 else VGroup()

        ph = always_redraw(draw)
        tl = always_redraw(track_line)
        sax = self.axes([350, 450, 25], [-0.4, 1.1, 1], 2.8, 1.6, [4.6, -0.1, 0])
        spec = always_redraw(lambda: stems(sax, [(375, sgn.get_value() * M_AM / 2, C_LO), (400, 1.0, C_CAR), (425, M_AM / 2, C_UP)], 7))
        with self.line("A cosine wobble is two arrows spinning opposite ways: mirror twins.", extra=1.4) as v:
            self.callback("FFT", 1, "The half your analyser throws away")
            self.maths(r"1 + m\cos\Omega t \;=\; 1 + \tfrac{m}{2}e^{i\Omega t} + \tfrac{m}{2}e^{-i\Omega t}",
                       "1 + m cos Ωt = 1 + (m/2)e^(iΩt) + (m/2)e^(−iΩt)", pos=[1.5, 2.45, 0], size=34, rt=0.8)
            self.add(tl, ph)
            self.play(FadeIn(sax), FadeIn(spec), run_time=0.4)
            self.play(th.animate(rate_func=linear).set_value(4 * PI), run_time=2.8)
            self.w_feel("happy")
            self.w_say("It stretches, it shrinks!")
        self.w_hush()
        with self.line("Flip one twin and the arrow swings instead: a timing wobble, FM.", extra=0.9) as v:
            self.sfx("tick")
            self.play(sgn.animate.set_value(-1.0), run_time=0.6)
            th.set_value(0.0)
            self.play(th.animate(rate_func=linear).set_value(4 * PI), run_time=2.6)
        for m in (ph, tl, spec):
            m.clear_updaters()
        self.callback_off()
        self.maths_clear()
        self.clear_board(ph, tl, sax, spec)

    # =================================================================
    # P3  every harmonic (+ one line on FM)
    # =================================================================
    def p_harm(self):
        self.ensure_wiggle()
        self.header("EVERY HARMONIC", "Stamped on every line")
        ax = self.axes([300, 1300, 100], [0, 1.15, 1], 9.6, 2.4, [0.9, -1.2, 0])
        base = stems(ax, [(k * F_MESH, a, C_CAR) for k, a in enumerate(HARM, 1)], 6)
        nums = freq_labels(ax, (400, 800, 1200))
        mx = self.axes([-50, 50, 25], [0, 1.1, 1], 2.6, 1.0, [-0.6, 1.75, 0])
        pat = stems(mx, [(-F_SHAFT, M_AM / 2, C_MOD), (0, 1.0, C_MOD), (F_SHAFT, M_AM / 2, C_MOD)], 6)
        with self.line("Remember harmonics? A real mesh is no pure sine.", extra=0.0) as v:
            self.callback("HARMONICS", 2, "Why we see harmonics")
            self.play(FadeIn(ax), FadeIn(nums), run_time=0.3)
            self.lag_snd(3, 0.9, 0.25, "pop")
            self.play(LaggedStart(*[GrowFromEdge(s_, DOWN) for s_ in base], lag_ratio=0.25), run_time=0.9)
        finals = [stems(ax, [(k * F_MESH - F_SHAFT, a * M_AM / 2, C_LO), (k * F_MESH, a, C_CAR),
                             (k * F_MESH + F_SHAFT, a * M_AM / 2, C_UP)], 6) for k, a in enumerate(HARM, 1)]
        with self.line("The wobble's pattern gets stamped on every one: twins everywhere.", extra=0.8) as v:
            self.play(FadeIn(mx), run_time=0.3)
            self.play(LaggedStart(*[GrowFromEdge(s_, DOWN) for s_ in pat], lag_ratio=0.2), run_time=0.6)
            self.maths(r"x(t) = m(t)\sum_k a_k\cos k\omega t", "x(t) = m(t) Σ a_k cos kωt", pos=[4.0, 2.2, 0], size=34, rt=0.8)
            copies = [pat.copy() for _ in finals]
            self.lag_snd(3, 2.0, 0.7, "pop")
            self.play(LaggedStart(*[Transform(c_, f_) for c_, f_ in zip(copies, finals)], lag_ratio=0.7), run_time=2.0)
            self.remove(base)
        self.play(*[FadeOut(c_) for c_ in copies], FadeOut(mx), FadeOut(pat), run_time=0.4)
        st = VGroup()
        st.clear_updaters()
        self.callback_off()
        self.maths_clear()
        self.clear_board(ax, nums, st)
        self.remove(*[m for m in self.mobjects if type(m) is Line])

    # =================================================================
    # P4  are they normal? when to worry
    # =================================================================
    def db_board(self, at, w=7.4, h=2.4):
        ax = self.axes([250, 550, 50], [DB_FLOOR, 4, 10], w, h, at)
        ticks = VGroup(*[T(f"{d} dB", 16, MUTED, BOLD).move_to([ax.get_left()[0] - 0.1, ax.c2p(250, d)[1], 0], aligned_edge=RIGHT)
                         for d in (0, -40)])
        return ax, ticks, freq_labels(ax, (300, 400, 500))

    def db_stems(self, ax, x, width=6):
        L = db_lines(x)
        return VGroup(*[Line(ax.c2p(f, DB_FLOOR), ax.c2p(f, max(DB_FLOOR + 0.6, d)), stroke_color=c, stroke_width=width) for f, d, c in L])

    def p_health(self):
        self.ensure_wiggle()
        self.header("ARE THEY NORMAL?", "Yes: small and steady")
        X0 = self.WIDE["x"]
        ax, dt_, nums = self.db_board([0.0, -0.6, 0], w=6.2, h=2.6)
        cur = self.db_stems(ax, SIG_MONTH[0])
        badge = T("example", 18, MUTED, BOLD).next_to(ax, UP, buff=0.12).align_to(ax, RIGHT)
        with self.line("Nothing is made perfect. Every gearbox shows small sidebands.", extra=0.8) as v:
            self.play(FadeIn(ax), FadeIn(dt_), FadeIn(nums), FadeIn(badge), run_time=0.4)
            self.sfx("pop")
            self.play(LaggedStart(*[GrowFromEdge(s_, DOWN) for s_ in cur], lag_ratio=0.15), run_time=0.8)
            self.w_feel("happy")
            self.w_say("Normal? Yes.")
        self.w_hush()
        self.header("WHEN TO WORRY", "When they grow")
        tax = self.axes([0, 12, 3], [-40, -5, 5], 2.4, 2.4, [5.0, -0.6, 0])
        tnum = VGroup(*[T(s, 16, MUTED, BOLD).move_to([tax.c2p(m_, 0)[0], tax.get_bottom()[1] - 0.2, 0]) for s, m_ in
                        (("0", 0), ("6", 6), ("12 months", 10.6))])
        pts = [Dot(tax.c2p(m_, TREND_DB[i]), radius=0.06, color=STARc) for i, m_ in enumerate(TREND_M)]
        line = VMobject(stroke_color=STARc, stroke_width=3).set_points_as_corners([tax.c2p(m_, d) for m_, d in zip(TREND_M, TREND_DB)])
        with self.line("Trend them. Wear makes the twins taller, month by month.", extra=1.0) as v:
            self.play(FadeIn(tax), FadeIn(tnum), run_time=0.3)
            self.play(Transform(cur, self.db_stems(ax, SIG_MONTH[1])), Create(line), LaggedStart(*[FadeIn(p_) for p_ in pts], lag_ratio=0.2),
                      run_time=2.0)
            self.w_feel("worried", hop=False)
        with self.line("Damage brings more of them. Growing sidebands: time to look.", extra=1.0) as v:
            self.sfx("thud")
            self.play(Transform(cur, self.db_stems(ax, SIG_MONTH[2])), run_time=1.0)
            self.w_say("Growing? Look closer.")
        self.w_hush()
        self.w_feel("neutral", hop=False)
        self.clear_board(ax, dt_, nums, cur, badge, tax, tnum, line, *pts)

    # =================================================================
    # P5  one cracked tooth: short knock, many sidebands
    # =================================================================
    def p_crack(self):
        self.ensure_wiggle()
        self.header("ONE CRACKED TOOTH", "Short knock, many sidebands")
        self.rig_setup()
        self.rig_x.set_value(-4.3)
        self.rig_y.set_value(1.35)
        self.rig_s.set_value(0.62)
        self.rig_crack = ValueTracker(1.0)
        rig = always_redraw(self.draw_rig)
        sc_frame, sc_trace = self.scope(np.array([2.6, 1.4, 0]), 7.2, 1.4, fn=crack_signal)
        with self.line("A cracked tooth knocks once per turn.", extra=1.6) as v:
            self.add(rig, self.spin)
            self.play(self.rig_op.animate.set_value(1), FadeIn(sc_frame), run_time=0.6)
            self.add(sc_trace)
        ax, dt_, nums = self.db_board([1.4, -1.45, 0], w=8.6, h=1.75)
        cs = self.db_stems(ax, SIG_CRACK, 5)
        with self.line("A short knock spreads into many sidebands: short in time, wide in frequency.", extra=1.4) as v:
            self.play(FadeIn(ax), FadeIn(dt_), FadeIn(nums), run_time=0.3)
            self.sfx("pop")
            self.play(LaggedStart(*[GrowFromEdge(s_, DOWN) for s_ in cs], lag_ratio=0.03), run_time=1.0)
            self.w_say("Like the wavelets!")
        self.w_hush()
        sc_trace.clear_updaters()
        self.play(self.rig_op.animate.set_value(0), FadeOut(sc_frame), FadeOut(sc_trace), FadeOut(ax), FadeOut(dt_), FadeOut(nums),
                  FadeOut(cs), run_time=0.5)
        self.remove(rig, self.spin)
        self.rig_crack.set_value(0.0)

    # =================================================================
    # one knock, two views: the wavelet map (FFT part 3) and the spectrum
    # =================================================================
    def p_views(self):
        self.header("ONE KNOCK, TWO VIEWS", "Wavelets and the FFT")
        self.w_appear()
        span = K_SHOW[1] - K_SHOW[0]
        W, H = 5.0, 2.4
        im, frame, cover = self.heat(CWT_K, W, H, [-0.9, -0.1, 0], gamma=0.5)
        ticks = self.f_ticks(frame, (200, 400, 800), log_range=(F_KLOG[0], F_KLOG[-1]))
        x_of = lambda t: frame.get_left()[0] + (t - K_SHOW[0]) / span * W
        yt = frame.get_top()[1] + 0.22
        gap = DoubleArrow([x_of(0.28), yt, 0], [x_of(0.32), yt, 0], color=STARc, buff=0, stroke_width=3.5, tip_length=0.15,
                          max_tip_length_to_length_ratio=0.25)
        gap_l = T("40 ms", 20, STARc, BOLD).next_to(gap, UP, buff=0.06)
        with self.line("Remember the wavelet map? Each knock is a flash, 40 ms apart.", extra=0.9) as v:
            self.callback("FFT", 3, "Wavelets: which frequency, and when")
            self.add(im, cover)
            self.play(FadeIn(frame), FadeIn(ticks), self.reveal(cover), run_time=1.3)
            self.remove(cover)
            self.sfx("tick")
            self.play(GrowFromCenter(gap), FadeIn(gap_l), run_time=0.4)
        ax, dt_, nums = self.db_board([4.5, -0.25, 0], w=3.5, h=2.2)
        cs = self.db_stems(ax, SIG_CRACK, 4)
        yg = ax.c2p(400, -8)[1]
        gf = VGroup(DoubleArrow([ax.c2p(375, 0)[0], yg, 0], [ax.c2p(400, 0)[0], yg, 0], color=STARc, buff=0, stroke_width=3,
                                tip_length=0.1, max_tip_length_to_length_ratio=0.4))
        gf.add(T("25 Hz", 18, STARc, BOLD).next_to(gf[0], LEFT, buff=0.08))
        with self.line("The FFT sees the same knocks as sidebands, 25 Hz apart.", extra=0.6) as v:
            self.play(FadeIn(ax), FadeIn(dt_), FadeIn(nums), run_time=0.3)
            self.lag_snd(len(cs), 1.0, 0.06, "tick")
            self.play(LaggedStart(*[GrowFromEdge(s_, DOWN) for s_ in cs], lag_ratio=0.06), run_time=1.0)
            self.play(GrowFromCenter(gf), run_time=0.4)
        with self.line("Short in time, wide in frequency: 40 ms apart is 25 Hz apart.", extra=1.0) as v:
            self.maths(r"\frac{1}{0.040\ \text{s}} = 25\ \text{Hz}", "1 / 0.040 s = 25 Hz", pos=[1.6, 2.45, 0], size=36, rt=0.7)
            self.w_feel("happy")
            self.w_say("One knock, two views!")
        self.w_hush()
        self.callback_off()
        self.maths_clear()
        self.clear_board(im, frame, ticks, gap, gap_l, ax, dt_, nums, cs, gf)

    # =================================================================
    # P6  the gap names the culprit
    # =================================================================
    def p_where(self):
        self.ensure_wiggle()
        self.header("WHERE TO LOOK", "The gap names the culprit")

        def card(title, color, f0, f1, c0, gap, label):
            box = RoundedRectangle(corner_radius=0.18, width=3.0, height=3.4, stroke_color=color, stroke_width=3,
                                   fill_color=PANEL, fill_opacity=1)
            tt = T(title, 26, color, BOLD)
            a_ = Axes(x_range=[f0, f1, (f1 - f0) / 4], y_range=[0, 1.1, 1], x_length=2.3, y_length=1.2, tips=False,
                      axis_config={"stroke_color": AXc, "stroke_width": 2, "include_ticks": False})
            sp = stems(a_, [(c0 - gap, 0.3, C_LO), (c0, 1.0, C_CAR), (c0 + gap, 0.3, C_UP)], 6)
            lb = VGroup(*[T(r_, 21, INK2, BOLD) for r_ in label]).arrange(DOWN, buff=0.08)
            body = VGroup(tt, VGroup(a_, sp), lb).arrange(DOWN, buff=0.28)
            if body.width > box.width - 0.3:
                body.scale_to_fit_width(box.width - 0.3)
            body.move_to(box)
            return VGroup(box, body)

        c1 = card("GEAR MESH", ORANGEc, 350, 450, 400, 25, ["gap =", "gear's shaft speed"])
        c2 = card("BEARING", STARc, 85, 185, F_BPFI, 25, ["gap =", "shaft speed"])
        c3 = card("MOTOR CURRENT", BLUEc, 44, 56, 50, GAP_MOTOR, ["gap =", "2 x slip x 50 Hz"])
        row = VGroup(c1, c2, c3).arrange(RIGHT, buff=0.22).move_to([1.45, 0.1, 0])
        with self.line("Measure the gap: it is the speed of the part that wobbles.", extra=0.9) as v:
            self.lag_snd(3, 1.3, 0.3, "tick")
            self.play(LaggedStart(*[FadeIn(c_, shift=UP * 0.2) for c_ in row], lag_ratio=0.3), run_time=1.3)
            self.w_feel("happy")
        self.clear_board(row)

    def p_see(self):
        self.ensure_wiggle()
        self.header("SEEING THEM", "Record at least two turns")
        X0 = self.WIDE["x"]
        ax = self.axes([340, 460, 20], [0, 1.1, 1], 7.4, 2.1, [X0, -0.5, 0])
        nums = freq_labels(ax, (375, 400, 425))
        pts = lambda y: np.array([ax.c2p(f, v) for f, v in zip(LEAK_F, y)])
        cur = poly(pts(LEAK[0]), STARc, 4.0)
        with self.line("Record under two turns and leakage blurs the twins into one lump.", extra=1.2) as v:
            self.callback("FFT", 2, "Leakage and aliasing")
            self.play(FadeIn(ax), FadeIn(nums), run_time=0.3)
            self.play(Create(cur), run_time=0.7)
            self.maths(r"T \;>\; 2 / \Omega", "T > 2 / Ω", pos=[X0, 1.5, 0], size=40, rt=0.6)
            self.play(Transform(cur, poly(pts(LEAK[2]), STARc, 4.0)), run_time=1.1)
            self.w_feel("worried", hop=False)
        self.w_feel("neutral", hop=False)
        self.callback_off()
        self.maths_clear()
        self.clear_board(ax, cur, nums)

    # =================================================================
    # P7  recap
    # =================================================================
    def p_close(self):
        self.header("RECAP", "Sidebands")

        def card(title, color, rows_):
            box = RoundedRectangle(corner_radius=0.18, width=2.55, height=2.0, stroke_color=color, stroke_width=3,
                                   fill_color=PANEL, fill_opacity=1)
            tt = T(title, 26, color, BOLD)
            body = VGroup(*[T(rw, 22, INK, BOLD) for rw in rows_]).arrange(DOWN, aligned_edge=LEFT, buff=0.12)
            inner = VGroup(tt, body).arrange(DOWN, aligned_edge=LEFT, buff=0.22)
            if inner.width > box.width - 0.35:
                inner.scale_to_fit_width(box.width - 0.35)
            inner.move_to(box)
            return VGroup(box, tt, body)

        cs = [card("WHY", INK2, ["slow wobble,", "fast tone"]), card("NORMAL?", OKc, ["yes: small,", "steady"]),
              card("WORRY", BADc, ["growing,", "multiplying"]), card("WHERE", STARc, ["the gap", "names it"])]
        row = VGroup(*cs).arrange(RIGHT, buff=0.18).move_to([1.45, 0.75, 0])
        site = T("nodallab.dev", 22, MUTED, BOLD).move_to(FIG(0.97, 0.94), aligned_edge=RIGHT).set_z_index(80)
        with self.line("Sidebands: the wobble's fingerprint. Watch them, trend them.", extra=1.6) as v:
            self.lag_snd(4, 1.3, 0.25, "tick")
            self.play(LaggedStart(*[FadeIn(c_, shift=UP * 0.2) for c_ in row], lag_ratio=0.25), FadeIn(site), run_time=1.3)
            self.maths(r"x(t) = m(t) \cdot \text{carrier}(t)", "x(t) = m(t) · carrier(t)", pos=[1.45, -1.55, 0], size=42, rt=0.9)
            self.w_feel("wink")
            self.w_say("See you in the Lab!")
        self.drop_caption()
        self.wait(0.3)
        veil = Rectangle(width=FW + 1, height=FH + 1, stroke_width=0, fill_color="#000000", fill_opacity=1).set_z_index(99)
        self.play(FadeIn(veil), run_time=1.6)
        self.wait(0.4)


class SHear(SBFilm):
    PARTS = ["p_hear", "end_dip"]


class SEvenHarm(SBFilm):
    PARTS = ["p_even", "p_harm", "end_dip"]


class SCrackViews(SBFilm):
    PARTS = ["p_views", "end_dip"]


class SWhereClose(SBFilm):
    PARTS = ["p_where", "p_see", "p_close"]
