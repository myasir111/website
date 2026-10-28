(function () {
  const Ru = 8314.46, ST_LO = 0.27, ST_HI = 0.55;
  function calc() {
    const gas = T.$('cm').value === 'gas';
    T.$('g-gas').hidden = !gas; T.$('g-direct').hidden = gas;
    const c = gas ? Math.sqrt(T.num('gam') * T.num('z') * Ru * (T.num('tc') + 273.15) / T.num('mw')) : T.num('c');
    const L = T.num('L'), bc = T.$('bc').value;
    const f = [1, 2, 3, 4].map((n) => (bc === 'co' ? (2 * n - 1) * c / (4 * L) : n * c / (2 * L)));
    T.$('o-c').innerHTML = `${T.fmt(c)}<small>m/s</small>`;
    T.$('o-f1').innerHTML = `${T.fmt(f[0])}<small>Hz</small>`;
    T.$('out').innerHTML = f.map((v, i) => `<tr><td>${i + 1}</td><td class="num">${T.fmt(v)}</td><td class="num">${T.fmt(c / v)}</td></tr>`).join('');
    const d = T.num('d') / 1000, V = T.num('V');
    const fs = (St) => St * V / d;
    const vLo = f[0] * d / ST_HI, vHi = f[0] * d / ST_LO; // velocity band that excites mode 1
    T.$('vx').innerHTML = [
      ['Shedding frequency at branch mouth (St 0.27–0.55)', `${T.fmt(fs(ST_LO))} – ${T.fmt(fs(ST_HI))} Hz`],
      ['Main-line velocity that can excite mode 1', `${T.fmt(vLo)} – ${T.fmt(vHi)} m/s`],
      ['Branch length / diameter', T.fmt(L / d, 3)],
    ].map(([k, v]) => `<tr><td>${k}</td><td class="num">${v}</td></tr>`).join('');
    T.$('o-msg').innerHTML = bc !== 'co' ? '' : (V >= vLo && V <= vHi)
      ? `<div class="warn">The main-line velocity sits inside the band that can excite the first acoustic mode of this dead leg. Check for pulsation, or detune the branch.</div>`
      : V > vHi
        ? `<div class="ok">The flow is above the first-mode excitation band (${T.fmt(vLo)}–${T.fmt(vHi)} m/s). Check the band isn't crossed at start-up or turndown, and check higher modes.</div>`
        : `<div class="ok">The flow is below the first-mode excitation band. Check higher flow cases.</div>`;
  }
  T.live(calc);
})();
