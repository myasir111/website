"""Join the rendered shots into one film, edit the music to the picture, mix the effects.
    PLAN=plan_fjeld.json MUSIC_DIR=music/ python assemble.py 1080p60 sidebands.mp4
Shots (in order) and their renders come from SHOTS. With PLAN set, one track is cut at bar lines to fit the film
(score_edit.py); without it, ACTS (acts.json) lays one track per act."""
import json, os, subprocess, sys, wave
import numpy as np
import pyloudnorm as pyln

Q = sys.argv[1] if len(sys.argv) > 1 else "720p30"
OUT = sys.argv[2] if len(sys.argv) > 2 else "sidebands_cut.mp4"
SR = 44100
MUS = os.environ.get("MUSIC_DIR", "music/")
SHOTS = [("scenes3d", "Opener3D"), ("sidebands", "SHear"), ("scenes3d", "Why3D"), ("sidebands", "SEvenHarm"),
         ("scenes3d", "Waterfall3D"), ("scenes3d", "Crack3D"), ("sidebands", "SCrackViews"),
         ("sidebands", "SWhereClose")]
# act: (first shot, last shot, track file, track start s (or None), anchor (shot, time-in-shot key, track time), loudness LUFS)
ACTS = json.load(open("acts.json")) if os.path.exists("acts.json") else []


def dur(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=duration",
                                 "-of", "csv=p=0", p], capture_output=True, text=True).stdout.strip())


def decode(p, ch=1):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-f", "f32le", "-ac", str(ch), "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    y = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    return y.reshape(-1, ch) if ch > 1 else y


def write(p, y):
    y = np.atleast_2d(y.T).T if y.ndim == 1 else y
    with wave.open(p, "wb") as w:
        w.setnchannels(y.shape[1]); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())


os.makedirs("build", exist_ok=True)
starts, fx_parts, fins = [], [], []
t = 0.0
for i, (mod, name) in enumerate(SHOTS):
    src = f"media/videos/{mod}/{Q}/{name}.mp4"
    d = dur(src)
    a = decode(src)
    n = int(round(d * SR))
    a = np.pad(a, (0, max(0, n - len(a))))[:n]
    wav_p = f"build/{name}_fx.wav"
    write(wav_p, a)
    cuts = f"cuts_{name}.json" if mod == "sidebands" else f"build/cuts_{name}.json"
    if mod != "sidebands":
        json.dump({"cuts": [0.0], "total": d, "bar_h": 0.125}, open(cuts, "w"))
    fin = f"build/{i}_{name}.mp4"
    env = dict(os.environ, PUSH="0.025" if mod == "sidebands" else "0")
    if not (os.path.exists(fin) and os.path.getmtime(fin) > os.path.getmtime(src)):
        subprocess.run(["python3", "film.py", src, cuts, wav_p, fin], check=True, env=env, capture_output=True)
    starts.append(t)
    fx_parts.append(a)
    fins.append(fin)
    print(f"{name:12s} starts {t:6.2f} s, {d:5.2f} s")
    t += d
T = t
with open("build/list.txt", "w") as f:
    for p in fins:
        f.write(f"file '{os.path.abspath(p)}'\n")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", "build/list.txt", "-an", "-c:v", "copy",
                "build/video.mp4"], check=True)          # every shot has the same size, rate and codec: no re-encode
fx = np.concatenate(fx_parts)
N = len(fx) + int(2.5 * SR)
fx = np.pad(fx, (0, N - len(fx)))
meter = pyln.Meter(SR)

# ---- the score: one track per act, each entering on a beat as the picture fades up; level automation follows the content
shot_start = {n: starts[i] for i, (m, n) in enumerate(SHOTS)}
shot_end = {n: starts[i] + dur(fins[i]) for i, (m, n) in enumerate(SHOTS)}
cuts_of = {n: json.load(open(f"cuts_{n}.json"))["cuts"] for m, n in SHOTS}
BEATS = json.load(open("beats.json"))


def ev(e):
    """film time of an event: ["start"|"end", shot] or ["cut", shot, index] or ["at", shot, seconds] or ["frac", shot, 0..1]"""
    k, sh = e[0], e[1]
    if k == "start":
        return shot_start[sh]
    if k == "end":
        return shot_end[sh]
    if k == "cut":
        return shot_start[sh] + cuts_of[sh][e[2]]
    if k == "cutoff":                                 # a cut plus an offset in seconds
        return shot_start[sh] + cuts_of[sh][e[2]] + e[3]
    if k == "frac":
        return shot_start[sh] + e[2] * (shot_end[sh] - shot_start[sh])
    return shot_start[sh] + e[2]


def snap(track, t_want):
    """nearest strong beat to the wanted track time (strong = top half of onset strength nearby)"""
    b = np.array(BEATS[track]["beats"]); st = np.array(BEATS[track]["strength"])
    near = np.abs(b - t_want) < 2.5
    if not near.any():
        return t_want
    cand = np.where(near)[0]
    best = cand[np.argmax(st[cand] - 0.15 * np.abs(b[cand] - t_want))]
    return float(b[best])


