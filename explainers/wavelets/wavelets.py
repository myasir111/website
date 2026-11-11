"""
Wavelets: which frequencies, and when.   (LinkedIn cut, about 90 s: captions + soft sound, no narration)

Same look and engine as the leakage & aliasing film: dark surface, captions in a box at the bottom,
orange kicker + title top-left, Wiggle the wave mascot on the left, a maths row, "focus" moments.

    manim -qh wavelets.py Wavelets              # 1920x1080 @ 60 fps
    manim -ql wavelets.py Wavelets              # fast draft
    STORY=1 manim -ql wavelets.py Wavelets      # no video: stills + layout & physics report in ./snapshots
    manim -qh wavelets.py P3Wavelet             # one part only (P1Hook, P2Stft, P3Wavelet, P4Machine)

All audio is synthesised with NumPy into ./wv_audio and mixed in by Manim.

Story
  hook     10 Hz then 25 Hz, and the same thing backwards: exactly the same amplitude spectrum
  try 1    short FFTs (the spectrogram) bring time back, but one window size: sharp in time OR in frequency
  idea     a wavelet = a short burst; slide it (b) and stretch it (a); every stretch gives a map
  machine  a shaft at 1,500 rpm with a knock once per turn: the hum is a band, each knock a flash, 40 ms apart
  close    FFT: which. Wavelets: which, and when.
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


# ----------------------------------------------------------------- the signals and their transforms
def hann(t):
    return 0.5 * (1 - np.cos(2 * PI * np.asarray(t)))


F_LO, F_HI = 10.0, 25.0          # the two tones of the demo signals (Hz)
FS = 1000.0                      # sample rate of the demo signals
TT = np.arange(int(FS)) / FS     # one second


def sig_a(t):
    """10 Hz for the first half second, then 25 Hz (joined at a zero crossing)"""
    t = np.asarray(t, dtype=float)
    return np.where(t < 0.5, np.sin(2 * PI * F_LO * t), np.sin(2 * PI * F_HI * (t - 0.5)))


def sig_b(t):
    """the same signal played backwards: 25 Hz first, then 10 Hz"""
    return sig_a(1.0 - np.asarray(t, dtype=float))


def spectrum(x):
    """single-sided amplitude spectrum; bins are 1 Hz apart for a 1 s record"""
    X = np.fft.rfft(x) / len(x)
    a = 2 * np.abs(X)
    a[0] /= 2
    return a


SPEC_A, SPEC_B = spectrum(sig_a(TT)), spectrum(sig_b(TT))


def stft(x, fs, win_s, taus, freqs):
    """short-time Fourier transform: Hann window of win_s seconds centred at each tau. |X(tau, f)|, amplitude-scaled"""
    n = len(x)
    t = np.arange(n) / fs
    E = np.exp(-2j * PI * np.outer(freqs, t))
    out = np.zeros((len(freqs), len(taus)))
    for j, tau in enumerate(taus):
        u = (t - tau) / win_s + 0.5
        w = np.where((u > 0) & (u < 1), hann(np.clip(u, 0, 1)), 0.0)
        out[:, j] = 2 * np.abs(E @ (x * w)) / max(w.sum(), 1e-9)
    return out


W0 = 6.0                         # Morlet wavelet: omega_0


def morlet(u):
    """real part of the Morlet wavelet  psi(u) = exp(i w0 u) exp(-u^2 / 2)"""
    return np.cos(W0 * u) * np.exp(-u ** 2 / 2)


def scale_of(f):
    """scale a (seconds) whose wavelet oscillates at f Hz:  f = w0 / (2 pi a)"""
    return W0 / (2 * PI * f)


def cwt(x, fs, freqs):
    """continuous wavelet transform |W(a, b)| with the Morlet wavelet and the 1/sqrt(a) factor,
    done in the frequency domain (zero-padded so the two ends don't wrap around)."""
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


WINS = (0.3, 0.14, 0.8)        # window lengths (s): the first try, a short one, a long one
TAUS = np.linspace(0, 1, 240)
F_LIN = np.linspace(0, 40, 121)
STFT_MID, STFT_SHORT, STFT_LONG = [stft(sig_a(TT), FS, w, TAUS, F_LIN) for w in WINS]
F_LOG = np.geomspace(4, 60, 110)
CWT_A = cwt(sig_a(TT), FS, F_LOG)
ROW = {f: cwt(sig_a(TT), FS, np.array([f]))[0] for f in (F_LO, F_HI)}     # the 'score' of one wavelet as it slides

# the machine: a shaft at 1,500 rpm with a small knock once per turn
RPM = 1500.0
F_SHAFT = RPM / 60               # 25 Hz
T_TURN = 60 / RPM                # 0.040 s
F_RING, TAU_RING = 400.0, 0.003  # each knock rings a 400 Hz resonance that dies in a few ms
FS_M = 4000.0
M_SHOW = (0.40, 0.64)            # the 0.24 s (6 turns) shown, cut from the middle of a 1 s run
T_M = np.arange(int(FS_M)) / FS_M


def machine(t):
    t = np.asarray(t, dtype=float)
    y = np.sin(2 * PI * F_SHAFT * t)
    for k in range(int(t.max() / T_TURN) + 2):
        d = t - (0.012 + k * T_TURN)
        y = y + np.where(d >= 0, 1.6 * np.exp(-np.clip(d, 0, None) / TAU_RING) * np.sin(2 * PI * F_RING * d), 0.0)
    return y + 0.03 * np.random.default_rng(11).standard_normal(len(t))


X_M = machine(T_M)
F_MLOG = np.geomspace(12, 1000, 120)
_i0, _i1 = int(M_SHOW[0] * FS_M), int(M_SHOW[1] * FS_M)
CWT_M = cwt(X_M, FS_M, F_MLOG)[:, _i0:_i1]
ROW_RING = cwt(X_M, FS_M, np.array([F_RING]))[0, _i0:_i1]

HEAT = [(0.0, "#111110"), (0.3, "#4a2466"), (0.62, "#c2541f"), (0.85, "#eda100"), (1.0, "#fff3cf")]


def heat_rgb(Z, gamma=0.7, px=(720, 260)):
    """|W| -> an RGB picture (row 0 = highest frequency), colours from the HEAT ramp"""
    from PIL import Image
    v = np.clip(Z / Z.max(), 0, 1) ** gamma
    xs = np.array([s for s, _ in HEAT])
    cols = np.array([[int(c[i:i + 2], 16) for i in (1, 3, 5)] for _, c in HEAT], dtype=float)
    rgb = np.stack([np.interp(v, xs, cols[:, i]) for i in range(3)], -1)[::-1]
    return np.asarray(Image.fromarray(rgb.astype(np.uint8)).resize(px, Image.BICUBIC))




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

    _tz = lambda y, x: float(np.sum((y[1:] + y[:-1]) * np.diff(x)) / 2)      # trapezium rule
    lo, hi = int(F_LO), int(F_HI)
    chk(np.abs(SPEC_A - SPEC_B).max() < 1e-9, "the two signals have exactly the same amplitude spectrum",
        f"largest difference {np.abs(SPEC_A - SPEC_B).max():.1e}")
    top2 = sorted(np.argsort(SPEC_A[:41])[-2:])
    chk(top2 == [lo, hi] and abs(SPEC_A[lo] - 0.5) < 0.005 and abs(SPEC_A[hi] - 0.5) < 0.005,
        "its two tallest peaks are at 10 Hz and 25 Hz", f"{SPEC_A[lo]:.3f} and {SPEC_A[hi]:.3f}")
    chk(np.abs(sig_a(TT) - sig_b(TT)).max() > 0.9, "yet the two signals are very different in time")
    tm = lambda Z, f: Z[np.argmin(np.abs(F_LIN - f))]
    first, second = TAUS < 0.3, TAUS > 0.7
    chk(tm(STFT_MID, F_LO)[first].mean() > 5 * tm(STFT_MID, F_LO)[second].mean()
        and tm(STFT_MID, F_HI)[second].mean() > 5 * tm(STFT_MID, F_HI)[first].mean(),
        "short FFTs bring time back: 10 Hz first, 25 Hz after")
    def width_t(Z):                      # how long the picture's centre frequency takes to move from 10 Hz to 25 Hz
        c = (Z ** 2 * F_LIN[:, None]).sum(0) / (Z ** 2).sum(0)
        r = (c - c[TAUS < 0.2].mean()) / (c[TAUS > 0.8].mean() - c[TAUS < 0.2].mean())
        return TAUS[np.argmax(r > 0.75)] - TAUS[np.argmax(r > 0.25)]

    width_f = lambda Z: np.ptp(F_LIN[Z[:, np.argmin(np.abs(TAUS - 0.75))] > 0.5 * Z[:, np.argmin(np.abs(TAUS - 0.75))].max()])
    chk(width_t(STFT_SHORT) < width_t(STFT_LONG) and width_f(STFT_SHORT) > width_f(STFT_LONG),
        "short window: sharp in time, blurry in frequency; long window: the reverse",
        f"switch-over {width_t(STFT_SHORT):.2f} s vs {width_t(STFT_LONG):.2f} s;  peak width {width_f(STFT_SHORT):.1f} Hz vs {width_f(STFT_LONG):.1f} Hz")
    t = np.linspace(-40, 40, 400001)
    g = np.exp(-t ** 2 / 2)
    st = np.sqrt(_tz(t ** 2 * g ** 2, t) / _tz(g ** 2, t))
    G = np.abs(np.fft.fftshift(np.fft.fft(g)))
    fr = np.fft.fftshift(np.fft.fftfreq(len(t), t[1] - t[0]))
    sf = np.sqrt(_tz(fr ** 2 * G ** 2, fr) / _tz(G ** 2, fr))
    chk(abs(st * sf - 1 / (4 * PI)) < 1e-4, "Gabor limit: sigma_t x sigma_f = 1/(4 pi) for a Gaussian (the minimum)",
        f"{st * sf:.5f} vs {1 / (4 * PI):.5f}")
    u = np.linspace(-8, 8, 16001)
    P = np.abs(np.fft.rfft(morlet(u)))
    fpk = np.fft.rfftfreq(len(u), u[1] - u[0])[np.argmax(P)]
    chk(abs(fpk - W0 / (2 * PI)) < 0.02, "a wavelet at scale a oscillates at f = w0 / (2 pi a)", f"{fpk:.3f} vs {W0 / (2 * PI):.3f} (a = 1)")
    a, b = TT < 0.35, TT > 0.65
    chk(ROW[F_HI][b].mean() > 5 * ROW[F_HI][a].mean(), "the 25 Hz wavelet scores high only in the second half",
        f"{ROW[F_HI][b].mean() / ROW[F_HI][a].mean():.0f}x")
    chk(ROW[F_LO][a].mean() > 5 * ROW[F_LO][b].mean(), "stretched to 10 Hz, it scores high only in the first half",
        f"{ROW[F_LO][a].mean() / ROW[F_LO][b].mean():.0f}x")
    chk(np.isclose(scale_of(F_LO) / scale_of(F_HI), 2.5), "the 10 Hz wavelet is 2.5x longer than the 25 Hz one")
    chk(abs(60 / RPM - 0.040) < 1e-12 and F_SHAFT == 25.0, "1,500 rpm = 25 turns per second = 40 ms per turn")
    r = ROW_RING
    pk = np.array([i for i in range(1, len(r) - 1) if r[i] > r[i - 1] and r[i] >= r[i + 1] and r[i] > 0.5 * r.max()])
    gaps = np.diff(pk) / FS_M
    chk(len(pk) == 6 and np.allclose(gaps, T_TURN, atol=0.001), "wavelet map of the machine: 6 flashes in 6 turns, 40 ms apart",
        f"{len(pk)} flashes, gaps {gaps.min() * 1000:.1f} to {gaps.max() * 1000:.1f} ms")
    hum = CWT_M[np.argmin(np.abs(F_MLOG - F_SHAFT))]
    chk(hum.min() > 0.8 * hum.max(), "the 25 Hz hum is a steady band across the map", f"min/max {hum.min() / hum.max():.2f}")
    return out


# ----------------------------------------------------------------- audio
SR = 44100
AUD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "wv_audio")


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


