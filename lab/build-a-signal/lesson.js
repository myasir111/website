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
      [r`\int\sin(n\omega_0 t)\,dt=-\frac{\cos(n\omega_0 t)}{n\omega_0}`, '← antiderivative'],
      [r`\int_0^{T/2}\!\sin=\frac{1-\cos(n\omega_0\tfrac{T}{2})}{n\omega_0}=\frac{1-\cos n\pi}{n\omega_0},\qquad \int_{T/2}^{T}\!\sin=\frac{\cos n\pi-\cos 2n\pi}{n\omega_0}=\frac{\cos n\pi-1}{n\omega_0}`, '← limits; ω₀T = 2π'],
      [r`=\frac{2}{T}\cdot\frac{1}{n\omega_0}\Big[(1-\cos n\pi)-(\cos n\pi-1)\Big]=\frac{4\,(1-\cos n\pi)}{n\,\omega_0 T}`, '← collect'],
      [r`=\frac{2}{\pi n}\big(1-(-1)^n\big)`, '← ω₀T = 2π, cos nπ = (−1)ⁿ'],
      [r`b_n=\frac{4}{\pi n}\ \ (n\ \text{odd}),\qquad b_n=0\ \ (n\ \text{even})`, '← falls like 1/n'],
    ],
    [
      [r`f(t)=a_0+\sum_{n=1}^{\infty}\big[a_n\cos(n\omega_0 t)+b_n\sin(n\omega_0 t)\big]`, '← any repeating signal'],
      [r`a_n=\frac{2}{T}\!\int_0^T\! f\cos(n\omega_0 t)\,dt,\quad b_n=\frac{2}{T}\!\int_0^T\! f\sin(n\omega_0 t)\,dt`, '← same recipe, every lane'],
      [r`\text{FFT}\ =\ \text{these integrals, from samples}`, '← what the analyser does'],
    ],
  ];


  // ---- calculator exercise: random but realistic numbers
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const newEx2 = (s) => {
    s.ex = { A: pick([1.2, 1.5, 2, 2.4, 3, 3.6, 4.5, 6]), R: pick([960, 1475, 1490, 2960, 3580]), p: pick([10, 15, 20, 25]) };
    s.showSol = false;
  };
  const firstOdd = (p) => { let n = 1; while (!(1 / n < p / 100)) n += 2; return n; };
  const F = (x, d = 3) => (+x.toFixed(d)).toString();
  WORK.push((s) => {
    if (!s.showSol) return [];
    const { A, R, p } = s.ex, n = firstOdd(p), pi = 3.1416;
    return [
      [r`f(t)=a_0+\sum_{n=1}^{\infty}\big[a_n\cos(n\omega_0 t)+b_n\sin(n\omega_0 t)\big]`, '← start: any repeating signal (step 6)'],
      [r`a_0=\frac{1}{T}\!\int_0^T\! f\,dt`, '← how to get each coefficient'],
      [r`a_n=\frac{2}{T}\!\int_0^T\! f\cos(n\omega_0 t)\,dt,\qquad b_n=\frac{2}{T}\!\int_0^T\! f\sin(n\omega_0 t)\,dt`, ''],
      [r`f(t)=\begin{cases}+A=+${A}, & 0<t<\tfrac{T}{2}\\ -A=-${A}, & \tfrac{T}{2}<t<T\end{cases}`, '← our signal, written out'],
      [r`a_0=\frac{1}{T}\Big[A\cdot\tfrac{T}{2}+(-A)\cdot\tfrac{T}{2}\Big]=0`, '← as long up as down: no DC'],
      [r`a_n=\frac{2A}{T}\Big[\int_0^{T/2}\!\cos(n\omega_0 t)\,dt-\int_{T/2}^{T}\!\cos(n\omega_0 t)\,dt\Big]`, '← cosine parts'],
      [r`=\frac{2A}{T}\cdot\frac{\sin n\pi-(\sin 2n\pi-\sin n\pi)}{n\omega_0}=0`, '← ∫cos = sin/(nω₀); sin of a multiple of π is 0'],
      [r`b_n=\frac{2}{T}\Big[\int_0^{T/2}\!A\sin(n\omega_0 t)\,dt+\int_{T/2}^{T}\!(-A)\sin(n\omega_0 t)\,dt\Big]`, '← only sines left: split where f flips'],
      [r`\int\sin(n\omega_0 t)\,dt=-\frac{\cos(n\omega_0 t)}{n\omega_0}`, '← antiderivative'],
      [r`\int_0^{T/2}\!\sin(n\omega_0 t)\,dt=\frac{-\cos(n\omega_0\tfrac{T}{2})+\cos 0}{n\omega_0}=\frac{1-\cos n\pi}{n\omega_0}`, '← put in the limits; ω₀T/2 = π'],
      [r`\int_{T/2}^{T}\!\sin(n\omega_0 t)\,dt=\frac{-\cos(n\omega_0 T)+\cos(n\omega_0\tfrac{T}{2})}{n\omega_0}=\frac{\cos n\pi-1}{n\omega_0}`, '← ω₀T = 2π, cos 2nπ = 1'],
      [r`b_n=\frac{2A}{T}\cdot\frac{(1-\cos n\pi)-(\cos n\pi-1)}{n\omega_0}=\frac{2A}{n\,\omega_0 T}\cdot 2\,(1-\cos n\pi)`, '← collect the brackets'],
      [r`n\,\omega_0 T=2\pi n\ \Rightarrow\ b_n=\frac{4A}{2\pi n}\,(1-\cos n\pi)=\frac{2A}{\pi n}\,(1-\cos n\pi)`, ''],
      [r`\cos n\pi=(-1)^n:\qquad n\ \text{odd}\Rightarrow 1-\cos n\pi=1-(-1)=2`, '← the key step'],
      [r`\phantom{\cos n\pi=(-1)^n:}\qquad n\ \text{even}\Rightarrow 1-\cos n\pi=1-1=0`, '← this is why the evens vanish'],
      [r`\boxed{\,b_n=\frac{4A}{\pi n}\ (n\ \text{odd}),\qquad b_n=0\ (n\ \text{even})\,}`, '← the formula, now earned'],
      [r`b_1=\frac{4\times ${A}}{\pi\times 1}=\frac{${F(4 * A, 2)}}{${pi}}=${F(4 * A / Math.PI)}\ \text{mm/s}`, '← n = 1'],
      [r`b_2=\frac{2\times ${A}}{2\pi}\,(1-\cos 2\pi)=\frac{${A}}{\pi}\,(1-1)=0`, '← n = 2: the bracket is zero'],
      [r`b_3=\frac{4\times ${A}}{\pi\times 3}=\frac{${F(4 * A, 2)}}{${F(3 * Math.PI, 3)}}=${F(4 * A / (3 * Math.PI))}\ \text{mm/s}`, '← n = 3'],
      [r`f_3=3\times\frac{${R}\ \text{rev/min}}{60\ \text{s/min}}=\frac{${3 * R}}{60}=${F(R / 20, 2)}\ \text{Hz}`, '← 3X in hertz'],
      [r`\frac{b_n}{b_1}=\frac{4A/(\pi n)}{4A/\pi}=\frac{1}{n}`, '← A and π cancel'],
      [r`\frac{1}{n}<${p / 100}\ \Rightarrow\ n>\frac{1}{${p / 100}}=${F(100 / p, 2)}\ \Rightarrow\ \text{first odd } n=${n}`, '← n must be odd: evens are zero'],
    ];
  });

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
      {
        title: 'Try it with a calculator',
        tryLabel: 'Your answers',
        text: (s) => {
          if (!s.ex) newEx2(s);
          const { A, R, p } = s.ex;
          return `<div class="problem"><p>A vibrating screen is driven so its velocity is close to a <b>square wave</b> of amplitude \\(A=${A}\\) mm/s, at <b>${R} rpm</b>.</p>
                  <p>Start from the Fourier coefficients (step 6) and work out each peak, type it in and press Check. Show working derives everything from scratch. The last one asks: which is the first harmonic whose peak is below <b>${p}%</b> of 1X?</p></div>`;
        },
        controls: [
          { type: 'answer', label: '1X amplitude \\(b_1\\)', unit: 'mm/s', value: (s) => 4 * s.ex.A / Math.PI, rel: 0.02 },
          { type: 'answer', label: '2X amplitude \\(b_2\\)', unit: 'mm/s', value: () => 0, abs: 0.005 },
          { type: 'answer', label: '3X amplitude \\(b_3\\)', unit: 'mm/s', value: (s) => 4 * s.ex.A / (3 * Math.PI), rel: 0.02 },
          { type: 'answer', label: 'Frequency of 3X', unit: 'Hz', value: (s) => s.ex.R / 20, rel: 0.01 },
          { type: 'answer', label: 'First harmonic below that % of 1X', unit: 'n', value: (s) => firstOdd(s.ex.p), abs: 0 },
          { type: 'check' },
          { type: 'button', label: 'Show working', action: (s, api) => { s.showSol = true; api.rewrite(); } },
          { type: 'button', label: 'New numbers', action: (s, api) => { newEx2(s); api.refresh(); api.rewrite(); } },
        ],
        draw(g, s, t, api) {
          if (!s.ex) newEx2(s);
          const c = g.col, { A, p } = s.ex, C = coeffs('square', SHAPES.square.f);
          const P = g.plot({ ...WAVE, y: [-1.7 * A, 1.7 * A] });
          P.axes({ grid: [1, 2], ticks: TICKS });
          if (s.showSol) {                                   // why b2 = 0: the areas cancel
            const prod = (x) => A * Math.sign(Math.sin(TAU * x)) * Math.sin(2 * TAU * x);
            P.area(prod, { from: 0, to: 3, alpha: 0.3 });
            P.curve((x) => A * Math.sin(2 * TAU * x), { color: c.blue, width: 1.4, alpha: 0.7 });
          }
          P.curve((x) => A * Math.sign(Math.sin(TAU * x)), { color: c.ink, width: 2.6, glow: true });
          const B = g.plot({ ...SPEC, y: [0, 1.35 * 4 * A / Math.PI] });
          const amps = [0]; for (let k = 1; k <= 12; k++) amps.push(A * C.amp[k]);
          B.bars(amps.map((v, k) => (k <= 1 ? v : 0)), { ghost: true, noDC: true });
          const y = B.Y(4 * A / Math.PI * p / 100);
          g.ctx.setLineDash([5, 4]); g.ctx.strokeStyle = c.bad; g.ctx.lineWidth = 1.2;
          g.ctx.beginPath(); g.ctx.moveTo(B.X(0.5), y); g.ctx.lineTo(B.X(12.5), y); g.ctx.stroke(); g.ctx.setLineDash([]);
          g.text(`${p}% of 1X`, B.X(12.4), y - 8, { size: 11, color: c.bad, align: 'right' });
          api.legend(s.showSol ? [[`square wave, A = ${A} mm/s`, c.ink], ['2X', c.blue], ['f × 2X: areas cancel', c.good]] : [[`square wave, A = ${A} mm/s`, c.ink], ['1X shown; the rest is yours', c.blue]]);
        },
      },
    ],
  });
})();
