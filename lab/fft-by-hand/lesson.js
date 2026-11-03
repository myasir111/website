// Lesson: an FFT by hand. 8 samples, one bin at a time, worked like class notes.
(function () {
  const { TAU, ease } = Lab;
  const N = 8;
  const K = [...Array(N).keys()];
  const sig = (a1, b1, a2) => (t) => a1 * Math.cos(TAU * t) + b1 * Math.sin(TAU * t) + a2 * Math.cos(2 * TAU * t);
  const samples = (f) => K.map((k) => f(k / N));
  const dft = (x, n) => {
    let re = 0, im = 0;
    x.forEach((v, k) => { re += v * Math.cos(TAU * n * k / N); im -= v * Math.sin(TAU * n * k / N); });
    return { re: re / N, im: im / N };
  };
  const F = (v, d = 4) => {
    const r = +(+v).toFixed(d);
    return (Object.is(r, -0) ? 0 : r).toString();
  };
  const f0 = sig(0.6, 0.8, 0.5);
  const x0 = samples(f0);

  // ---- sketches
  function waveWithSamples(g, f, xs, box = [0.06, 0.08, 0.9, 0.62]) {
    const c = g.col;
    const P = g.plot({ box, x: [0, 1], y: [-1.7, 1.7] });
    P.axes({ grid: K.slice(1).map((k) => k / N), ticks: [[0.5, 'T/2'], [1, 'T']] });
    P.curve(f, { color: c.muted, width: 1.6, dash: [5, 5] });
    xs.forEach((v, k) => {
      const ctx = g.ctx;
      ctx.strokeStyle = c.blue; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(P.X(k / N), P.Y(0)); ctx.lineTo(P.X(k / N), P.Y(v)); ctx.stroke();
      P.dot(k / N, v, { color: c.blue, r: 5 });
      g.text(`x${k}`, P.X(k / N), P.Y(0) + (v >= 0 ? 14 : -10), { size: 11, color: c.muted });
    });
    return P;
  }

  // the winding machine: each sample becomes an arrow at angle -2πnk/N; the dot is their average
  function winding(g, xs, n, t, cx, cy, R) {
    const c = g.col, ctx = g.ctx;
    ctx.strokeStyle = c.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - R * 1.15, cy); ctx.lineTo(cx + R * 1.15, cy);
    ctx.moveTo(cx, cy - R * 1.15); ctx.lineTo(cx, cy + R * 1.15); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    g.text('Re', cx + R * 1.15, cy - 10, { size: 11 }); g.text('Im', cx + 12, cy - R * 1.12, { size: 11 });
    const grow = ease(t / 1.2);
    let sre = 0, sim = 0;
    xs.forEach((v, k) => {
      const ang = -TAU * n * k / N * grow;
      const px = v * Math.cos(ang), py = v * Math.sin(ang);
      sre += px; sim += py;
      ctx.strokeStyle = c.blue; ctx.globalAlpha = 0.55; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + px / 1.4 * R, cy - py / 1.4 * R); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = c.blue; ctx.beginPath(); ctx.arc(cx + px / 1.4 * R, cy - py / 1.4 * R, 4, 0, TAU); ctx.fill();
    });
    const re = sre / N, im = sim / N;
    const dx = cx + re / 1.4 * R, dy = cy - im / 1.4 * R;
    ctx.strokeStyle = c.orange; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(dx, dy); ctx.stroke();
    ctx.fillStyle = c.orange; ctx.beginPath(); ctx.arc(dx, dy, 7, 0, TAU); ctx.fill();
    return { re, im };
  }

  // ---- calculator exercise
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const newEx = (s) => {
    s.ex = { a1: pick([0.3, 0.4, 0.5, 0.6, 0.8, 1.0, 1.2]) * pick([1, -1]), b1: pick([0.2, 0.4, 0.5, 0.6, 0.9, 1.1]),
             a2: pick([0.2, 0.3, 0.4, 0.5]) };
    s.showSol = false;
  };

  const r = String.raw;
  const tableRows = (xs, n) => xs.map((v, k) => {
    const cth = Math.cos(TAU * n * k / N), sth = Math.sin(TAU * n * k / N);
    return `${k} & ${F(v)} & ${F(cth)} & ${F(sth)} & ${F(v * cth)} & ${F(v * sth)}`;
  }).join(r` \\ `);
  const table = (xs, n) => r`\begin{array}{c|r|r|r|r|r} k & x_k & \cos\theta_k & \sin\theta_k & x_k\cos\theta_k & x_k\sin\theta_k \\ \hline ` +
    tableRows(xs, n) + r` \end{array}`;

  // ---- the working, as in class: sentences ('>'), equations, notes, equation numbers
  const WORK = [
    [
      ['>Take a signal with a 1X part and a 2X part. Over one turn (\\(\\omega_0 T=2\\pi\\)) it is'],
      [r`x(t)=0.6\cos(\omega_0 t)+0.8\sin(\omega_0 t)+0.5\cos(2\omega_0 t)`, '← a₁ = 0.6, b₁ = 0.8, a₂ = 0.5', 1],
      ['>An analyser doesn’t see the curve, only samples. Take \\(N=8\\) per turn, at'],
      [r`t_k=\frac{k\,T}{8},\qquad \omega_0 t_k=\frac{2\pi k}{8}=\theta_k,\qquad k=0,1,\dots,7`, '← equally spaced', 2],
      ['>Putting (2) in (1) gives the 8 numbers the FFT works with:'],
      [r`x_k=0.6\cos\theta_k+0.8\sin\theta_k+0.5\cos 2\theta_k`, '', 3],
      [r`x_0..x_7=1.1,\ 0.99,\ 0.3,\ 0.141,\ -0.1,\ -0.99,\ -1.3,\ -0.141`, '← e.g. x₀ = 0.6 + 0 + 0.5'],
    ],
    [
      ['>The winding machine from the video, with the integral replaced by an average over the 8 samples:'],
      [r`X_n=\frac{1}{N}\sum_{k=0}^{N-1}x_k\,e^{-i\,2\pi nk/N}`, '← the DFT; the FFT is a fast way to compute it', 4],
      ['>We know Euler’s formula:'],
      [r`e^{-i\theta}=\cos\theta-i\sin\theta`, '', 5],
      ['>Substituting (5) in (4) splits each bin into two ordinary sums:'],
      [r`\operatorname{Re}X_n=\frac{1}{N}\sum_k x_k\cos\Big(\frac{2\pi nk}{N}\Big)`, '← how much cosine', 6],
      [r`\operatorname{Im}X_n=-\frac{1}{N}\sum_k x_k\sin\Big(\frac{2\pi nk}{N}\Big)`, '← minus how much sine', 7],
    ],
    [
      ['>Each sample \\(x_k\\) becomes an arrow of length \\(x_k\\) at angle \\(-2\\pi nk/N\\). \\(X_n\\) is the average of the 8 arrows: the orange dot.'],
      ['>When \\(n\\) matches a harmonic in the signal, the arrows pile up on one side and the dot moves out. Otherwise they cancel.'],
    ],
    [
      ['>Bin \\(n=1\\). From (2), \\(\\theta_k=2\\pi k/8\\), so \\(\\cos\\theta_k\\) and \\(\\sin\\theta_k\\) take the values 0, ±0.7071 and ±1:'],
      [table(x0, 1), ''],
      ['>Adding the last two columns:'],
      [r`\sum_k x_k\cos\theta_k=2.4,\qquad \sum_k x_k\sin\theta_k=3.2`, '← calculator'],
      ['>Using (6) and (7) with \\(N=8\\):'],
      [r`\operatorname{Re}X_1=\frac{2.4}{8}=0.3,\qquad \operatorname{Im}X_1=-\frac{3.2}{8}=-0.4`, '', 8],
      [r`X_1=0.3-0.4\,i`, '← one bin, two numbers', 9],
    ],
    [
      ['>The peak you see on the analyser is twice the length of (9), because half the energy sits in the mirror bin (step 6):'],
      [r`2\,|X_1|=2\sqrt{0.3^2+0.4^2}=2\sqrt{0.25}=1.0`, '← the 1X peak', 10],
      ['>The angle of (9) is the phase. We know \\(\\tan\\theta=\\text{Im}/\\text{Re}\\), and (9) has Re > 0, Im < 0 (fourth quadrant):'],
      [r`\theta_1=\tan^{-1}\Big(\frac{-0.4}{0.3}\Big)=-53.1^\circ`, '← the phase', 11],
      ['>Check against (1). By (6) and (7), \\(X_n=\\tfrac12(a_n-i\\,b_n)\\), so (9) should be'],
      [r`\tfrac12(0.6-0.8\,i)=0.3-0.4\,i\ \checkmark`, '← the FFT found a₁ and b₁'],
      ['>So the 1X part of (1) is \\(1.0\\cos(\\omega_0 t-53.1^\\circ)\\): size from (10), timing from (11).'],
    ],
    [
      ['>Bin \\(n=2\\): the same sums with \\(2\\theta_k\\) give'],
      [r`X_2=0.25+0\,i\quad\Rightarrow\quad 2|X_2|=0.5,\ \ \theta_2=0^\circ`, '← a pure cosine at 2X', 12],
      ['>Bin \\(n=3\\): there is no 3X in (1), so the arrows cancel:'],
      [r`X_3=0`, '', 13],
      ['>Bin \\(n=7\\): we know \\(e^{-i2\\pi 7k/8}=e^{+i2\\pi k/8}\\) (one full turn less), so it is bin 1 wound the other way:'],
      [r`X_7=0.3+0.4\,i=\overline{X_1}`, '← the mirror image', 14],
      ['>This is the mirror half from the video. For a real signal, \\(X_{N-n}=\\overline{X_n}\\): no new information, so analysers drop it and double the rest, as in (10).'],
    ],
  ];

  WORK.push((s) => {
    if (!s.ex) newEx(s);
    const { a1, b1, a2 } = s.ex;
    const f = sig(a1, b1, a2), xs = samples(f);
    const given = [
      ['>Worked example. The signal is'],
      [r`x(t)=${a1}\cos(\omega_0 t)+${b1}\sin(\omega_0 t)+${a2}\cos(2\omega_0 t)`, '← sample it 8 times per turn', 15],
    ];
    if (!s.showSol) return given;
    let sc = 0, ss = 0;
    xs.forEach((v, k) => { sc += v * Math.cos(TAU * k / N); ss += v * Math.sin(TAU * k / N); });
    const re = sc / N, im = -ss / N, mag = 2 * Math.hypot(re, im), ph = Math.atan2(im, re) * 180 / Math.PI;
    return [
      ...given,
      ['>Samples from (2) and (3), then the products for bin 1:'],
      [table(xs, 1), ''],
      ['>Adding the last two columns:'],
      [r`\sum_k x_k\cos\theta_k=${F(sc, 3)},\qquad \sum_k x_k\sin\theta_k=${F(ss, 3)}`, ''],
      ['>Using (6) and (7):'],
      [r`\operatorname{Re}X_1=\frac{${F(sc, 3)}}{8}=${F(re, 3)},\qquad \operatorname{Im}X_1=-\frac{${F(ss, 3)}}{8}=${F(im, 3)}`, '', 16],
      ['>The peak, as in (10):'],
      [r`2|X_1|=2\sqrt{${F(re, 3)}^2+(${F(im, 3)})^2}=${F(mag, 3)}`, ''],
      ['>The phase, as in (11). Watch the quadrant: use the signs of Re and Im.'],
      [r`\theta_1=\tan^{-1}\Big(\frac{${F(im, 3)}}{${F(re, 3)}}\Big)=${F(ph, 1)}^\circ`, re < 0 ? '← Re < 0: add or subtract 180°' : ''],
      ['>Check: \\(X_1=\\tfrac12(a_1-i\\,b_1)\\):'],
      [r`\tfrac12\big(${a1}-${b1}\,i\big)=${F(a1 / 2, 3)}-${F(b1 / 2, 3)}\,i\ \checkmark`, ''],
    ];
  });

  Lab.lesson({
    work: WORK,
    next: '../',
    state: { n: 1 },
    steps: [
      {
        title: 'Eight samples',
        text: `<p>An analyser never sees the smooth curve. It sees samples: here 8 per turn of the shaft, the blue dots.</p>
               <p>Everything the FFT tells you comes from these 8 numbers.</p>`,
        draw(g, s, t, api) {
          waveWithSamples(g, f0, x0.map((v, k) => (k <= Math.floor(t * 4) ? v : 0)));
          api.legend([['the signal', g.col.muted], ['8 samples', g.col.blue]]);
        },
      },
      {
        title: 'The formula',
        text: `<p>The video’s winding machine, written for samples: wind each sample round a circle and average. Euler’s formula turns that into two plain sums you can do on a calculator: one with cosines (the real part) and one with sines (the imaginary part).</p>`,
        draw(g, s, t, api) {
          waveWithSamples(g, f0, x0);
          api.legend([['the signal', g.col.muted], ['8 samples', g.col.blue]]);
        },
      },
      {
        title: 'Wind the samples',
        text: `<p>Pick a bin \\(n\\). Each sample becomes an arrow pointing at angle \\(-2\\pi nk/8\\), and the orange dot is their average: that is \\(X_n\\).</p>
               <p>Try \\(n=1\\) and \\(n=2\\) (the signal has those), then \\(n=3\\) (it doesn’t).</p>`,
        controls: [{ type: 'range', key: 'n', label: 'Bin n', min: 0, max: 7, step: 1, fmt: (v) => `n = ${v}`, onInput: (s, api) => api.restart() }],
        draw(g, s, t, api) {
          const R = Math.min(g.h * 0.4, g.w * 0.2);
          waveWithSamples(g, f0, x0, [0.04, 0.12, 0.48, 0.7]);
          const X = winding(g, x0, s.n, t, g.w * 0.77, g.h * 0.5, R);
          api.legend([['samples as arrows', g.col.blue], ['average = Xₙ', g.col.orange]]);
          api.verdict(`X${s.n} = ${F(X.re, 3)} ${X.im < 0 ? '−' : '+'} ${F(Math.abs(X.im), 3)} i`, '');
        },
      },
      {
        title: 'Bin 1 by hand',
        text: `<p>Now do bin 1 with a calculator. Multiply each sample by \\(\\cos\\theta_k\\) and by \\(\\sin\\theta_k\\), add the columns, divide by 8.</p>
               <p>Two numbers come out: a real part and an imaginary part.</p>`,
        draw(g, s, t, api) {
          const R = Math.min(g.h * 0.4, g.w * 0.2);
          waveWithSamples(g, f0, x0, [0.04, 0.12, 0.48, 0.7]);
          winding(g, x0, 1, 5, g.w * 0.77, g.h * 0.5, R);
          api.legend([['samples as arrows', g.col.blue], ['X₁ = 0.3 − 0.4i', g.col.orange]]);
        },
      },
      {
        title: 'Size and phase',
        text: `<p>The dot’s distance gives the peak on your analyser (doubled, because of the mirror half). Its angle gives the phase.</p>
               <p>And they agree with the signal we started with: the FFT has found \\(a_1\\) and \\(b_1\\) from 8 numbers.</p>`,
        draw(g, s, t, api) {
          const c = g.col, ctx = g.ctx, R = Math.min(g.h * 0.42, g.w * 0.22), cx = g.w * 0.32, cy = g.h * 0.5;
          const X = winding(g, x0, 1, 5, cx, cy, R);
          const dx = cx + X.re / 1.4 * R, dy = cy - X.im / 1.4 * R;
          ctx.setLineDash([4, 4]); ctx.strokeStyle = c.good; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(dx, cy); ctx.lineTo(dx, dy); ctx.stroke(); ctx.setLineDash([]);
          ctx.strokeStyle = c.blue; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(dx, cy); ctx.stroke();
          ctx.strokeStyle = c.ink; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(cx, cy, R * 0.18, 0, -Math.atan2(X.im, X.re), X.im > 0); ctx.stroke();   // canvas y points down
          // the 1X part it describes
          const P = g.plot({ box: [0.6, 0.15, 0.37, 0.6], x: [0, 1], y: [-1.3, 1.3] });
          P.axes({ ticks: [[1, 'T']] });
          P.curve((tt) => Math.cos(TAU * tt - 53.13 * Math.PI / 180), { color: c.orange, width: 2.6, glow: true });
          P.curve((tt) => 0.6 * Math.cos(TAU * tt) + 0.8 * Math.sin(TAU * tt), { color: c.ink, width: 1.2, dash: [4, 4] });
          api.legend([['Re = 0.3', c.blue], ['Im = −0.4', c.good], ['1.0·cos(ω₀t − 53.1°)', c.orange]]);
        },
      },
      {
        title: 'Other bins, and the mirror',
        text: `<p>Bin 2 finds the 2X cosine. Bin 3 finds nothing. Bin 7 is bin 1 wound the other way: the mirror image.</p>
               <p>Slide through all eight bins and watch the spectrum fill in.</p>`,
        controls: [{ type: 'range', key: 'n', label: 'Bin n', min: 0, max: 7, step: 1, fmt: (v) => `n = ${v}`, onInput: (s, api) => api.restart() }],
        draw(g, s, t, api) {
          const c = g.col, R = Math.min(g.h * 0.36, g.w * 0.18);
          const X = winding(g, x0, s.n, t, g.w * 0.22, g.h * 0.45, R);
          const B = g.plot({ box: [0.48, 0.1, 0.48, 0.7], x: [-0.6, 7.6], y: [0, 0.6] });
          const mags = K.map((n) => { const d = dft(x0, n); return Math.hypot(d.re, d.im); });
          B.bars(mags, { labels: false, color: (k) => (k === s.n ? c.orange : k >= 4 ? c.muted : c.blue) });
          K.forEach((n) => g.text(`X${n}`, B.X(n), B.Y(0) + 13, { size: 11 }));
          api.legend([['|Xₙ| for every bin', c.blue], ['mirror half', c.muted]]);
          api.verdict(`X${s.n} = ${F(X.re, 3)} ${X.im < 0 ? '−' : '+'} ${F(Math.abs(X.im), 3)} i`, '');
        },
      },
      {
        title: 'Try it with a calculator',
        tryLabel: 'Your answers',
        text: (s) => {
          if (!s.ex) newEx(s);
          const { a1, b1, a2 } = s.ex;
          return `<div class="problem"><p>A signal is \\(x(t)=${a1}\\cos\\omega_0 t+${b1}\\sin\\omega_0 t+${a2}\\cos 2\\omega_0 t\\), sampled 8 times per turn.</p>
                  <p>Work out bin 1 by hand, as in step 4. Calculator in degrees for the phase.</p></div>`;
        },
        controls: [
          { type: 'answer', label: 'Real part of \\(X_1\\)', unit: '', value: (s) => { const x = samples(sig(s.ex.a1, s.ex.b1, s.ex.a2)); return dft(x, 1).re; }, abs: 0.006 },
          { type: 'answer', label: 'Imaginary part of \\(X_1\\)', unit: '', value: (s) => { const x = samples(sig(s.ex.a1, s.ex.b1, s.ex.a2)); return dft(x, 1).im; }, abs: 0.006 },
          { type: 'answer', label: 'The 1X peak, \\(2|X_1|\\)', unit: '', value: (s) => Math.hypot(s.ex.a1, s.ex.b1), rel: 0.02 },
          { type: 'answer', label: 'Phase \\(\\theta_1\\)', unit: 'degrees', value: (s) => Math.atan2(-s.ex.b1 / 2, s.ex.a1 / 2) * 180 / Math.PI, abs: 1.5 },
          { type: 'check' },
          { type: 'button', label: 'Show working', action: (s, api) => { s.showSol = true; api.rewrite(); } },
          { type: 'button', label: 'New numbers', action: (s, api) => { newEx(s); api.refresh(); api.rewrite(); } },
        ],
        draw(g, s, t, api) {
          if (!s.ex) newEx(s);
          const { a1, b1, a2 } = s.ex, f = sig(a1, b1, a2), xs = samples(f);
          const R = Math.min(g.h * 0.4, g.w * 0.2);
          waveWithSamples(g, f, xs, [0.04, 0.12, 0.48, 0.7]);
          if (s.showSol) winding(g, xs, 1, t, g.w * 0.77, g.h * 0.5, R);
          api.legend([['your signal', g.col.muted], ['8 samples', g.col.blue]]);
        },
      },
    ],
  });
})();