# ----------------------------------------------------------------- mascot shapes (one period, -1..1)
WX = np.linspace(0, 1, 300)


def _norm(y):
    y = y - (y.max() + y.min()) / 2
    return y / (np.abs(y).max() + 1e-9)


SHAPES = {
    "sine": np.sin(2 * PI * WX),
    "burst": 0.9 * np.exp(-((WX - 0.68) / 0.11) ** 2 / 2) * np.cos(2 * PI * 7 * (WX - 0.68)),     # face stays calm, tail is the burst
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
class WVFilm(Scene):
    PARTS = []

    def construct(self):
        self.t_anim = 0.0
        clock = Mobject()
        clock.add_updater(lambda m, dt: setattr(self, "t_anim", self.t_anim + dt))
        self.add(clock)
        self.snd = {"pop": soft_click("pop", 0.05, 1800, 300, 0.009, 0.16), "tick": soft_click("tick", 0.03, 3000, 700, 0.005, 0.10),
                    "whoosh": noise_swell("whoosh", 0.8, 0.12), "swoosh": noise_swell("swoosh", 0.6, 0.09, 15, 4),
                    "sweep": noise_swell("sweep", 2.2, 0.07, 30, 5), "thud": thud(0.2), "stamp": stamp_snd(0.22)}
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
        self.play(FadeOut(veil), run_time=1.2)
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
            with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "cuts.json"), "w") as fh:
                json.dump({"cuts": self.cuts, "total": float(self.renderer.time), "bar_h": BAR_H / FH}, fh)
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
        rows = textwrap.wrap(text, 62)
        txt = VGroup(*[T(r, 26, INK, BOLD) for r in rows]).arrange(DOWN, buff=0.1)
        box = RoundedRectangle(corner_radius=0.12, width=txt.width + 0.6, height=txt.height + 0.4,
                               fill_color="#000000", fill_opacity=0.0, stroke_width=0)
        cap = VGroup(box, txt.move_to(box)).move_to([0, -FH / 2 + BAR_H / 2, 0]).set_z_index(80)
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
        self.sfx("swoosh")
        self.play(*anims, run_time=0.5)
        self.hdr = g

    def part_card(self, kicker, title, kcolor=ORANGEc):
        """big title card that shrinks into the header"""
        self.drop_caption()
        self.maths_clear()
        self.sfx("whoosh")
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
            cy = float(np.clip(c[1], -FH / 2 + BAR_H + 0.15 + h / 2, FH / 2 - BAR_H - 0.08 - h / 2))   # stay inside the picture
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

    def wide_signal(self):
        ax = self.axes([0, 1, 0.5], [-1.2, 1.2, 1], self.WIDE["w"], 1.3, [self.WIDE["x"], 1.2, 0])
        return ax, self.two_tone(ax, sig_a)

    # =================================================================
    # P1  Hook: two different signals, one spectrum
    # =================================================================
    def p_cold(self):
        """cold open: the machine, before any title"""
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
        with self.line("A spectrum can tell you what rings. Not when.", extra=0.4) as v:
            self.play(sig.animate.set_stroke(opacity=0.3), ax.animate.set_stroke(opacity=0.3), run_time=v.frac(0.5))
        self.play(FadeOut(sig), FadeOut(ax), run_time=0.5)
        self.part_card("SIGNAL PROCESSING", "Wavelets")

    def p_hook(self):
        if self.hdr is None:
            self.header("SIGNAL PROCESSING", "Wavelets")
        aA = self.axes([0, 1, 0.5], [-1.2, 1.2, 1], 5.2, 1.4, [-0.7, 1.05, 0])
        aB = self.axes([0, 1, 0.5], [-1.2, 1.2, 1], 5.2, 1.4, [-0.7, -1.2, 0])
        cA, cB = self.two_tone(aA, sig_a), self.two_tone(aB, sig_b, lo_first=False)
        tA, tB = self.tone_tags(aA), self.tone_tags(aB, lo_first=False)
        with self.line("One signal plays 10 Hz, then 25 Hz.") as v:
            self.play(Create(aA), run_time=0.3)
            self.play(Create(cA[0]), FadeIn(tA[0]), run_time=v.frac(0.3), rate_func=linear)
            self.play(Create(cA[1]), FadeIn(tA[1]), run_time=v.frac(0.3), rate_func=linear)
        self.w_appear()
        with self.line("Another plays them the other way round.") as v:
            self.play(Create(aB), run_time=0.3)
            self.play(Create(cB[0]), FadeIn(tB[0]), run_time=v.frac(0.3), rate_func=linear)
            self.play(Create(cB[1]), FadeIn(tB[1]), run_time=v.frac(0.3), rate_func=linear)
        sA, stA, nA = self.spectrum_board(SPEC_A, [4.75, 1.05, 0])
        sB, stB, nB = self.spectrum_board(SPEC_B, [4.75, -1.2, 0])
        arr = VGroup(*[Arrow(a.get_right() + RIGHT * 0.05, s.get_left() + LEFT * 0.05, color=MUTED, buff=0.08, stroke_width=3,
                             max_tip_length_to_length_ratio=0.2) for a, s in ((aA, sA), (aB, sB))])
        with self.line("Take the FFT of each.", extra=0.9) as v:
            self.maths(r"X(f) = \int x(t)\, e^{-i 2\pi f t}\, dt", "X(f) = ∫ x(t) e^(−i2πft) dt", rt=0.8)
            self.play(GrowArrow(arr[0]), GrowArrow(arr[1]), Create(sA), Create(sB), run_time=0.5)
            self.sfx("pop")
            self.play(LaggedStart(*[GrowFromEdge(s, DOWN) for s in stA], lag_ratio=0.03),
                      LaggedStart(*[GrowFromEdge(s, DOWN) for s in stB], lag_ratio=0.03), FadeIn(nA), FadeIn(nB),
                      run_time=v.frac(0.3))
        with self.line("Exactly the same spectrum. The order is gone.", extra=1.6) as v:
            self.w_feel("surprised")
            self.w_say("Which one is which?", at=FIG(0.105, 0.31) + np.array([0.3, 1.75, 0]))
            self.focus([sA.copy(), stA.copy(), sB.copy(), stB.copy()], "two different signals, one spectrum", BADc, hold=0.9)
        self.w_hush()
        self.stamp("WHEN?", ORANGEc, hold=0.6)
        self.w_feel("neutral", hop=False)
        self.maths_clear()
        self.clear_board(aB, cB, tB, sA, stA, nA, sB, stB, nB, arr, tA)
        self.aA, self.cA = aA, cA

    # =================================================================
    # P2  First try: short FFTs (the spectrogram) and their one-size window
    # =================================================================
    def p_stft(self):
        self.ensure_wiggle()
        self.header("FIRST TRY", "Short FFTs")
        ax, sig = self.wide_signal()
        if getattr(self, "aA", None) is not None:
            self.play(ReplacementTransform(self.aA, ax), ReplacementTransform(self.cA, sig), run_time=0.7)
        else:
            self.play(Create(ax), Create(sig), run_time=0.7)
        W, X0 = self.WIDE["w"], self.WIDE["x"]
        at = [X0, -0.95, 0]
        im, frame, cover = self.heat(STFT_MID, W, 2.1, at)
        ticks = self.f_ticks(frame, (10, 25), lin_max=40)
        box = lambda win_s, tau: Rectangle(width=win_s * W, height=1.55, stroke_color=INK, stroke_width=3, fill_color=INK,
                                           fill_opacity=0.07).move_to(ax.c2p(tau, 0))
        win = box(WINS[0], 0.0)
        with self.line("Fix one: slide a short window along, FFT each slice.", extra=1.0) as v:
            self.maths(r"X(\tau, f) = \int x(t)\, w(t - \tau)\, e^{-i 2\pi f t}\, dt", "X(τ, f) = ∫ x(t) w(t−τ) e^(−i2πft) dt",
                       size=36, rt=0.8)
            self.add(im, cover)
            self.play(FadeIn(win), FadeIn(frame), FadeIn(ticks), run_time=0.4)
            self.sfx("sweep")
            self.play(win.animate(rate_func=linear).move_to(ax.c2p(1.0, 0)), self.reveal(cover), run_time=v.left(0.3))
        self.remove(cover)
        with self.line("Time is back: 10 Hz first, 25 Hz after.", extra=0.5) as v:
            self.play(FadeOut(win), run_time=0.3)
            self.w_feel("happy")
            self.play(Indicate(ticks, color=INK, scale_factor=1.25), run_time=0.8)
        self.w_feel("neutral", hop=False)
        # the price: one window size for everything
        wS, hS, yS = 4.3, 1.9, -0.8
        imS, frS, coS = self.heat(STFT_SHORT, wS, hS, [X0 - 2.35, yS, 0])
        imL, frL, coL = self.heat(STFT_LONG, wS, hS, [X0 + 2.35, yS, 0])
        lbS = T(f"short window: {WINS[1]:g} s", 18, INK2, BOLD).next_to(frS, DOWN, buff=0.12)
        lbL = T(f"long window: {WINS[2]:g} s", 18, INK2, BOLD).next_to(frL, DOWN, buff=0.12)
        win = box(WINS[1], 0.5)
        with self.line("One window size. Short: sharp in time, blurry in frequency.", extra=0.3) as v:
            self.play(FadeOut(im), FadeOut(frame), FadeOut(ticks), FadeIn(win), run_time=0.5)
            self.add(imS, coS)
            self.sfx("swoosh")
            self.play(FadeIn(frS), FadeIn(lbS), self.reveal(coS), run_time=v.frac(0.3))
        self.remove(coS)
        with self.line("Long: sharp in frequency, blurry in time.", extra=1.2) as v:
            self.play(Transform(win, box(WINS[2], 0.5)), run_time=0.6)
            self.add(imL, coL)
            self.sfx("swoosh")
            self.play(FadeIn(frL), FadeIn(lbL), self.reveal(coL), run_time=v.frac(0.25))
            self.remove(coL)
            self.maths(r"\Delta t \cdot \Delta f \;\ge\; \frac{1}{4\pi}", "Δt · Δf ≥ 1 / 4π", pos=np.array([X0, 2.85, 0]), size=40, rt=0.8)
            self.w_feel("worried", hop=False)
            self.w_say("Can't have both.")
        self.w_hush()
        self.maths_clear()
        self.clear_board(win, imS, frS, lbS, imL, frL, lbL)
        self.ax, self.sig = ax, sig

    # =================================================================
    # P3  The idea: a wavelet, slid along and stretched
    # =================================================================
    def p_wavelet(self):
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
        env = VGroup(*[DashedVMobject(VMobject(stroke_color=MUTED, stroke_width=2).set_points_as_corners(
            big_pts(lambda u, s=s: s * np.exp(-u ** 2 / 2))), num_dashes=40) for s in (1, -1)])
        with self.line("A wavelet is a short burst of a wave.", extra=0.9) as v:
            self.play(FadeOut(ax), FadeOut(sig), run_time=0.4)
            self.sfx("pop")
            self.play(Create(big), run_time=v.frac(0.3))
            self.play(FadeIn(env), run_time=0.4)
            self.maths(r"\psi(t) = e^{-t^{2}/2}\; e^{\,i\omega_0 t}", "ψ(t) = e^(−t²/2) · e^(iω₀t)", size=42, rt=0.8)
            self.w_shape("burst", rt=0.6)
            self.w_say("Short and wiggly. Like me!")
        self.w_hush()

        # a wavelet riding on the signal; its 'score' is drawn underneath
        b, fq = ValueTracker(0.06), ValueTracker(F_HI)

        def glyph():
            f = fq.get_value()
            a = scale_of(f)
            mixc = interpolate_color(ManimColor(BLUEc), ManimColor(ORANGEc), (f - F_LO) / (F_HI - F_LO))
            ts = b.get_value() + a * np.linspace(-3.3, 3.3, 260)
            keep = (ts > -0.03) & (ts < 1.03)                      # never draw past the ends of the record
            pts = np.array([ax.c2p(t_, 0.95 * morlet((t_ - b.get_value()) / a)) for t_ in ts[keep]])
            return poly(pts, mixc, 4.2)

        aS = self.axes([0, 1, 0.5], [0, 1.2, 1], W, 1.25, [X0, -1.15, 0])
        s_lab = T("score", 18, MUTED, BOLD).move_to([aS.get_left()[0] - 0.15, aS.get_center()[1], 0], aligned_edge=RIGHT)

        def trace(f, color):
            row = ROW[f] / ROW[f].max()
            n = max(2, int(np.clip(b.get_value(), 0, 1) * (len(TT) - 1)))
            return poly(np.array([aS.c2p(TT[i], row[i]) for i in range(0, n, 4)] + [aS.c2p(TT[n], row[n])]), color, 3.4)

        g0 = glyph()
        with self.line("Slide it along. Where it matches, the score is high.", extra=0.6) as v:
            self.play(FadeOut(env), FadeIn(ax), FadeIn(sig.set_stroke(opacity=0.45)), ReplacementTransform(big, g0),
                      FadeIn(aS), FadeIn(s_lab), run_time=0.8)
            self.remove(g0)
            gl = always_redraw(glyph)
            tr_hi = always_redraw(lambda: trace(F_HI, ORANGEc))
            self.add(gl, tr_hi)
            self.sfx("sweep")
            self.play(b.animate(rate_func=linear).set_value(0.94), run_time=v.left(0.4))
            tr_hi.clear_updaters()
        with self.line("Stretch it, and it finds the slow part instead.", extra=2.2) as v:
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
        with self.line("Do that for every stretch: a map of which, and when.", extra=0.5) as v:
            self.play(FadeOut(tr_hi), FadeOut(tr_lo), FadeOut(aS), FadeOut(s_lab), FadeOut(gl), sig.animate.set_stroke(opacity=1),
                      run_time=0.5)
            self.add(im, cover)
            self.sfx("sweep")
            self.play(FadeIn(frame), FadeIn(ticks), self.reveal(cover), run_time=v.frac(0.45))
            self.remove(cover)
        fy = lambda f: frame.get_bottom()[1] + np.log(f / F_LOG[0]) / np.log(F_LOG[-1] / F_LOG[0]) * frame.height
        mini = lambda f, tc: poly(np.array([[frame.get_left()[0] + (tc + scale_of(f) * u) * W, fy(f) + 0.2 * morlet(u), 0]
                                            for u in np.linspace(-3.2, 3.2, 200)]), INK, 3.0)
        m_hi, m_lo = mini(F_HI, 0.25), mini(F_LO, 0.68)
        with self.line("Short bursts for fast things, long for slow.", extra=0.5) as v:
            self.sfx("pop")
            self.play(Create(m_hi), run_time=0.6)
            self.sfx("pop")
            self.play(Create(m_lo), run_time=0.8)
            self.w_feel("happy")
            self.w_say("The window adapts!")
        self.w_hush()
        self.maths_clear()
        self.clear_board(ax, sig, im, frame, ticks, m_hi, m_lo)
        self.ax = None

    # =================================================================
    # P4  On a machine: one knock per turn  (+ close)
    # =================================================================
    def p_machine(self):
        self.ensure_wiggle()
        self.w_feel("neutral", hop=False)
        self.header("ON A MACHINE", "One knock per turn")
        W, X0 = self.WIDE["w"], self.WIDE["x"]
        span = M_SHOW[1] - M_SHOW[0]
        ax = self.axes([0, span, span], [-2.8, 2.8, 1], W, 1.3, [X0, 1.3, 0])
        i0, i1 = int(M_SHOW[0] * FS_M), int(M_SHOW[1] * FS_M)
        tt = T_M[i0:i1] - M_SHOW[0]
        sig = VMobject(stroke_color=INK, stroke_width=2.6).set_points_as_corners(
            np.array([ax.c2p(a, y) for a, y in zip(tt, X_M[i0:i1])]))
        with self.line("Back to the machine: 1,500 rpm, one knock per turn.", extra=0.5) as v:
            self.play(Create(ax), run_time=0.3)
            self.sfx("sweep")
            self.play(Create(sig), run_time=v.frac(0.5), rate_func=linear)
        im, frame, cover = self.heat(CWT_M, W, 1.9, [X0, -1.05, 0], gamma=0.38)
        ticks = self.f_ticks(frame, (25, 400), log_range=(F_MLOG[0], F_MLOG[-1]))
        with self.line("Its wavelet map: the hum is a band, each knock a flash.", extra=0.8) as v:
            self.add(im, cover)
            self.sfx("sweep")
            self.play(FadeIn(frame), FadeIn(ticks), self.reveal(cover), run_time=v.frac(0.45))
            self.remove(cover)
        x_of = lambda t: frame.get_left()[0] + t / span * W
        k0 = 0.012 + 2 * T_TURN
        gap = DoubleArrow([x_of(k0), 0.12, 0], [x_of(k0 + T_TURN), 0.12, 0], color=STARc, buff=0, stroke_width=3.5,
                          tip_length=0.16, max_tip_length_to_length_ratio=0.2)
        gap_l = T("40 ms", 20, STARc, BOLD).next_to(gap, UP, buff=0.06)
        with self.line("Flashes 40 ms apart: exactly one per turn.", extra=1.8) as v:
            self.sfx("tick")
            self.play(GrowFromCenter(gap), FadeIn(gap_l), run_time=0.5)
            self.maths(r"\frac{60\ \text{s}}{1500\ \text{turns}} = 0.040\ \text{s}", "60 s / 1500 turns = 0.040 s", size=38, rt=0.8)
            self.w_feel("happy")
            self.w_say("Found the knock!")
            self.focus([im.copy(), frame.copy(), gap.copy(), gap_l.copy()], "which frequency, and when it hits", OKc, hold=0.5)
        self.w_hush()
        self.maths_clear()
        self.clear_board(ax, sig, im, frame, ticks, gap, gap_l)
        self.p_close()

    def p_close(self):
        self.header("RECAP", "Which, and when")

        def card(title, color, rows):
            box = RoundedRectangle(corner_radius=0.18, width=4.9, height=2.6, stroke_color=color, stroke_width=3,
                                   fill_color=PANEL, fill_opacity=1)
            tt = T(title, 34, color, BOLD)
            body = VGroup(*[T(rw, 22, c_, BOLD) for rw, c_ in rows]).arrange(DOWN, aligned_edge=LEFT, buff=0.18)
            inner = VGroup(tt, body).arrange(DOWN, aligned_edge=LEFT, buff=0.3)
            if inner.width > box.width - 0.6:
                inner.scale_to_fit_width(box.width - 0.6)
            inner.move_to(box)
            return VGroup(box, tt, body)

        left = card("FFT", INK2, [("which frequencies", INK), ("one answer per record", INK2)])
        right = card("WAVELETS", ORANGEc, [("which frequencies, and when", INK), ("short bursts for fast things", INK2),
                                            ("long ones for slow things", INK2)])
        VGroup(left, right).arrange(RIGHT, buff=0.4).move_to(RIGHT * 1.5 + UP * 0.2)
        site = T("nodallab.dev", 22, MUTED, BOLD).move_to(FIG(0.97, 0.94), aligned_edge=RIGHT).set_z_index(80)
        with self.line("FFT: which frequencies. Wavelets: which, and when.", extra=1.6) as v:
            self.sfx("whoosh")
            self.play(FadeIn(left, shift=UP * 0.2), run_time=0.5)
            self.play(FadeIn(right, shift=UP * 0.2), FadeIn(site), run_time=0.5)
            self.w_shape("sine", rt=0.5)
            self.w_feel("wink")
            self.w_say("See you in the Lab!")
        self.drop_caption()
        self.wait(0.3)
        veil = Rectangle(width=FW + 1, height=FH + 1, stroke_width=0, fill_color="#000000", fill_opacity=1).set_z_index(99)
        self.play(FadeIn(veil), run_time=1.6)
        self.wait(0.4)


# =====================================================================
# Scenes to render
# =====================================================================
class Wavelets(WVFilm):
    PARTS = ["p_cold", "p_hook", "p_stft", "p_wavelet", "p_machine"]


class P1Hook(WVFilm):
    PARTS = ["p_hook"]


class P2Stft(WVFilm):
    PARTS = ["p_stft"]


class P3Wavelet(WVFilm):
    PARTS = ["p_wavelet"]


class P4Machine(WVFilm):
    PARTS = ["p_machine"]
