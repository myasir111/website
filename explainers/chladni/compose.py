"""Assemble the Chladni film: plate shots (three.js) + maths shots (Manim) + overlays, wide-screen bars,
film finish, captions in the bottom bar (one style for every shot), effects, and one music track edited to the
picture with a steady body level.
    TRACK="Landskab - Ambient.ogg" python compose.py out.mp4"""
import json, os, subprocess, sys, wave
import numpy as np
import cv2
import proj as PJ

HERE = os.path.dirname(os.path.abspath(__file__))
SB = HERE                                   # sidebands.py, film.py and score_edit.py from the Sidebands page
MUS = os.environ.get("MUSIC_DIR", os.path.join(HERE, "music")) + "/"   # put the .ogg here
B = f"{HERE}/build"; os.makedirs(B, exist_ok=True)
SR = 48000
BAR = 135
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MAN = f"{HERE}/media/videos/cfilm/1080p60"

SHOTS = [
    dict(name="s1", kind="three", dur=9.0, fx="s1", caps=[(0.6, 3.0, "Sand on a plate, shaken at 967 Hz."), (4.5, 3.3, "Nothing is drawing this pattern.")]),
    dict(name="CTitle", kind="manim"),
    dict(name="CJump", kind="manim"),
    dict(name="s2", kind="three", dur=6.2, ov="O2", fx="s2", caps=[(0.3, 2.8, "Slowed down three times."), (3.3, 2.7, "Where a beats g, grains fly.")]),
    dict(name="s3", kind="three", dur=16.0, ov="O3", caps=[(0.3, 2.9, "Where it doesn't move, sand stays."), (3.4, 2.5, "Magnified: one shape, flexing."),
                                                          (6.0, 2.5, "The shape breathes; nothing travels."), (8.6, 3.0, "Lines where W = 0 never move."),
                                                          (11.8, 3.6, "That's exactly where the sand sits.")]),
    dict(name="CWave", kind="manim"),
    dict(name="CFit", kind="manim"),
    dict(name="CPeak", kind="manim"),
    dict(name="s5", kind="three", dur=26.4, ov="O5", fx="s5", caps=[(0.6, 3.6, "Now sweep the drive frequency."), (4.9, 3.6, "Every peak: a new shape."),
                                                                   (9.2, 3.6, "Between peaks, the plate barely moves."), (13.5, 3.6, "967 Hz: our ring again."),
                                                                   (17.8, 3.6, "Higher peaks, busier patterns."), (22.1, 3.8, "Every peak in a spectrum has a shape.")]),
    dict(name="CSensor", kind="manim"),
    dict(name="s7", kind="three", dur=17.5, ov="O7", fx="s7", caps=[(0.4, 2.9, "Two sensors on the same plate."), (3.5, 3.0, "Inside the ring: a big 967 Hz peak."),
                                                                   (6.7, 3.4, "On the ring: 24 dB lower."), (10.4, 3.1, "The sensor sees each mode times W."),
                                                                   (13.8, 3.3, "A missing peak can mean a bad spot.")]),
    dict(name="CBrace", kind="manim"),
    dict(name="s8", kind="three", dur=12.0, ov="O8", fx="s8", caps=[(0.4, 3.0, "A brace pins one point of the plate."), (3.6, 3.0, "On a nodal line, the mode doesn't notice."),
                                                                   (6.8, 2.6, "Off the line, it can't ring at 967."), (9.6, 2.2, "Brace where it moves.")]),
    dict(name="s9", kind="three", dur=6.0, caps=[(0.5, 4.6, "Same physics in panels, ducts and casings.")]),
    dict(name="CClose", kind="manim"),
]


def sh(*a):
    subprocess.run(a, check=True)


def dur_of(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p],
                                capture_output=True, text=True).stdout)


def read_wav(p, n=None):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    y = np.frombuffer(raw, np.float32).astype(np.float64)
    if n is not None:
        y = np.pad(y, (0, max(0, n - len(y))))[:n]
    return y


def write_wav(p, y):
    with wave.open(p, "wb") as w:
        w.setnchannels(1 if y.ndim == 1 else 2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())


