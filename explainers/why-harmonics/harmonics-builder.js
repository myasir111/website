// Harmonic builder: pick a periodic signal, add harmonics one at a time,
// watch the partial sum approach the shape and the spectrum fill in.
(function () {
  const N = 1024;                 // samples in exactly one period -> harmonic n lands on bin n
  const NMAX = 25;                // harmonics available
  const SHOW = 15;                // orders drawn in the spectrum
  const $ = (id) => document.getElementById(id);
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const TAU = 2 * Math.PI;

  function realSignal(t) {        // imbalance + misalignment + a ringing impact once per turn
    const ph = ((t % 1) + 1) % 1;
    const tau = (((ph - 0.32) % 1) + 1) % 1;
    const ring = Math.exp(-tau / 0.15) * Math.sin(TAU * 6 * tau);
    return (0.55 * Math.sin(TAU * t) + 0.3 * Math.sin(2 * TAU * t + 0.9) + 1.4 * ring) / 1.16;
  }

  const SIGNALS = {
    sine:     { f: (t) => Math.sin(TAU * t),
                tex: 'f(t)=\\sin(\\omega_0 t)',
                note: 'Already a single harmonic: one term, one peak at 1X. Adding more changes nothing.' },
    square:   { f: (t) => Math.sign(Math.sin(TAU * t)),
                tex: '\\operatorname{sgn}(\\sin\\omega_0 t)=\\frac{4}{\\pi}\\sum_{n\\ \\text{odd}}\\frac{\\sin(n\\omega_0 t)}{n}',
                note: 'Odd harmonics only (half-wave symmetry), falling as 1/n because of the jumps. Watch the overshoot at the corners: it never goes away (Gibbs phenomenon).' },
    sawtooth: { f: (t) => 2 * ((((t + 0.5) % 1) + 1) % 1) - 1,
                tex: 'f(t)=\\frac{2}{\\pi}\\sum_{n=1}^{\\infty}(-1)^{n+1}\\frac{\\sin(n\\omega_0 t)}{n}',
                note: 'No flip symmetry, so every harmonic is present. Still a jump, so still 1/n.' },
    triangle: { f: (t) => (2 / Math.PI) * Math.asin(Math.sin(TAU * t)),
                tex: 'f(t)=\\frac{8}{\\pi^2}\\sum_{n\\ \\text{odd}}(-1)^{\\frac{n-1}{2}}\\frac{\\sin(n\\omega_0 t)}{n^2}',
                note: 'Same symmetry as the square, so odd only. Corners instead of jumps, so harmonics fall as 1/n²: three or four terms already look right.' },
    cut:      { f: (t) => Math.max(Math.sin(TAU * t), 0),
                tex: '\\max(\\sin\\omega_0 t,0)=\\frac{1}{\\pi}+\\frac{1}{2}\\sin\\omega_0 t-\\frac{2}{\\pi}\\sum_{n\\ \\text{even}}\\frac{\\cos(n\\omega_0 t)}{n^2-1}',
                note: 'Cut on one side, so the symmetry is gone: even harmonics appear, plus a DC offset of 1/π.' },
    real:     { f: realSignal,
                tex: 'f(t)=a_0+\\sum_{n=1}^{\\infty}c_n\\cos(n\\omega_0 t+\\varphi_n)',
                note: 'Imbalance (1X), misalignment (2X) and an impact every turn that rings and spreads energy across 4X–7X. Messy, but it repeats, so it is still a Fourier series.' },
  };

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
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
  }

  // Fourier coefficients of one period: dc, a[n] (cos), b[n] (sin)
  const cache = {};
  function coeffs(name) {
    if (cache[name]) return cache[name];
    const f = SIGNALS[name].f, re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = f(i / N);
    let power = 0;
    for (let i = 0; i < N; i++) power += re[i] * re[i];
    power /= N;
    fft(re, im);
    const a = new Float64Array(NMAX + 1), b = new Float64Array(NMAX + 1);
    for (let k = 1; k <= NMAX; k++) { a[k] = 2 * re[k] / N; b[k] = -2 * im[k] / N; }
    return (cache[name] = { dc: re[0] / N, a, b, power });
  }

  function setup(c) {
    const dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }

  let current = 'square';

  function render() {
    const n = +$('nh').value, comps = $('comps').checked;
    const S = SIGNALS[current], C = coeffs(current);
    $('nhv').textContent = n + (n === 1 ? ' harmonic' : ' harmonics');
    const pad = { l: 8, r: 8, t: 10, b: 22 };

    // ---- time view: two periods, target (dashed) + partial sum (solid)
    {
      const { ctx, w, h } = setup($('time'));
      const M = 800, mid = pad.t + (h - pad.t - pad.b) / 2, amp = (h - pad.t - pad.b) / 2 / 1.3;
      const X = (t) => pad.l + t / 2 * (w - pad.l - pad.r);
      const Y = (v) => mid - v * amp;
      ctx.strokeStyle = css('--line'); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, mid); ctx.lineTo(w - pad.r, mid); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X(1), pad.t); ctx.lineTo(X(1), h - pad.b); ctx.stroke();
      ctx.fillStyle = css('--muted'); ctx.font = '11px ' + css('--mono'); ctx.textAlign = 'center';
      ctx.fillText('0', X(0) + 6, h - 5); ctx.fillText('T', X(1), h - 5); ctx.fillText('2T', X(2) - 10, h - 5);
      const partial = (t) => {
        let v = C.dc;
        for (let k = 1; k <= n; k++) v += C.a[k] * Math.cos(TAU * k * t) + C.b[k] * Math.sin(TAU * k * t);
        return v;
      };
      if (comps) {                          // individual harmonics, faint
        for (let k = 1; k <= n; k++) {
          if (Math.hypot(C.a[k], C.b[k]) < 0.01) continue;
          ctx.strokeStyle = k === 1 ? css('--accent') : css('--accent-2');
          ctx.globalAlpha = 0.35; ctx.lineWidth = 1.2; ctx.beginPath();
          for (let i = 0; i <= M; i++) {
            const t = 2 * i / M, v = C.a[k] * Math.cos(TAU * k * t) + C.b[k] * Math.sin(TAU * k * t);
            i ? ctx.lineTo(X(t), Y(v)) : ctx.moveTo(X(t), Y(v));
          }
          ctx.stroke(); ctx.globalAlpha = 1;
        }
      }
      ctx.strokeStyle = css('--muted'); ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]); ctx.beginPath();
      for (let i = 0; i <= M; i++) { const t = 2 * i / M, v = S.f(t); i ? ctx.lineTo(X(t), Y(v)) : ctx.moveTo(X(t), Y(v)); }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = css('--ink'); ctx.lineWidth = 2.2; ctx.beginPath();
      for (let i = 0; i <= M; i++) { const t = 2 * i / M, v = partial(t); i ? ctx.lineTo(X(t), Y(v)) : ctx.moveTo(X(t), Y(v)); }
      ctx.stroke();
    }

    // ---- spectrum: amplitude of each harmonic; ones not yet added are ghosted
    {
      const { ctx, w, h } = setup($('freq'));
      const amps = [Math.abs(C.dc)];
      for (let k = 1; k <= SHOW; k++) amps.push(Math.hypot(C.a[k], C.b[k]));
      const top = Math.max(...amps) * 1.25;
      const X = (k) => pad.l + 18 + k / SHOW * (w - pad.l - pad.r - 30);
      const H = h - pad.t - pad.b, Y = (a) => h - pad.b - a / top * H;
      ctx.fillStyle = css('--muted'); ctx.font = '11px ' + css('--mono'); ctx.textAlign = 'center';
      ctx.strokeStyle = css('--line'); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b); ctx.lineTo(w - pad.r, h - pad.b); ctx.stroke();
      for (let k = 0; k <= SHOW; k++) {
        const lbl = k === 0 ? 'DC' : k + 'X';
        if (w > 520 || k % 2 === 1 || k === 0) ctx.fillText(lbl, X(k), h - 5);
        const a = amps[k];
        if (a < 0.004) continue;
        const on = k === 0 || k <= n;
        ctx.globalAlpha = on ? 1 : 0.22;
        ctx.strokeStyle = k === 0 ? css('--muted') : (k === 1 ? css('--accent') : css('--accent-2'));
        ctx.lineWidth = w > 520 ? 7 : 5;
        ctx.beginPath(); ctx.moveTo(X(k), h - pad.b); ctx.lineTo(X(k), Y(a)); ctx.stroke();
        // on phones, label only the main peaks so the numbers don't overlap
        if (on && a > 0.012 && (w > 520 || a >= 0.3 * Math.max(...amps))) { ctx.fillStyle = css('--ink'); ctx.fillText(a.toFixed(2), X(k), Y(a) - 6); ctx.fillStyle = css('--muted'); }
        ctx.globalAlpha = 1;
      }
    }

    // ---- readouts: energy captured (Parseval) and the series
    let got = C.dc * C.dc;
    for (let k = 1; k <= n; k++) got += (C.a[k] * C.a[k] + C.b[k] * C.b[k]) / 2;
    $('energy').textContent = (100 * Math.min(got / C.power, 1)).toFixed(1) + '%';
    $('note').textContent = S.note;
    if (window.katex) katex.render(S.tex, $('formula'), { displayMode: true, throwOnError: false });
  }

  document.querySelectorAll('[data-sig]').forEach((b) => b.addEventListener('click', () => {
    current = b.dataset.sig;
    document.querySelectorAll('[data-sig]').forEach((x) => x.classList.toggle('on', x === b));
    render();
  }));
  $('nh').addEventListener('input', render);
  $('comps').addEventListener('change', render);
  $('reset').addEventListener('click', () => { $('nh').value = 1; render(); });
  $('play').addEventListener('click', () => {      // add harmonics one by one
    let k = 1; $('nh').value = 1; render();
    const id = setInterval(() => { k++; $('nh').value = k; render(); if (k >= 15) clearInterval(id); }, 450);
  });
  window.addEventListener('resize', render);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', render);
  window.addEventListener('load', render);           // re-render once KaTeX has loaded
  render();
})();
