/* Nodal plate: the ground of every page.
   One fixed field of sand sits behind the site. The physics is the Chladni experiment: each grain is
   kicked in proportion to how much the plate moves under it, |z(x, y)|, so sand leaves the antinodes
   and settles on the nodal lines. Mode shapes are the classic approximation for a free plate:
     z = cos(n pi x) cos(m pi y) + s cos(m pi x) cos(n pi y),   x, y in [0, 1].

   How the site uses it
   - Each section of a page is a mode: scrolling into a section changes the drive and the sand re-forms.
     Sections are elements with [data-mode="n,m,s"], or else every <h2> in <main> (modes picked per page).
   - Opening a page: the sand carries over from the page you came from (sessionStorage) and settles
     into this page's pattern. Leaving a page saves it.
   - First visit to the home page: the sand gathers into the word "nodal." then is thrown into the plate.
   - The plate is bright behind the top of a page and dims as you scroll into the reading area.
   - It stops computing once the sand has settled, and when the tab is hidden.
   - Reduced motion, or the footer's motion switch: still, settled patterns only.
   Controls (any page): [data-plate-next] change mode, [data-plate-pause] pause, [data-plate-label] shows
   the mode, [data-motion-toggle] turns motion on/off for the whole site, [data-probe-zone] shows the
   amplitude probe under the pointer. */
