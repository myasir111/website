"""Edit ONE music track to fit the film, the way a music editor would: the track is cut and looped inside itself,
always on a bar line, choosing the bar whose harmony best matches what would have played next; the last section is the
track's own ending, lined up to finish with the film. Short equal-power crossfades on the cut."""
import numpy as np, librosa, os, json

SR = 44100


def analyse(path, cache):
    if os.path.exists(cache):
        d = np.load(cache)
        return d["beats"], d["bars"], d["chroma"], float(d["end"])
    y, sr = librosa.load(path, sr=22050, mono=True)
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units="frames")
    on = librosa.onset.onset_strength(y=y, sr=sr)
    st = on[np.clip(beats, 0, len(on) - 1)]
    phase = int(np.argmax([st[p::4].sum() for p in range(4)]))      # the beat phase with the strongest hits = downbeats
    bt = librosa.frames_to_time(beats, sr=sr)
    bars = bt[phase::4]
    ch = librosa.feature.chroma_cqt(y=y, sr=sr)
    cht = librosa.times_like(ch, sr=sr)
    chroma = np.array([ch[:, (cht >= a) & (cht < b)].mean(1) if ((cht >= a) & (cht < b)).any() else np.zeros(12)
                       for a, b in zip(bars, np.append(bars[1:], bars[-1] + 4))])
    rms = librosa.feature.rms(y=y)[0]
    rt = librosa.times_like(rms, sr=sr)
    loud = 20 * np.log10(rms + 1e-9)
    end = float(rt[np.where(loud > loud.max() - 40)[0][-1]])          # where the track has really finished
    np.savez(cache, beats=bt, bars=bars, chroma=chroma, end=end)
    return bt, bars, chroma, end


def build(track_path, plan, ev, T, N, cache_dir="build"):
    """plan: {"anchor": [event, track time], "edits": [{"at": event, "hint": track time}, ...], "end_at": event}
    returns stereo music (N samples) and a log"""
    beats, bars, chroma, end = analyse(track_path, os.path.join(cache_dir, os.path.basename(track_path) + ".npz"))
    import subprocess
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", track_path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    y = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)
    near = lambda arr, x: arr[np.argmin(np.abs(arr - x))]
    cos = lambda a, b: float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))
    bar_i = lambda x: int(np.argmin(np.abs(bars - x)))
    # sections: list of (film start, film end, track time at film start)
    e0, a0 = plan["anchor"]
    off = a0 - ev(e0)                                       # track time = film time + off
    t_start = max(0.0, -off)
    secs, log = [], []
    cur_start, cur_off = t_start, off
    for ed in plan["edits"]:
        te = ev(ed["at"])
        p = te + cur_off                                    # where the running section would be at the cut
        pb = near(bars, p)
        if abs(pb - p) < 1.2:                               # move the cut onto that section's nearest bar line
            te, p = te + (pb - p), pb
        nxt = chroma[min(bar_i(p), len(chroma) - 1)]
        cands = [j for j, b in enumerate(bars) if abs(b - ed["hint"]) < 8 and j < len(chroma)]
        q = bars[max(cands, key=lambda j: cos(chroma[j], nxt) - 0.01 * abs(bars[j] - ed["hint"]))] if cands else ed["hint"]
        secs.append((cur_start, te, cur_off))
        log.append(f"cut at film {te:6.2f} s: track {p:6.1f} -> {q:6.1f} s (bar line, harmony match {cos(chroma[bar_i(q)], nxt):.2f})")
        cur_start, cur_off = te, q - te
    # the ending: the track's own last bars, finishing with the film
    te = ev(plan["end_at"])
    p = te + cur_off
    off_end = end - (T + 0.6)                               # track time = film time + off_end  (ends 0.6 s after the last frame)
    best = min(np.linspace(-1.5, 1.5, 61), key=lambda d: abs(near(bars, te + d + cur_off) - (te + d + cur_off))
               + abs(near(beats, te + d + off_end) - (te + d + off_end)))
    te += best
    secs.append((cur_start, te, cur_off))
    log.append(f"cut at film {te:6.2f} s: track {te + cur_off:6.1f} -> {te + off_end:6.1f} s (the track's own ending, done at {end:.1f} s)")
    secs.append((te, T + 2.0, off_end))
    out = np.zeros((N, 2))
    XF = 0.12
    for k, (f0, f1, o) in enumerate(secs):
        i0, i1 = int(max(0, f0 - XF / 2) * SR), min(N, int((f1 + XF / 2) * SR))
        tt = np.arange(i0, i1) / SR
        src = ((tt + o) * SR).astype(int)
        ok = (src >= 0) & (src < len(y))
        seg = np.zeros((i1 - i0, 2))
        seg[ok] = y[src[ok]]
        g = np.ones_like(tt)
        if k > 0:
            g *= np.sin(np.clip((tt - (f0 - XF / 2)) / XF, 0, 1) * np.pi / 2)
        else:
            g *= np.clip((tt - f0) / 2.5, 0, 1) if f0 > 0 else np.clip(tt / 1.0, 0, 1)
        if k < len(secs) - 1:
            g *= np.cos(np.clip((tt - (f1 - XF / 2)) / XF, 0, 1) * np.pi / 2)
        out[i0:i1] += seg * g[:, None]
    return out, log
