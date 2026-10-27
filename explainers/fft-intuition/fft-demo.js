// Interactive FFT demo: two sine components + white noise, time and spectrum views.
(function () {
  const FS = 1000;      // sample rate, Hz
  const N = 1024;       // samples (power of two for the FFT)
  const FMAX = 250;     // highest frequency shown in the spectrum

  const $ = (id) => document.getElementById(id);
  const ids = ['f1', 'a1', 'f2', 'a2', 'n'];
  const timeC = $('time'), freqC = $('freq');

  // Fixed noise sequence so the plot doesn't flicker as sliders move.
  const noise = new Float64Array(N);
  let seed = 12345;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < N; i++) {
    const u = Math.max(rand(), 1e-12), v = rand();
    noise[i] = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // In-place radix-2 FFT.
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const a = i + k, b = a + len / 2;
          const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
          re[b] = re[a] - tr; im[b] = im[a] - ti;
          re[a] += tr; im[a] += ti;
          const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
        }
      }
    }
  }

  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  function setup(c) {
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth, h = c.clientHeight;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }

  function axes(ctx, w, h, pad, xLabel) {
    ctx.strokeStyle = css('--line'); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b); ctx.lineTo(w - pad.r, h - pad.b); ctx.stroke();
    ctx.fillStyle = css('--muted'); ctx.font = '11px ' + css('--mono');
    ctx.textAlign = 'right'; ctx.fillText(xLabel, w - pad.r, h - 4);
  }

  function render() {
    const p = Object.fromEntries(ids.map((k) => [k, parseFloat($(k).value)]));
    const useWin = $('win').checked;
    $('f1v').textContent = p.f1.toFixed(1) + ' Hz';
    $('f2v').textContent = p.f2.toFixed(1) + ' Hz';
    $('a1v').textContent = p.a1.toFixed(2);
    $('a2v').textContent = p.a2.toFixed(2);
    $('nv').textContent = p.n.toFixed(2);

    const x = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const t = i / FS;
      x[i] = p.a1 * Math.sin(2 * Math.PI * p.f1 * t) + p.a2 * Math.sin(2 * Math.PI * p.f2 * t) + p.n * noise[i];
    }

    // Time plot: first 0.25 s.
    {
      const { ctx, w, h } = setup(timeC);
      const pad = { l: 8, r: 8, t: 8, b: 20 };
      axes(ctx, w, h, pad, 'time (0–0.25 s)');
      const n = Math.round(0.25 * FS);
      const peak = Math.max(2.5, p.a1 + p.a2 + 3 * p.n);
      ctx.strokeStyle = css('--accent'); ctx.lineWidth = 1.5; ctx.beginPath();
      const mid = pad.t + (h - pad.t - pad.b) / 2;
      for (let i = 0; i < n; i++) {
        const X = pad.l + (i / (n - 1)) * (w - pad.l - pad.r);
        const Y = mid - (x[i] / peak) * (h - pad.t - pad.b) / 2;
        i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.stroke();
    }

    // Spectrum: single-sided amplitude, corrected for window coherent gain.
    {
      const re = new Float64Array(N), im = new Float64Array(N);
      let gain = 0;
      for (let i = 0; i < N; i++) {
        const wv = useWin ? 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)) : 1;
        re[i] = x[i] * wv; gain += wv;
      }
      fft(re, im);
      const kMax = Math.floor(FMAX * N / FS);
      const mag = new Float64Array(kMax);
      for (let k = 0; k < kMax; k++) mag[k] = (2 / gain) * Math.hypot(re[k], im[k]);

      const { ctx, w, h } = setup(freqC);
      const pad = { l: 8, r: 8, t: 8, b: 20 };
      axes(ctx, w, h, pad, 'frequency (0–' + FMAX + ' Hz)');
      const top = Math.max(2.1, ...mag) * 1.05;
      ctx.fillStyle = css('--muted'); ctx.font = '11px ' + css('--mono'); ctx.textAlign = 'center';
      for (let f = 50; f < FMAX; f += 50) {
        const X = pad.l + (f / FMAX) * (w - pad.l - pad.r);
        ctx.fillText(f, X, h - 4);
      }
      ctx.strokeStyle = css('--accent-2'); ctx.lineWidth = 1.5; ctx.beginPath();
      for (let k = 0; k < kMax; k++) {
        const X = pad.l + (k / (kMax - 1)) * (w - pad.l - pad.r);
        const Y = h - pad.b - (mag[k] / top) * (h - pad.t - pad.b);
        k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.stroke();
    }
  }

  ids.forEach((k) => $(k).addEventListener('input', render));
  $('win').addEventListener('change', render);
  window.addEventListener('resize', render);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', render);
  render();
})();