def push_in(name, src):
    """a slow 2D push-in on a rendered plate shot (proj.PUSH), frame by frame with sub-pixel warps; overlays use the same numbers"""
    out = f"{B}/{name}_push.mp4"
    if os.path.exists(out) and os.path.getmtime(out) > os.path.getmtime(src):
        return out
    W, H = 1920, 1080
    fps = 30
    rd = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE)
    wr = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
                           "-c:v", "libx264", "-crf", "12", "-preset", "fast", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    cx, cy = PJ.PUSH[name][3]
    px, py = (cx / (PJ.FW / 2) + 1) / 2 * W, (1 - cy / (PJ.FH / 2)) / 2 * H
    i = 0
    while True:
        buf = rd.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        z = PJ.zoom(name, i / fps)
        M_ = np.array([[z, 0, px - z * px], [0, z, py - z * py]], np.float32)
        fr = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
        wr.stdin.write(cv2.warpAffine(fr, M_, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE).tobytes())
        i += 1
    wr.stdin.close(); wr.wait(); rd.wait()
    return out


def build_shot(s):
    out = f"{B}/{s['name']}.mp4"
    if os.path.exists(out) and not os.environ.get("REBUILD"):
        return out
    if s["kind"] == "three":
        d = s["dur"]; src = f"{HERE}/render/{s['name']}.mp4"
        if s["name"] in PJ.PUSH:
            src = push_in(s["name"], src)
        base = f"{B}/{s['name']}_base.mp4"
        bars = f"drawbox=x=0:y=0:w=1920:h={BAR}:color=black:t=fill,drawbox=x=0:y={1080 - BAR}:w=1920:h={BAR}:color=black:t=fill"
        if s.get("ov"):
            ov = f"{MAN}/{s['ov']}.mov"
            fc = (f"[0:v]trim=0:{d},setpts=PTS-STARTPTS,fps=60,scale=1920:1080[b];[1:v]trim=0:{d},setpts=PTS-STARTPTS,fps=60,"
                  f"scale=1920:1080,format=rgba[o];[b][o]overlay=0:0:eof_action=pass:format=auto,{bars}[v]")
            sh("ffmpeg", "-v", "error", "-y", "-i", src, "-i", ov, "-filter_complex", fc, "-map", "[v]", "-t", str(d),
               "-c:v", "libx264", "-crf", "12", "-preset", "fast", "-pix_fmt", "yuv420p", base)
        else:
            sh("ffmpeg", "-v", "error", "-y", "-i", src, "-vf", f"trim=0:{d},setpts=PTS-STARTPTS,fps=60,scale=1920:1080,{bars}", "-t", str(d),
               "-c:v", "libx264", "-crf", "12", "-preset", "fast", "-pix_fmt", "yuv420p", base)
        n = int(round(d * SR)); a = np.zeros(n)
        if s.get("fx"): a += read_wav(f"{HERE}/fx/{s['fx']}.wav", n)
        if s.get("ov") and os.path.exists(f"{SB}/sb_audio/mix_{s['ov']}.wav"):
            a += read_wav(f"{SB}/sb_audio/mix_{s['ov']}.wav", n)
        push = "0"
    else:
        base = f"{MAN}/{s['name']}.mp4"; d = dur_of(base); n = int(round(d * SR))
        a = read_wav(base, n) if subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index",
                                                 "-of", "csv=p=0", base], capture_output=True, text=True).stdout.strip() else np.zeros(n)
        push = "0.02"
    wavp = f"{B}/{s['name']}.wav"; write_wav(wavp, a)
    cuts = f"{B}/{s['name']}_cuts.json"
    json.dump({"cuts": [], "total": d, "bar_h": BAR / 1080}, open(cuts, "w"))
    env = dict(os.environ, PUSH=push)
    subprocess.run([sys.executable, f"{SB}/film.py", base, cuts, wavp, out], check=True, env=env)
    return out


