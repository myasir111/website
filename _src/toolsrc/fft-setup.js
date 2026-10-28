(function () {
  function calc() {
    const fmax = T.num('fmax'), L = +T.$('lines').value, n = Math.max(1, Math.round(T.num('navg'))), ov = +T.$('ov').value / 100, enbw = +T.$('win').value;
    const df = fmax / L, tb = 1 / df, fs = 2.56 * fmax, N = 2.56 * L;
    const tt = tb * (1 + (n - 1) * (1 - ov));
    T.$('o-df').innerHTML = `${T.fmt(df)}<small>Hz</small>`;
    T.$('o-tt').innerHTML = `${T.fmt(tt, 3)}<small>s</small>`;
    T.$('out').innerHTML = [
      ['Sample rate', `${T.fmt(fs)} Hz`],
      ['Block size', `${T.fmt(N)} samples`],
      ['Time per block', `${T.fmt(tb, 3)} s`],
      ['Resolution in CPM', `${T.fmt(df * 60)} CPM`],
      ['Effective bandwidth (window ENBW × Δf)', `${T.fmt(enbw * df)} Hz`],
    ].map(([k, v]) => `<tr><td>${k}</td><td class="num">${v}</td></tr>`).join('');
    const fa = T.num('fa'), fb = T.num('fb');
    if (isFinite(fa) && isFinite(fb) && fa !== fb) {
      const bins = Math.abs(fa - fb) / df;
      const need = Math.abs(fa - fb) / 4;
      T.$('o-msg').innerHTML = bins >= 4
        ? `<div class="ok">${T.fmt(fa)} Hz and ${T.fmt(fb)} Hz are ${T.fmt(bins, 3)} bins apart: separable.</div>`
        : `<div class="warn">Only ${T.fmt(bins, 3)} bins apart: likely to merge into one peak. Aim for Δf ≤ ${T.fmt(need)} Hz, e.g. ${Math.ceil(fmax / need)}+ lines at this F<sub>max</sub>, which takes ${T.fmt(4 / Math.abs(fa - fb), 3)} s per block.</div>`;
    } else T.$('o-msg').innerHTML = '';
  }
  T.live(calc);
})();
