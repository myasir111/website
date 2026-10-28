(function () {
  function calc() {
    const V = T.num('V'), D = T.num('D') / 1000, St = T.num('St'), rho = T.num('rho'), mu = T.num('mu') / 1000, fn = T.num('fn');
    const fs = St * V / D, ratio = fs / fn;
    T.$('o-fs').innerHTML = `${T.fmt(fs)}<small>Hz</small>`;
    T.$('o-ratio').textContent = T.fmt(ratio, 3);
    T.$('o-fil').textContent = `${T.fmt(2 * fs)} Hz`;
    T.$('o-re').textContent = T.fmt(rho * V * D / mu, 3);
    T.$('o-vr').textContent = T.fmt(V / (fn * D), 3);
    T.$('o-vc').textContent = `${T.fmt(fn * D / St)} m/s`;
    const near = (r) => r > 0.8 && r < 1.2;
    T.$('o-msg').innerHTML = near(ratio)
      ? `<div class="warn">Cross-flow shedding is within ±20% of the natural frequency. High risk of lock-in.</div>`
      : near(2 * ratio)
        ? `<div class="warn">In-line (2·f<sub>s</sub>) shedding is within ±20% of the natural frequency. Check in-line vibration, especially in dense fluids.</div>`
        : `<div class="ok">Neither cross-flow nor in-line shedding is within ±20% of f<sub>n</sub>.</div>`;
  }
  T.live(calc);
})();
