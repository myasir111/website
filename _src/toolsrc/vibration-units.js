(function () {
  const G = 9.80665;
  // Factor to convert each unit to SI base (m/s², m/s, m).
  const U = {
    g: ['a', G], ms2: ['a', 1], ins2: ['a', 0.0254],
    mms: ['v', 1e-3], ins: ['v', 0.0254],
    um: ['d', 1e-6], mm: ['d', 1e-3], mil: ['d', 0.0254e-3],
  };
  const DET = { pk: 1, rms: Math.SQRT2, pp: 0.5 }; // multiply to get peak
  const rows = [
    ['Acceleration', 'g', 'a', 1 / G], ['Acceleration', 'm/s²', 'a', 1], ['Acceleration', 'in/s²', 'a', 1 / 0.0254],
    ['Velocity', 'mm/s', 'v', 1e3], ['Velocity', 'in/s', 'v', 1 / 0.0254],
    ['Displacement', 'µm', 'd', 1e6], ['Displacement', 'mm', 'd', 1e3], ['Displacement', 'mil', 'd', 1 / 0.0254e-3],
  ];
  function calc() {
    const val = T.num('val'), [q, k] = U[T.$('unit').value];
    let f = T.num('f'); if (T.$('funit').value === 'cpm') f /= 60;
    const w = 2 * Math.PI * f;
    const pk = val * k * DET[T.$('det').value];
    const si = q === 'a' ? { a: pk, v: pk / w, d: pk / (w * w) }
             : q === 'v' ? { a: pk * w, v: pk, d: pk / w }
             : { a: pk * w * w, v: pk * w, d: pk };
    T.$('out').innerHTML = rows.map(([name, unit, qq, s]) => {
      const p = si[qq] * s;
      return `<tr><td>${name} <span class="note">(${unit})</span></td><td class="num">${T.fmt(p)}</td><td class="num">${T.fmt(p / Math.SQRT2)}</td><td class="num">${T.fmt(2 * p)}</td></tr>`;
    }).join('');
  }
  T.live(calc);
})();
