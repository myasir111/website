(function () {
  const g = 9.80665;
  function calc() {
    const fn = T.num('fn'), Q = T.num('Q'), psd = T.num('psd');
    const G = Math.sqrt(Math.PI / 2 * fn * Q * psd);
    const z = G * g / (2 * Math.PI * fn) ** 2 * 1000; // mm
    T.$('o-g').innerHTML = `${T.fmt(G, 3)}<small>G rms</small>`;
    T.$('o-3s').innerHTML = `${T.fmt(3 * G, 3)}<small>G</small>`;
    T.$('o-z').textContent = T.fmt(1 / (2 * Q), 3);
    T.$('o-d').textContent = `${T.fmt(z, 3)} mm`;
    T.$('o-d3').textContent = `${T.fmt(3 * z, 3)} mm`;
  }
  T.live(calc);
})();
