"""Assemble the cinematic 2-minute Chladni film (v4: c1 macro hook, c2 follow-one-grain, scenes played to their end): plate shots (three.js) + short maths shots (Manim, cfilm2.py) + overlays,
wide-screen bars, film finish, captions (one or two short lines) in the bottom bar, the plate's own sound
(plate_sound.py), CC0 kit effects with a soft knock on every cut, and one music track edited to the picture.
    PLAN=plan_2min.json python compose2.py out.mp4          (AUDIO_ONLY=1 for a quick loudness pass on the mix)"""
import json, os, subprocess, sys, wave
import numpy as np

import compose as C                                          # push-ins, wav helpers, the film finish settings

HERE = C.HERE
SB = C.SB
B = f"{HERE}/build4"; os.makedirs(B, exist_ok=True)
SR, BAR, FONT = C.SR, C.BAR, C.FONT
MAN = f"{HERE}/media/videos/cfilm2/1080p60"
MAN3 = f"{HERE}/media/videos/cfilm3/1080p60"
MAN4 = f"{HERE}/media/videos/cfilm4/1080p60"
OVM = f"{HERE}/media/videos/cfilm/1080p60"                  # the overlays' pictures (unchanged)
KEN = os.environ.get("KENNEY", "sfx/")                     # the Kenney impact pack (CC0)
MUSIC_CREDIT = os.environ.get("CREDIT", "")

SHOTS = [
    dict(name="c1", kind="three", dur=10.5, fx="c1", grade=True,
         caps=[(0.6, 3.2, "Sand on a metal plate, shaken at 967 Hz."), (4.1, 2.6, "Slowed down, hops enlarged."),
               (7.4, 2.9, "Nothing is drawing this pattern.")]),
    dict(name="CQTitle", kind="manim"),
    dict(name="CJumpOnly", kind="manim", man=4),
    dict(name="c2", kind="three", dur=12.5, fx="c2", grade=True,
         caps=[(0.5, 2.6, "Follow one grain."), (3.4, 2.8, "Big hops where the plate moves."),
               (6.5, 2.4, "Smaller near the line."), (9.3, 2.9, "On the line it stops.")]),
    dict(name="CFitQ", kind="manim", man=4),
    dict(name="s5", kind="three", dur=26.4, ov="O5S", ovdir=3, fx="s5q", ovsnd=False,
         caps=[(0.6, 3.6, "Now sweep the drive frequency."), (4.9, 3.6, "Every peak: a new shape."),
               (9.2, 3.6, "Between peaks, the plate barely moves."), (13.5, 3.6, "967 Hz: our ring again."),
               (17.8, 3.6, "Higher peaks, busier patterns."), (22.1, 3.8, "Every peak in a spectrum\nhas a shape.")]),
    dict(name="s7", kind="three", dur=17.5, ov="O7S", ovdir=4, fx="s7",
         caps=[(0.4, 2.6, "Two sensors on the same plate."), (3.2, 2.0, "Inside the ring: a big peak."),
               (5.25, 3.2, "On the ring: almost nothing."), (8.7, 2.1, "24 dB lower. Same plate."),
               (11.0, 2.5, "A sensor reads the shape where it sits."), (13.8, 3.3, "On a still line: no peak.")]),
    dict(name="CRecapQ", kind="manim", man=4),
    dict(name="s9", kind="three", dur=6.0,
         caps=[(0.5, 4.8, "Same physics in panels,\nducts and casings.")]),
]
# the music's own arc carries it (ARC_LIM=0); these points only anchor the fader's reference window
ARC = [("start", "CQTitle", -1.5), ("start", "CJumpOnly", -1.0), ("start", "CFitQ", -0.3), ("start", "s5", 2.0),
       ("end", "s5", 1.5), ("start", "s7", 0.5), ("start", "CRecapQ", -0.5), ("start", "s9", -1.0)]
GRADE = "vignette=angle=0.55:mode=forward,noise=alls=7:allf=t"   # the cinematic shots: a soft lens vignette and film grain


def kit(rel, vol):
    raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", KEN + rel, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    y = np.frombuffer(raw, np.float32).astype(np.float64)
    return vol * y / (np.abs(y).max() + 1e-9)


