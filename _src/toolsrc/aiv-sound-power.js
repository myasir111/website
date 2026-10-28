(function () {
  const pwlOf = (W, p1, p2, Tk, mw, K) => 10 * Math.log10(W * W * ((p1 - p2) / p1) ** 3.6 * (Tk / mw) ** 1.2) + 126.1 + K;
  function calc() {
    const W = T.num('w'), p1 = T.num('p1'), p2 = T.num('p2'), Tk = T.num('t') + 273.15, mw = T.num('mw'), g = T.num('gam');
    const crit = ((g + 1) / 2) ** (g / (g - 1));
    const choked = p1 / p2 >= crit;
    const s = T.$('son').value, K = s === 'auto' ? (choked ? 6 : 0) : +s;
    const pwl = pwlOf(W, p1, p2, Tk, mw, K);
    T.$('o-pwl').innerHTML = `${p2 < p1 ? T.fmt(pwl, 4) : '—'}<small>dB</small>`;
    T.$('out').innerHTML = [
      ['Pressure ratio P<sub>1</sub>/P<sub>2</sub>', T.fmt(p1 / p2, 3)],
      ['Critical pressure ratio for choking', T.fmt(crit, 3)],
      ['Flow regime', choked ? 'Choked (sonic)' : 'Subsonic'],
      ['Correction K applied', `${K} dB`],
      ['ΔP / P<sub>1</sub>', T.fmt((p1 - p2) / p1, 3)],
    ].map(([k, v]) => `<tr><td>${k}</td><td class="num">${v}</td></tr>`).join('');
    const d2 = pwlOf(2 * W, p1, p2, Tk, mw, K) - pwl;
    const dpHalf = pwlOf(W, p1, p1 - (p1 - p2) / 2, Tk, mw, K) - pwl;
    T.$('o-sens').innerHTML = `<div class="ok">Double the flow: ${d2 >= 0 ? '+' : ''}${T.fmt(d2, 3)} dB · Halve ΔP: ${T.fmt(dpHalf, 3)} dB</div>`;
    // position on a 120–190 dB scale
    const { ctx, w, h } = T.canvas(T.$('bar'));
    const lo = 120, hi = 190, X = (v) => 10 + (v - lo) / (hi - lo) * (w - 20);
    const grd = ctx.createLinearGradient(X(lo), 0, X(hi), 0);
    grd.addColorStop(0, T.css('--accent')); grd.addColorStop(1, T.css('--accent-2'));
    ctx.fillStyle = grd; ctx.globalAlpha = 0.35; ctx.fillRect(X(lo), 22, X(hi) - X(lo), 12); ctx.globalAlpha = 1;
    ctx.fillStyle = T.css('--muted'); ctx.font = '11px ' + T.css('--mono'); ctx.textAlign = 'center';
    for (let v = lo; v <= hi; v += 10) ctx.fillText(v, X(v), 52);
    if (p2 < p1 && isFinite(pwl)) {
      const x = X(Math.min(hi, Math.max(lo, pwl)));
      ctx.fillStyle = T.css('--ink'); ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x - 6, 8); ctx.lineTo(x + 6, 8); ctx.closePath(); ctx.fill();
    }
  }
  T.live(calc);
})();
