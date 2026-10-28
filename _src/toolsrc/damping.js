(function () {
  function calc() {
    const v = T.num('val'), fn = T.num('fn');
    const k = T.$('kind').value;
    const z = k === 'z' ? v : k === 'pct' ? v / 100 : k === 'Q' ? 1 / (2 * v) : k === 'eta' ? v / 2
      : k === 'delta' ? v / Math.sqrt(4 * Math.PI ** 2 + v * v) : v / (2 * fn);
    const rows = [
      ['Damping ratio ζ', T.fmt(z)],
      ['% of critical', T.fmt(z * 100) + ' %'],
      ['Quality factor Q', T.fmt(1 / (2 * z))],
      ['Loss factor η', T.fmt(2 * z)],
      ['Logarithmic decrement δ', z < 1 ? T.fmt(2 * Math.PI * z / Math.sqrt(1 - z * z)) : '— (overdamped)'],
      ['Half-power bandwidth at f<sub>n</sub>', `${T.fmt(2 * z * fn)} Hz`],
      ['Cycles to decay to 10%', z < 1 ? T.fmt(Math.log(10) / (2 * Math.PI * z / Math.sqrt(1 - z * z)), 3) : '—'],
    ];
    T.$('out').innerHTML = rows.map(([a, b]) => `<tr><td>${a}</td><td class="num">${b}</td></tr>`).join('');
  }
  T.live(calc);
})();
