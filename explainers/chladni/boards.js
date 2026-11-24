// Three small boards for the Chladni explainer, each building one idea before its formula:
// (1) a grain on a shaking plate, (2) echoes that line up only for waves that fit, (3) a mode pushed in and out of time.
// Animation runs only while a board is on screen and motion is on (the footer switch sets html.still).
(function () {
  const TAU = Math.PI * 2, root = document.documentElement;
  const css = (n, d) => getComputedStyle(root).getPropertyValue(n).trim() || d;
  const col = () => ({ ink: css('--ink', '#f0efec'), muted: css('--muted', '#9a9891'), line: css('--line', '#2b2b28'),
    orange: '#d95926', blue: css('--blue', '#3987e5'), grain: '#e9dcc0', plate: '#9aa2ab' });
  const still = () => root.classList.contains('still') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  function fit(c) {
    const d = Math.min(devicePixelRatio || 1, 2), w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.round(w * d) || c.height !== Math.round(h * d)) { c.width = Math.round(w * d); c.height = Math.round(h * d); }
    const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, w, h); return [g, w, h];
  }
  function loop(el, frame) {                                   // run frame(t) while visible and moving; one still frame otherwise
    let on = false, t0 = performance.now(), raf = 0;
    const tick = (now) => { frame((now - t0) / 1000); if (on && !still()) raf = requestAnimationFrame(tick); };
    const start = () => { cancelAnimationFrame(raf); if (on && !still()) raf = requestAnimationFrame(tick); else frame(null); };
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => es.forEach((e) => { on = e.isIntersecting; start(); }), { threshold: 0.05 }).observe(el);
    else { on = true; start(); }
    new MutationObserver(start).observe(root, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return start;
  }
  const label = (g, s, x, y, c, al = 'left', size = 12) => { g.fillStyle = c; g.font = `${size}px "JetBrains Mono", monospace`; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };

  // ---------------------------------------------------------------- 1. a grain on a shaking plate
  {
    const cv = document.getElementById('jump'), sl = document.getElementById('jg'), out = document.getElementById('jgv'), rd = document.getElementById('jr');
    if (cv) {
      const OM = TAU * 0.5, A = 1;                               // one cycle every 2 s on screen; plate swing in plate units
      let sim = null;
      const reset = () => { sim = { y: A, v: 0, on: true, last: null, hist: [] }; };
      const peak = () => +sl.value;                              // peak plate acceleration in g
      const step = (t) => {
        const gv = A * OM * OM / peak(), yp = A * Math.cos(OM * t), vp = -A * OM * Math.sin(OM * t), ap = -A * OM * OM * Math.cos(OM * t);
        const dt = sim.last == null ? 0 : Math.min(0.05, t - sim.last); sim.last = t;
        if (sim.on) { sim.y = yp; sim.v = vp; if (ap < -gv) sim.on = false; }
        else { sim.v -= gv * dt; sim.y += sim.v * dt; if (sim.y <= yp) { sim.y = yp; sim.v = vp; sim.on = true; } }
        sim.hist.push([t, ap / gv]); while (sim.hist.length && sim.hist[0][0] < t - 4) sim.hist.shift();
        return yp;
      };
      const draw = (t) => {
        const C = col(), [g, w, h] = fit(cv);
        let yp;
        if (t == null) {                                       // a still: four seconds computed at once, the grain where it is at the end
          reset(); for (let s = 0; s <= 4; s += 1 / 60) yp = step(s); t = 4; sim.still = true;
        } else {
          if (sim.still || (sim.last != null && t < sim.last)) reset();   // live again: start a fresh trace
          yp = step(t);
        }
        const lw = Math.min(w * 0.34, 260), cx = lw / 2, mid = h * 0.58, sc = h * 0.13;
        g.fillStyle = C.plate; g.fillRect(cx - lw * 0.38, mid - yp * sc - 5, lw * 0.76, 10);
        const gy = mid - sim.y * sc - 5 - 9;
        g.fillStyle = C.grain; g.beginPath(); g.arc(cx, gy, 8, 0, TAU); g.fill();
        if (!sim.on) { g.strokeStyle = C.orange; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, gy, 14, 0, TAU); g.stroke(); }
        // the plate's acceleration in g, the last four seconds
        const x0 = lw + 44, x1 = w - 10, Y = (a) => h / 2 - a / 4.4 * (h / 2 - 14);
        g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, Y(0)); g.lineTo(x1, Y(0)); g.moveTo(x0, 8); g.lineTo(x0, h - 8); g.stroke();
        g.setLineDash([6, 5]); g.strokeStyle = C.ink; g.beginPath(); g.moveTo(x0, Y(-1)); g.lineTo(x1, Y(-1)); g.stroke(); g.setLineDash([]);
        label(g, '−g', x0 - 8, Y(-1), C.ink, 'right'); label(g, 'a', x0 - 8, 14, C.muted, 'right');
        const X = (s) => x1 - (t - s) / 4 * (x1 - x0);
        g.lineWidth = 2.4;
        for (let i = 1; i < sim.hist.length; i++) {
          const [s0, a0] = sim.hist[i - 1], [s1, a1] = sim.hist[i];
          g.strokeStyle = a1 < -1 ? C.orange : C.ink; g.beginPath(); g.moveTo(X(s0), Y(a0)); g.lineTo(X(s1), Y(a1)); g.stroke();
        }
        out.textContent = `${peak().toFixed(1)} g`;
        rd.textContent = peak() > 1 ? 'the plate falls away faster than g: the grain flies' : 'never faster than g: the grain rides along';
      };
      reset();
      const restart = loop(cv, draw);
      sl.addEventListener('input', () => { reset(); restart(); });
      addEventListener('resize', () => restart());
    }
  }

  // ---------------------------------------------------------------- 2. echoes that line up
  {
    const cv = document.getElementById('echo'), sl = document.getElementById('ek'), out = document.getElementById('ekv'), rd = document.getElementById('er');
    if (cv) {
      const R = 0.82, N = 8, SMAX = (1 - R ** N) / (1 - R);
      const pile = (k) => { let re = 0, im = 0; for (let n = 0; n < N; n++) { re += R ** n * Math.cos(TAU * k * n); im += R ** n * Math.sin(TAU * k * n); } return Math.hypot(re, im) / SMAX; };
      const draw = () => {
        const C = col(), [g, w, h] = fit(cv), k = +sl.value, x0 = 34, x1 = w - 34, ys = h * 0.3, amp = h * 0.11;
        const Xs = (u) => x0 + (x1 - x0) * u;
        g.strokeStyle = C.muted; g.lineWidth = 5; [x0, x1].forEach((x) => { g.beginPath(); g.moveTo(x, ys - amp * 1.7); g.lineTo(x, ys + amp * 1.7); g.stroke(); });
        for (let n = 0; n < N; n++) {                           // each round trip leaves another copy, shifted by 2kL
          g.strokeStyle = C.orange; g.globalAlpha = 0.5; g.lineWidth = 1.5; g.beginPath();
          for (let i = 0; i <= 200; i++) { const u = i / 200, y = ys - amp * R ** n * Math.sin(Math.PI * k * u + TAU * k * n); i ? g.lineTo(Xs(u), y) : g.moveTo(Xs(u), y); }
          g.stroke();
        }
        g.globalAlpha = 1; g.strokeStyle = C.ink; g.lineWidth = 3.5; g.beginPath();
        for (let i = 0; i <= 240; i++) {
          const u = i / 240; let s = 0; for (let n = 0; n < N; n++) s += R ** n * Math.sin(Math.PI * k * u + TAU * k * n);
          const y = ys - amp * 1.6 * s / SMAX; i ? g.lineTo(Xs(u), y) : g.moveTo(Xs(u), y);
        }
        g.stroke();
        // the comb: how big the pile gets for every wavelength
        const cy = h - 22, ch = h * 0.3, K = (kk) => x0 + (x1 - x0) * (kk - 0.5) / 4;
        g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, cy); g.lineTo(x1, cy); g.stroke();
        g.strokeStyle = C.orange; g.lineWidth = 2; g.beginPath();
        for (let i = 0; i <= 800; i++) { const kk = 0.5 + 4 * i / 800, y = cy - ch * pile(kk); i ? g.lineTo(K(kk), y) : g.moveTo(K(kk), y); }
        g.stroke();
        [1, 2, 3, 4].forEach((m) => label(g, `m=${m}`, K(m), cy + 12, C.muted, 'center', 11));
        g.fillStyle = C.ink; g.beginPath(); g.arc(K(k), cy - ch * pile(k), 6, 0, TAU); g.fill();
        out.textContent = `${k.toFixed(2)} half-waves`;
        const p = pile(k), m = Math.round(k);
        rd.textContent = Math.abs(k - m) < 0.03 ? `it fits (m = ${m}): every echo adds, ${Math.round(100 * p)}% of the most` : `out of step: the echoes add to only ${Math.round(100 * p)}%`;
      };
      sl.addEventListener('input', draw); addEventListener('resize', draw);
      new MutationObserver(draw).observe(root, { attributes: true, attributeFilter: ['class', 'data-theme'] });
      draw();
    }
  }

  // ---------------------------------------------------------------- 3. pushing a mode in and out of time
  {
    const cv = document.getElementById('push'), sl = document.getElementById('pr'), out = document.getElementById('prv'), rd = document.getElementById('prr');
    if (cv) {
      const Z = 0.08, WN = TAU * 0.6;                            // the board's damping (the film's plate: 0.005) and natural rate on screen
      const X = (r) => 1 / Math.sqrt((1 - r * r) ** 2 + (2 * Z * r) ** 2);
      const draw = (t) => {
        const C = col(), [g, w, h] = fit(cv), r = +sl.value, ph = Math.atan2(2 * Z * r, 1 - r * r), tt = t == null ? 0.4 : t;
        const lw = w < 520 ? w * 0.5 : Math.min(w * 0.4, 300), wall = 16, rest = lw * 0.66, mid = h * 0.5;
        const sc = Math.min(lw * 0.04, (rest - 22 - wall - 38) / (1 / (2 * Z) + 0.2));   // full swing at resonance clears the damper
        const q = X(r) * Math.sin(r * WN * tt - ph), f = Math.sin(r * WN * tt), xm = rest + sc * q;
        g.strokeStyle = C.muted; g.lineWidth = 5; g.beginPath(); g.moveTo(wall, mid - 46); g.lineTo(wall, mid + 46); g.stroke();
        g.strokeStyle = C.ink; g.lineWidth = 2.2; g.beginPath(); g.moveTo(wall, mid - 16);   // the spring
        for (let i = 1; i < 12; i++) g.lineTo(wall + (xm - 22 - wall) * i / 12, mid - 16 + (i % 2 ? 8 : -8));
        g.lineTo(xm - 22, mid - 16); g.stroke();
        g.beginPath(); g.moveTo(wall, mid + 16); g.lineTo(wall + 8, mid + 16); g.stroke();           // the damper
        g.strokeRect(wall + 8, mid + 8, 24, 16); g.beginPath(); g.moveTo(wall + 22, mid + 16); g.lineTo(xm - 22, mid + 16); g.stroke();
        g.fillStyle = C.blue; g.globalAlpha = 0.3; g.fillRect(xm - 22, mid - 22, 44, 44); g.globalAlpha = 1;
        g.strokeStyle = C.blue; g.lineWidth = 2.5; g.strokeRect(xm - 22, mid - 22, 44, 44);
        if (Math.abs(f) > 0.06) {                                // the push
          const x2 = xm + 22 + 34 * f; g.strokeStyle = C.orange; g.fillStyle = C.orange; g.lineWidth = 3;
          g.beginPath(); g.moveTo(xm + 22, mid); g.lineTo(x2, mid); g.stroke();
          g.beginPath(); g.moveTo(x2, mid); g.lineTo(x2 - 8 * Math.sign(f), mid - 6); g.lineTo(x2 - 8 * Math.sign(f), mid + 6); g.fill();
        }
        // amplitude against push rate
        const x0 = lw + 50, x1 = w - 12, y0 = h - 22, y1 = 12, Xr = (rr) => x0 + (x1 - x0) * rr / 2, Ya = (a) => y0 - (y0 - y1) * Math.min(a, 7) / 7;
        g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
        g.strokeStyle = C.orange; g.lineWidth = 2.2; g.beginPath();
        for (let i = 1; i <= 400; i++) { const rr = 2 * i / 400; i > 1 ? g.lineTo(Xr(rr), Ya(X(rr))) : g.moveTo(Xr(rr), Ya(X(rr))); }
        g.stroke();
        label(g, 'ωn', Xr(1), y0 + 12, C.ink, 'center'); label(g, '|Q|', x0 - 8, y1 + 4, C.muted, 'right');
        g.fillStyle = C.ink; g.beginPath(); g.arc(Xr(r), Ya(X(r)), 6, 0, TAU); g.fill();
        out.textContent = `${r.toFixed(2)} × ωn`;
        rd.textContent = `${X(r).toFixed(1)} × the push alone` + (r < 0.7 ? ': it just follows' : r > 1.3 ? ': too fast, it can’t keep up' : ': in time, every push adds');
      };
      const restart = loop(cv, draw);
      sl.addEventListener('input', () => restart()); addEventListener('resize', () => restart());
    }
  }
})();