def captions(shots_t):
    """[(t0, t1, text)] on the film timeline"""
    caps = []
    for s, t0 in shots_t:
        if s["kind"] == "three":
            caps += [(t0 + a, t0 + a + d, txt) for a, d, txt in s.get("caps", [])]
        else:
            p = f"{HERE}/caps_{s['name']}.json"
            if os.path.exists(p):
                caps += [(t0 + a, t0 + a + d, txt) for a, d, txt in json.load(open(p))]
        caps += [(t0 + a, t0 + a + d, txt) for a, d, txt in EXTRA_CAPS.get(CUT, {}).get(s["name"], [])]
    return caps


def caption_filter(caps):
    parts = []
    os.makedirs(f"{B}/caps", exist_ok=True)
    for i, (a, b, txt) in enumerate(caps):
        tf = f"{B}/caps/{i:03d}.txt"; open(tf, "w").write(txt)
        al = f"if(lt(t,{a + 0.25:.3f}),(t-{a:.3f})/0.25,if(gt(t,{b - 0.25:.3f}),({b:.3f}-t)/0.25,1))"
        parts.append(f"drawtext=fontfile={FONT}:textfile={tf}:fontsize=46:fontcolor=0xF0EFEC:x=(w-text_w)/2:"
                     f"y={1080 - BAR // 2}-text_h/2:enable='between(t,{a:.3f},{b:.3f})':alpha='{al}'")
    return ",".join(parts)


# the LinkedIn cut (CUT=short): hook, why the sand moves, why only some frequencies, the sweep, sensors, braces, close.
# The full film lives on nodallab.dev; the close points there.
SHORT_NAMES = ["s1", "CTitle", "CJump", "CFit", "s5", "s7", "s8", "CClose"]
EXTRA_CAPS = {"short": {"CClose": [(7.4, 4.0, "Full five-minute version on nodallab.dev.")]}}
ARCS = {"full": [("start", "CTitle", -1.5), ("start", "CWave", -1.0), ("start", "CFit", -0.5), ("start", "CPeak", 0.0),
                 ("start", "s5", 2.5), ("end", "s5", 2.0), ("start", "CSensor", 0.0), ("start", "s7", -0.5), ("start", "s9", -1.0)],
        "short": [("start", "CTitle", -1.5), ("start", "CJump", -1.0), ("start", "CFit", -0.3), ("start", "s5", 2.5),
                  ("end", "s5", 2.0), ("start", "s7", -0.3), ("start", "CClose", -1.0)]}
CUT = os.environ.get("CUT", "full")
if CUT == "short":
    SHOTS = [next(s for s in SHOTS if s["name"] == n) for n in SHORT_NAMES]


