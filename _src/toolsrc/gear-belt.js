(function () {
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  function calc() {
    let f1 = T.num('rpm'); if (T.$('u').value === 'rpm') f1 /= 60;
    const z1 = Math.round(T.num('z1')), z2 = Math.round(T.num('z2'));
    const gmf = z1 * f1, f2 = f1 * z1 / z2, na = gcd(z1, z2);
    const row = (k, v) => `<tr><td>${k}</td><td class="num">${T.fmt(v)}</td><td class="num">${T.fmt(v * 60)}</td></tr>`;
    T.$('gear').innerHTML = [
      row('Input shaft speed f<sub>1</sub>', f1),
      row('Output shaft speed f<sub>2</sub>', f2),
      row('Gear mesh frequency (GMF)', gmf),
      row('2 × GMF', 2 * gmf),
      row('3 × GMF', 3 * gmf),
      row(`Hunting tooth frequency (N<sub>a</sub> = ${na})`, gmf * na / (z1 * z2)),
      row('Assembly phase frequency (GMF / N<sub>a</sub>)', gmf / na),
    ].join('') + `<tr><td>Ratio</td><td class="num" colspan="2">${T.fmt(z2 / z1, 4)} : 1</td></tr>`;
    const d1 = T.num('d1') / 1000, d2 = T.num('d2') / 1000, L = T.num('bl') / 1000;
    const fb = Math.PI * d1 * f1 / L;
    T.$('belt').innerHTML = [
      row('Driven pulley speed', f1 * d1 / d2),
      row('Belt frequency', fb),
      row('2 × belt frequency', 2 * fb),
      row('3 × belt frequency', 3 * fb),
    ].join('') + `<tr><td>Belt speed</td><td class="num" colspan="2">${T.fmt(Math.PI * d1 * f1)} m/s</td></tr>`;
  }
  T.live(calc);
})();
