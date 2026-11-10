// Lesson 5: leakage and windows. Derive why a tone between two bins leaks (a geometric series),
// what a Hann window does to it (three shifted copies), and the amplitude correction; then
// solve the same pump signal twice on a calculator, with and without the window.
(function () {
  const { TAU, ease } = Lab;
  const r = String.raw;
  const PI = Math.PI;
  const F = (v, d = 4) => { const x = +(+v).toFixed(d); return (Object.is(x, -0) || Math.abs(x) < 1e-12 ? 0 : x).toString(); };
  const P = (v, d = 4) => (+F(v, d) < 0 ? `(${F(v, d)})` : F(v, d));

  // ---- truth: everything on the boards and in the examples is computed here
  const N = 64, K = 12;
  const hann = (u) => 0.5 * (1 - Math.cos(TAU * u));
  // exact one-sided bin readings 2|X_k| of A cos(2 pi f n / N + ph), optionally Hann-windowed (x2 corrected)
  function bins(f, win, A = 1, ph = 0, corr = true) {
    const out = [];
    for (let k = 0; k <= K; k++) {
      let re = 0, im = 0;
      for (let n = 0; n < N; n++) {
        const x = A * Math.cos(TAU * f * n / N + ph) * (win ? hann(n / N) * (corr ? 2 : 1) : 1);
        re += x * Math.cos(TAU * k * n / N); im -= x * Math.sin(TAU * k * n / N);
      }
      out.push((k === 0 ? 1 : 2) * Math.hypot(re, im) / N);
    }
    return out;
  }
  // the lesson's two formulas (d = f - k, not a whole number)
  const rect = (A, d) => A * Math.abs(Math.sin(PI * d)) / (PI * Math.abs(d));
  const hannR = (A, d) => A * Math.abs(Math.sin(PI * d)) / (PI * Math.abs(d) * Math.abs(d * d - 1));

  // worked examples: a pump at 1490 rpm, 1X = 24.83 Hz, 5 mm/s; record T = 1 s so the bins are 1 Hz apart
  const EX = { A: 5, f: 24.83, ks: [24, 25, 26, 30] };
  const S = Math.abs(Math.sin(PI * (EX.f - 25)));          // |sin(pi d)| is the same for every bin

  // ---- boards
  function recordAndBins(g, f, win, api, o = {}) {
    const c = g.col, ctx = g.ctx;
    const x = (u) => Math.cos(TAU * f * u) * (win ? hann(u) : 1);
    const R = g.plot({ box: [0.05, 0.06, 0.9, 0.34], x: [0, 3], y: [-1.25, 1.25] });
    R.axes({ grid: [1, 2] });
    for (let s = 0; s < 3; s++) R.curve((u) => x(u - s), { from: s, to: s + 1, color: s === 1 ? c.ink : c.muted, width: s === 1 ? 2.6 : 1.6, n: 300 });
    if (win) [1, -1].forEach((sg) => R.curve((u) => sg * hann(u % 1), { color: c.good, width: 1.4, dash: [5, 5], n: 400 }));
    const jump = Math.abs(x(1) - x(0));
    [1, 2].forEach((s) => { ctx.strokeStyle = jump > 0.02 ? c.bad : c.good; ctx.lineWidth = 2.5; ctx.beginPath();
      ctx.arc(R.X(s), R.Y((x(0) + x(1)) / 2), 12, 0, TAU); ctx.stroke(); });
    g.text('the record, repeated', R.X(1.5), R.Y(1.25) - 2, { size: 11 });
    const b = bins(f, win);
    const B = g.plot({ box: [0.05, 0.52, 0.9, 0.34], x: [0.4, K + 0.6], y: [0, 1.15] });
    B.bars(b, { labels: false, noDC: true, color: (k) => (Math.abs(k - f) < 0.75 ? c.blue : c.orange) });
    for (let k = 1; k <= K; k++) g.text(String(k), B.X(k), B.Y(0) + 12, { size: 11 });
    if (o.formula) {            // the lesson's formula as open circles on top of the exact bars
      for (let k = 1; k <= K; k++) { const d = f - k; if (Math.abs(d) < 1e-9 || (win && Math.abs(Math.abs(d) - 1) < 1e-9)) continue;
        const v = win ? hannR(1, d) : rect(1, d); ctx.strokeStyle = c.ink; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(B.X(k), B.Y(Math.min(v, 1.15)), 4.5, 0, TAU); ctx.stroke(); }
    }
    api.legend([[`${F(f, 2)} cycles in the record`, c.ink], ['nearest bins', c.blue], ['leaked bins', c.orange], ...(o.formula ? [['○ the formula', c.muted]] : [])]);
    return { b, jump };
  }

  // arrows e^{i 2 pi d n / N}, n = 0..N-1, laid tip to tail: they close up when d is a whole number
  function arrowChain(g, d, t, api) {
    const c = g.col, ctx = g.ctx, M = 32;
    const grow = ease(t / 1.4), shown = Math.max(1, Math.round(M * grow));
    let x = 0, y = 0; const pts = [[0, 0]];
    for (let n = 0; n < M; n++) { x += Math.cos(TAU * d * n / M); y += Math.sin(TAU * d * n / M); pts.push([x, y]); }
    let x0 = 0, x1 = 0, y0 = 0, y1 = 0;
    pts.forEach(([a, b]) => { x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); });
    const span = Math.max(x1 - x0, y1 - y0, 6), sc = Math.min(g.w * 0.5, g.h * 0.7) / span;
    const ox = g.w * 0.36 - sc * (x0 + x1) / 2, oy = g.h * 0.48 + sc * (y0 + y1) / 2;
    const Q = ([a, b]) => [ox + a * sc, oy - b * sc];
    ctx.lineWidth = 2; ctx.strokeStyle = c.blue; ctx.globalAlpha = 0.85; ctx.beginPath();
    pts.slice(0, shown + 1).forEach((p, i) => { const q = Q(p); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.stroke(); ctx.globalAlpha = 1;
    const e = Q(pts[shown]), o = Q([0, 0]);
    ctx.strokeStyle = c.orange; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
    ctx.fillStyle = c.orange; ctx.beginPath(); ctx.arc(e[0], e[1], 6, 0, TAU); ctx.fill();
    ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(o[0], o[1], 4, 0, TAU); ctx.fill();
    const sum = Math.hypot(pts[M][0], pts[M][1]) / M;
    g.text(`f − k = ${F(d, 2)}`, g.w * 0.8, g.h * 0.3, { size: 14, color: c.ink });
    g.text(`|sum| / N = ${F(sum, 3)}`, g.w * 0.8, g.h * 0.42, { size: 14, color: c.orange });
    api.legend([['N arrows, tip to tail', c.blue], ['their sum', c.orange]]);
  }

  // ---- calculator exercise
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const newEx = (s) => {
    s.ex = { rpm: pick([1475, 1480, 1485, 1490, 2955, 2960, 2970, 2985, 990, 985]), A: pick([2.0, 3.0, 4.0, 5.0, 6.0, 8.0]) };
    s.showSol = false;
  };
  const exNums = (s) => { const f = s.ex.rpm / 60, k = Math.round(f), d = f - k; return { f, k, d, rect: rect(s.ex.A, d), hann: hannR(s.ex.A, d) }; };

  // ---- the working
  const WORK = [];

  // 1. Goal
  WORK.push([
    ['>By the end of this lesson we will have derived why a tone that falls between two FFT bins leaks into all of them, and by how much:'],
    [r`2\,|X_k|\approx A\,\left|\frac{\sin\pi(f-k)}{\pi\,(f-k)}\right|`, '← no window', '', 'box'],
    ['>what a Hann window does to the same tone (after the ×2 correction every analyser applies):'],
    [r`\text{reading}_k\approx A\,\frac{|\sin\pi(f-k)|}{\pi\,|f-k|\;\big|(f-k)^2-1\big|}`, '← Hann window', '', 'box'],
    ['>Here \\(f\\) is the number of cycles of the tone in the record, and \\(k\\) is the bin. Then we solve one pump signal twice on a calculator, with and without the window.'],
  ]);

  // 2. Tools
  WORK.push([
    ['>From Lesson 4, (25): the DFT of \\(N\\) samples, and the peak an analyser shows:'],
    [r`X_k=\frac{1}{N}\sum_{n=0}^{N-1}x_n\,e^{-i2\pi kn/N},\qquad \text{peak}=2\,|X_k|`, '', 'A'],
    ['>Euler’s formula, turned round to give a cosine as two arrows:'],
    [r`\cos\theta=\tfrac12\,e^{i\theta}+\tfrac12\,e^{-i\theta}`, '', 'B'],
    ['>The sum of a geometric series, for any \\(q\\neq1\\):'],
    [r`\sum_{n=0}^{N-1}q^{\,n}=\frac{1-q^{N}}{1-q}`, '← multiply both sides by (1 − q) to check', 'C'],
    ['>One minus an arrow. Take out \\(e^{i\\alpha/2}\\), then use \\(e^{-i\\beta}-e^{i\\beta}=-2i\\sin\\beta\\):'],
    [r`1-e^{i\alpha}=e^{i\alpha/2}\big(e^{-i\alpha/2}-e^{i\alpha/2}\big)=-2i\,e^{i\alpha/2}\sin\tfrac{\alpha}{2}`, '', 'D'],
    ['>For a small angle (in radians):'],
    [r`\sin x\approx x`, '', 'E'],
    ['>And for a whole number \\(m\\): \\(e^{i2\\pi m}=1\\), \\(e^{i\\pi}=-1\\), \\(\\sin(x\\pm\\pi)=-\\sin x\\).'],
  ]);

  // 3. A tone into the DFT
  WORK.push([
    ['>Take one tone of amplitude \\(A\\) that completes \\(f\\) cycles in the record. \\(f\\) need not be a whole number:'],
    [r`x_n=A\cos\!\Big(\frac{2\pi f n}{N}+\varphi\Big)`, '', 1],
    ['>By (B), it is two arrows turning opposite ways:'],
    [r`x_n=\tfrac{A}{2}\,e^{i\varphi}\,e^{i2\pi fn/N}+\tfrac{A}{2}\,e^{-i\varphi}\,e^{-i2\pi fn/N}`, '', 2],
    ['>Put the first arrow into (A). The exponents add:'],
    [r`X_k=\frac{A}{2N}\,e^{i\varphi}\sum_{n=0}^{N-1}e^{\,i2\pi(f-k)n/N}`, '← keep only the +f arrow for now', 3],
    ['>The second arrow gives the same sum with \\(-(f+k)\\) in place of \\(f-k\\). For a bin \\(k\\) near \\(f\\), that is far from zero and it adds very little, so we set it aside. (It matters only when \\(f\\) is close to 0 or to \\(N/2\\).)'],
    ['>The sum in (3) is a geometric series (C), with'],
    [r`q=e^{\,i2\pi(f-k)/N},\qquad q^{N}=e^{\,i2\pi(f-k)}`, '', 4],
    ['>On the board: each term is an arrow of length 1, turned a little more than the last. Laid tip to tail, they curl round.'],
  ]);

  // 4. Whole number of cycles
  WORK.push([
    ['>First case: \\(f\\) is a whole number. In the bin \\(k=f\\), every exponent in (3) is zero, so every term is 1 and the sum is \\(N\\):'],
    [r`X_f=\frac{A}{2N}\,e^{i\varphi}\cdot N=\frac{A}{2}\,e^{i\varphi}\qquad\Rightarrow\qquad 2|X_f|=A`, '← the true amplitude', 5],
    ['>In any other bin, \\(f-k\\) is a whole number that is not zero. Then \\(q\\neq1\\), but by (4) \\(q^N=e^{i2\\pi(f-k)}=1\\), so (C) gives'],
    [r`\sum_{n=0}^{N-1}q^{\,n}=\frac{1-1}{1-q}=0\qquad\Rightarrow\qquad X_k=0\quad(k\neq f)`, '← the arrows close into a loop', 6],
    ['>A tone that fits the record exactly lands in one bin and nowhere else. No leakage.'],
  ]);

  // 5. Between bins
  WORK.push([
    ['>Second case: \\(f\\) is not a whole number. Write \\(\\delta=f-k\\) for the distance from the tone to bin \\(k\\). By (C) and (4):'],
    [r`\sum_{n=0}^{N-1}q^{\,n}=\frac{1-e^{\,i2\pi\delta}}{1-e^{\,i2\pi\delta/N}}`, '', 7],
    ['>Use (D) on the top (with \\(\\alpha=2\\pi\\delta\\)) and on the bottom (with \\(\\alpha=2\\pi\\delta/N\\)). The \\(-2i\\) cancels:'],
    [r`\sum_{n=0}^{N-1}q^{\,n}=\frac{e^{\,i\pi\delta}\sin(\pi\delta)}{e^{\,i\pi\delta/N}\sin(\pi\delta/N)}`, '', 8],
    ['>\\(N\\) is large, so \\(\\pi\\delta/N\\) is a small angle: by (E), \\(\\sin(\\pi\\delta/N)\\approx\\pi\\delta/N\\) and \\(e^{i\\pi\\delta/N}\\approx1\\):'],
    [r`\sum_{n=0}^{N-1}q^{\,n}\approx N\,e^{\,i\pi\delta}\,\frac{\sin\pi\delta}{\pi\delta}`, '', 9],
    ['>Substitute (9) in (3). The \\(N\\)’s cancel:'],
    [r`X_k\approx\frac{A}{2}\,e^{i\varphi}\,e^{\,i\pi\delta}\,\frac{\sin\pi\delta}{\pi\delta},\qquad \delta=f-k`, '', 10],
    ['>Take the size and double it, as in (A). \\(|e^{i\\varphi}|=|e^{i\\pi\\delta}|=1\\):'],
    [r`2\,|X_k|\approx A\,\left|\frac{\sin\pi(f-k)}{\pi\,(f-k)}\right|`, '← leakage', 11, 'box'],
    ['>Every bin gets something. Far from the tone, \\(|\\sin|\\leq1\\), so the leak falls only like \\(1/(\\pi|f-k|)\\): slowly.'],
    ['>The worst case is exactly halfway, \\(\\delta=\\pm\\tfrac12\\), where the two nearest bins both read'],
    [r`A\,\frac{\sin(\pi/2)}{\pi/2}=\frac{2A}{\pi}=0.637\,A\qquad(-3.9\ \text{dB})`, '← the peak can read 36% low', 12],
  ]);

  // 6. What it means: the seam
  WORK.push([
    ['>Why does a tone that doesn’t fit behave so differently? The DFT treats the record as one period of a repeating signal (Lesson 4). Compare the two ends of the record in (1), with \\(\\varphi=0\\):'],
    [r`x_0=A,\qquad x_N=A\cos(2\pi f)`, '', 13],
    ['>If \\(f\\) is a whole number, \\(\\cos(2\\pi f)=1\\) and the ends meet. Otherwise there is a jump at every seam. A jump is a sharp edge, and by Lesson 2, (14), sharp edges need harmonics that fall off only like \\(1/n\\). That is the same slow \\(1/|f-k|\\) as in (11).'],
  ]);

  // 7. The Hann window as three arrows
  WORK.push([
    ['>The fix is to fade the record in and out so the ends meet at zero. The Hann window is'],
    [r`w_n=\tfrac12\Big(1-\cos\frac{2\pi n}{N}\Big)`, '← 0 at both ends, 1 in the middle', 14],
    ['>By (B), the cosine is two arrows, so the window is three terms:'],
    [r`w_n=\tfrac12-\tfrac14\,e^{\,i2\pi n/N}-\tfrac14\,e^{-i2\pi n/N}`, '', 15],
    ['>What does multiplying a signal by \\(e^{\\,i2\\pi n/N}\\) do to its DFT? Put it into (A):'],
    [r`\frac{1}{N}\sum_n x_n\,e^{\,i2\pi n/N}\,e^{-i2\pi kn/N}=\frac{1}{N}\sum_n x_n\,e^{-i2\pi(k-1)n/N}=X_{k-1}`, '← it shifts everything up one bin', 16],
    ['>In the same way \\(e^{-i2\\pi n/N}\\) gives \\(X_{k+1}\\). So the DFT of the windowed record \\(w_nx_n\\), call it \\(Y_k\\), is by (15) and (16)'],
    [r`Y_k=\tfrac12\,X_k-\tfrac14\,X_{k-1}-\tfrac14\,X_{k+1}`, '← each bin minus half the average of its neighbours', 17, 'box'],
  ]);

  // 8. A tone on a bin, through the window
  WORK.push([
    ['>Try (17) on a tone that fits the record, \\(f=m\\). By (5) and (6), \\(X_m=\\tfrac{A}{2}e^{i\\varphi}\\) and every other \\(X_k=0\\):'],
    [r`Y_m=\tfrac12X_m=\tfrac{A}{4}\,e^{i\varphi},\qquad Y_{m\pm1}=-\tfrac14X_m=-\tfrac{A}{8}\,e^{i\varphi},\qquad\text{all others }0`, '', 18],
    ['>Two things happened. First, the peak reads half what it should:'],
    [r`2\,|Y_m|=\tfrac{A}{2}`, '← the window removed half the signal', 19],
    ['>So an analyser multiplies a Hann-windowed spectrum by 2, the amplitude correction. (2 is one over the average height of the window, which is \\(\\tfrac12\\) by (14).) After correction:'],
    [r`\text{reading}_m=A,\qquad \text{reading}_{m\pm1}=\tfrac{A}{2}`, '← right peak, but two neighbours at −6 dB', 20],
    ['>Second, the tone now occupies three bins, not one. That is the price of a window: a wider peak.'],
  ]);

  // 9. Why the far leak collapses
  WORK.push([
    ['>Now the tone between bins. Look again at (10). Moving one bin changes \\(\\delta\\) by 1, which by the tools flips the sign of \\(e^{i\\pi\\delta}\\) and of \\(\\sin\\pi\\delta\\): two flips, so their product does not change. So across the bins'],
    [r`X_k\approx\frac{c}{\delta},\qquad c=\frac{A}{2\pi}\,e^{i\varphi}\,e^{\,i\pi\delta}\sin\pi\delta\quad\text{(the same for every bin)}`, '', 21],
    ['>The neighbours are \\(X_{k-1}\\approx c/(\\delta+1)\\) and \\(X_{k+1}\\approx c/(\\delta-1)\\). Substitute in (17):'],
    [r`Y_k\approx c\Big[\frac{1}{2\delta}-\frac{1}{4(\delta+1)}-\frac{1}{4(\delta-1)}\Big]`, '', 22],
    ['>Combine the last two fractions: \\(\\frac{1}{\\delta+1}+\\frac{1}{\\delta-1}=\\frac{2\\delta}{\\delta^2-1}\\). Then put everything over \\(2\\delta(\\delta^2-1)\\):'],
    [r`Y_k\approx c\Big[\frac{1}{2\delta}-\frac{\delta}{2(\delta^2-1)}\Big]=c\,\frac{(\delta^2-1)-\delta^2}{2\delta(\delta^2-1)}=\frac{-c}{2\,\delta\,(\delta^2-1)}`, '← the big terms cancel', 23],
    ['>Take the size, double it as in (A), and apply the ×2 correction of (20):'],
    [r`\text{reading}_k\approx A\,\frac{|\sin\pi\delta|}{\pi\,|\delta|\,|\delta^2-1|},\qquad \delta=f-k`, '← Hann', 24, 'box'],
    ['>Far from the tone this falls like \\(1/|\\delta|^3\\), not \\(1/|\\delta|\\). Five bins away it is about 25 times smaller than without the window.'],
    ['>And the worst case, halfway (\\(\\delta=\\tfrac12\\)), is much milder than (12):'],
    [r`A\,\frac{1}{\pi\cdot\tfrac12\cdot\big|\tfrac14-1\big|}=\frac{A}{0.375\,\pi}=0.849\,A\qquad(-1.4\ \text{dB})`, '← 15% low at worst, not 36%', 25],
  ]);

  // 10. Example 1: no window
  {
    const { A, f, ks } = EX;
    const rows = ks.map((k) => { const d = f - k; return [r`k=${k}:\quad \delta=${f}-${k}=${F(d, 2)},\qquad 2|X_{${k}}|\approx${A}\times\frac{${F(S)}}{\pi\times${F(Math.abs(d), 2)}}=${A}\times\frac{${F(S)}}{${F(PI * Math.abs(d))}}=${F(rect(A, d), 3)}\ \text{mm/s}`, k === 25 ? '← the tallest bin' : k === 30 ? '← 5 bins away' : '']; });
    WORK.push([
      ['>Worked example 1. A pump runs at 1490 rpm with a 1X vibration of \\(A=5\\) mm/s. The analyser takes a 1-second record with no window. What does the spectrum show?'],
      ['>The bins are \\(1/T=1\\) Hz apart, so the number of cycles in the record equals the frequency in hertz. From Lesson 1, (13):'],
      [r`f=\frac{1490}{60}=24.83\ \text{cycles in the record}`, '← between bins 24 and 25', 26],
      ['>The top of (11) is the same for every bin, since moving one bin only flips the sign of the sine. Work it out once (calculator in radians, or \\(0.17\\times180^\\circ=30.6^\\circ\\)):'],
      [r`|\sin\pi(24.83-25)|=|\sin(-0.17\pi)|=\sin(30.6^\circ)=${F(S)}`, '', 27],
      ['>Now (11), bin by bin:'],
      ...rows,
      ['>So the analyser shows its tallest peak at 25 Hz, reading'],
      [r`${F(rect(A, f - 25), 2)}\ \text{mm/s instead of }5.00:\qquad \frac{${F(rect(A, f - 25), 3)}-5}{5}=${F((rect(A, f - 25) / A - 1) * 100, 1)}\%`, '← low, and at the wrong frequency', 28],
      [`>with false peaks of ${F(rect(A, f - 24), 2)} and ${F(rect(A, f - 26), 2)} mm/s beside it, and ${F(rect(A, f - 30), 2)} mm/s still showing five bins away. A small real component near 30 Hz would be hidden under that.`],
    ]);
  }

  // 11. Example 2: Hann
  {
    const { A, f, ks } = EX;
    const rows = ks.map((k) => { const d = f - k; return [r`k=${k}:\quad \text{reading}\approx${A}\times\frac{${F(S)}}{\pi\times${F(Math.abs(d), 2)}\times|${F(d * d, 4)}-1|}=${A}\times\frac{${F(S)}}{${F(PI * Math.abs(d) * Math.abs(d * d - 1))}}=${F(hannR(A, d), k === 30 ? 4 : 3)}\ \text{mm/s}`, k === 25 ? '← the tallest bin' : k === 30 ? '← 5 bins away' : '']; });
    WORK.push([
      ['>Worked example 2. The same pump and the same record, now with a Hann window (and the analyser’s ×2 correction).'],
      ['>Use (24) with the same \\(\\delta\\) values, and \\(|\\sin\\pi\\delta|\\) from (27). The only new part is \\(|\\delta^2-1|\\):'],
      ...rows,
      ['>Compare with example 1:'],
      [r`\text{peak: }${F(hannR(A, f - 25), 2)}\ \text{mm/s},\qquad \frac{${F(hannR(A, f - 25), 3)}-5}{5}=${F((hannR(A, f - 25) / A - 1) * 100, 1)}\%`, `← was ${F((rect(A, f - 25) / A - 1) * 100, 1)}%`, 29],
      [r`\text{5 bins away: }\frac{${F(rect(A, f - 30), 4)}}{${F(hannR(A, f - 30), 4)}}=${F(rect(A, f - 30) / hannR(A, f - 30), 0)}\ \text{times lower}\qquad(${F(20 * Math.log10(hannR(A, f - 30) / rect(A, f - 30)), 0)}\ \text{dB})`, '← the far leak is gone', 30],
      [`>The price shows in bins 24 and 26: ${F(hannR(A, f - 24), 2)} and ${F(hannR(A, f - 26), 2)} mm/s, higher than before. The peak is wider, as (20) said it would be. For reading a machine spectrum that is a good trade: the amplitude is closer and nothing is buried.`],
    ]);
  }

  // 12. Your turn
  WORK.push((s) => {
    if (!s.ex) newEx(s);
    const { rpm, A } = s.ex, E = exNums(s), sn = Math.abs(Math.sin(PI * E.d));
    const given = [
      ['>Your turn. A machine runs at'],
      [r`${rpm}\ \text{rpm},\qquad 1\text{X amplitude }A=${F(A, 1)}\ \text{mm/s},\qquad \text{record }T=1\ \text{s}`, '← bins 1 Hz apart', 31],
    ];
    if (!s.showSol) return given;
    return [
      ...given,
      ['>Cycles in the record, the nearest bin and the distance to it:'],
      [r`f=\frac{${rpm}}{60}=${F(E.f, 3)},\qquad k=${E.k},\qquad \delta=f-k=${F(E.d, 3)}`, '', 32],
      [r`|\sin\pi\delta|=\sin(${F(Math.abs(E.d) * 180, 1)}^\circ)=${F(sn)}`, ''],
      ['>No window, by (11):'],
      [r`2|X_{${E.k}}|\approx${F(A, 1)}\times\frac{${F(sn)}}{\pi\times${F(Math.abs(E.d), 3)}}=${F(E.rect, 3)}\ \text{mm/s}`, `← ${F((E.rect / A - 1) * 100, 1)}%`],
      ['>Hann window, by (24):'],
      [r`\text{reading}\approx${F(A, 1)}\times\frac{${F(sn)}}{\pi\times${F(Math.abs(E.d), 3)}\times|${F(E.d * E.d, 4)}-1|}=${F(E.hann, 3)}\ \text{mm/s}`, `← ${F((E.hann / A - 1) * 100, 1)}%`],
    ];
  });

  // 13. Summary
  WORK.push([
    ['>Everything in this lesson on one card (\\(\\delta=f-k\\) is the distance from the tone to the bin, in bins):'],
    [r`\delta\ \text{a whole number}\ \Rightarrow\ \text{one bin reads }A,\ \text{the rest read }0`, '← from (5), (6)', '', 'box'],
    [r`\text{no window:}\quad 2|X_k|\approx A\,\left|\frac{\sin\pi\delta}{\pi\delta}\right|\qquad\text{worst case }0.637A`, '← from (11), (12)', '', 'box'],
    [r`\text{Hann:}\quad Y_k=\tfrac12X_k-\tfrac14X_{k-1}-\tfrac14X_{k+1},\qquad \text{correct by }\times2`, '← from (17), (20)', '', 'box'],
    [r`\text{Hann:}\quad \text{reading}_k\approx A\,\frac{|\sin\pi\delta|}{\pi|\delta|\,|\delta^2-1|}\qquad\text{worst case }0.849A`, '← from (24), (25)', '', 'box'],
    ['>Leakage falls like \\(1/\\delta\\) without a window and like \\(1/\\delta^3\\) with a Hann window. The price is a peak three bins wide.'],
  ]);

  Lab.lesson({
    work: WORK,
    heads: true,
    next: '../',
    state: { d: 0.5, f6: 4.5, w6: 'rect', fm: 4, f9: 4.5, w9: 'hann', e1: 'hann' },
    steps: [
      {
        part: 'Goal',
        title: 'Where we are going',
        text: `<p>One clean tone should give one clean line in a spectrum. Often it gives a blurred hill instead. This lesson derives exactly why, and what a window does about it, then works one pump signal through both ways.</p>
               <p class="hint">The working builds up below the board. Click any heading there to fold it away.</p>`,
        draw(g, s, t, api) { recordAndBins(g, 4 + 0.5 * ease(t / 2.5), false, api); },
      },
      {
        part: 'What we already know',
        title: 'The tools',
        text: `<p>Five facts, lettered (A) to (E). The one doing most of the work is (C), the sum of a geometric series.</p>
               <p>On the board: the terms of that sum are arrows, each turned a little more than the last. Drag the slider. When the total turn is a whole number of circles, the arrows close into a loop and the sum is zero.</p>`,
        controls: [{ type: 'range', key: 'd', label: 'Total turn, f − k', min: 0, max: 3, step: 0.05, fmt: (v) => v.toFixed(2) + ' turns', onInput: (s, api) => api.restart() }],
        draw(g, s, t, api) { arrowChain(g, s.d, t, api); },
      },
      {
        part: 'Derivation',
        title: 'A tone into the DFT',
        text: `<p>Write the tone as two arrows and put one of them into the DFT. Out comes a geometric series: \\(N\\) arrows, each turned by the same small step.</p>
               <p>The step depends on \\(f-k\\): how far the tone is from the bin you are computing.</p>`,
        draw(g, s, t, api) { arrowChain(g, 0.5, t, api); },
      },
      {
        part: 'Derivation',
        title: 'A whole number of cycles',
        text: `<p>If the tone fits the record exactly, the arrows either all line up (in its own bin) or close into a loop (in every other bin).</p>
               <p>Slide \\(f\\) through whole numbers on the board: one bar, nothing else.</p>`,
        controls: [{ type: 'range', key: 'fm', label: 'Cycles in the record', min: 2, max: 10, step: 1, fmt: (v) => `f = ${v}` }],
        draw(g, s, t, api) { recordAndBins(g, s.fm, false, api); api.verdict('One bin reads A. The rest read 0.', 'good'); },
      },
      {
        part: 'Derivation',
        title: 'Between two bins',
        text: `<p>If the tone doesn’t fit, the arrows never close, and every bin gets a share. The geometric series gives the share exactly; for large \\(N\\) it simplifies to \\(\\sin(\\pi\\delta)/(\\pi\\delta)\\).</p>
               <p>On the board, the open circles are that formula; the bars are the exact FFT of 64 samples. They agree closely, except near the edges where the other arrow matters.</p>`,
        controls: [{ type: 'range', key: 'f6', label: 'Cycles in the record', min: 3, max: 9, step: 0.05, fmt: (v) => `f = ${v.toFixed(2)}` }],
        draw(g, s, t, api) {
          const { b } = recordAndBins(g, s.f6, false, api, { formula: true });
          api.verdict(`Tallest bin reads ${F(Math.max(...b.slice(1)), 3)} A`, Math.abs(s.f6 - Math.round(s.f6)) < 0.01 ? 'good' : 'bad');
        },
      },
      {
        part: 'What it means',
        title: 'The jump at the seam',
        text: `<p>The FFT treats the record as if it repeated. If the tone doesn’t fit, the end of one copy doesn’t meet the start of the next: there is a jump at every seam, and a jump needs many frequencies.</p>
               <p>Slide \\(f\\), and switch the window on to see the seams close.</p>`,
        controls: [
          { type: 'choice', key: 'w6', options: [['rect', 'No window'], ['hann', 'Hann window']] },
          { type: 'range', key: 'f6', label: 'Cycles in the record', min: 3, max: 9, step: 0.05, fmt: (v) => `f = ${v.toFixed(2)}` },
        ],
        draw(g, s, t, api) {
          const { jump } = recordAndBins(g, s.f6, s.w6 === 'hann', api);
          api.verdict(`Jump at the seam = ${F(jump, 2)} A`, jump < 0.02 ? 'good' : 'bad');
        },
      },
      {
        part: 'Derivation',
        title: 'The Hann window is three arrows',
        text: `<p>A Hann window is a constant minus a cosine, and a cosine is two arrows. Multiplying a signal by an arrow shifts its whole spectrum by one bin.</p>
               <p>So windowing never needs a new FFT: each new bin is half the old bin, minus a quarter of each neighbour.</p>`,
        draw(g, s, t, api) {
          const c = g.col;
          const Pl = g.plot({ box: [0.06, 0.1, 0.9, 0.62], x: [0, 1], y: [-1.25, 1.25] });
          Pl.axes({ ticks: [[0.5, 'T/2'], [1, 'T']] });
          const k = ease(t / 1.6);
          Pl.curve((u) => Math.cos(TAU * 4.5 * u), { color: c.muted, width: 1.4, alpha: 0.6 });
          [1, -1].forEach((sg) => Pl.curve((u) => sg * (1 - k + k * hann(u)), { color: c.good, width: 1.6, dash: [5, 5] }));
          Pl.curve((u) => Math.cos(TAU * 4.5 * u) * (1 - k + k * hann(u)), { color: c.ink, width: 2.6, glow: true });
          api.legend([['the record', c.muted], ['Hann window', c.good], ['record × window', c.ink]]);
        },
      },
      {
        part: 'Derivation',
        title: 'A tone on a bin, through the window',
        text: `<p>Even a tone that fits perfectly is changed by the window: its bin reads half, and its two neighbours each pick up a quarter. Analysers multiply by 2 to put the peak right.</p>
               <p>The board shows the corrected spectrum: the right peak, with two neighbours at half height.</p>`,
        controls: [{ type: 'range', key: 'fm', label: 'Cycles in the record', min: 2, max: 10, step: 1, fmt: (v) => `f = ${v}` }],
        draw(g, s, t, api) { recordAndBins(g, s.fm, true, api); api.verdict('Peak reads A; neighbours read A/2', 'good'); },
      },
      {
        part: 'Derivation',
        title: 'Why the far leak collapses',
        text: `<p>Without a window, neighbouring bins of a leaking tone are nearly equal. The window subtracts half the average of the neighbours from each bin, so far from the tone almost everything cancels.</p>
               <p>Switch between the two on the board. Open circles are the formulas.</p>`,
        controls: [
          { type: 'choice', key: 'w9', options: [['rect', 'No window'], ['hann', 'Hann window']] },
          { type: 'range', key: 'f9', label: 'Cycles in the record', min: 3, max: 9, step: 0.05, fmt: (v) => `f = ${v.toFixed(2)}` },
        ],
        draw(g, s, t, api) {
          const { b } = recordAndBins(g, s.f9, s.w9 === 'hann', api, { formula: true });
          const far = b[12] / Math.max(...b.slice(1));
          api.verdict(`Bin 12 is ${far < 1e-6 ? 'below −120' : F(20 * Math.log10(far), 0)} dB under the peak`, s.w9 === 'hann' ? 'good' : 'bad');
        },
      },
      {
        part: 'Worked example 1',
        title: 'A pump at 1490 rpm, no window',
        text: `<p>A 5 mm/s vibration at 24.83 Hz, a 1-second record, no window. Bin by bin on a calculator: where the peak appears, how low it reads, and how far the leak reaches.</p>`,
        draw(g, s, t, api) { exBoard(g, false, api); },
      },
      {
        part: 'Worked example 2',
        title: 'The same pump, with a Hann window',
        text: `<p>Same signal, same record, Hann window on. The peak reads closer to 5 mm/s and the far bins drop out, at the cost of a wider peak.</p>`,
        controls: [{ type: 'choice', key: 'e1', options: [['rect', 'No window'], ['hann', 'Hann window']] }],
        draw(g, s, t, api) { exBoard(g, s.e1 === 'hann', api); },
      },
      {
        part: 'Your turn',
        title: 'Try it with a calculator',
        tryLabel: 'Your answers',
        text: (s) => {
          if (!s.ex) newEx(s);
          const { rpm, A } = s.ex;
          return `<div class="problem"><p>A machine runs at ${rpm} rpm with a 1X vibration of ${F(A, 1)} mm/s. The analyser takes a 1-second record.</p>
                  <p>What does the tallest bin read without a window, and with a Hann window?</p></div>`;
        },
        controls: [
          { type: 'answer', label: 'Distance to the nearest bin, \\(\\delta=f-k\\)', unit: 'bins', value: (s) => exNums(s).d, abs: 0.006 },
          { type: 'answer', label: 'Tallest bin, no window', unit: 'mm/s', value: (s) => exNums(s).rect, rel: 0.02 },
          { type: 'answer', label: 'Tallest bin, Hann window', unit: 'mm/s', value: (s) => exNums(s).hann, rel: 0.02 },
          { type: 'check' },
          { type: 'button', label: 'Show working', action: (s, api) => { s.showSol = true; api.rewrite(); } },
          { type: 'button', label: 'New numbers', action: (s, api) => { newEx(s); api.refresh(); api.rewrite(); } },
        ],
        draw(g, s, t, api) {
          if (!s.ex) newEx(s);
          const E = exNums(s), c = g.col, A = s.ex.A, k0 = E.k - 4;
          const B = g.plot({ box: [0.06, 0.12, 0.9, 0.68], x: [-0.6, 8.6], y: [0, A * 1.15] });
          const ctx = g.ctx;
          ctx.strokeStyle = c.muted; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(B.X(-0.6), B.Y(A)); ctx.lineTo(B.X(8.6), B.Y(A)); ctx.stroke(); ctx.setLineDash([]);
          g.text(`true amplitude ${F(A, 1)} mm/s`, B.X(1.2), B.Y(A) - 10, { size: 11 });
          const vals = Array.from({ length: 9 }, (_, i) => { const d = E.f - (k0 + i); return s.showSol ? rect(A, d) : 0; });
          B.bars(vals, { labels: false, ghost: true, color: (i) => (k0 + i === E.k ? c.blue : c.orange) });
          for (let i = 0; i < 9; i++) g.text(String(k0 + i), B.X(i), B.Y(0) + 13, { size: 11 });
          ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(B.X(E.f - k0), B.Y(0)); ctx.lineTo(B.X(E.f - k0), B.Y(A)); ctx.stroke();
          api.legend(s.showSol ? [['the tone', c.ink], ['what the FFT shows (no window)', c.blue]] : [['the tone, between two bins', c.ink], ['bins (Hz)', c.muted]]);
        },
      },
      {
        part: 'Summary',
        title: 'On one card',
        text: `<p>Four boxed results, each derived above. A tone on a bin is exact; a tone between bins leaks like \\(1/\\delta\\); a Hann window turns that into \\(1/\\delta^3\\) and is corrected by ×2.</p>
               <p>Next in the series: wavelets, for signals that change over time.</p>`,
        controls: [{ type: 'choice', key: 'w9', options: [['rect', 'No window'], ['hann', 'Hann window']] }],
        draw(g, s, t, api) { recordAndBins(g, 4.5, s.w9 === 'hann', api, { formula: true }); },
      },
    ],
  });

  // the pump example: bins 20..31 Hz, the lesson's formulas as bars, exact FFT (256 samples) as open circles
  function exBoard(g, win, api) {
    const c = g.col, ctx = g.ctx, { A, f } = EX, k0 = 20, n = 12, NN = 256;
    const B = g.plot({ box: [0.06, 0.12, 0.9, 0.68], x: [-0.6, n - 0.4], y: [0, A * 1.15] });
    ctx.strokeStyle = c.muted; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(B.X(-0.6), B.Y(A)); ctx.lineTo(B.X(n - 0.4), B.Y(A)); ctx.stroke(); ctx.setLineDash([]);
    g.text('true amplitude 5 mm/s', B.X(1.4), B.Y(A) - 10, { size: 11 });
    const vals = Array.from({ length: n }, (_, i) => (win ? hannR : rect)(A, f - (k0 + i)));
    B.bars(vals, { labels: false, color: (i) => (k0 + i === 25 ? c.blue : c.orange) });
    for (let i = 0; i < n; i++) {
      g.text(String(k0 + i), B.X(i), B.Y(0) + 13, { size: 11 });
      if (vals[i] > (g.w > 620 ? 0.12 : 0.6)) g.text(F(vals[i], 2), B.X(i), B.Y(vals[i]) - 9, { size: 11, color: c.ink });
      let re = 0, im = 0;                                     // exact DFT bin, for the check
      for (let m = 0; m < NN; m++) { const x = A * Math.cos(TAU * f * m / NN) * (win ? 2 * hann(m / NN) : 1); re += x * Math.cos(TAU * (k0 + i) * m / NN); im -= x * Math.sin(TAU * (k0 + i) * m / NN); }
      ctx.strokeStyle = c.ink; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(B.X(i), B.Y(2 * Math.hypot(re, im) / NN), 4.5, 0, TAU); ctx.stroke();
    }
    ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(B.X(f - k0), B.Y(0)); ctx.lineTo(B.X(f - k0), B.Y(A)); ctx.stroke();
    g.text('24.83 Hz', B.X(f - k0), B.Y(A) - 22, { size: 11, color: c.ink });
    api.legend([['the real tone', c.ink], [win ? 'formula (24)' : 'formula (11)', c.blue], ['○ exact FFT, 256 samples', c.muted]]);
    api.verdict(`Peak reads ${F(vals[5], 2)} mm/s (${F((vals[5] / A - 1) * 100, 1)}%)`, win ? 'good' : 'bad');
  }
})();
