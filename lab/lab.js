/* Lab engine: a lesson is a list of steps. Each step has words, maths, optional
   controls, and a draw(g, s, t, api) function for the board (canvas).
   s = shared state (slider values persist across steps), t = seconds since the
   step was entered, so steps can animate in and then be played with. */
const Lab = (() => {
  const TAU = 2 * Math.PI;
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const ramp = (t, t0, d) => ease((t - t0) / d);
  const COL = () => ({
    ink: css('--ink'), muted: css('--muted'), line: css('--line'), bg: css('--surface'),
    accent: css('--accent'), orange: css('--accent-2'), good: css('--good'), bad: css('--bad'), blue: css('--blue'),
  });

  // ---------------------------------------------------------------- drawing
  class Graphics {
    constructor(canvas) { this.c = canvas; this.resize(); }
    resize() {
      const dpr = window.devicePixelRatio || 1;
      this.w = this.c.clientWidth; this.h = this.c.clientHeight;
      this.c.width = Math.round(this.w * dpr); this.c.height = Math.round(this.h * dpr);
      this.ctx = this.c.getContext('2d');
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    clear() { this.col = COL(); this.ctx.clearRect(0, 0, this.w, this.h); }
    /* a plot region: box = [left, top, width, height] as fractions of the board */
    plot(o) { return new Plot(this, o); }
    text(s, x, y, o = {}) {
      const ctx = this.ctx;
      ctx.font = `${o.weight || 400} ${o.size || 12}px ${o.font || 'JetBrains Mono, ui-monospace, monospace'}`;
      ctx.fillStyle = o.color || this.col.muted;
      ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
      ctx.globalAlpha = o.alpha ?? 1;
      ctx.fillText(s, x, y);
      ctx.globalAlpha = 1;
    }
  }

  class Plot {
    constructor(g, o) {
      this.g = g; this.ctx = g.ctx;
      const [l, t, w, h] = o.box || [0.06, 0.08, 0.9, 0.8];
      this.l = l * g.w; this.t = t * g.h; this.w = w * g.w; this.h = h * g.h;
      this.x0 = o.x[0]; this.x1 = o.x[1]; this.y0 = o.y[0]; this.y1 = o.y[1];
    }
    X(x) { return this.l + (x - this.x0) / (this.x1 - this.x0) * this.w; }
    Y(y) { return this.t + (this.y1 - y) / (this.y1 - this.y0) * this.h; }
    axes(o = {}) {
      const ctx = this.ctx, c = this.g.col;
      ctx.lineWidth = 1; ctx.strokeStyle = c.line; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(this.l, this.Y(0)); ctx.lineTo(this.l + this.w, this.Y(0));
      ctx.moveTo(this.X(this.x0), this.t); ctx.lineTo(this.X(this.x0), this.t + this.h); ctx.stroke();
      (o.grid || []).forEach((x) => {
        ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(this.X(x), this.t); ctx.lineTo(this.X(x), this.t + this.h); ctx.stroke();
      });
      ctx.setLineDash([]);
      (o.ticks || []).forEach(([x, s]) => this.g.text(s, this.X(x), this.Y(0) + 13 + (o.tickOffset || 0), { size: 11 }));
    }
    path(xs, ys) {
      const ctx = this.ctx; ctx.beginPath();
      for (let i = 0; i < xs.length; i++) { const px = this.X(xs[i]), py = this.Y(ys[i]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    }
    sample(f, a = this.x0, b = this.x1, n = 700) {
      const xs = [], ys = [];
      for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n; xs.push(x); ys.push(f(x)); }
      return [xs, ys];
    }
    curve(f, o = {}) {
      const [xs, ys] = this.sample(f, o.from ?? this.x0, o.to ?? this.x1, o.n || 700);
      const ctx = this.ctx;
      ctx.save();
      ctx.beginPath(); ctx.rect(this.l - 2, this.t - 6, this.w + 4, this.h + 12); ctx.clip();
      if (o.glow) { ctx.globalAlpha = 0.14 * (o.alpha ?? 1); ctx.lineWidth = (o.width || 2.5) * 3.2; ctx.strokeStyle = o.color; this.path(xs, ys); ctx.stroke(); }
      ctx.globalAlpha = o.alpha ?? 1; ctx.lineWidth = o.width || 2.5; ctx.strokeStyle = o.color || this.g.col.ink;
      ctx.lineJoin = 'round'; ctx.setLineDash(o.dash || []); this.path(xs, ys); ctx.stroke();
      ctx.restore();
    }
    /* signed area under f on [a, b]: positive and negative parts in two colours */
    area(f, o = {}) {
      const a = o.from ?? this.x0, b = o.to ?? this.x1;
      const [xs, ys] = this.sample(f, a, b, o.n || 600);
      const ctx = this.ctx;
      [[1, o.pos || this.g.col.good], [-1, o.neg || this.g.col.bad]].forEach(([sg, col]) => {
        ctx.beginPath(); ctx.moveTo(this.X(a), this.Y(0));
        xs.forEach((x, i) => ctx.lineTo(this.X(x), this.Y(sg * ys[i] > 0 ? ys[i] : 0)));
        ctx.lineTo(this.X(b), this.Y(0)); ctx.closePath();
        ctx.globalAlpha = o.alpha ?? 0.35; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;
      });
    }
    /* shade the gap between two functions (where they disagree) */
    between(f1, f2, o = {}) {
      const [xs, y1] = this.sample(f1, o.from ?? this.x0, o.to ?? this.x1, 500);
      const y2 = xs.map(f2);
      const ctx = this.ctx; ctx.beginPath();
      xs.forEach((x, i) => (i ? ctx.lineTo(this.X(x), this.Y(y1[i])) : ctx.moveTo(this.X(x), this.Y(y1[i]))));
      for (let i = xs.length - 1; i >= 0; i--) ctx.lineTo(this.X(xs[i]), this.Y(y2[i]));
      ctx.closePath(); ctx.globalAlpha = o.alpha ?? 0.25; ctx.fillStyle = o.color || this.g.col.orange; ctx.fill(); ctx.globalAlpha = 1;
    }
    vline(x, o = {}) {
      const ctx = this.ctx; ctx.strokeStyle = o.color || this.g.col.muted; ctx.lineWidth = o.width || 1.2;
      ctx.setLineDash(o.dash || [4, 4]); ctx.globalAlpha = o.alpha ?? 1;
      ctx.beginPath(); ctx.moveTo(this.X(x), this.t); ctx.lineTo(this.X(x), this.t + this.h); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    dot(x, y, o = {}) {
      const ctx = this.ctx; ctx.fillStyle = o.color || this.g.col.ink;
      ctx.beginPath(); ctx.arc(this.X(x), this.Y(y), o.r || 4, 0, TAU); ctx.fill();
    }
    /* spectrum bars: values[k] for k = 0 (DC), 1, 2, ... */
    bars(values, o = {}) {
      const ctx = this.ctx, c = this.g.col;
      values.forEach((v, k) => {
        if (k === 0 && o.noDC) return;
        const x = this.X(k), bw = Math.max(4, Math.min(18, this.w / (this.x1 - this.x0) * 0.32));
        if (Math.abs(v) > 1e-3) {
          ctx.fillStyle = (o.color && o.color(k)) || (k === 0 ? c.muted : k === 1 ? c.blue : c.orange);
          ctx.globalAlpha = o.alpha ?? 1;
          ctx.fillRect(x - bw / 2, this.Y(Math.abs(v)), bw, this.Y(0) - this.Y(Math.abs(v)));
          ctx.globalAlpha = 1;
        } else if (o.ghost) {
          ctx.strokeStyle = c.muted; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x, this.Y(0)); ctx.lineTo(x, this.Y(0) - 18); ctx.stroke(); ctx.setLineDash([]);
        }
        if (o.labels !== false) this.g.text(k === 0 ? 'DC' : k + 'X', x, this.Y(0) + 13, { size: 11 });
      });
    }
  }

  // ---------------------------------------------------------------- maths helpers
  /* Fourier coefficients of a 1-periodic function: dc, a[k], b[k], amp[k] (k = 1..K) */
  function fourier(f, K = 12, N = 2048) {
    const a = new Float64Array(K + 1), b = new Float64Array(K + 1), amp = new Float64Array(K + 1);
    let dc = 0;
    const v = new Float64Array(N);
    for (let i = 0; i < N; i++) { v[i] = f(i / N); dc += v[i]; }
    dc /= N;
    for (let k = 1; k <= K; k++) {
      let ca = 0, sb = 0;
      for (let i = 0; i < N; i++) { const ph = TAU * k * i / N; ca += v[i] * Math.cos(ph); sb += v[i] * Math.sin(ph); }
      a[k] = 2 * ca / N; b[k] = 2 * sb / N; amp[k] = Math.hypot(a[k], b[k]);
    }
    return { dc, a, b, amp };
  }
  /* integral of f on [a, b] (trapezoid) */
  function integral(f, a, b, n = 2000) {
    let s = 0; const h = (b - a) / n;
    for (let i = 0; i <= n; i++) s += (i === 0 || i === n ? 0.5 : 1) * f(a + i * h);
    return s * h;
  }

  // ---------------------------------------------------------------- lesson runner
  function lesson(cfg) {
    const canvas = document.querySelector(cfg.canvas || '#board');
    const panel = document.querySelector(cfg.panel || '#panel');
    const legendEl = document.querySelector('#legend');
    const verdictEl = document.querySelector('#verdict');
    const g = new Graphics(canvas);
    const s = Object.assign({}, cfg.state || {});
    const steps = cfg.steps;
    let cur = 0, t0 = performance.now(), seen = new Set([0]);

    const tex = (src, el, display = true) => {
      if (window.katex) katex.render(src, el, { displayMode: display, throwOnError: false });
      else el.textContent = src;
    };
    const autoMath = (el) => {
      if (window.renderMathInElement) {
        renderMathInElement(el, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false });
      }
    };

    const api = {
      restart() { t0 = performance.now(); },
      legend(items) {
        if (!legendEl) return;
        legendEl.innerHTML = items.map(([label, color]) => `<span style="--sw:${color}">${label}</span>`).join('');
      },
      verdict(text, cls) { if (verdictEl) { verdictEl.textContent = text || ''; verdictEl.className = 'verdict ' + (cls || ''); } },
      refresh() { show(cur, false, false); },
      rewrite() {
        workEl.querySelectorAll(`.wline[data-step="${cur}"]`).forEach((r) => r.remove());
        written = cur - 1; renderWork(true);
      },
      set(key, v) { s[key] = v; const el = panel.querySelector(`[data-key="${key}"]`); if (el && el.type === 'range') { el.value = v; el.dispatchEvent(new Event('input')); } },
    };

    /* the page of working: every step's lines up to the current one, like
       derivation written out by hand; the current step writes itself in */
    const workEl = document.querySelector(cfg.work_el || '#working');
    let written = -1;                       // last step whose lines are already on the page
    function renderWork(animate) {
      if (!workEl) return;
      const W = cfg.work || [];
      if (!animate || cur < written) { workEl.innerHTML = ''; written = -1; }
      workEl.querySelectorAll('.writing').forEach((r) => r.classList.remove('writing'));
      for (let i = written + 1; i <= cur; i++) {
        const lines = (typeof W[i] === 'function' ? W[i](s) : W[i]) || [];
        lines.forEach(([src, note], j) => {
          const row = document.createElement('div');
          row.className = 'wline' + (i === cur ? ' now' : '');
          row.dataset.step = i;
          const num = document.createElement('span'); num.className = 'wnum'; num.textContent = j === 0 ? String(i + 1) : '';
          const m = document.createElement('span'); m.className = 'wmath'; tex(src, m, false);
          const body = document.createElement('span'); body.className = 'wbody'; body.appendChild(m);
          if (note) { const n = document.createElement('span'); n.className = 'wnote'; n.textContent = note; body.appendChild(n); }
          row.append(num, body);
          if (animate && i === cur) row.style.setProperty('--d', (0.25 + 0.75 * j) + 's'), row.classList.add('writing');
          workEl.appendChild(row);
        });
      }
      workEl.querySelectorAll('.wline').forEach((r) => r.classList.toggle('now', +r.dataset.step === cur));
      written = cur;
      const last = workEl.querySelector('.wline.now');
      if (animate && last && workEl.getBoundingClientRect().top < innerHeight) {
        const lines = workEl.querySelectorAll('.wline.now'), end = lines[lines.length - 1];
        const r = end.getBoundingClientRect();
        if (r.bottom > innerHeight - 20 && innerWidth > 900) setTimeout(() => end.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 300);
      }
    }

    function buildControls(st, box) {
      (st.controls || []).forEach((c) => {
        if (c.type === 'range') {
          if (s[c.key] === undefined) s[c.key] = c.value ?? c.min;
          const wrap = document.createElement('label'); wrap.className = 'ctl';
          const fmt = c.fmt || ((v) => String(v));
          wrap.innerHTML = `<span class="row"><span>${c.label}</span><span class="val"></span></span>`;
          const inp = document.createElement('input');
          Object.assign(inp, { type: 'range', min: c.min, max: c.max, step: c.step || 'any', value: s[c.key] });
          inp.dataset.key = c.key;
          const val = wrap.querySelector('.val');
          const upd = () => { s[c.key] = +inp.value; val.textContent = fmt(+inp.value); if (c.onInput) c.onInput(s, api); };
          inp.addEventListener('input', upd); upd();
          wrap.appendChild(inp); box.appendChild(wrap);
        } else if (c.type === 'choice') {
          if (s[c.key] === undefined) s[c.key] = c.options[0][0];
          const seg = document.createElement('div'); seg.className = 'seg';
          c.options.forEach(([v, label]) => {
            const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
            b.classList.toggle('on', s[c.key] === v);
            b.addEventListener('click', () => {
              s[c.key] = v; seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
              if (c.onPick) c.onPick(s, api);
            });
            seg.appendChild(b);
          });
          box.appendChild(seg);
        } else if (c.type === 'answer') {
          const wrap = document.createElement('label'); wrap.className = 'ans';
          wrap.innerHTML = `<span class="ans-q">${c.label}</span><span class="ans-in"><input type="text" inputmode="decimal" autocomplete="off" spellcheck="false"><span class="unit">${c.unit || ''}</span><span class="mark" aria-live="polite"></span></span>`;
          autoMath(wrap.querySelector('.ans-q'));
          const inp = wrap.querySelector('input'), mark = wrap.querySelector('.mark');
          inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') box.querySelector('[data-check]')?.click(); });
          box._answers = box._answers || [];
          box._answers.push({ c, inp, mark });
          box.appendChild(wrap);
        } else if (c.type === 'check') {
          let row = box.querySelector('.btns');
          if (!row) { row = document.createElement('div'); row.className = 'btns'; box.appendChild(row); }
          const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-small check'; b.textContent = c.label || 'Check';
          b.dataset.check = '1';
          b.addEventListener('click', () => {
            let right = 0, tried = 0;
            (box._answers || []).forEach(({ c: q, inp, mark }) => {
              const v = parseFloat(inp.value.replace(',', '.').replace(/[^0-9eE+\-.]/g, ''));
              if (Number.isNaN(v)) { mark.textContent = ''; mark.className = 'mark'; return; }
              tried++;
              const want = q.value(s), tol = Math.max(q.abs ?? 0, Math.abs(want) * (q.rel ?? 0.02));
              const ok = Math.abs(v - want) <= tol;
              if (ok) right++;
              mark.textContent = ok ? '✓' : '✗'; mark.className = 'mark ' + (ok ? 'good' : 'bad');
            });
            const n = (box._answers || []).length;
            api.verdict(tried === 0 ? 'Type an answer first' : right === n ? 'All correct ✓' : `${right} of ${n} correct — try again, or show the working`, right === n ? 'good' : (tried ? 'bad' : ''));
          });
          row.appendChild(b);
        } else if (c.type === 'button') {
          let row = box.querySelector('.btns');
          if (!row) { row = document.createElement('div'); row.className = 'btns'; box.appendChild(row); }
          const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-small'; b.textContent = c.label;
          b.addEventListener('click', () => c.action(s, api)); row.appendChild(b);
        }
      });
    }

    function show(i, push = true, animate = true) {
      cur = Math.max(0, Math.min(steps.length - 1, i));
      seen.add(cur);
      const st = steps[cur];
      panel.innerHTML = '';
      const prog = document.createElement('div'); prog.className = 'progress';
      steps.forEach((x, j) => {
        const b = document.createElement('button'); b.type = 'button';
        b.setAttribute('aria-label', `Step ${j + 1}: ${x.title}`);
        b.className = j === cur ? 'on' : (seen.has(j) ? 'done' : '');
        b.addEventListener('click', () => show(j)); prog.appendChild(b);
      });
      panel.appendChild(prog);
      panel.insertAdjacentHTML('beforeend', `<p class="step-count">Step ${cur + 1} of ${steps.length}</p><h2></h2><div class="text"></div>`);
      panel.querySelector('h2').textContent = st.title;
      const text = panel.querySelector('.text'); text.innerHTML = (typeof st.text === 'function' ? st.text(s) : st.text) || ''; autoMath(text);
      if (st.tex && !cfg.work) { const d = document.createElement('div'); d.className = 'tex'; panel.appendChild(d); tex(st.tex, d); }
      if (st.controls && st.controls.length) {
        const box = document.createElement('div'); box.className = 'try';
        box.innerHTML = `<p class="try-label">${st.tryLabel || 'Try it'}</p>`;
        panel.appendChild(box); buildControls(st, box);
      }
      const nav = document.createElement('div'); nav.className = 'nav-row';
      nav.innerHTML = `<button type="button" class="btn" data-go="-1">← Back</button>` +
        `<button type="button" class="btn primary" data-go="1">${cur === steps.length - 1 ? 'Done' : 'Next →'}</button>`;
      nav.querySelector('[data-go="-1"]').disabled = cur === 0;
      nav.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
        const d = +b.dataset.go;
        if (d > 0 && cur === steps.length - 1) { if (cfg.next) location.href = cfg.next; return; }
        show(cur + d);
      }));
      panel.appendChild(nav);
      panel.insertAdjacentHTML('beforeend', '<p class="kbd-hint">Tip: ← → keys move between steps.</p>');
      if (st.enter) st.enter(s, api);
      api.verdict('');
      t0 = performance.now();
      renderWork(animate);
      if (push) history.replaceState(null, '', `#step-${cur + 1}`);
    }

    function frame() {
      const t = (performance.now() - t0) / 1000;
      g.clear();
      try { steps[cur].draw(g, s, t, api); } catch (e) { console.error(e); }
      requestAnimationFrame(frame);
    }

    window.addEventListener('resize', () => g.resize());
    window.addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight') show(cur + 1);
      if (e.key === 'ArrowLeft') show(cur - 1);
    });
    const m = location.hash.match(/step-(\d+)/);
    const startAt = m ? +m[1] - 1 : 0;
    for (let j = 0; j <= startAt; j++) seen.add(j);
    show(startAt, false, false);
    // re-render maths once KaTeX has arrived
    window.addEventListener('load', () => show(cur, false, false));
    window.addEventListener('hashchange', () => {
      const h = location.hash.match(/step-(\d+)/);
      if (h && +h[1] - 1 !== cur) { for (let j = 0; j < +h[1]; j++) seen.add(j); show(+h[1] - 1, false, false); }
    });
    requestAnimationFrame(frame);
  }

  return { lesson, fourier, integral, ease, ramp, TAU, COL };
})();
