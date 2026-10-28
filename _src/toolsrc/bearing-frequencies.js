(function () {
  function calc() {
    let fr = T.num('rpm'); if (T.$('sunit').value === 'rpm') fr /= 60;
    const n = T.num('n'), d = T.num('d'), D = T.num('D'), th = T.num('th') * Math.PI / 180;
    const r = (d / D) * Math.cos(th);
    const f = {
      'BPFO · outer race': n * fr / 2 * (1 - r),
      'BPFI · inner race': n * fr / 2 * (1 + r),
      'BSF · rolling element': D / (2 * d) * fr * (1 - r * r),
      'FTF · cage': fr / 2 * (1 - r),
    };
    T.$('out').innerHTML = Object.entries(f).map(([k, v]) =>
      `<tr><td>${k}</td><td class="num">${T.fmt(v)}</td><td class="num">${T.fmt(v * 60)}</td><td class="num">${T.fmt(v / fr, 3)}</td></tr>`).join('');
    T.$('harm').innerHTML = Object.entries(f).map(([k, v]) =>
      `<tr><td>${k.split(' ')[0]}</td>${[1, 2, 3, 4].map((h) => `<td class="num">${T.fmt(v * h)}</td>`).join('')}</tr>`).join('');
  }
  T.live(calc);
})();
