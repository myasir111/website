/* Nodal site motion. Everything here is an enhancement: pages read fine without it.
   - cards arrive in order when they scroll into view
   - the home hero is the sand plate (js/plate.js); this file sets --hdr for screen-filling layouts
   - card borders that light up where the pointer is, and muted video previews on poster cards
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

  // ---------------------------------------------------------------- header height, for layouts that fill the screen
  const hdr = document.querySelector('.site-header');
  if (hdr) { const setH = () => root.style.setProperty('--hdr', hdr.offsetHeight + 'px'); setH();
    if ('ResizeObserver' in window) new ResizeObserver(setH).observe(hdr); }

  // ---------------------------------------------------------------- cards: border lit where the pointer is
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (FINE) document.querySelectorAll('a.card').forEach((c) => c.addEventListener('pointermove', (e) => {
    const r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }));

  // ---------------------------------------------------------------- video previews: a poster plays muted while you hover it
  // Only with a fine pointer, only after a short pause (so passing over posters loads nothing), never with motion off.
  if (FINE && !REDUCE) document.querySelectorAll('img[data-preview]').forEach((img) => {
    const host = img.closest('.media') || img.closest('.card'), inRow = !!img.closest('.media'), trigger = img.closest('a') || host;
    let v = null, timer = 0;
    const place = () => { if (inRow) return; v.style.left = img.offsetLeft + 'px'; v.style.top = img.offsetTop + 'px'; v.style.width = img.offsetWidth + 'px'; v.style.height = img.offsetHeight + 'px'; };
    trigger.addEventListener('pointerenter', () => { if (root.classList.contains('still')) return; timer = setTimeout(() => {
      if (!v) {
        v = document.createElement('video'); v.className = 'preview'; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
        v.setAttribute('aria-hidden', 'true'); v.src = img.dataset.preview;
        v.addEventListener('loadedmetadata', () => { try { v.currentTime = Math.min(+(img.dataset.from || 12), v.duration * 0.4); } catch (e) {} }, { once: true });   // skip the title card
        host.append(v);
      }
      place();
      // reveal only once real frames are showing; a browser that can't decode the file keeps the poster
      v.addEventListener('timeupdate', () => { if (v.videoWidth > 0 && !v.paused) v.classList.add('on'); }, { once: true });
      v.play().catch(() => {});
    }, 260); });
    trigger.addEventListener('pointerleave', () => { clearTimeout(timer); if (v) { v.classList.remove('on'); setTimeout(() => v && !v.classList.contains('on') && v.pause(), 350); } });
  });

  // ---------------------------------------------------------------- header: one indicator under the current page that slides to what you point at
  const nav = document.querySelector('.site-header .nav');
  if (nav) {
    const ind = document.createElement('span'); ind.className = 'nav-ind'; nav.appendChild(ind);
    const at = (a) => { if (!a) { ind.style.opacity = 0; return; } ind.style.opacity = 1; ind.style.width = a.offsetWidth + 'px'; ind.style.transform = `translateX(${a.offsetLeft}px)`; };
    const home = () => at(nav.querySelector('a.active'));
    nav.querySelectorAll('a').forEach((a) => { a.addEventListener('pointerenter', () => at(a)); a.addEventListener('focus', () => at(a)); });
    nav.addEventListener('pointerleave', home); nav.addEventListener('focusout', home);
    ind.style.transition = 'none'; home(); requestAnimationFrame(() => { ind.style.transition = ''; });
    addEventListener('resize', home);
    if (document.fonts) document.fonts.ready.then(home);
    // phones: a menu button that opens the links over the sand
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'menu-btn'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'site-nav');
    btn.innerHTML = '<i aria-hidden="true"></i><span>Menu</span>';
    nav.id = nav.id || 'site-nav';
    nav.parentElement.appendChild(btn);
    const setOpen = (o) => { root.classList.toggle('menu-open', o); btn.setAttribute('aria-expanded', String(o)); btn.querySelector('span').textContent = o ? 'Close' : 'Menu'; };
    btn.addEventListener('click', () => setOpen(!root.classList.contains('menu-open')));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('menu-open')) { setOpen(false); btn.focus(); } });
    nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  }

  // ---------------------------------------------------------------- articles: an "On this page" rail in the left margin
  if (document.body.classList.contains('article')) {
    const hs = [...document.querySelectorAll('main h2')].filter((h) => !h.closest('.method, .sim, .panel'));
    if (hs.length >= 3) {
      const rail = document.createElement('nav'); rail.className = 'rail'; rail.setAttribute('aria-label', 'On this page');
      rail.innerHTML = '<p>On this page</p>';
      hs.forEach((h, i) => {
        if (!h.id) h.id = 's-' + (h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || i);
        const a = document.createElement('a'); a.href = '#' + h.id; a.textContent = h.textContent; rail.appendChild(a);
      });
      document.querySelector('main').appendChild(rail);
      const links = [...rail.querySelectorAll('a')];
      const spy = () => { let cur = 0; hs.forEach((h, i) => { if (h.getBoundingClientRect().top < innerHeight * 0.35) cur = i; }); links.forEach((a, i) => a.classList.toggle('on', i === cur)); };
      addEventListener('scroll', spy, { passive: true }); spy();
    }
  }

  // ---------------------------------------------------------------- section heads and lists arrive once, as their section's pattern forms
  const later = document.querySelectorAll('.rise, .rows > .row, .lessons > *, .index > a, .dir > a');
  if (REDUCE || !('IntersectionObserver' in window)) later.forEach((c) => c.classList.add('in'));
  else {
    const io2 = new IntersectionObserver((es) => {
      let i = 0;
      es.forEach((e) => { if (e.isIntersecting) { e.target.style.setProperty('--i', i++); e.target.classList.add('in'); io2.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    later.forEach((c) => io2.observe(c));
    setTimeout(() => later.forEach((c) => c.classList.add('in')), 4000);     // never leave anything hidden
  }

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

  // ---------------------------------------------------------------- sparks: card drawings, alive only on hover / focus
  const SPARK = {
    sine: (x, t) => [[C.blue, 0.75 * Math.sin(TAU * (2 * x - t))]],
    sum: (x, t) => { const a = 0.5 * Math.sin(TAU * (2 * x - t)), b = 0.28 * Math.sin(TAU * (4 * x - 2 * t) + 0.9), c = 0.16 * Math.sin(TAU * (6 * x - 3 * t));
      return [[C.orange, b, 0.5], [C.blue, a, 0.5], [C.ink, a + b + c]]; },
    square: (x, t) => { const N = 1 + 2 * Math.floor((0.5 + 0.5 * Math.sin(TAU * t * 0.5)) * 7); let s = 0;
      for (let k = 1; k <= N; k += 2) s += Math.sin(TAU * k * 2 * x) / k; return [[C.ink, 0.72 * s * 4 / Math.PI * 0.8]]; },
    phase: (x, t) => { let a = 0, b = 0; const ph = t * TAU * 0.25; for (let k = 1; k <= 9; k += 2) { a += Math.sin(TAU * k * 2 * x) / k; b += Math.sin(TAU * k * 2 * x + ph * k) / k; }
      return [[C.muted, 0.6 * a, 0.45], [C.blue, 0.6 * b]]; },
    wavelet: (x, t) => { const c = 0.15 + 0.7 * (0.5 - 0.5 * Math.cos(TAU * t * 0.25)), u = (x - c) / 0.07;
      return [[C.muted, 0.45 * Math.sin(TAU * (x < 0.5 ? 3 : 7.5) * x), 0.5], [C.orange, 0.8 * Math.exp(-u * u / 2) * Math.cos(6 * u)]]; },
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

/* Wide maths that scrolls sideways must be reachable by keyboard (WCAG 2.1.1). Re-checked after KaTeX renders and on resize. */
(function () {
  function focusWide() {
    document.querySelectorAll('.eq, .nmath, .formula, .tex, .wmath, .katex-display').forEach(function (el) {
      var wide = el.scrollWidth > el.clientWidth + 1;
      if (wide && !el.hasAttribute('tabindex')) { el.setAttribute('tabindex', '0'); el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Equation, scroll sideways'); el.dataset.fw = '1'; }
      else if (!wide && el.dataset.fw) { el.removeAttribute('tabindex'); el.removeAttribute('role'); el.removeAttribute('aria-label'); delete el.dataset.fw; }
    });
  }
  window.addEventListener('load', function () { focusWide(); setTimeout(focusWide, 1200); setTimeout(focusWide, 3000); });
  var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(focusWide, 200); });
  new MutationObserver(function () { clearTimeout(t); t = setTimeout(focusWide, 150); }).observe(document.body, { childList: true, subtree: true });
})();