def build_shot(s):
    out = f"{B}/{s['name']}.mp4"
    if os.path.exists(out) and not os.environ.get("REBUILD"):
        return out
    if s["kind"] == "three":
        d = s["dur"]; t0s = s.get("start", 0.0); src = f"{HERE}/render/{s['name']}.mp4"
        if s["name"] in C.PJ.PUSH:
            src = C.push_in(s["name"], src)                 # cached in build/ (same render, same push)
        base = f"{B}/{s['name']}_base.mp4"
        bars = f"drawbox=x=0:y=0:w=1920:h={BAR}:color=black:t=fill,drawbox=x=0:y={1080 - BAR}:w=1920:h={BAR}:color=black:t=fill"
        if s.get("ov"):
            fc = (f"[0:v]trim={t0s}:{t0s + d},setpts=PTS-STARTPTS,fps=60,scale=1920:1080[b];[1:v]trim={t0s}:{t0s + d},setpts=PTS-STARTPTS,fps=60,"
                  f"scale=1920:1080,format=rgba[o];[b][o]overlay=0:0:eof_action=pass:format=auto,{bars}[v]")
            C.sh("ffmpeg", "-nostdin", "-v", "error", "-y", "-i", src, "-i", f"{ {3: MAN3, 4: MAN4}.get(s.get('ovdir'), OVM) }/{s['ov']}.mov", "-filter_complex", fc, "-map", "[v]",
                 "-t", str(d), "-c:v", "libx264", "-crf", "12", "-preset", "fast", "-pix_fmt", "yuv420p", base)
        else:
            gr = f"{GRADE}," if s.get("grade") else ""
            C.sh("ffmpeg", "-nostdin", "-v", "error", "-y", "-i", src, "-vf", f"trim={t0s}:{t0s + d},setpts=PTS-STARTPTS,fps=60,scale=1920:1080:flags=lanczos,{gr}{bars}",
                 "-t", str(d), "-c:v", "libx264", "-crf", "12", "-preset", "fast", "-pix_fmt", "yuv420p", base)
        n = int(round(d * SR)); a = np.zeros(n); i0 = int(round(t0s * SR))
        if s.get("fx"): a += C.read_wav(f"{HERE}/fx/{s['fx']}.wav", i0 + n)[i0:]
        if s.get("ov") and s.get("ovsnd", True) and os.path.exists(f"{SB}/sb_audio/k2_mix_{s['ov']}.wav"):
            a += C.read_wav(f"{SB}/sb_audio/k2_mix_{s['ov']}.wav", i0 + n)[i0:]
        push = "0"
    else:
        src = f"{ {3: MAN3, 4: MAN4}.get(s.get('man'), MAN) }/{s['name']}.mp4"
        d = s.get("dur") or float(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=duration",
                                                  "-of", "csv=p=0", src], capture_output=True, text=True).stdout)   # the picture's length (the audio runs 2 s longer)
        n = int(round(d * SR))
        base = src
        if True:                                              # always cut to the picture's length
            base = f"{B}/{s['name']}_trim.mp4"
            C.sh("ffmpeg", "-nostdin", "-v", "error", "-y", "-i", src, "-t", str(d), "-c:v", "libx264", "-crf", "12", "-preset", "fast",
                 "-pix_fmt", "yuv420p", "-an", base)
        a = C.read_wav(src, n)
        push = "0.02"
    wavp = f"{B}/{s['name']}.wav"; C.write_wav(wavp, a)
    cuts = f"{B}/{s['name']}_cuts.json"
    json.dump({"cuts": [], "total": d, "bar_h": BAR / 1080}, open(cuts, "w"))
    subprocess.run([sys.executable, f"{SB}/film.py", base, cuts, wavp, out], check=True, env=dict(os.environ, PUSH=push))
    return out


def captions(shots_t):
    caps = []
    for s, t0 in shots_t:
        if s["kind"] == "three":
            caps += [(t0 + a, t0 + a + d, txt) for a, d, txt in s.get("caps", [])]
        else:
            p = f"{HERE}/caps_{s['name']}.json"
            if os.path.exists(p):
                caps += [(t0 + a, t0 + min(a + d, s.get("dur", 1e9)), txt) for a, d, txt in json.load(open(p))]
    return caps


def caption_filter(caps, extra=()):
    """one style for every caption: bold, in the bottom bar; one line, or two short ones stacked"""
    parts = []
    os.makedirs(f"{B}/caps", exist_ok=True)
    k = 0
    for a, b, txt in caps:
        al = f"if(lt(t,{a + 0.25:.3f}),(t-{a:.3f})/0.25,if(gt(t,{b - 0.25:.3f}),({b:.3f}-t)/0.25,1))"
        rows = txt.split("\n")
        for j, row in enumerate(rows):
            tf = f"{B}/caps/{k:03d}.txt"; open(tf, "w").write(row); k += 1
            dy = (j - (len(rows) - 1) / 2) * 52
            parts.append(f"drawtext=fontfile={FONT}:textfile={tf}:fontsize={46 if len(rows) == 1 else 44}:fontcolor=0xF0EFEC:"
                         f"x=(w-text_w)/2:y={1080 - BAR // 2}+{dy:.0f}-text_h/2:enable='between(t,{a:.3f},{b:.3f})':alpha='{al}'")
    for a, b, txt, size, y, col in extra:                    # small credit lines in the top bar
        tf = f"{B}/caps/x{k:03d}.txt"; open(tf, "w").write(txt); k += 1
        al = f"if(lt(t,{a + 0.4:.3f}),(t-{a:.3f})/0.4,if(gt(t,{b - 0.4:.3f}),({b:.3f}-t)/0.4,1))"
        parts.append(f"drawtext=fontfile={FONT}:textfile={tf}:fontsize={size}:fontcolor={col}:x=(w-text_w)/2:y={y}:"
                     f"enable='between(t,{a:.3f},{b:.3f})':alpha='{al}'")
    return ",".join(parts)


