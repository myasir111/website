(function () {
  const BL = {
    pp: [1, 2, 3, 4].map((n) => n * Math.PI),
    ff: [4.730041, 7.853205, 10.995608, 14.137165],
    fp: [3.926602, 7.068583, 10.210176, 13.351769],
    cf: [1.875104, 4.694091, 7.854757, 10.995541],
    free: [4.730041, 7.853205, 10.995608, 14.137165],
  };
  const { cosh, cos, sinh, sin } = Math;
  // Normalised mode shape at x in [0, 1].
  function shape(bc, b, x) {
    if (bc === 'pp') return sin(b * x);
    if (bc === 'ff' || bc === 'fp') { const s = (cosh(b) - cos(b)) / (sinh(b) - sin(b)); return cosh(b * x) - cos(b * x) - s * (sinh(b * x) - sin(b * x)); }
    if (bc === 'cf') { const s = (cosh(b) + cos(b)) / (sinh(b) + sin(b)); return cosh(b * x) - cos(b * x) - s * (sinh(b * x) - sin(b * x)); }
    const s = (cosh(b) - cos(b)) / (sinh(b) - sin(b)); return cosh(b * x) + cos(b * x) - s * (sinh(b * x) + sin(b * x));
  }
  let mode = 0, t = 0, freqs = [];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function calc() {
    const bc = T.$('bc').value, L = T.num('L');
    const Do = T.num('od') / 1000, Di = Do - 2 * T.num('wt') / 1000;
    const I = Math.PI / 64 * (Do ** 4 - Di ** 4);
    const mPipe = Math.PI / 4 * (Do ** 2 - Di ** 2) * T.num('rho');
    const mFluid = Math.PI / 4 * Di ** 2 * T.num('rhof');
    const m = mPipe + mFluid + T.num('mx');
    const EI = T.num('E') * 1e9 * I;
    freqs = BL[bc].map((b) => b * b / (2 * Math.PI * L * L) * Math.sqrt(EI / m));
    T.$('out').innerHTML = freqs.map((f, i) =>
      `<tr><td>${i + 1}</td><td class="num">${BL[bc][i].toFixed(4)}</td><td class="num">${T.fmt(f)}</td><td class="num">${T.fmt(f * 60)}</td></tr>`).join('');
    T.$('props').textContent = `I = ${T.fmt(I * 1e12 / 1e4)} cm⁴ · mass = ${T.fmt(m)} kg/m (pipe ${T.fmt(mPipe)}, contents ${T.fmt(mFluid)}, extra ${T.fmt(T.num('mx'))})`
      + (Di <= 0 ? ' · check wall thickness' : '');
    if (reduce) draw();
  }

  function draw() {
    const bc = T.$('bc').value, b = BL[bc][mode];
    const { ctx, w, h } = T.canvas(T.$('shape'));
    const pad = 24, mid = h / 2, amp = h / 2 - 22;
    const N = 200, ys = [];
    let mx = 0;
    for (let i = 0; i <= N; i++) { const y = shape(bc, b, i / N); ys.push(y); mx = Math.max(mx, Math.abs(y)); }
    const X = (i) => pad + i / N * (w - 2 * pad);
    // supports
    ctx.fillStyle = T.css('--muted'); ctx.strokeStyle = T.css('--muted'); ctx.lineWidth = 2;
    const sup = { pp: ['pin', 'pin'], ff: ['fix', 'fix'], fp: ['fix', 'pin'], cf: ['fix', null], free: [null, null] }[bc];
    [[0, sup[0]], [N, sup[1]]].forEach(([i, kind]) => {
      if (!kind) return;
      const x = X(i);
      if (kind === 'pin') { ctx.beginPath(); ctx.moveTo(x, mid); ctx.lineTo(x - 8, mid + 14); ctx.lineTo(x + 8, mid + 14); ctx.closePath(); ctx.fill(); }
      else { ctx.fillRect(i ? x : x - 6, mid - 26, 6, 52); }
    });
    // rest line
    ctx.strokeStyle = T.css('--line'); ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(X(0), mid); ctx.lineTo(X(N), mid); ctx.stroke(); ctx.setLineDash([]);
    // shape
    const c = reduce ? 1 : Math.cos(t);
    ctx.strokeStyle = T.css('--accent'); ctx.lineWidth = 3; ctx.beginPath();
    ys.forEach((y, i) => { const Y = mid - c * y / mx * amp; i ? ctx.lineTo(X(i), Y) : ctx.moveTo(X(i), Y); });
    ctx.stroke();
    ctx.fillStyle = T.css('--muted'); ctx.font = '11px ' + T.css('--mono'); ctx.textAlign = 'right';
    ctx.fillText(`${T.fmt(freqs[mode] || 0)} Hz`, w - 4, 14);
  }
  function loop() { t += 0.06; draw(); requestAnimationFrame(loop); }

  T.$('modes').addEventListener('click', (e) => {
    const bt = e.target.closest('button'); if (!bt) return;
    mode = +bt.dataset.m;
    T.$('modes').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === bt));
    if (reduce) draw();
  });
  T.live(calc);
  if (!reduce) loop();
})();
