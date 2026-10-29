// Lesson: sines and cosines, the building blocks, step by step.
(function () {
  const { TAU, ease } = Lab;

  // left: a point going round a circle; right: its height traced over time
  function phasor(g, s, t, o) {
    const c = g.col;
    // one shared scale: 1 unit of amplitude = U pixels, on the circle and on the trace
    const boxH = g.h * 0.72, U = Math.min(boxH / 3.4, g.w * 0.13 / 1.5);
    const half = boxH / 2 / U;
    const P = g.plot({ box: [0.36, 0.1, 0.6, 0.72], x: [0, 2], y: [-half, half] });
    P.axes({ grid: [1], ticks: [[1, 'T'], [2, '2T']] });
    const cx = g.w * 0.18, cy = P.Y(0), R = 1.5 * U;
    const A = o.A, k = o.k, ph = o.ph, run = t * 0.25;            // a quarter turn per second
    const ctx = g.ctx;
    ctx.strokeStyle = c.line; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, U * A, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
    const ang = TAU * k * run + ph;
    const px = cx + U * A * Math.cos(ang), py = cy - U * A * Math.sin(ang);
    ctx.strokeStyle = o.color; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
    ctx.fillStyle = o.color; ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.fill();
    // the trace, scrolling so the newest point sits at t = 0
    const f = (x) => A * Math.sin(TAU * k * (run - x) + ph);
    if (o.ref) P.curve((x) => Math.sin(TAU * k * (run - x)), { color: c.muted, width: 1.6, dash: [5, 5] });
    P.curve(f, { color: o.color, width: 2.8, glow: true });
    ctx.setLineDash([3, 4]); ctx.strokeStyle = c.muted; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(P.X(0), P.Y(f(0))); ctx.stroke(); ctx.setLineDash([]);
    return P;
  }

  // the working, line by line, as you'd write it on paper: [maths, margin note]
  const r = String.raw;
  const WORK = [
    [
      [r`\text{point on a circle: }\ (A\cos\theta,\ A\sin\theta)`, '← height is the y part'],
      [r`\theta=\omega t`, '← angle grows steadily'],
      [r`x(t)=A\sin(\omega t)`, '← height against time'],
      [r`\omega T=2\pi\ \Rightarrow\ \omega=\frac{2\pi}{T}=2\pi f`, '← one full turn'],
    ],
    [
      [r`x(t)=A\sin(n\,\omega_0 t)`, '← n turns per revolution'],
      [r`n=1:\ 1\text{X},\quad n=2:\ 2\text{X},\quad n=3:\ 3\text{X}`, '← orders'],
    ],
    [
      [r`x(t)=A\sin(\omega t+\varphi)`, '← a head start of φ'],
      [r`\sin(a+b)=\sin a\cos b+\cos a\sin b`, '← angle-sum rule'],
      [r`\varphi=\tfrac{\pi}{2}:\ \sin\!\big(\omega t+\tfrac{\pi}{2}\big)=\sin\omega t\cdot 0+\cos\omega t\cdot 1`, ''],
      [r`=\cos(\omega t)`, '← a cosine is a sine, 90° ahead'],
    ],
    [
      [r`c\sin(\omega t+\varphi)=c\cos\varphi\,\sin\omega t+c\sin\varphi\,\cos\omega t`, '← expand, rule from step 3'],
      [r`\text{match with } a\cos\omega t+b\sin\omega t:\quad b=c\cos\varphi,\ \ a=c\sin\varphi`, ''],
      [r`a^2+b^2=c^2\big(\sin^2\varphi+\cos^2\varphi\big)=c^2`, '← square and add'],
      [r`c=\sqrt{a^2+b^2},\qquad \tan\varphi=\frac{a}{b}`, '← divide'],
    ],
    [
      [r`f_1=\frac{\text{rpm}}{60}\ \text{Hz}`, '← revolutions per second'],
      [r`1490\ \text{rpm}:\ \ f_1=\frac{1490}{60}\approx 24.8\ \text{Hz}`, ''],
      [r`f_n=n\,f_1:\ \ 2\text{X}\approx 49.7\ \text{Hz},\ \ 3\text{X}\approx 74.5\ \text{Hz}`, ''],
    ],
  ];


  // ---- calculator exercise: random but realistic numbers
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const r1 = (x) => Math.round(x * 10) / 10;
  const newEx1 = (s) => {
    s.ex = { R: pick([740, 985, 1480, 1490, 2950, 2975, 3560]), a: r1(0.5 + Math.random() * 4), b: r1(0.5 + Math.random() * 4) };
    s.showSol = false;
  };
  const F = (x, d = 2) => (+x.toFixed(d)).toString();
  WORK.push((s) => {
    if (!s.showSol) return [];
    const { R, a, b } = s.ex, f1 = R / 60, c = Math.hypot(a, b), ph = Math.atan2(a, b) * 180 / Math.PI;
    return [
      [r`f_1=\frac{\text{rpm}}{60}=\frac{${R}}{60}=${F(f1)}\ \text{Hz}`, '← 1X'],
      [r`f_2=2f_1=2\times ${F(f1)}=${F(2 * f1)}\ \text{Hz}`, '← 2X'],
      [r`T=\frac{1}{f_1}=\frac{1}{${F(f1)}}=${F(1 / f1, 5)}\ \text{s}=${F(1000 / f1)}\ \text{ms}`, '← one turn'],
      [r`c=\sqrt{a^2+b^2}=\sqrt{${a}^2+${b}^2}=\sqrt{${F(a * a + b * b)}}=${F(c)}\ \text{mm/s}`, '← step 4'],
      [r`\tan\varphi=\frac{a}{b}=\frac{${a}}{${b}}=${F(a / b, 3)}\ \Rightarrow\ \varphi=${F(ph, 1)}^\circ`, '← calculator in degrees: tan⁻¹'],
    ];
  });

  Lab.lesson({
    work: WORK,
    next: '../build-a-signal/',
    state: { A: 1, k: 1, phd: 0, a: 0.6, b: 0.8, rpm: 1490, order: 1 },
    steps: [
      {
        title: 'A point going round',
        text: `<p>A shaft turns. Follow one point on it: its height, plotted against time, is a <b>sine</b>.</p>
               <p>One full circle is one period \\(T\\). The number of turns per second is the frequency \\(f\\), and \\(\\omega=2\\pi f\\) is the same thing measured in radians per second.</p>`,
        draw(g, s, t, api) { phasor(g, s, t, { A: 1, k: 1, ph: 0, color: g.col.blue }); api.legend([['height of the point', g.col.blue]]); },
      },
      {
        title: 'Amplitude and frequency',
        text: `<p><b>Amplitude</b> \\(A\\) is how far the point swings. <b>Frequency</b> is how fast it goes round.</p>
               <p>On a machine, frequencies are counted in multiples of running speed: 1X is once per revolution, 2X twice per revolution, and so on.</p>`,
        controls: [
          { type: 'range', key: 'A', label: 'Amplitude A', min: 0.2, max: 1.5, step: 0.05, fmt: (v) => v.toFixed(2) },
          { type: 'range', key: 'k', label: 'Frequency', min: 1, max: 4, step: 1, fmt: (v) => v + 'X' },
        ],
        draw(g, s, t, api) { phasor(g, s, t, { A: s.A, k: s.k, ph: 0, color: g.col.blue }); api.legend([[`${s.A.toFixed(2)}·sin(${s.k}ω₀t)`, g.col.blue]]); },
      },
      {
        title: 'Phase: where it starts',
        text: `<p>Two points on the same shaft go round at the same speed but start at different angles. That head start is the <b>phase</b> \\(\\varphi\\). The dashed line is the same sine with zero phase.</p>
               <p>A phase of 90° turns a sine into a <b>cosine</b>.</p>`,
        controls: [{ type: 'range', key: 'phd', label: 'Phase φ', min: -180, max: 180, step: 5, fmt: (v) => v + '°' }],
        draw(g, s, t, api) {
          phasor(g, s, t, { A: 1, k: 1, ph: s.phd * Math.PI / 180, color: g.col.orange, ref: true });
          api.legend([['sin(ωt + φ)', g.col.orange], ['sin(ωt)', g.col.muted]]);
          api.verdict(Math.abs(s.phd - 90) < 1 ? 'φ = 90°: this is cos(ωt)' : '', 'good');
        },
      },
      {
        title: 'A sine plus a cosine',
        text: `<p>Add a cosine and a sine at the same frequency and you get one sine, shifted. Its size is \\(c=\\sqrt{a^2+b^2}\\), like the long side of a right triangle.</p>
               <p>So any amount of shift can be written as a mix of a sine and a cosine. That's why a spectrum lane holds both, and why the peak height is \\(c\\).</p>`,
        controls: [
          { type: 'range', key: 'a', label: 'Cosine part, a', min: -1, max: 1, step: 0.01, fmt: (v) => v.toFixed(2) },
          { type: 'range', key: 'b', label: 'Sine part, b', min: -1, max: 1, step: 0.01, fmt: (v) => v.toFixed(2) },
        ],
        draw(g, s, t, api) {
          const c = g.col, a = s.a, b = s.b;
          const P = g.plot({ box: [0.06, 0.08, 0.6, 0.8], x: [0, 2], y: [-1.6, 1.6] });
          P.axes({ grid: [1], ticks: [[1, 'T'], [2, '2T']] });
          P.curve((x) => a * Math.cos(TAU * x), { color: c.blue, width: 1.6, alpha: 0.85 });
          P.curve((x) => b * Math.sin(TAU * x), { color: c.good, width: 1.6, alpha: 0.85 });
          P.curve((x) => a * Math.cos(TAU * x) + b * Math.sin(TAU * x), { color: c.orange, width: 3, glow: true });
          // the right triangle: b along, a up, c the hypotenuse
          const ctx = g.ctx, S = Math.min(g.w * 0.12, g.h * 0.3), ox = g.w * 0.74, oy = g.h * 0.62;
          ctx.lineWidth = 3;
          ctx.strokeStyle = c.good; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + b * S, oy); ctx.stroke();
          ctx.strokeStyle = c.blue; ctx.beginPath(); ctx.moveTo(ox + b * S, oy); ctx.lineTo(ox + b * S, oy - a * S); ctx.stroke();
          ctx.strokeStyle = c.orange; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + b * S, oy - a * S); ctx.stroke();
          const cn = Math.hypot(a, b);
          g.text(`c = ${cn.toFixed(2)}`, ox + S * 0.4, g.h * 0.12, { size: 14, weight: 600, color: c.orange });
          api.legend([['a cos', c.blue], ['b sin', c.good], ['sum = c sin(ωt+φ)', c.orange]]);
        },
      },
      {
        title: 'Orders: from rpm to hertz',
        text: `<p>Vibration analysts name frequencies by <b>order</b>: multiples of running speed. A pump at 1490 rpm turns \\(1490/60\\approx 24.8\\) times a second, so 1X is 24.8 Hz, 2X is 49.7 Hz, 3X is 74.5 Hz.</p>
               <p>Next lesson: why a repeating signal can only contain these whole orders.</p>`,
        controls: [
          { type: 'range', key: 'rpm', label: 'Running speed', min: 300, max: 3600, step: 10, fmt: (v) => v + ' rpm' },
          { type: 'range', key: 'order', label: 'Order', min: 1, max: 6, step: 1, fmt: (v) => v + 'X' },
        ],
        draw(g, s, t, api) {
          const c = g.col, f1 = s.rpm / 60;
          const P = g.plot({ box: [0.06, 0.1, 0.9, 0.6], x: [0, 0.2], y: [-1.5, 1.5] });
          P.axes({ grid: [0.05, 0.1, 0.15], ticks: [[0.05, '50 ms'], [0.1, '100 ms'], [0.15, '150 ms'], [0.2, '200 ms']] });
          P.curve((x) => Math.sin(TAU * f1 * x), { color: c.muted, width: 1.6, dash: [5, 5], n: 1200 });
          P.curve((x) => Math.sin(TAU * f1 * s.order * x), { color: c.blue, width: 2.6, glow: true, n: 1200 });
          const B = g.plot({ box: [0.06, 0.78, 0.9, 0.14], x: [0, 400], y: [0, 1.2] });
          const ctx = g.ctx;
          ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(B.X(0), B.Y(0)); ctx.lineTo(B.X(400), B.Y(0)); ctx.stroke();
          for (let n = 1; n <= 6; n++) {
            const fx = n * f1; if (fx > 400) break;
            ctx.fillStyle = n === s.order ? c.blue : c.line;
            ctx.fillRect(B.X(fx) - 3, B.Y(1), 6, B.Y(0) - B.Y(1));
          }
          [0, 100, 200, 300, 400].forEach((hz) => g.text(hz + ' Hz', B.X(hz), B.Y(0) + 12, { size: 10 }));
          api.legend([['1X', c.muted], [`${s.order}X`, c.blue]]);
          api.verdict(`1X = ${f1.toFixed(1)} Hz · ${s.order}X = ${(f1 * s.order).toFixed(1)} Hz`, '');
        },
      },
      {
        title: 'Try it with a calculator',
        tryLabel: 'Your answers',
        text: (s) => {
          if (!s.ex) newEx1(s);
          const { R, a, b } = s.ex;
          return `<div class="problem"><p>A fan runs at <b>${R} rpm</b>. At 1X its vibration has a cosine part \\(a=${a}\\) mm/s and a sine part \\(b=${b}\\) mm/s.</p>
                  <p>Work these out with a calculator, type them in and press Check. Stuck? Show the working: it's written onto the page, line by line.</p></div>`;
        },
        controls: [
          { type: 'answer', label: '1X frequency', unit: 'Hz', value: (s) => s.ex.R / 60, rel: 0.01 },
          { type: 'answer', label: '2X frequency', unit: 'Hz', value: (s) => s.ex.R / 30, rel: 0.01 },
          { type: 'answer', label: 'Time for one turn, T', unit: 'ms', value: (s) => 60000 / s.ex.R, rel: 0.01 },
          { type: 'answer', label: 'Amplitude \\(c\\) at 1X', unit: 'mm/s', value: (s) => Math.hypot(s.ex.a, s.ex.b), rel: 0.02 },
          { type: 'answer', label: 'Phase \\(\\varphi\\)', unit: 'degrees', value: (s) => Math.atan2(s.ex.a, s.ex.b) * 180 / Math.PI, abs: 1 },
          { type: 'check' },
          { type: 'button', label: 'Show working', action: (s, api) => { s.showSol = true; api.rewrite(); } },
          { type: 'button', label: 'New numbers', action: (s, api) => { newEx1(s); api.refresh(); api.rewrite(); } },
        ],
        draw(g, s, t, api) {
          if (!s.ex) newEx1(s);
          const c = g.col, { R, a, b } = s.ex, Tms = 60000 / R;
          const amp = Math.hypot(a, b), top = Math.ceil(amp + 0.5);
          const P = g.plot({ box: [0.07, 0.08, 0.62, 0.78], x: [0, 2 * Tms], y: [-top, top] });
          P.axes({ grid: [Tms], ticks: [[Tms, 'T = ?'], [2 * Tms, '2T']] });
          const w = 2 * Math.PI / Tms;
          P.curve((x) => a * Math.cos(w * x), { color: c.blue, width: 1.5, alpha: 0.8 });
          P.curve((x) => b * Math.sin(w * x), { color: c.good, width: 1.5, alpha: 0.8 });
          P.curve((x) => a * Math.cos(w * x) + b * Math.sin(w * x), { color: c.orange, width: 3, glow: true });
          const ctx = g.ctx, S = Math.min(g.w * 0.24, g.h * 0.6) / Math.max(a, b, 1), ox = g.w * 0.74, oy = g.h * 0.8;
          ctx.lineWidth = 3;
          ctx.strokeStyle = c.good; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + b * S, oy); ctx.stroke();
          ctx.strokeStyle = c.blue; ctx.beginPath(); ctx.moveTo(ox + b * S, oy); ctx.lineTo(ox + b * S, oy - a * S); ctx.stroke();
          ctx.strokeStyle = c.orange; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + b * S, oy - a * S); ctx.stroke();
          g.text(`b = ${b}`, ox + b * S / 2, oy + 14, { size: 12, color: c.good });
          g.text(`a = ${a}`, ox + b * S + 8, oy - a * S / 2, { size: 12, color: c.blue, align: 'left' });
          g.text('c = ?', ox + b * S / 2 - 14, oy - a * S / 2 - 10, { size: 12, color: c.orange, align: 'right' });
          api.legend([['a cos', c.blue], ['b sin', c.good], ['the vibration at 1X', c.orange]]);
        },
      },
    ],
  });
})();