PLAN = os.environ.get("PLAN")
tl = np.arange(N) / SR
if PLAN:                                            # one track, edited to fit
    import score_edit
    plan = json.load(open(PLAN))
    music, log = score_edit.build(MUS + plan["track"], plan, ev, T, N)
    for l_ in log:
        print(l_)
    lu = meter.integrated_loudness(music[: int(T * SR)])
    music *= 10 ** ((-21 - lu) / 20)
    pts = sorted([(ev(e), d) for e, d in plan.get("auto", [])])
    if pts:
        music *= (10 ** (np.interp(tl, [p_[0] for p_ in pts], [p_[1] for p_ in pts]) / 20))[:, None]
else:
    music = np.zeros((N, 2))
    tl = np.arange(N) / SR
    for k, act in enumerate(ACTS):
        a0, a1 = ev(act["in"]) + act.get("in_delay", 0.0), ev(act["out"])
        y = decode(MUS + act["track"], ch=2)
        if "anchor" in act:                          # [event, track time]: that track moment lands on that film moment
            off = act["anchor"][1] - ev(act["anchor"][0])
            t_start = snap(act["track"], a0 + off)   # start the track on a beat near where the anchor puts it
            off = t_start - a0
        else:
            t_start = snap(act["track"], act["start"])
            off = t_start - a0
        i0, i1 = int(a0 * SR), min(N, int((a1 + 0.05) * SR))
        src = (np.arange(i0, i1) / SR + off) * SR
        ok = (src >= 0) & (src < len(y) - 1)
        seg = np.zeros((i1 - i0, 2))
        seg[ok] = y[src[ok].astype(int)]
        lu = meter.integrated_loudness(seg[ok]) if ok.sum() > SR * 3 else -30
        seg *= 10 ** ((act["lufs"] - lu) / 20)
        tt = tl[i0:i1]
        fi, fo = act.get("fade_in", 0.4), act.get("fade_out", 1.2)
        g = np.clip((tt - a0) / fi, 0, 1) * np.clip((a1 - tt) / fo, 0, 1)
        g = np.sin(g * np.pi / 2)                    # equal-power shape
        pts = sorted([(ev(e), d) for e, d in act.get("auto", [])])
        if pts:
            db = np.interp(tt, [p_[0] for p_ in pts], [p_[1] for p_ in pts])
            g = g * 10 ** (db / 20)
        music[i0:i1] += seg * g[:, None]
        print(f"act {k}: {act['track']:30s} film {a0:6.1f}-{a1:6.1f} s, track from {t_start:6.1f} s (on a beat), {lu:5.1f} -> {act['lufs']} LUFS")


# gentle bus compression on the music: big crescendos in a track stay big, but not 15 dB big
from scipy.ndimage import uniform_filter1d
lvl = 10 * np.log10(uniform_filter1d((music ** 2).mean(1), int(0.4 * SR)) + 1e-12)
thr = np.percentile(lvl[lvl > -60], 60)                   # roughly the bed level
gdb = -(1 - 1 / 2.5) * np.clip(lvl - thr - 4, 0, None)
gdb = uniform_filter1d(gdb, int(0.15 * SR))
music *= (10 ** (gdb / 20))[:, None]
lm = meter.integrated_loudness(music)
lf = meter.integrated_loudness(np.stack([fx, fx], 1))
fx *= 10 ** ((lm - 4.0 - lf) / 20)
final = music + fx[:, None]


def limit(x, ceil=10 ** (-1.2 / 20), look=0.004, release=0.12):
    """a simple look-ahead peak limiter: gain dips just before a peak and recovers slowly"""
    pk = np.abs(x).max(1)
    w = max(1, int(look * SR))
    from scipy.ndimage import maximum_filter1d
    need = np.minimum(1.0, ceil / np.maximum(maximum_filter1d(pk, 2 * w + 1), 1e-9))
    g = np.empty_like(need)
    a = np.exp(-1 / (release * SR))
    cur = 1.0
    for i in range(len(need)):                       # instant attack (look-ahead covers it), smooth release
        cur = need[i] if need[i] < cur else a * cur + (1 - a) * need[i]
        g[i] = cur
    return x * g[:, None]


for _ in range(3):                                   # set the loudness, then catch the peaks; repeat to settle
    final *= 10 ** ((-20.0 - meter.integrated_loudness(final)) / 20)
    final = limit(final)
write("build/mix.wav", final)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "build/video.mp4", "-i", "build/mix.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT], check=True)
print(f"total {T:.1f} s  ->  {OUT}  ({meter.integrated_loudness(final):.1f} LUFS, peak {20 * np.log10(np.abs(final).max()):.1f} dBFS)")
