/* Nodal plate: sand on a vibrating plate settles on the nodal lines.
   The physics is the classic Chladni experiment. Each grain is kicked in proportion to how much the
   plate moves under it, |z(x, y)|, so sand is thrown off the antinodes and comes to rest where the
   plate doesn't move: the nodal lines. Mode shapes are the classic approximation for a free plate,
     z = cos(n pi x) cos(m pi y) + s cos(m pi x) cos(n pi y),   x, y in [0, 1].
   Usage: <canvas data-plate data-modes="2,4,1 3,5,-1" data-grains="0.012" data-probe data-cycle="8">
     data-modes  list of n,m,s triples (space separated)
     data-grains grains per CSS pixel of area (capped)
     data-probe  show the amplitude probe under the pointer
     data-cycle  seconds between automatic mode changes (0 = never)
   Controls: an element with [data-plate-next] changes mode, [data-plate-pause] pauses,
   [data-plate-label] shows the current mode. Reduced motion: the pattern is computed settled
   and drawn still; clicking still changes it. Pauses off screen and in background tabs. */
(() => {
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = (n, d) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || d;
  const G = 256;                                  // lookup grid for |z|: G x G
  const KICK = 0.0115;                            // step size at an antinode, in plate widths
  const SUB = 3;                                  // physics substeps per frame

  // xorshift32: fast seeded randomness (pattern is repeatable)
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  function table(md) {
    const t = new Float32Array(G * G), { n, m, s } = md;
    let mx = 0;
    for (let j = 0; j < G; j++) {
      const y = (j + 0.5) / G;
      for (let i = 0; i < G; i++) {
        const x = (i + 0.5) / G;
        const z = Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y) + s * Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y);
        t[j * G + i] = z; mx = Math.max(mx, Math.abs(z));
      }
    }
    for (let k = 0; k < t.length; k++) t[k] /= mx || 1;   // normalise so the largest motion is 1
    return t;
  }

  function Plate(canvas) {
    const host = canvas.closest('[data-plate-host]') || canvas.parentElement;
    const modes = (canvas.dataset.modes || '2,4,1 2,5,-1 3,5,1').trim().split(/\s+/).map((s) => {
      const [n, m, sg] = s.split(',').map(Number); return { n, m, s: sg >= 0 ? 1 : -1 };
    });
    const density = +(canvas.dataset.grains || 0.012);
    const probeOn = canvas.hasAttribute('data-probe');
    const cycle = +(canvas.dataset.cycle || 0);
    const rest = +(canvas.dataset.rest || 0);       // strips: stop computing once settled; hover wakes them
    const labelEl = host.querySelector('[data-plate-label]');
    const pauseBtn = host.querySelector('[data-plate-pause]');
    const tables = modes.map(table);
    const C = { bg: css('--bg', '#0c0c0b'), ink: css('--ink', '#f0efec'), blue: css('--accent', '#5aa2f0'),
      orange: css('--accent-2', '#ec7646'), good: css('--good', '#3cc46f'), muted: css('--muted', '#9a9891') };

    let W = 0, H = 0, dpr = 1, ctx = null, N = 0, X = null, Y = null, Z = null;
    let mi = 0, modeT = 0, agitate = 0, playing = !REDUCE, visible = true, raf = 0, last = 0, lastCycle = 0;
    let probe = null;                               // {x, y} in CSS px, or null
    let restAt = Infinity, hovering = false;
    const rnd = rng(20261110);

    function size() {
      const r = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const changed = w !== W || h !== H;
      W = w; H = h;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx = canvas.getContext('2d', { alpha: false }); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const want = Math.min(16000, Math.max(800, Math.round(W * H * density)));
      if (want !== N) {
        // keep existing grains where possible so a resize doesn't reset the pattern
        const nx = new Float32Array(want), ny = new Float32Array(want);
        for (let i = 0; i < want; i++) { nx[i] = i < N ? X[i] : rnd(); ny[i] = i < N ? Y[i] : rnd(); }
        X = nx; Y = ny; N = want; Z = new Float32Array(N);
      }
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      return changed;
    }

    const zAt = (t, x, y) => t[Math.min(G - 1, (y * G) | 0) * G + Math.min(G - 1, (x * G) | 0)];

    function step(t, gain) {
      // a kick of KICK times the plate's size (geometric mean of its sides), so wide strips settle as fast as the hero
      const s = Math.sqrt(W * H), kx = KICK * gain * s / W * 1.7320508, ky = KICK * gain * s / H * 1.7320508;
      for (let i = 0; i < N; i++) {
        const a = Math.abs(zAt(t, X[i], Y[i]));
        Z[i] = a;
        if (a < 0.004) continue;
        let x = X[i] + kx * a * (rnd() * 2 - 1), y = Y[i] + ky * a * (rnd() * 2 - 1);
        X[i] = x < 0 ? -x : x > 1 ? 2 - x : x;        // sand stays on the plate
        Y[i] = y < 0 ? -y : y > 1 ? 2 - y : y;
      }
    }

    function settle(steps) { const t = tables[mi]; for (let k = 0; k < steps; k++) step(t, 1); }

    function draw(fade) {
      ctx.globalAlpha = fade; ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      const g = W > 700 ? 1.5 : 1.3;
      // resting grains in ink, grains still being thrown about in signal blue.
      // One path per colour: about 5x faster than a fillRect per grain (measured: 1.5 ms vs 7.7 ms for 13k grains)
      ctx.beginPath(); for (let i = 0; i < N; i++) if (Z[i] < 0.16) ctx.rect(X[i] * W, Y[i] * H, g, g);
      ctx.fillStyle = C.ink; ctx.globalAlpha = 0.86; ctx.fill();
      ctx.beginPath(); for (let i = 0; i < N; i++) if (Z[i] >= 0.16) ctx.rect(X[i] * W, Y[i] * H, g, g);
      ctx.fillStyle = C.blue; ctx.globalAlpha = 0.7; ctx.fill();
      ctx.globalAlpha = 1;
      if (probe) drawProbe();
    }

    function drawProbe() {
      const { x, y } = probe, a = Math.abs(zAt(tables[mi], x / W, y / H));
      const node = a < 0.12, col = node ? C.good : a > 0.6 ? C.orange : C.blue;
      ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.35; ctx.beginPath();
      ctx.moveTo(x - 30, y); ctx.lineTo(x - 20, y); ctx.moveTo(x + 20, y); ctx.lineTo(x + 30, y);
      ctx.moveTo(x, y - 30); ctx.lineTo(x, y - 20); ctx.moveTo(x, y + 20); ctx.lineTo(x, y + 30); ctx.stroke(); ctx.globalAlpha = 1;
      const msg = node ? 'node · sand rests' : a > 0.6 ? 'antinode · sand thrown off' : 'moving · sand drifts';
      const txt = `|z| = ${a.toFixed(2)}  ${msg}`;
      ctx.font = '500 12px "JetBrains Mono", ui-monospace, monospace';
      const tw = ctx.measureText(txt).width, left = x + 26 + tw + 16 > W ? x - 26 - tw - 12 : x + 26;
      ctx.fillStyle = 'rgba(12,12,11,0.82)'; ctx.fillRect(left - 6, y + 16, tw + 12, 22);
      ctx.fillStyle = col; ctx.textBaseline = 'middle'; ctx.fillText(txt, left, y + 27);
    }

    function setLabel() {
      if (!labelEl) return;
      const md = modes[mi];
      labelEl.innerHTML = `mode <b>(${md.n}, ${md.m})</b>`;
    }

    function next(manual) {
      mi = (mi + 1) % modes.length; modeT = 0; setLabel();
      if (rest) restAt = performance.now() + rest * 1000;
      if (manual) lastCycle = performance.now();
      if (REDUCE || !playing) { settle(REDUCE ? 420 : 0); if (REDUCE) draw(1); else { agitate = 1; } return; }
      agitate = 1;                                  // a new drive frequency flings the sand first
    }

    function frame(now) {
      raf = 0;
      if (!playing || !visible || document.hidden) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      modeT += dt;
      const t = tables[mi];
      const gain = (modeT < 0.35 ? 0 : 1) * (1 + 1.6 * agitate);   // plate at rest for a moment, then driven
      agitate = Math.max(0, agitate - dt / 0.6);
      for (let k = 0; k < SUB; k++) step(t, gain);
      draw(0.42);
      if (cycle > 0 && now - lastCycle > cycle * 1000) { lastCycle = now; next(false); }
      if (rest && now > restAt && !hovering) { draw(1); return; }      // settled: stop until woken
      raf = requestAnimationFrame(frame);
    }
    const start = () => { if (!raf && playing && visible && !document.hidden) { last = performance.now(); if (rest) restAt = last + rest * 1000; raf = requestAnimationFrame(frame); } };

    // ---------------------------------------------------------------- wiring
    size(); setLabel();
    if (REDUCE) { settle(420); draw(1); }
    else { modeT = 0; lastCycle = performance.now(); draw(1); start(); }

    let rT = 0;
    new ResizeObserver(() => { clearTimeout(rT); rT = setTimeout(() => { size(); if (!playing) draw(1); }, 80); }).observe(canvas);
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => es.forEach((e) => { visible = e.isIntersecting; start(); }), { threshold: 0.01 }).observe(canvas);
    document.addEventListener('visibilitychange', start);

    host.querySelectorAll('[data-plate-next]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); next(true); }));
    canvas.addEventListener('click', () => { next(true); start(); });
    if (rest && !REDUCE) {
      canvas.addEventListener('pointerenter', () => { hovering = true; agitate = Math.max(agitate, 0.6); start(); });
      canvas.addEventListener('pointerleave', () => { hovering = false; restAt = performance.now() + rest * 1000; });
    }
    if (pauseBtn) {
      pauseBtn.textContent = playing ? 'Pause' : 'Play';
      pauseBtn.setAttribute('aria-pressed', String(!playing));
      pauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (REDUCE) return;
        playing = !playing; pauseBtn.textContent = playing ? 'Pause' : 'Play'; pauseBtn.setAttribute('aria-pressed', String(!playing));
        start();
      });
      if (REDUCE) pauseBtn.hidden = true;
    }
    if (probeOn && matchMedia('(hover: hover) and (pointer: fine)').matches) {
      canvas.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); probe = { x: e.clientX - r.left, y: e.clientY - r.top }; if (!raf) draw(1); });
      canvas.addEventListener('pointerleave', () => { probe = null; if (!raf) draw(1); });
    }
    // test hook: run the physics forward without drawing frames
    canvas._plate = { settle: (n) => { settle(n); draw(1); }, next: () => next(true), get mode() { return modes[mi]; },
      nodeShare: () => { const t = tables[mi]; let k = 0; for (let i = 0; i < N; i++) if (Math.abs(zAt(t, X[i], Y[i])) < 0.12) k++; return k / N; } };
  }

  const init = () => document.querySelectorAll('canvas[data-plate]').forEach((c) => { if (!c._plate) Plate(c); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