(() => {
  const root = document.documentElement;
  const OS_REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let userOff = false; try { userOff = localStorage.getItem('nodal-motion') === 'off'; } catch (e) {}
  let STILL = OS_REDUCE || userOff;
  const css = (n, d) => getComputedStyle(root).getPropertyValue(n).trim() || d;
  const TAU = Math.PI * 2, G = 256, KICK = 0.0115, SUB = 3, SETTLE = 5.5;
  const POOL = ['3,5,1', '2,5,-1', '3,8,1', '4,6,-1', '2,7,1', '1,6,-1', '2,4,1', '5,7,-1', '3,7,1', '4,9,1', '2,9,-1', '5,8,1'];
  const parse = (s) => { const [n, m, sg] = String(s).split(',').map(Number); return { n, m, s: sg >= 0 ? 1 : -1, key: `${n},${m},${sg >= 0 ? 1 : -1}` }; };

  // seeded randomness (xorshift32): the pattern is repeatable
  let seed = 20261110;
  const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };

  // ---------------------------------------------------------------- |z| lookup tables
  const cache = new Map();
  function modeTable(md) {
    if (cache.has(md.key)) return cache.get(md.key);
    const d = new Float32Array(G * G); let mx = 0;
    for (let j = 0; j < G; j++) { const y = (j + 0.5) / G;
      for (let i = 0; i < G; i++) { const x = (i + 0.5) / G;
        const z = Math.cos(md.n * Math.PI * x) * Math.cos(md.m * Math.PI * y) + md.s * Math.cos(md.m * Math.PI * x) * Math.cos(md.n * Math.PI * y);
        d[j * G + i] = Math.abs(z); mx = Math.max(mx, Math.abs(z)); } }
    for (let k = 0; k < d.length; k++) d[k] /= mx || 1;
    const t = { w: G, h: G, d, md };
    cache.set(md.key, t); return t;
  }
  // the word: the plate is still under the letters (|z| = 0) and moves more the further you are from them
  function textTable(word) {
    const w = Math.max(64, Math.round(W / 3)), h = Math.max(48, Math.round(H / 3));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const fs = Math.min(w / (word.length * 0.62), h * 0.42);
    g.font = `600 ${fs}px "JetBrains Mono", ui-monospace, monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.filter = 'blur(' + Math.max(2, fs * 0.09) + 'px)'; g.fillStyle = '#fff'; g.fillText(word, w / 2, h * 0.48);
    const soft = g.getImageData(0, 0, w, h).data;
    g.filter = 'none'; g.clearRect(0, 0, w, h); g.fillText(word, w / 2, h * 0.48);
    const hard = g.getImageData(0, 0, w, h).data;
    const d = new Float32Array(w * h);
    for (let k = 0; k < w * h; k++) d[k] = hard[k * 4 + 3] > 110 ? 0 : 0.18 + 0.82 * (1 - Math.sqrt(soft[k * 4 + 3] / 255));
    return { w, h, d, md: null };
  }
  const zAt = (t, x, y) => t.d[Math.min(t.h - 1, (y * t.h) | 0) * t.w + Math.min(t.w - 1, (x * t.w) | 0)];

  // ---------------------------------------------------------------- canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'plate-bg'; canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  let W = 0, H = 0, ctx = null, N = 0, X = null, Y = null, Z = null;
  const C = { bg: css('--bg', '#0c0c0b'), ink: css('--ink', '#f0efec'), blue: css('--accent', '#5aa2f0'),
    orange: css('--accent-2', '#ec7646'), good: css('--good', '#3cc46f') };

  // page character: the home page is the instrument; lessons, tools and articles keep the plate quiet
  const isHome = document.body.classList.contains('home');
  const calm = !!document.querySelector('.lesson, .tool, .method, video.video, .notes, .cv-layout');
  const TOP = isHome ? 1 : calm ? 0.34 : 0.46, BODY = calm ? 0.1 : 0.18;

  function size() {
    W = Math.max(1, innerWidth); H = Math.max(1, innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx = canvas.getContext('2d', { alpha: false }); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const want = Math.min(18000, Math.max(2500, Math.round(W * H * (W < 700 ? 0.011 : 0.0085))));
    if (want !== N) {
      const nx = new Float32Array(want), ny = new Float32Array(want);
      for (let i = 0; i < want; i++) { nx[i] = i < N ? X[i] : rnd(); ny[i] = i < N ? Y[i] : rnd(); }
      X = nx; Y = ny; N = want; Z = new Float32Array(N).fill(1);
    }
  }

  // ---------------------------------------------------------------- state carried between pages
  const KEY = 'nodal-plate';
  function save() {
    try {
      const n = Math.min(N, 18000), q = new Uint16Array(n * 2);
      for (let i = 0; i < n; i++) { q[i] = X[i] * 65535; q[n + i] = Y[i] * 65535; }
      let s = ''; const b = new Uint8Array(q.buffer);
      for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192));
      sessionStorage.setItem(KEY, JSON.stringify({ n, t: Date.now(), mode: table && table.md ? table.md.key : null, p: btoa(s) }));
    } catch (e) {}
  }
  function restore() {
    try {
      const o = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (!o || Date.now() - o.t > 30 * 60 * 1000) return null;
      const s = atob(o.p), b = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
      const q = new Uint16Array(b.buffer), n = Math.min(o.n, N);
      for (let i = 0; i < n; i++) { X[i] = q[i] / 65535; Y[i] = q[o.n + i] / 65535; }
      return o;
    } catch (e) { return null; }
  }

  // ---------------------------------------------------------------- physics and drawing
  let table = null, modeT = 0, agitate = 0, dim = TOP, dimT = TOP, playing = !STILL, raf = 0, last = 0, probe = null;
  let cycleOn = false, lastCycle = 0, pageModes = [], modeIx = 0;

  function step(t, gain) {
    const s = Math.sqrt(W * H), kx = KICK * gain * s / W * 1.7320508, ky = KICK * gain * s / H * 1.7320508;
    for (let i = 0; i < N; i++) {
      const a = zAt(t, X[i], Y[i]); Z[i] = a;
      if (a < 0.004) continue;
      const x = X[i] + kx * a * (rnd() * 2 - 1), y = Y[i] + ky * a * (rnd() * 2 - 1);
      X[i] = x < 0 ? -x : x > 1 ? 2 - x : x;            // sand stays on the plate
      Y[i] = y < 0 ? -y : y > 1 ? 2 - y : y;
    }
  }
  function settle(steps) { for (let k = 0; k < steps; k++) step(table, 1); }

  function draw(fade) {
    ctx.globalAlpha = fade; ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    const g = W > 900 ? 1.5 : 1.35;
    // one path per colour: about 5x faster than a fillRect per grain
    ctx.beginPath(); for (let i = 0; i < N; i++) if (Z[i] < 0.16) ctx.rect(X[i] * W, Y[i] * H, g, g);
    ctx.fillStyle = C.ink; ctx.globalAlpha = 0.86 * dim; ctx.fill();
    ctx.beginPath(); for (let i = 0; i < N; i++) if (Z[i] >= 0.16) ctx.rect(X[i] * W, Y[i] * H, g, g);
    ctx.fillStyle = C.blue; ctx.globalAlpha = 0.62 * dim; ctx.fill();
    ctx.globalAlpha = 1;
    if (probe && table && table.md) drawProbe();
  }
  function drawProbe() {
    const { x, y } = probe, a = zAt(table, x / W, y / H);
    const node = a < 0.12, col = node ? C.good : a > 0.6 ? C.orange : C.blue;
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 16, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.4; ctx.beginPath();
    ctx.moveTo(x - 30, y); ctx.lineTo(x - 20, y); ctx.moveTo(x + 20, y); ctx.lineTo(x + 30, y);
    ctx.moveTo(x, y - 30); ctx.lineTo(x, y - 20); ctx.moveTo(x, y + 20); ctx.lineTo(x, y + 30); ctx.stroke(); ctx.globalAlpha = 1;
    const msg = node ? 'node, the sand rests' : a > 0.6 ? 'antinode, the sand is thrown off' : 'moving, the sand drifts';
    const txt = `|z| = ${a.toFixed(2)}  ${msg}`;
    ctx.font = '500 12px "JetBrains Mono", ui-monospace, monospace';
    const tw = ctx.measureText(txt).width, left = x + 26 + tw + 16 > W ? x - 26 - tw - 12 : x + 26;
    ctx.fillStyle = 'rgba(12,12,11,0.86)'; ctx.fillRect(left - 6, y + 16, tw + 12, 22);
    ctx.fillStyle = col; ctx.textBaseline = 'middle'; ctx.fillText(txt, left, y + 27);
  }

  const labels = () => document.querySelectorAll('[data-plate-label]');
  function setLabel() {
    const md = table && table.md;
    labels().forEach((el) => { el.innerHTML = md ? `mode <b>(${md.n}, ${md.m})</b>` : ''; });
  }

  function setTable(t, kick = 1) {
    if (table === t) return;
    table = t; modeT = 0; agitate = Math.max(agitate, kick); setLabel();
    if (STILL) { settle(t.md ? 420 : 260); draw(1); return; }
    wake();
  }
  function setMode(key, kick) { setTable(modeTable(parse(key)), kick); }

  function frame(now) {
    raf = 0;
    if (!playing || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    modeT += dt;
    const gain = (modeT < 0.25 ? 0.4 : 1) * (1 + 1.6 * agitate);
    agitate = Math.max(0, agitate - dt / 0.7);
    dim += (dimT - dim) * Math.min(1, dt * 6);
    for (let k = 0; k < SUB; k++) step(table, gain);
    draw(0.42);
    if (cycleOn && now - lastCycle > 10000) { lastCycle = now; nextMode(); }
    // rest: the sand has settled, nothing is changing, nobody is probing
    const busy = modeT < SETTLE || agitate > 0 || Math.abs(dimT - dim) > 0.004 || probe || cycleOn;
    if (busy) raf = requestAnimationFrame(frame); else draw(1);
  }
  function wake() { if (!raf && playing && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  function nextMode() {
    if (!pageModes.length) return;
    modeIx = (modeIx + 1) % pageModes.length; setMode(pageModes[modeIx], 1); lastCycle = performance.now();
  }

  // ---------------------------------------------------------------- the page's modes and sections
  let h = 0; for (const ch of location.pathname) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  pageModes = (document.body.dataset.modes || '').trim().split(/\s+/).filter(Boolean);
  if (!pageModes.length) pageModes = Array.from({ length: 6 }, (_, k) => POOL[(h + k * 5) % POOL.length]);
  seed = (seed ^ h) >>> 0 || 1;

  size();
  const prev = restore();
  table = modeTable(parse(pageModes[0]));
  if (STILL) { settle(420); draw(1); }
  else {
    // arriving: if we came from another page, start from its sand and throw it into this page's pattern
    agitate = prev ? 0.9 : 0;
    draw(1); wake();
  }
  setLabel();

  // sections: whichever section crosses the middle of the screen sets the mode
  const sections = [...document.querySelectorAll('[data-mode]')];
  const heads = sections.length ? sections : [...document.querySelectorAll('main h2')];
  if (heads.length && 'IntersectionObserver' in window) {
    const modeOf = new Map(heads.map((el, i) => [el, el.dataset.mode || pageModes[(i + 1) % pageModes.length]]));
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setMode(modeOf.get(e.target), 0.8); }),
      { rootMargin: '-48% 0px -48% 0px' });
    heads.forEach((el) => io.observe(el));
  }
  // back at the top: the page's own mode
  const topSentinel = document.querySelector('[data-plate-top]') || document.querySelector('main > :first-child, .hero');
  if (topSentinel && 'IntersectionObserver' in window && heads.length) {
    new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting && e.intersectionRatio > 0.5) setMode(pageModes[modeIx], 0.6); }),
      { threshold: [0.5] }).observe(topSentinel);
  }

  // brightness follows scroll: bright behind the top of the page, quiet behind the reading
  const onScroll = () => {
    const u = Math.min(1, Math.max(0, scrollY / (innerHeight * 0.7)));
    dimT = TOP + (BODY - TOP) * u * u * (3 - 2 * u);
    if (STILL) { dim = dimT; draw(1); } else wake();
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  let rT = 0;
  addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { size(); draw(1); wake(); }, 120); });
  document.addEventListener('visibilitychange', wake);
  addEventListener('pagehide', save);
  addEventListener('pageswap', save);
  document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a[href]'); if (a && a.origin === location.origin) save(); }, true);

  // ---------------------------------------------------------------- home: probe, changing modes, cycling while the hero is in view
  const zone = document.querySelector('[data-probe-zone]');
  if (zone) {
    cycleOn = !STILL;
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => es.forEach((e) => { cycleOn = e.isIntersecting && playing && !STILL; lastCycle = performance.now(); wake(); }), { threshold: 0.4 }).observe(zone);
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      zone.addEventListener('pointermove', (e) => {
        if (e.target.closest('a, button, h1, p')) { if (probe) { probe = null; draw(1); } return; }
        probe = { x: e.clientX, y: e.clientY }; if (!raf) { if (STILL) draw(1); else wake(); }
      });
      zone.addEventListener('pointerleave', () => { probe = null; draw(1); });
    }
    zone.addEventListener('click', (e) => { if (!e.target.closest('a, button')) nextMode(); });
  }
  document.querySelectorAll('[data-plate-next]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); nextMode(); }));
  document.querySelectorAll('[data-plate-pause]').forEach((b) => {
    const sync = () => { b.textContent = playing ? 'Pause' : 'Play'; b.setAttribute('aria-pressed', String(!playing)); };
    if (STILL) b.hidden = true; sync();
    b.addEventListener('click', (e) => { e.stopPropagation(); playing = !playing; cycleOn = playing && !!zone; sync(); wake(); });
  });
  document.querySelectorAll('[data-motion-toggle]').forEach((b) => {
    const sync = () => { b.textContent = userOff ? 'Motion: off' : 'Motion: on'; b.setAttribute('aria-pressed', String(!userOff)); };
    sync();
    b.addEventListener('click', () => {
      userOff = !userOff; try { localStorage.setItem('nodal-motion', userOff ? 'off' : 'on'); } catch (e) {}
      root.classList.toggle('still', userOff || OS_REDUCE);
      STILL = OS_REDUCE || userOff; playing = !STILL; cycleOn = playing && !!zone;
      if (STILL) { settle(420); draw(1); } else wake();
      sync();
    });
  });
  root.classList.toggle('still', STILL);

  // ---------------------------------------------------------------- first visit: the sand writes the name, then becomes the plate
  function intro(word, done) {
    let skip = false;
    const end = () => { if (skip) return; skip = true; ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((t) => removeEventListener(t, end)); setMode(pageModes[0], 1.2); done(); };
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((t) => addEventListener(t, end, { passive: true }));
    for (let i = 0; i < N; i++) { X[i] = rnd(); Y[i] = rnd(); }
    table = null; setTable(textTable(word), 1.6);
    setTimeout(end, 2300);
  }
  if (isHome && !STILL && !prev && root.classList.contains('intro')) {
    const fonts = document.fonts ? document.fonts.load('600 64px "JetBrains Mono"') : Promise.resolve();
    Promise.race([fonts, new Promise((r) => setTimeout(r, 400))]).then(() => intro('nodal.', () => root.classList.remove('intro')));
  } else root.classList.remove('intro');

  // test and tooling hook
  window.NodalPlate = { setMode, nextMode, save, get mode() { return table && table.md; }, get running() { return !!raf; },
    settle: (n) => { settle(n); draw(1); },
    nodeShare: () => { let k = 0; for (let i = 0; i < N; i++) if (zAt(table, X[i], Y[i]) < 0.12) k++; return k / N; } };
})();
