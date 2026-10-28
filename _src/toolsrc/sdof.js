(function () {
  const g = 9.80665;
  function fnHz() {
    const mode = T.$('mode').value;
    ['km', 'fn', 'defl'].forEach((k) => { T.$('g-' + k).hidden = k !== mode; });
    if (mode === 'km') return Math.sqrt(T.num('k') * 1000 / T.num('m')) / (2 * Math.PI);
    if (mode === 'fn') return T.num('fn');
    return Math.sqrt(g / (T.num('dst') / 1000)) / (2 * Math.PI);
  }
  const daf = (r, z) => 1 / Math.sqrt((1 - r * r) ** 2 + (2 * z * r) ** 2);
  const tr = (r, z) => Math.sqrt(1 + (2 * z * r) ** 2) * daf(r, z);

  function calc() {
    const fn = fnHz(), z = T.num('z'), ff = T.num('ff'), r = ff / fn;
    T.$('o-fn').innerHTML = `${T.fmt(fn)}<small>Hz</small>`;
    T.$('o-r').textContent = T.fmt(r, 3);
    T.$('o-fncpm').textContent = `${T.fmt(fn * 60)} CPM`;
    T.$('o-q').textContent = T.fmt(1 / (2 * z), 3);
    T.$('o-daf').textContent = T.fmt(daf(r, z), 3) + ' ×';
    T.$('o-t').textContent = T.fmt(tr(r, z), 3) + ' ×';
    const sep = (ff - fn) / fn * 100;
    T.$('o-sep').textContent = `${sep >= 0 ? '+' : ''}${T.fmt(sep, 3)} %`;
    T.$('o-msg').innerHTML = Math.abs(sep) < 20
      ? `<div class="warn">Forcing frequency is within ±20% of the natural frequency. Resonance risk: check the margin your standard requires, and consider stiffening, detuning or adding damping.</div>`
      : r > Math.SQRT2
        ? `<div class="ok">Above √2·f<sub>n</sub>: the system is isolating (transmissibility below 1).</div>`
        : `<div class="ok">More than ±20% away from the natural frequency.</div>`;
    plot(r, z);
  }

  function plot(r0, z) {
    const { ctx, w, h } = T.canvas(T.$('plot'));
    const pad = { l: 40, r: 10, t: 10, b: 26 }, rMax = 3;
    const yMin = -1.5, yMax = Math.max(1.2, Math.log10(1 / (2 * z)) + 0.2); // log10(T)
    const X = (r) => pad.l + r / rMax * (w - pad.l - pad.r);
    const Y = (t) => h - pad.b - (Math.log10(Math.max(t, 1e-6)) - yMin) / (yMax - yMin) * (h - pad.t - pad.b);
    ctx.font = '11px ' + T.css('--mono'); ctx.fillStyle = T.css('--muted'); ctx.strokeStyle = T.css('--line'); ctx.lineWidth = 1;
    for (let e = Math.ceil(yMin); e <= yMax; e++) {
      ctx.beginPath(); ctx.moveTo(pad.l, Y(10 ** e)); ctx.lineTo(w - pad.r, Y(10 ** e)); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText(e >= 0 ? String(10 ** e) : (10 ** e).toString(), pad.l - 6, Y(10 ** e) + 4);
    }
    ctx.textAlign = 'center';
    for (let r = 0; r <= rMax; r += 0.5) { ctx.fillText(r.toFixed(1), X(r), h - 8); }
    // isolation threshold and T = 1
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(X(Math.SQRT2), pad.t); ctx.lineTo(X(Math.SQRT2), h - pad.b); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = T.css('--accent'); ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 600; i++) { const r = i / 600 * rMax, y = Y(tr(r, z)); i ? ctx.lineTo(X(r), y) : ctx.moveTo(X(r), y); }
    ctx.stroke();
    if (r0 <= rMax && isFinite(r0)) {
      ctx.fillStyle = T.css('--accent-2');
      ctx.beginPath(); ctx.arc(X(r0), Y(tr(r0, z)), 5, 0, 2 * Math.PI); ctx.fill();
    }
  }
  T.live(calc);
})();