if __name__ == "__main__":
    out = sys.argv[1]
    built, t, shots_t = [], 0.0, []
    for s in SHOTS:
        p = build_shot(s); d = dur_of(p)
        shots_t.append((s, t)); built.append(p); print(f"{s['name']:8s} at {t:7.2f} s  ({d:5.2f} s)", flush=True); t += d
    T = t
    lst = f"{B}/concat_{CUT}.txt"; open(lst, "w").write("".join(f"file '{p}'\n" for p in built))
    raw = f"{B}/film_raw_{CUT}.mp4"
    sh("ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", raw)
    N = int(round(T * SR))
    fx = read_wav(raw, N)
    starts = {s["name"]: t0 for s, t0 in shots_t}
    durs = {s["name"]: dur_of(p) for (s, _), p in zip(shots_t, built)}

    def ev(e):
        k = e[0]
        if k == "start": return starts[e[1]]
        if k == "end": return starts[e[1]] + durs[e[1]]
        if k == "at": return starts[e[1]] + e[2]
        raise ValueError(e)

    sys.path.insert(0, SB)
    import score_edit
    score_edit.SR = SR                                      # its default is 44.1 kHz: build the music at the film's rate
    plan = json.load(open(os.environ.get("PLAN", f"{HERE}/plan_music.json")))
    music, log = score_edit.build(MUS + plan["track"], plan, ev, T, N, cache_dir=B)
    print("\n".join(log))
    m = music.mean(1) if music.ndim == 2 else music
    # the music's arc, by design (dB, relative): its own intro under the hook, a steady progression, the climax on the cut
    # into the sweep, a step down for the point (sensors, braces), then the track's own ending. A slow fader rides the
    # track toward this curve (8 s smoothing, so its phrasing and breaths survive), within +-6 dB.
    ARC = ARCS[CUT]
    at = [ev(a[:2] if a[0] != "at" else a[:3]) for a in ARC]; tg = [a[-1] for a in ARC]
    hop = SR // 10; n10 = N // hop
    lv = 10 * np.log10(np.array([np.mean(m[i * hop:(i + 1) * hop] ** 2) for i in range(n10)]) + 1e-10)
    k = np.ones(80) / 80; lv = 10 * np.log10(np.convolve(10 ** (lv / 10), k, "same") + 1e-10)
    tt = np.arange(n10) / 10
    ref = np.median(lv[(tt > at[0]) & (tt < at[-1])])
    gdb = np.clip(np.interp(tt, at, tg) - (lv - ref), -6, 6)
    gdb[tt < at[0]] = gdb[np.argmax(tt >= at[0])]                     # the track's own intro under the hook
    gdb[tt > at[-1]] = gdb[np.argmax(tt >= at[-1])]                   # and its own ending
    gdb = np.convolve(np.pad(gdb, 15, mode="edge"), np.ones(31) / 31, "valid")   # 3 s glide, no pumping
    g = 10 ** (np.interp(np.arange(N) / SR, tt, gdb) / 20)
    music_g = (music if music.ndim == 2 else np.stack([music] * 2, 1)) * g[:, None]
    mix = 0.26 * music_g + np.stack([fx, fx], 1) * 1.25               # music under the effects
    mixp = f"{B}/mix_{os.environ.get('TAG', 'film')}.wav"; write_wav(mixp, mix / max(1.0, np.abs(mix).max() / 0.95))
    if os.environ.get("AUDIO_ONLY"):                        # quick loop on the mix: short-term loudness per shot
        r = subprocess.run(["ffmpeg", "-nostats", "-i", mixp, "-af", "ebur128=framelog=info", "-f", "null", "-"], capture_output=True, text=True).stderr
        import re
        tS = np.array([[float(a), float(b)] for a, b in re.findall(r"t:\s*([\d.]+)\s.*?S:\s*(-?[\d.]+)", r)])
        I = float(re.findall(r"I:\s*(-?[\d.]+) LUFS", r)[-1])
        print(f"mix integrated {I:.1f} LUFS")
        for s, t0 in shots_t:
            m = (tS[:, 0] >= t0 + 1.5) & (tS[:, 0] < t0 + durs[s["name"]])
            print(f"  {s['name']:8s} median S {np.median(tS[m, 1]) - I:+5.1f} LU")
        if os.environ.get("PREVIEW"):                     # the current picture with this soundtrack, small, for an ear check
            sh("ffmpeg", "-v", "error", "-y", "-i", os.environ["PREVIEW"], "-i", mixp, "-filter_complex",
               "[0:v]fps=30,scale=854:-2[v];[1:a]loudnorm=I=-21:TP=-2[a]", "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "27",
               "-preset", "veryfast", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-t", f"{T:.3f}", out)
        sys.exit(0)
    # captions on the bottom bar + the mix, loudness to -20 LUFS (two-pass), true peak -1.5
    cf = caption_filter(captions(shots_t))
    meas = subprocess.run(["ffmpeg", "-nostats", "-i", mixp, "-af", "loudnorm=I=-21:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                          capture_output=True, text=True).stderr
    js = json.loads(meas[meas.rindex("{"):meas.rindex("}") + 1])
    ln = (f"loudnorm=I=-21:TP=-1.5:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:measured_LRA={js['input_lra']}:"
          f"measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
    sh("ffmpeg", "-v", "error", "-y", "-i", raw, "-i", mixp, "-filter_complex", f"[0:v]{cf}[v];[1:a]{ln},aresample=48000[a]",
       "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p",
       "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-t", f"{T:.3f}", out)
    print("done", out, f"{T:.1f} s")
