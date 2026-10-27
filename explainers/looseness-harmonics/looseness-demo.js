// Looseness demo: a sine response limited by stops (clipping) and its order spectrum.
(function () {
  const REV = 16, SPR = 256, N = REV * SPR;   // 16 revs → 1/16-order resolution, exact bins for 0.5X
  const MAXORD = 8;
  const $ = (id) => document.getElementById(id);
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const up = $('up'), lo = $('lo'), alt = $('alt');

  const presets = {
    tight: { up: 1, lo: 1, alt: false },
    sym:   { up: 0.6, lo: 0.6, alt: false },
    one:   { up: 0.6, lo: 1, alt: false },
    alt:   { up: 0.6, lo: 1, alt: true },
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

  function setup(c) {
    const dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }

  function signal() {
    const U = +up.value, L = +lo.value, A = alt.checked;
    const free = new Float64Array(N), y = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const s = Math.sin(2 * Math.PI * i / SPR);
      free[i] = s;
      const hit = !A || Math.floor(i / SPR) % 2 === 0;
      y[i] = hit ? Math.min(U, Math.max(-L, s)) : s;
    }
    return { free, y };
  }

  function render() {
    $('upv').textContent = (+up.value).toFixed(2);
    $('lov').textContent = (-lo.value).toFixed(2);
    const { free, y } = signal();
    const pad = { l: 8, r: 8, t: 10, b: 22 };

    // Time view: first 4 revolutions.
    {
      const { ctx, w, h } = setup($('time'));
      const n = 4 * SPR, mid = pad.t + (h - pad.t - pad.b) / 2, amp = (h - pad.t - pad.b) / 2 * 0.9;
      const X = (i) => pad.l + i / (n - 1) * (w - pad.l - pad.r);
      ctx.strokeStyle = css('--line'); ctx.lineWidth = 1;
      for (let r = 1; r < 4; r++) { ctx.beginPath(); ctx.moveTo(X(r * SPR), pad.t); ctx.lineTo(X(r * SPR), h - pad.b); ctx.stroke(); }
      ctx.fillStyle = css('--muted'); ctx.font = '11px ' + css('--mono'); ctx.textAlign = 'center';
      for (let r = 0; r < 4; r++) ctx.fillText('rev ' + (r + 1), X(r * SPR + SPR / 2), h - 5);
      [[free, css('--muted'), 1, [4, 4]], [y, css('--accent'), 2, []]].forEach(([s, col, lw, dash]) => {
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash); ctx.beginPath();
        for (let i = 0; i < n; i++) { const Y = mid - s[i] * amp; i ? ctx.lineTo(X(i), Y) : ctx.moveTo(X(i), Y); }
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    // Order spectrum (exact bins: whole number of revolutions, no window needed).
    {
      const re = Float64Array.from(y), im = new Float64Array(N);
      fft(re, im);
      const kMax = MAXORD * REV;
      const { ctx, w, h } = setup($('freq'));
      const X = (o) => pad.l + 10 + (o / MAXORD) * (w - pad.l - pad.r - 20);
      const H = h - pad.t - pad.b;
      // log-ish scale so small harmonics stay visible: dB relative to 1, floor at -60 dB
      const Y = (a) => { const db = Math.max(-60, 20 * Math.log10(Math.max(a, 1e-9))); return h - pad.b - (db + 60) / 60 * H; };
      ctx.strokeStyle = css('--line'); ctx.lineWidth = 1;
      ctx.fillStyle = css('--muted'); ctx.font = '11px ' + css('--mono'); ctx.textAlign = 'center';
      for (let o = 1; o <= MAXORD; o++) {
        ctx.beginPath(); ctx.moveTo(X(o), pad.t); ctx.lineTo(X(o), h - pad.b); ctx.stroke();
        ctx.fillText(o + 'X', X(o), h - 5);
      }
      ctx.textAlign = 'left'; ctx.fillText('0 dB', pad.l, pad.t + 10); ctx.fillText('−60 dB', pad.l, h - pad.b - 4);
      for (let k = 1; k <= kMax; k++) {
        const a = 2 * Math.hypot(re[k], im[k]) / N;
        if (a < 1e-3) continue;
        const o = k / REV;
        ctx.strokeStyle = Math.abs(o - 1) < 1e-9 ? css('--accent') : css('--accent-2');
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(X(o), h - pad.b); ctx.lineTo(X(o), Y(a)); ctx.stroke();
      }
    }
  }

  function apply(name) {
    const p = presets[name];
    up.value = p.up; lo.value = p.lo; alt.checked = p.alt;
    document.querySelectorAll('[data-preset]').forEach((b) => b.classList.toggle('on', b.dataset.preset === name));
    render();
  }
  function clearPreset() { document.querySelectorAll('[data-preset]').forEach((b) => b.classList.remove('on')); render(); }

  document.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => apply(b.dataset.preset)));
  $('reset').addEventListener('click', () => apply('tight'));
  [up, lo].forEach((el) => el.addEventListener('input', clearPreset));
  alt.addEventListener('change', clearPreset);
  window.addEventListener('resize', render);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', render);
  render();
})();
