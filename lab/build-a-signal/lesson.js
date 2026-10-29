// Lesson: build a repeating signal from harmonics, step by step.
(function () {
  const { TAU, ease, fourier } = Lab;
  // the "machine" signal from the video: imbalance (1X), misalignment (2X), an impact every turn
  const machine = (t) => {
    const ph = ((t % 1) + 1) % 1, tau = (((ph - 0.32) % 1) + 1) % 1;
    const ring = Math.exp(-tau / 0.15) * Math.sin(TAU * 6 * tau);
    return (0.55 * Math.sin(TAU * t) + 0.3 * Math.sin(2 * TAU * t + 0.9) + 1.4 * ring) / 1.16;
  };
  const SHAPES = {
    square: { f: (t) => Math.sign(Math.sin(TAU * t)), name: 'square', law: '1/n, odd only' },
    sawtooth: { f: (t) => 2 * ((((t + 0.5) % 1) + 1) % 1) - 1, name: 'sawtooth', law: '1/n, every n' },
    triangle: { f: (t) => (2 / Math.PI) * Math.asin(Math.sin(TAU * t)), name: 'triangle', law: '1/n², odd only' },
  };
  const cache = {};
  const coeffs = (key, f) => (cache[key] = cache[key] || fourier(f, 25, 2048));
  const partial = (C, N) => (t) => {
    let v = C.dc;
    for (let k = 1; k <= N; k++) v += C.a[k] * Math.cos(TAU * k * t) + C.b[k] * Math.sin(TAU * k * t);
    return v;
  };
  const TICKS = [[1, 'T'], [2, '2T'], [3, '3T']];
  const WAVE = { box: [0.06, 0.07, 0.9, 0.56], x: [0, 3], y: [-1.7, 1.7] };
  const SPEC = { box: [0.06, 0.74, 0.9, 0.18], x: [-0.6, 12.6], y: [0, 1.35] };

  // the working, line by line, as you'd write it on paper: [maths, margin note]
  const r = String.raw;
  const WORK = [
    [
      [r`f(t+T)=f(t)`, '← repeats every turn'],
      [r`T=\frac{60}{\text{rpm}}\ \text{s},\qquad \omega_0=\frac{2\pi}{T}`, '← one revolution'],
    ],
    [
      [r`\sin\!\big(m\omega_0(t+T)\big)=\sin(m\omega_0 t+m\,\omega_0 T)`, '← shift a sine by one turn'],
      [r`=\sin(m\omega_0 t+2\pi m)`, '← ω₀T = 2π'],
      [r`=\sin(m\omega_0 t)\ \text{ for all } t\iff 2\pi m=2\pi k`, '← a sine repeats every 2π'],
      [r`\Rightarrow\ m=1,2,3,\dots`, '← only whole multiples fit'],
    ],
    [
      [r`f(t)=b_1\sin(\omega_0 t)+b_2\sin(2\omega_0 t)+b_3\sin(3\omega_0 t)`, '← each term repeats each turn…'],
      [r`f(t+T)=f(t)\ \checkmark`, '← …so the sum does too'],
      [r`\text{peak at } n\text{X has height } |b_n|`, ''],
    ],
    [
      [r`a_n\cos(n\omega_0 t)+b_n\sin(n\omega_0 t)=c_n\sin(n\omega_0 t+\varphi_n)`, '← Lesson 1, step 4'],
      [r`c_n=\sqrt{a_n^2+b_n^2},\qquad \tan\varphi_n=\frac{a_n}{b_n}`, '← cₙ is what the spectrum shows'],
    ],
    [
      [r`b_n=\frac{2}{T}\int_0^{T} f(t)\sin(n\omega_0 t)\,dt`, '← how much nX is in f'],
      [r`=\frac{2}{T}\Big[\int_0^{T/2}\!\sin(n\omega_0 t)\,dt-\int_{T/2}^{T}\!\sin(n\omega_0 t)\,dt\Big]`, '← square: +1 then −1'],
      [r`=\frac{2}{T}\cdot\frac{1}{n\omega_0}\Big[(1-\cos n\pi)-(\cos n\pi-1)\Big]`, '← ∫ sin = −cos / (nω₀)'],
      [r`=\frac{2}{\pi n}\big(1-(-1)^n\big)`, '← ω₀T = 2π, cos nπ = (−1)ⁿ'],
      [r`b_n=\frac{4}{\pi n}\ \ (n\ \text{odd}),\qquad b_n=0\ \ (n\ \text{even})`, '← falls like 1/n'],
    ],
    [
      [r`f(t)=a_0+\sum_{n=1}^{\infty}\big[a_n\cos(n\omega_0 t)+b_n\sin(n\omega_0 t)\big]`, '← any repeating signal'],
      [r`a_n=\frac{2}{T}\!\int_0^T\! f\cos(n\omega_0 t)\,dt,\quad b_n=\frac{2}{T}\!\int_0^T\! f\sin(n\omega_0 t)\,dt`, '← same recipe, every lane'],
      [r`\text{FFT}\ =\ \text{these integrals, from samples}`, '← what the analyser does'],
    ],
  ];

  Lab.lesson({
    work: WORK,
    next: '../why-evens-vanish/',
    state: { m: 2.3, b1: 1, b2: 0.5, b3: 0.3, a2: 0.4, s2: 0.3, N: 1, shape: 'square', Nm: 3 },
    steps: [
      {
        title: 'A signal that repeats',
        text: `<p>This is a vibration signal from a rotating machine: a bit of imbalance, a bit of misalignment, and an impact once every revolution that rings and dies away.</p>
               <p>It looks messy, but it does one important thing: it <b>repeats every turn</b>. If one revolution takes \\(T\\) seconds, the signal at \\(t+T\\) is the same as at \\(t\\).</p>`,
        draw(g, s, t, api) {
          const c = g.col, P = g.plot(WAVE);
          P.axes({ grid: [1, 2], ticks: TICKS });
          P.curve(machine, { color: c.ink, width: 2.4, to: 3 * ease(t / 2), glow: true });
          for (let k = 0; k < 3; k++) if (t > 2 + 0.4 * k) P.curve(machine, { from: k, to: k + 1, color: [c.blue, c.orange, c.good][k], width: 3.5, alpha: 0.35 });
          api.legend([['f(t)', c.ink]]);
        },
      },
      {
        title: 'Which sines fit one turn?',
        text: `<p>Any sine that is part of this signal must repeat every turn too. Try a sine at \\(m\\) times running speed. The dashed copy is the same sine one turn later; the shading shows where they disagree.</p>
               <p>Only <b>whole numbers</b> line up. That's why spectrum peaks sit at exactly 1X, 2X, 3X… and never at 2.3X.</p>`,
        controls: [{ type: 'range', key: 'm', label: 'Multiple of running speed, m', min: 0.5, max: 6, step: 0.1, fmt: (v) => v.toFixed(1) + 'X' }],
        draw(g, s, t, api) {
          const c = g.col, P = g.plot(WAVE), m = s.m;
          P.axes({ grid: [1, 2], ticks: TICKS });
          const f = (x) => Math.sin(TAU * m * x), later = (x) => Math.sin(TAU * m * (x + 1));
          P.between(f, later, { alpha: 0.3 });
          P.curve(f, { color: c.blue, width: 2.6 });
          P.curve(later, { color: c.orange, width: 2, dash: [7, 5] });
          const fits = Math.abs(m - Math.round(m)) < 0.04;
          api.legend([[`sin(${m.toFixed(1)}·ω₀t)`, c.blue], ['one turn later', c.orange]]);
          api.verdict(fits ? `${Math.round(m)}X fits: repeats every turn ✓` : `${m.toFixed(1)}X doesn't repeat every turn ✗`, fits ? 'good' : 'bad');
        },
      },
      {
        title: 'Add them up',
        text: `<p>So a repeating signal can only be built from sines at whole multiples. Mix three of them and watch the sum. Each slider is the height of one peak in the spectrum below.</p>`,
        controls: [
          { type: 'range', key: 'b1', label: '1X, b₁', min: 0, max: 1, step: 0.01, fmt: (v) => v.toFixed(2) },
          { type: 'range', key: 'b2', label: '2X, b₂', min: 0, max: 1, step: 0.01, fmt: (v) => v.toFixed(2) },
          { type: 'range', key: 'b3', label: '3X, b₃', min: 0, max: 1, step: 0.01, fmt: (v) => v.toFixed(2) },
        ],
        draw(g, s, t, api) {
          const c = g.col, P = g.plot(WAVE);
          P.axes({ grid: [1, 2], ticks: TICKS });
          const b = [0, s.b1, s.b2, s.b3], cols = [null, c.blue, c.orange, c.good];
          for (let k = 1; k <= 3; k++) P.curve((x) => b[k] * Math.sin(TAU * k * x), { color: cols[k], width: 1.5, alpha: 0.75 });
          P.curve((x) => b[1] * Math.sin(TAU * x) + b[2] * Math.sin(2 * TAU * x) + b[3] * Math.sin(3 * TAU * x), { color: c.ink, width: 3, glow: true });
          g.plot({ ...SPEC, x: [-0.6, 6.6], y: [0, 1.15] }).bars([0, s.b1, s.b2, s.b3, 0, 0, 0], { ghost: true, noDC: true, color: (k) => cols[k] });
          api.legend([['1X', c.blue], ['2X', c.orange], ['3X', c.good], ['sum', c.ink]]);
        },
      },
      {
        title: 'Sines and cosines in each lane',
        text: `<p>Real signals don't all start at zero, so each lane holds a cosine as well as a sine. Together they make one sine that is shifted in time.</p>
               <p>The spectrum shows only the combined height \\(c_n\\); the shift \\(\\varphi_n\\) is the phase. That's why we say a signal is a sum of <b>sines and cosines</b>.</p>`,
        controls: [
          { type: 'range', key: 'a2', label: '2X cosine, a₂', min: -1, max: 1, step: 0.01, fmt: (v) => v.toFixed(2) },
          { type: 'range', key: 's2', label: '2X sine, b₂', min: -1, max: 1, step: 0.01, fmt: (v) => v.toFixed(2) },
        ],
        draw(g, s, t, api) {
          const c = g.col, P = g.plot(WAVE), a = s.a2, b = s.s2;
          P.axes({ grid: [1, 2], ticks: TICKS });
          P.curve((x) => a * Math.cos(2 * TAU * x), { color: c.blue, width: 1.6, alpha: 0.8 });
          P.curve((x) => b * Math.sin(2 * TAU * x), { color: c.good, width: 1.6, alpha: 0.8 });
          P.curve((x) => a * Math.cos(2 * TAU * x) + b * Math.sin(2 * TAU * x), { color: c.orange, width: 3, glow: true });
          const cn = Math.hypot(a, b), ph = Math.atan2(a, b) * 180 / Math.PI;
          g.plot({ ...SPEC, x: [-0.6, 6.6], y: [0, 1.5] }).bars([0, 0, cn, 0, 0, 0, 0], { ghost: true, noDC: true });
          api.legend([['a₂ cos', c.blue], ['b₂ sin', c.good], ['sum', c.orange]]);
          api.verdict(`c₂ = ${cn.toFixed(2)},  φ₂ = ${ph.toFixed(0)}°`, '');
        },
      },
      {
        title: 'Build a shape, harmonic by harmonic',
        text: `<p>Pick a shape and add harmonics one at a time. Sharp jumps (square, sawtooth) need many harmonics and their peaks fall slowly, like \\(1/n\\). Corners only (triangle) fall like \\(1/n^2\\), so a few terms already look right.</p>
               <p>Near a jump the sum always overshoots by about 9% of the jump, however many terms you add: the Gibbs phenomenon.</p>`,
        controls: [
          { type: 'choice', key: 'shape', options: [['square', 'Square'], ['sawtooth', 'Sawtooth'], ['triangle', 'Triangle']] },
          { type: 'range', key: 'N', label: 'Harmonics used', min: 1, max: 25, step: 1, fmt: (v) => 'up to ' + v + 'X' },
        ],
        draw(g, s, t, api) {
          const c = g.col, S = SHAPES[s.shape], C = coeffs(s.shape, S.f);
          const P = g.plot(WAVE); P.axes({ grid: [1, 2], ticks: TICKS });
          P.curve(S.f, { color: c.muted, width: 1.6, dash: [5, 5] });
          P.curve(partial(C, s.N), { color: c.ink, width: 2.8, glow: true, n: 1400 });
          const amps = [0]; for (let k = 1; k <= 12; k++) amps.push(k <= s.N ? C.amp[k] : 0);
          g.plot(SPEC).bars(amps, { ghost: true, noDC: true });
          let got = C.dc * C.dc, tot = got;
          for (let k = 1; k <= 25; k++) { tot += C.amp[k] ** 2 / 2; if (k <= s.N) got += C.amp[k] ** 2 / 2; }
          api.legend([[S.name, c.muted], [`sum up to ${s.N}X`, c.ink]]);
          api.verdict(`${S.law} · ${(100 * got / tot).toFixed(1)}% of the energy`, '');
        },
      },
      {
        title: 'Back to the machine',
        text: `<p>The same works for the messy machine signal. Add its harmonics one by one: 1X gives the imbalance, 2X the misalignment, and the sharp impact needs the higher harmonics around 4X–7X.</p>
               <p>Every peak in a spectrum is one of these lanes. The harmonics aren't extra signals: they're the shape, written as sines and cosines.</p>`,
        controls: [{ type: 'range', key: 'Nm', label: 'Harmonics used', min: 1, max: 12, step: 1, fmt: (v) => 'up to ' + v + 'X' }],
        draw(g, s, t, api) {
          const c = g.col, C = coeffs('machine', machine);
          const P = g.plot(WAVE); P.axes({ grid: [1, 2], ticks: TICKS });
          P.curve(machine, { color: c.muted, width: 1.6, dash: [5, 5] });
          P.curve(partial(C, s.Nm), { color: c.ink, width: 2.8, glow: true, n: 1400 });
          const amps = [0]; for (let k = 1; k <= 12; k++) amps.push(k <= s.Nm ? C.amp[k] : 0);
          g.plot({ ...SPEC, y: [0, 0.75] }).bars(amps, { ghost: true, noDC: true });
          api.legend([['machine signal', c.muted], [`sum up to ${s.Nm}X`, c.ink]]);
        },
      },
    ],
  });
})();
