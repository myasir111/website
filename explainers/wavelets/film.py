"""Film finish for the Manim render: slow camera pushes inside the wide-screen picture, soft vignette, fine grain (the grain is added by ffmpeg).
The bars (title + captions) are left untouched.   python film.py in.mp4 cuts.json score.wav out.mp4"""
import json, subprocess, sys
import cv2
import numpy as np

src, cuts_file, audio, out = sys.argv[1:5]
meta = json.load(open(cuts_file))
cuts = sorted(set([0.0] + meta["cuts"] + [meta["total"]]))
cap = cv2.VideoCapture(src)
fps, W, H = cap.get(cv2.CAP_PROP_FPS), int(cap.get(3)), int(cap.get(4))
bar = int(round(meta["bar_h"] * H))
y0, y1 = bar, H - bar
bh = y1 - y0
yy, xx = np.mgrid[0:bh, 0:W].astype(np.float32)
r = np.hypot((xx - W / 2) / (W / 2), (yy - bh / 2) / (bh / 2) * 0.6)
vig = (1 - 0.22 * np.clip(r - 0.45, 0, None) ** 2 / 0.55 ** 2).clip(0.7, 1)
vig = cv2.merge([np.round(vig * 255).astype(np.uint8)] * 3)
ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(fps),
                       "-i", "-", "-i", audio, "-map", "0:v", "-map", "1:a", "-vf", "noise=c0s=5:c0f=t+u", "-c:v", "libx264", "-crf", "20", "-preset", "medium",
                       "-pix_fmt", "yuv420p", "-af", "volume=-2.5dB", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
                       out], stdin=subprocess.PIPE)
i = 0
while True:
    ok, f = cap.read()
    if not ok:
        break
    t = i / fps
    k = max(j for j, c in enumerate(cuts) if c <= t + 1e-6)
    a, b = cuts[k], cuts[min(k + 1, len(cuts) - 1)]
    z = 1.0 + 0.025 * ((t - a) / max(b - a, 1e-6))                      # each scene: a slow push in, reset on the cut
    M = np.float32([[z, 0, (1 - z) * W / 2], [0, z, (1 - z) * bh / 2]])
    band = cv2.warpAffine(f[y0:y1], M, (W, bh), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    f[y0:y1] = cv2.multiply(band, vig, scale=1 / 255)
    ff.stdin.write(f.tobytes())
    i += 1
ff.stdin.close()
ff.wait()
print("frames", i)