def gate_env(x, att=0.25, rel=0.8):
    """a smooth follower of |x| (attack/release in s) for ducking the music under the plate's tones"""
    hop = SR // 100; n = len(x) // hop
    e = np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(1)) * np.sqrt(2)
    out = np.zeros(n); g = 0.0
    a_, r_ = np.exp(-1 / (att * 100)), np.exp(-1 / (rel * 100))
    for i, v in enumerate(e):
        g = a_ * g + (1 - a_) * v if v > g else r_ * g + (1 - r_) * v
        out[i] = g
    return np.interp(np.arange(len(x)) / SR, np.arange(n) / 100, out)


if __name__ == "__main__":
    out = sys.argv[1]
    built, t, shots_t = [], 0.0, []
    for s in SHOTS:
        p = build_shot(s); d = C.dur_of(p)
        shots_t.append((s, t)); built.append(p); print(f"{s['name']:8s} at {t:7.2f} s  ({d:5.2f} s)", flush=True); t += d
    T = t
    lst = f"{B}/concat.txt"; open(lst, "w").write("".join(f"file '{p}'\n" for p in built))
    raw = f"{B}/film_raw.mp4"
    C.sh("ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", raw)
    N = int(round(T * SR))
    fx = C.read_wav(raw, N)
    starts = {s["name"]: t0 for s, t0 in shots_t}
    durs = {s["name"]: C.dur_of(p) for (s, _), p in zip(shots_t, built)}

    # the plate's own sound, placed on its shots (stereo)
    tones = np.zeros((N, 2))
    for s, t0 in shots_t:
        if s.get("tone"):
            with wave.open(f"{HERE}/fx2/{s['tone']}_tone.wav") as w:
                y = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(np.float64) / 32767
            i0 = int(round(t0 * SR)); n = min(len(y), int(round(durs[s["name"]] * SR)), N - i0)
            tones[i0:i0 + n] += y[:n]
    # a soft knock on every cut (the kit's light wood + a soft body), unless the cut already carries a sound
    knock = kit("kenney-impact-sounds/impactWood_light_000.ogg", 0.22)
    body = kit("kenney-impact-sounds/impactSoft_medium_001.ogg", 0.12)
    kn = np.zeros(max(len(knock), len(body))); kn[:len(knock)] += knock; kn[:len(body)] += body
    knock_at = [int(round(t0 * SR)) for s, t0 in shots_t[1:]]   # every scene change carries a sound (super-sound 2b)

    def ev(e):
        k = e[0]
        if k == "start": return starts[e[1]]
        if k == "end": return starts[e[1]] + durs[e[1]]
        if k == "at": return starts[e[1]] + e[2]
        raise ValueError(e)

    sys.path.insert(0, SB)
    import score_edit
    score_edit.SR = SR
    if os.environ.get("NOMUSIC"):                          # picture + the plate's sound + effects only (critic pass)
        music, log = np.zeros((N, 2)) + 1e-6, ["no music"]
    else:
        plan = json.load(open(os.environ.get("PLAN", f"{HERE}/plan4_piano.json")))
        if plan["anchor"][1] == "auto":                    # one continuous take: the track's own ending lands 0.6 s after the last frame
            plan["anchor"][1] = plan["track_end"] - (T + 0.6) + ev(plan["anchor"][0])
        music, log = score_edit.build(plan["track"], plan, ev, T, N, cache_dir=B)
    print("\n".join(log))
    m = music.mean(1) if music.ndim == 2 else music
    at = [ev(a[:2]) for a in ARC]; tg = [a[-1] for a in ARC]
    hop = SR // 10; n10 = N // hop
    lv = 10 * np.log10(np.array([np.mean(m[i * hop:(i + 1) * hop] ** 2) for i in range(n10)]) + 1e-10)
    lv = 10 * np.log10(np.convolve(10 ** (lv / 10), np.ones(80) / 80, "same") + 1e-10)
    tt = np.arange(n10) / 10
    ref = np.median(lv[(tt > at[0]) & (tt < at[-1])])
    LIM = float(os.environ.get("ARC_LIM", 6))
    gdb = np.clip(np.interp(tt, at, tg) - (lv - ref), -LIM, LIM)
    gdb[tt < at[0]] = gdb[np.argmax(tt >= at[0])]
    gdb[tt > at[-1]] = gdb[np.argmax(tt >= at[-1])]
    gdb = np.convolve(np.pad(gdb, 15, mode="edge"), np.ones(31) / 31, "valid")
    g = 10 ** (np.interp(np.arange(N) / SR, tt, gdb) / 20)
    # duck the music under the plate's tones (up to -7 dB) so the physics is what you hear
    te = gate_env(tones.mean(1))
    duck = 10 ** (-7 * np.clip(te / 0.12, 0, 1) / 20)
    music_g = (music if music.ndim == 2 else np.stack([music] * 2, 1)) * (g * duck)[:, None]
    MG, FG, TG = float(os.environ.get("MG", 0.26)), float(os.environ.get("FG", 1.6)), float(os.environ.get("TG", 1.0))
    mix = MG * music_g + FG * np.stack([fx, fx], 1) + TG * tones
    mrms = lambda i: np.sqrt(np.mean(music_g[max(0, i - SR // 3):i + SR // 3] ** 2)) + 1e-9
    med = np.median([mrms(i) for i in range(SR, N - SR, SR)])
    for i0 in knock_at:                                       # louder where the music is louder, so the cut still reads
        k_ = FG * kn[:N - i0] * float(np.clip(mrms(i0) / med, 1.0, 2.0))
        mix[i0:i0 + len(k_)] += k_[:, None]
    fo = int(1.2 * SR); mix[-fo:] *= np.linspace(1, 0, fo)[:, None]      # the last shot fades with the picture
    mixp = f"{B}/mix_{os.environ.get('TAG', 'film')}.wav"; C.write_wav(mixp, mix / max(1.0, np.abs(mix).max() / 0.95))
    if os.environ.get("AUDIO_ONLY"):
        import re
        r = subprocess.run(["ffmpeg", "-nostdin", "-nostats", "-i", mixp, "-af", "ebur128=framelog=info", "-f", "null", "-"],
                           capture_output=True, text=True).stderr
        tS = np.array([[float(a), float(b)] for a, b in re.findall(r"t:\s*([\d.]+)\s.*?S:\s*(-?[\d.]+)", r)])
        I = float(re.findall(r"I:\s*(-?[\d.]+) LUFS", r)[-1])
        print(f"mix integrated {I:.1f} LUFS, LRA {float(re.findall(r'LRA:\s*([\d.]+) LU', r)[-1]):.1f} LU")
        for s, t0 in shots_t:
            mm = (tS[:, 0] >= t0 + 1.5) & (tS[:, 0] < t0 + durs[s["name"]])
            print(f"  {s['name']:8s} median S {np.median(tS[mm, 1]) - I:+5.1f} LU")
        sys.exit(0)
    if os.environ.get("REMUX"):                            # keep the encoded picture, replace only the sound
        meas = subprocess.run(["ffmpeg", "-nostdin", "-nostats", "-i", mixp, "-af", "loudnorm=I=-20:TP=-2:LRA=11:print_format=json", "-f", "null", "-"],
                              capture_output=True, text=True).stderr
        js = json.loads(meas[meas.rindex("{"):meas.rindex("}") + 1])
        ln = (f"loudnorm=I=-20:TP=-2:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:measured_LRA={js['input_lra']}:"
              f"measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
        C.sh("ffmpeg", "-nostdin", "-v", "error", "-y", "-i", os.environ["REMUX"], "-i", mixp, "-filter_complex", f"[1:a]{ln},aresample=48000[a]",
             "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", "-t", f"{T:.3f}", out)
        print("remuxed", out); sys.exit(0)
    extra = []
    if MUSIC_CREDIT:
        a = starts["s9"] + 0.3
        extra.append((a, T - 0.2, MUSIC_CREDIT, 24, 55, "0x9AA3AD"))
    cf = caption_filter(captions(shots_t), extra)
    meas = subprocess.run(["ffmpeg", "-nostdin", "-nostats", "-i", mixp, "-af", "loudnorm=I=-20:TP=-2:LRA=11:print_format=json", "-f", "null", "-"],
                          capture_output=True, text=True).stderr
    js = json.loads(meas[meas.rindex("{"):meas.rindex("}") + 1])
    ln = (f"loudnorm=I=-20:TP=-2:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:measured_LRA={js['input_lra']}:"
          f"measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
    fade = f"fade=t=out:st={T - 1.2:.3f}:d=1.2"
    C.sh("ffmpeg", "-nostdin", "-v", "error", "-y", "-i", raw, "-i", mixp, "-filter_complex", f"[0:v]{cf},{fade}[v];[1:a]{ln},aresample=48000[a]",
         "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", os.environ.get("CRF", "18"), "-preset", os.environ.get("PRESET", "medium"), "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", "-t", f"{T:.3f}", out)
    print("done", out, f"{T:.1f} s")
