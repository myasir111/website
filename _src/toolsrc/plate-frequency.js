(function () {
  let modes = [], sel = 0;
  function calc() {
    const a = T.num('a') / 1000, b = T.num('b') / 1000, h = T.num('h') / 1000;
    const E = T.num('E') * 1e9, nu = T.num('nu'), rho = T.num('rho'), ma = T.num('ma'), fx = T.num('fx');
    const D = E * h ** 3 / (12 * (1 - nu * nu)), mu = rho * h + ma;
    modes = [];
    for (let m = 1; m <= 6; m++) for (let n = 1; n <= 6; n++)
      modes.push({ m, n, f: Math.PI / 2 * ((m / a) ** 2 + (n / b) ** 2) * Math.sqrt(D / mu) });
    modes.sort((x, y) => x.f - y.f); modes = modes.slice(0, 8);
    if (sel >= modes.length) sel = 0;
    T.$('out').innerHTML = modes.map((md, i) => {
      const sep = isFinite(fx) && fx > 0 ? (fx - md.f) / md.f * 100 : NaN;
      const flag = Math.abs(sep) < 20 ? ` style="color:var(--accent-2)"` : '';
      return `<tr data-i="${i}" style="cursor:pointer${i === sel ? ';background:var(--bg)' : ''}"><td>(${md.m}, ${md.n})</td><td class="num">${T.fmt(md.f)}</td><td class="num">${T.fmt(md.f * 60)}</td><td class="num"${flag}>${isFinite(sep) ? (sep >= 0 ? '+' : '') + T.fmt(sep, 3) + ' %' : '—'}</td></tr>`;
    }).join('');
    draw();
  }
  function draw() {
    const md = modes[sel]; if (!md) return;
    const { ctx, w, h } = T.canvas(T.$('shape'));
    const a = T.num('a'), b = T.num('b');
    const sc = Math.min((w - 20) / a, (h - 20) / b), pw = a * sc, ph = b * sc, x0 = (w - pw) / 2, y0 = (h - ph) / 2;
    const acc = T.css('--accent'), acc2 = T.css('--accent-2');
    const N = 60;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const v = Math.sin(md.m * Math.PI * (i + 0.5) / N) * Math.sin(md.n * Math.PI * (j + 0.5) / N);
      ctx.globalAlpha = Math.abs(v) * 0.9;
      ctx.fillStyle = v >= 0 ? acc : acc2;
      ctx.fillRect(x0 + i * pw / N, y0 + j * ph / N, pw / N + 0.6, ph / N + 0.6);
    }
    ctx.globalAlpha = 1; ctx.strokeStyle = T.css('--muted'); ctx.lineWidth = 1; ctx.strokeRect(x0, y0, pw, ph);
    // nodal lines
    ctx.setLineDash([4, 3]);
    for (let k = 1; k < md.m; k++) { const x = x0 + k * pw / md.m; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + ph); ctx.stroke(); }
    for (let k = 1; k < md.n; k++) { const y = y0 + k * ph / md.n; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + pw, y); ctx.stroke(); }
    ctx.setLineDash([]);
  }
  T.$('out').addEventListener('click', (e) => { const r = e.target.closest('tr'); if (!r) return; sel = +r.dataset.i; calc(); });
  T.live(calc);
})();
