/* Nodal site motion. Everything here is an enhancement: pages read fine without it.
   - cards arrive in order when they scroll into view
   - the home hero: a signal peeled into its harmonic lanes, then seen from the side as a spectrum
   - sparks: small drawings on cards that move only while you hover or focus the card
   - Wiggle, the series mascot, whose eyes follow the pointer
   - a reading-progress line on long pages
   Motion respects prefers-reduced-motion (static frames), pauses off screen, and has a pause button. */
(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;
  const css = (n) => getComputedStyle(root).getPropertyValue(n).trim();
  const C = { ink: css('--ink') || '#f0efec', ink2: css('--ink-2') || '#c3c2b7', muted: css('--muted') || '#9a9891',
    line: css('--line') || '#2b2b28', blue: css('--blue') || '#3987e5', orange: '#d95926', good: css('--good') || '#3cc46f',
    bad: css('--bad') || '#f0644d', bg: css('--bg') || '#0c0c0b' };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  // critically damped arrival (zeta = 1): the step response of a mass on a spring, no overshoot
  const arrive = (p) => { if (p >= 1) return 1; const t = p * 7.43; return 1 - Math.exp(-t) * (1 + t); };
  const inout = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  function fit(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }
  const onScreen = (el, cb) => { if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver((es) => es.forEach((e) => cb(e.isIntersecting)), { threshold: 0.05 }).observe(el); };

  // ---------------------------------------------------------------- cards arrive in order
  const cards = document.querySelectorAll('.cards > *');
  if (REDUCE || !('IntersectionObserver' in window)) cards.forEach((c) => c.classList.add('in'));
  else {
    const io = new IntersectionObserver((es) => {
      let i = 0;
      es.forEach((e) => { if (e.isIntersecting) { e.target.style.setProperty('--i', i++); e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    cards.forEach((c) => io.observe(c));
    setTimeout(() => cards.forEach((c) => c.classList.add('in')), 2500);     // never leave anything hidden
  }

  // ---------------------------------------------------------------- reading progress
  const bar = document.querySelector('.progress-bar');
  if (bar) {
    const upd = () => { const max = root.scrollHeight - innerHeight; bar.style.transform = `scaleX(${max > 0 ? clamp(scrollY / max) : 0})`; };
    addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
  }

  // ---------------------------------------------------------------- glow line helper
  function line(ctx, pts, color, width, alpha = 1, glow = true, cap = 'round') {
    if (pts.length < 2) return;
    ctx.lineJoin = 'round'; ctx.lineCap = cap; ctx.strokeStyle = color;
    const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); };
    if (glow) { ctx.globalAlpha = 0.12 * alpha; ctx.lineWidth = width * 3.4; path(); ctx.stroke(); }
    ctx.globalAlpha = alpha; ctx.lineWidth = width; path(); ctx.stroke(); ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- the hero lane world
  // A machine signal (truth block below) drawn in a 3D world: time runs along x, each harmonic
  // has its own lane going back, amplitude is up. Peel the signal into its lanes; from the side
  // the lane heights are the spectrum. Same picture as the videos.
  const stage = document.querySelector('#stage');
  if (stage) {
    const AMP = [0.55, 0.30, 0.12, 0.20, 0.15, 0.10, 0.06, 0.04];          // 1X..8X of the demo signal
    const PH = [0.0, 0.9, 2.1, 0.4, 1.7, 2.9, 0.8, 2.2];
    const K = AMP.length, NP = 220, XL = 6.4, DY = 0.62, FLOOR = -1.45, BAR_X = XL / 2 + 0.5, BAR_S = 2.0;
    const ts = Array.from({ length: NP }, (_, i) => i / (NP - 1));
    const lane = AMP.map((a, k) => ts.map((t) => a * Math.sin(TAU * (k + 1) * 2 * t + PH[k])));   // two turns shown
    const laneY = (k) => (k - K / 2) * DY;                                 // k = 0 is the front, 1..K the lanes
    const VIEW = { front: [2, 0], persp: [16, 44], side: [3, 88] };         // elevation, azimuth (degrees)
    const LOOP = 18;
    let playing = !REDUCE, visible = true, t0 = performance.now(), tHold = REDUCE ? 7.5 : 0, px = 0, pxT = 0;
    const btn = document.querySelector('#stage-toggle'), cap = document.querySelector('#stage-cap');
    if (btn) btn.addEventListener('click', () => {
      playing = !playing; btn.textContent = playing ? 'Pause' : 'Play'; btn.setAttribute('aria-pressed', String(!playing));
      if (playing) { t0 = performance.now() - tHold * 1000; requestAnimationFrame(frame); }
    });
    if (btn && REDUCE) { btn.textContent = 'Play'; btn.setAttribute('aria-pressed', 'true'); }
    stage.addEventListener('pointermove', (e) => { const r = stage.getBoundingClientRect(); pxT = ((e.clientX - r.left) / r.width - 0.5) * 2; });
    stage.addEventListener('pointerleave', () => { pxT = 0; });
    onScreen(stage, (v) => { const was = visible; visible = v; if (v && !was && playing) { t0 = performance.now() - tHold * 1000; requestAnimationFrame(frame); } });

    function state(t) {
      // timeline (seconds): draw the signal, peel into lanes, hold, turn to the side (spectrum), come back, rebuild
      const draw = arrive(seg(t, 0.2, 2.0));
      const peel = (k) => arrive(seg(t, 2.4 + 0.22 * k, 4.2 + 0.22 * k)) * (1 - arrive(seg(t, 14.6 + 0.1 * (K - k), 16.2 + 0.1 * (K - k))));
      const toP = inout(seg(t, 2.0, 4.4)), toS = inout(seg(t, 8.2, 10.2)), backP = inout(seg(t, 12.2, 14.0)), toF = inout(seg(t, 14.6, 17.0));
      const mix = (a, b, u) => a + (b - a) * u;
      let el = mix(VIEW.front[0], VIEW.persp[0], toP), az = mix(VIEW.front[1], VIEW.persp[1], toP);
      el = mix(el, VIEW.side[0], toS); az = mix(az, VIEW.side[1], toS);
      el = mix(el, VIEW.persp[0], backP); az = mix(az, VIEW.persp[1], backP);
      el = mix(el, VIEW.front[0], toF); az = mix(az, VIEW.front[1], toF);
      const sideness = toS * (1 - backP), fade = 1 - seg(t, 17.2, 17.9);
      const label = t < 2.2 ? 'One signal' : t < 8.2 ? 'Its harmonics, lane by lane' : t < 12.4 ? 'From the side: the spectrum' : 'Back together';
      return { draw, peel, el, az, sideness, fade, label };
    }

    function render(t) {
      const { ctx, w, h } = fit(stage);
      ctx.clearRect(0, 0, w, h);
      const S = state(t);
      px += (pxT - px) * 0.08;
      const e = (S.el * Math.PI) / 180, th = ((S.az + px * 5 * (1 - S.sideness)) * Math.PI) / 180;
      // fit the world's bounding box to the canvas at every view (no hand-tuned zooms)
      const raw = (x, y, z) => { const x1 = x * Math.cos(th) + y * Math.sin(th), y1 = -x * Math.sin(th) + y * Math.cos(th);
        const s = 18 / (18 + y1 * Math.cos(e) - z * Math.sin(e)); return [x1 * s, (z * Math.cos(e) + y1 * Math.sin(e)) * s]; };
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const x of [-XL / 2 - 0.1, BAR_X + 0.6]) for (const y of [laneY(0) - 0.3, laneY(K) + 0.3]) for (const z of [FLOOR, 1.5]) {
        const p = raw(x, y, z); x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      const zoom = 1.0 * Math.min(w / (x1 - x0), (h - 34) / (y1 - y0));
      const ox = w / 2 - zoom * (x0 + x1) / 2, oy = (h - 34) / 2 + zoom * (y0 + y1) / 2;
      const P = (x, y, z) => { const p = raw(x, y, z); return [ox + p[0] * zoom, oy - p[1] * zoom]; };
      const wx = (t_) => (t_ - 0.5) * XL;
      const A = S.fade;
      // floor grid
      for (let k = 0; k <= K; k++) line(ctx, [P(wx(0), laneY(k), FLOOR), P(wx(1), laneY(k), FLOOR)], C.line, 1, 0.9 * A, false);
      for (let i = 0; i <= 8; i++) line(ctx, [P(wx(i / 8), laneY(0) - 0.25, FLOOR), P(wx(i / 8), laneY(K) + 0.25, FLOOR)], C.line, 1, 0.9 * A, false);
      line(ctx, [P(wx(0), laneY(0), 0), P(wx(1) + 0.15, laneY(0), 0)], '#5a5955', 1.4, A, false);
      line(ctx, [P(BAR_X, laneY(0) - 0.2, 0), P(BAR_X, laneY(K) + 0.25, 0)], '#5a5955', 1.4, A, false);
      // lanes and bars (back to front so nearer lanes draw over farther ones)
      const dim = 1 - 0.8 * S.sideness;
      for (let k = K; k >= 1; k--) {
        const m = S.peel(k - 1);
        if (m < 0.004) continue;
        const y = laneY(0) + (laneY(k) - laneY(0)) * m;
        line(ctx, ts.map((t_, i) => P(wx(t_), y, lane[k - 1][i])), k === 1 ? C.blue : C.orange, 2.2, Math.min(1, 3 * m) * dim * A);
        const hgt = AMP[k - 1] * m * BAR_S;
        line(ctx, [P(BAR_X, laneY(k), 0), P(BAR_X, laneY(k), hgt)], k === 1 ? C.blue : C.orange, 9, A, false, 'butt');
        if (m > 0.6) { const p = P(BAR_X + 0.42, laneY(k), 0); ctx.globalAlpha = (m - 0.6) / 0.4 * A * (k % 2 === 1 || S.sideness > 0.6 ? 1 : 0);
          ctx.fillStyle = C.muted; ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(k + 'X', p[0], p[1] + 10); ctx.globalAlpha = 1; }
      }
      // the signal in front: the sum of whatever has not been peeled away yet
      const n = Math.max(2, Math.round(NP * S.draw));
      const front = [];
      for (let i = 0; i < n; i++) { let z = 0; for (let k = 0; k < K; k++) z += lane[k][i] * (1 - S.peel(k)); front.push(P(wx(ts[i]), laneY(0), z)); }
      line(ctx, front, C.ink, 2.8, dim * A);
      if (cap && cap.textContent !== S.label) cap.textContent = S.label;
    }

    function frame(now) {
      if (!playing || !visible) return;
      tHold = ((now - t0) / 1000) % LOOP;
      render(tHold);
      requestAnimationFrame(frame);
    }
    addEventListener('resize', () => render(tHold));
    render(tHold);
    if (playing) requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- sparks: card drawings, alive only on hover / focus
  const SPARK = {
    sine: (x, t) => [[C.blue, 0.75 * Math.sin(TAU * (2 * x - t))]],
    sum: (x, t) => { const a = 0.5 * Math.sin(TAU * (2 * x - t)), b = 0.28 * Math.sin(TAU * (4 * x - 2 * t) + 0.9), c = 0.16 * Math.sin(TAU * (6 * x - 3 * t));
      return [[C.orange, b, 0.5], [C.blue, a, 0.5], [C.ink, a + b + c]]; },
    square: (x, t) => { const N = 1 + 2 * Math.floor((0.5 + 0.5 * Math.sin(TAU * t * 0.5)) * 7); let s = 0;
      for (let k = 1; k <= N; k += 2) s += Math.sin(TAU * k * 2 * x) / k; return [[C.ink, 0.72 * s * 4 / Math.PI * 0.8]]; },
    phase: (x, t) => { let a = 0, b = 0; const ph = t * TAU * 0.25; for (let k = 1; k <= 9; k += 2) { a += Math.sin(TAU * k * 2 * x) / k; b += Math.sin(TAU * k * 2 * x + ph * k) / k; }
      return [[C.muted, 0.6 * a, 0.45], [C.blue, 0.6 * b]]; },
    leak: (x, t) => { const f = 4 + 0.5 * (0.5 - 0.5 * Math.cos(TAU * t * 0.5)); return [[C.ink, 0.7 * Math.cos(TAU * f * x)]]; },
  };
  function sparkBars(ctx, w, h, t, kind) {
    // spectrum bars for kinds that are about bins: leakage (4 -> 4.5 cycles) or samples (the winding average)
    const N = 12, f = 4 + 0.5 * (0.5 - 0.5 * Math.cos(TAU * t * 0.5));
    for (let k = 1; k <= N; k++) {
      const d = k - f, a = Math.abs(d) < 1e-6 ? 1 : Math.abs(Math.sin(Math.PI * d) / (Math.PI * d));
      const x = w * (0.08 + 0.84 * (k - 0.5) / N), bh = a * h * 0.7;
      ctx.fillStyle = Math.abs(d) < 0.75 ? C.blue : C.orange; ctx.globalAlpha = 0.95;
      ctx.fillRect(x - 3, h * 0.86 - bh, 6, bh);
    }
    ctx.globalAlpha = 1;
  }
  document.querySelectorAll('canvas.spark').forEach((cv) => {
    const kind = cv.dataset.spark || 'sine', card = cv.closest('.card') || cv;
    let on = false, t = 0.35, last = 0;
    const draw = () => {
      const { ctx, w, h } = fit(cv);
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
      if (kind === 'bins') { sparkBars(ctx, w, h, t, kind); return; }
      if (kind === 'samples') {
        const f = (x) => 0.6 * Math.cos(TAU * x) + 0.8 * Math.sin(TAU * x) + 0.5 * Math.cos(2 * TAU * x);
        const pts = []; for (let i = 0; i <= 120; i++) pts.push([w * (0.06 + 0.88 * i / 120), h / 2 - f(i / 120) * h * 0.24]);
        line(ctx, pts, C.muted, 1.4, 0.7, false);
        const shown = 1 + Math.floor((t * 3) % 9);
        for (let k = 0; k < 8; k++) { if (k >= shown && on) continue; const x = w * (0.06 + 0.88 * k / 8), y = h / 2 - f(k / 8) * h * 0.24;
          ctx.strokeStyle = C.blue; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, h / 2); ctx.lineTo(x, y); ctx.stroke();
          ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fill(); }
        return;
      }
      if (kind === 'alias') {
        const fast = [], slow = []; for (let i = 0; i <= 240; i++) { const x = i / 240; fast.push([w * (0.05 + 0.9 * x), h / 2 - 0.62 * Math.sin(TAU * 11 * x) * h * 0.36]); slow.push([w * (0.05 + 0.9 * x), h / 2 + 0.62 * Math.sin(TAU * x) * h * 0.36]); }
        line(ctx, fast, C.muted, 1.2, 0.55, false);
        const u = on ? clamp((t % 4) / 2.4) : 1;
        line(ctx, slow.slice(0, Math.max(2, Math.round(slow.length * u))), C.bad, 2.2, 1);
        for (let n = 0; n <= 12; n++) { if (n / 12 > u + 0.001) break; const x = n / 12; ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(w * (0.05 + 0.9 * x), h / 2 - 0.62 * Math.sin(TAU * 11 * x) * h * 0.36, 3, 0, TAU); ctx.fill(); }
        return;
      }
      const fn = SPARK[kind] || SPARK.sine, layers = fn(0, t).length;
      for (let L = 0; L < layers; L++) {
        const pts = []; let col = C.ink, al = 1;
        for (let i = 0; i <= 160; i++) { const x = i / 160, r = fn(x, t)[L]; col = r[0]; al = r[2] ?? 1; pts.push([w * x, h / 2 - r[1] * h * 0.36]); }
        line(ctx, pts, col, L === layers - 1 ? 2.2 : 1.4, al, L === layers - 1);
      }
    };
    const loop = (now) => { if (!on) return; t += Math.min(0.05, (now - last) / 1000) * 0.5; last = now; draw(); requestAnimationFrame(loop); };
    const start = () => { if (on || REDUCE) return; on = true; last = performance.now(); requestAnimationFrame(loop); };
    const stop = () => { on = false; draw(); };
    card.addEventListener('pointerenter', start); card.addEventListener('pointerleave', stop);
    card.addEventListener('focusin', start); card.addEventListener('focusout', stop);
    addEventListener('resize', draw);
    draw();
  });

  // ---------------------------------------------------------------- Wiggle, the mascot
  document.querySelectorAll('canvas.wiggle').forEach((cv) => {
    let gx = 0.6, gy = -0.2, vis = true, t = 0, last = performance.now(), hop = 0;
    addEventListener('pointermove', (e) => { const r = cv.getBoundingClientRect(), dx = e.clientX - (r.left + r.width * 0.35), dy = e.clientY - (r.top + r.height * 0.35), d = Math.hypot(dx, dy) || 1; gx = dx / d; gy = dy / d; }, { passive: true });
    cv.addEventListener('pointerenter', () => { hop = 1; });
    const draw = () => {
      const { ctx, w, h } = fit(cv);
      ctx.clearRect(0, 0, w, h);
      const sc = Math.min(w, h * 1.25) * 0.72, bx = w / 2 - sc / 2, by = h * 0.56, A = 0.3 * sc;
      hop *= 0.92;
      const Y = (x) => by - (Math.sin(TAU * x) * A + 0 + hop * 0.12 * sc * Math.sin(Math.PI * x));
      const pts = []; for (let i = 0; i <= 80; i++) pts.push([bx + sc * i / 80, Y(i / 80)]);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const path = () => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); };
      ctx.strokeStyle = C.blue; ctx.globalAlpha = 0.14; ctx.lineWidth = sc * 0.2; path(); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = sc * 0.085; path(); ctx.stroke();
      const blink = !REDUCE && ((t + 0.7) % 3.6) < 0.13, r = sc * 0.062;
      [0.15, 0.35].forEach((xe) => {
        const ex = bx + sc * xe, ey = Y(xe) - sc * 0.115;
        if (blink) { ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex - r, ey); ctx.lineTo(ex + r, ey); ctx.stroke(); return; }
        ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(ex, ey, r, 0, TAU); ctx.fill();
        ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(ex + gx * r * 0.45, ey + gy * r * 0.45, r * 0.45, 0, TAU); ctx.fill();
      });
      const mx = bx + sc * 0.25, my = Y(0.25) + sc * 0.13;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = -8; i <= 8; i++) { const a = i / 8, x = mx + a * sc * 0.06, y = my - (1 - a * a) * sc * -0.035; i === -8 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
    };
    const loop = (now) => { t += Math.min(0.05, (now - last) / 1000); last = now; if (vis) draw(); if (!REDUCE) requestAnimationFrame(loop); };
    onScreen(cv, (v) => { vis = v; });
    addEventListener('resize', draw);
    draw();
    if (!REDUCE) requestAnimationFrame(loop);
  });
})();
