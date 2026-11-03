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

  // the working, as it would be written in class: sentences ('>'), equations, margin notes,
  // and equation numbers on the right that later lines refer back to
  const r = String.raw;
  const DERIV = [
    [
      ['>A point on the shaft goes round a circle of radius \\(A\\). At angle \\(\\theta\\) it is at'],
      [r`(x,\,y)=(A\cos\theta,\ A\sin\theta)`, '← its height is the y part', 1],
      ['>The shaft turns steadily, so the angle grows at a constant rate \\(\\omega\\):'],
      [r`\theta=\omega t`, '', 2],
      ['>Substituting (2) in the height from (1):'],
      [r`x(t)=A\sin(\omega t)`, '← height against time: a sine', 3],
      ['>One full turn is \\(\\theta=2\\pi\\), reached after one period \\(T\\). From (2), \\(\\omega T=2\\pi\\), so'],
      [r`\omega=\frac{2\pi}{T}=2\pi f`, '← f = turns per second', 4],
    ],
    [
      ['>A feature that comes round \\(n\\) times per revolution has \\(n\\) times the angle rate. Putting \\(\\omega=n\\,\\omega_0\\) in (3):'],
      [r`x(t)=A\sin(n\,\omega_0 t)`, '← n = order', 5],
      [r`n=1:\ 1\text{X},\qquad n=2:\ 2\text{X},\qquad n=3:\ 3\text{X}`, ''],
    ],
    [
      ['>A point that starts at angle \\(\\varphi\\) instead of 0 has \\(\\theta=\\omega t+\\varphi\\), so from (1)'],
      [r`x(t)=A\sin(\omega t+\varphi)`, '← φ is the phase', 6],
      ['>From (D), the angle-sum rule:'],
      [r`\sin(a+b)=\sin a\cos b+\cos a\sin b`, '', 7],
      ['>Put \\(a=\\omega t\\), \\(b=\\tfrac{\\pi}{2}\\) in (7). We know that \\(\\cos\\tfrac{\\pi}{2}=0\\) and \\(\\sin\\tfrac{\\pi}{2}=1\\):'],
      [r`\sin\!\big(\omega t+\tfrac{\pi}{2}\big)=\sin\omega t\cdot 0+\cos\omega t\cdot 1=\cos(\omega t)`, '← a cosine is a sine, 90° ahead', 8],
    ],
    [
      ['>Expand \\(c\\sin(\\omega t+\\varphi)\\) using (7):'],
      [r`c\sin(\omega t+\varphi)=c\cos\varphi\,\sin\omega t+c\sin\varphi\,\cos\omega t`, '', 9],
      ['>For (9) to equal \\(a\\cos\\omega t+b\\sin\\omega t\\) at every \\(t\\), the parts must match:'],
      [r`b=c\cos\varphi,\qquad a=c\sin\varphi`, '', 10],
      ['>Square both parts of (10) and add. From (B), \\(\\sin^2\\varphi+\\cos^2\\varphi=1\\):'],
      [r`a^2+b^2=c^2\big(\sin^2\varphi+\cos^2\varphi\big)=c^2`, '', 11],
      ['>Taking the square root of (11), and dividing the two parts of (10):'],
      [r`c=\sqrt{a^2+b^2},\qquad \tan\varphi=\frac{a}{b}`, '← size and phase', 12],
    ],
    [
      ['>Running speed in rpm is revolutions per minute. Dividing by 60 seconds per minute gives revolutions per second, which is 1X in hertz:'],
      [r`f_1=\frac{\text{rpm}}{60}`, '', 13],
      ['>By (5), the \\(n\\)th order turns \\(n\\) times faster:'],
      [r`f_n=n\,f_1`, '', 14],
      ['>For example, at 1490 rpm, (13) and (14) give'],
      [r`f_1=\frac{1490}{60}\approx 24.8\ \text{Hz},\qquad f_2\approx 49.7\ \text{Hz},\qquad f_3\approx 74.5\ \text{Hz}`, ''],
    ],
  ];

  const GOAL = [
    ['>By the end of this lesson we will have derived, from a point going round a circle:'],
    [r`x(t)=A\sin(\omega t+\varphi),\qquad \omega=2\pi f=\frac{2\pi}{T}`, '← amplitude, frequency, phase', '', 'box'],
    [r`a\cos\omega t+b\sin\omega t=c\sin(\omega t+\varphi),\qquad c=\sqrt{a^2+b^2}`, '← one peak from two parts', '', 'box'],
    [r`f_n=n\times\frac{\text{rpm}}{60}`, '← orders in hertz', '', 'box'],
    ['>Then we solve two examples with every operation shown, and you try one yourself.'],
  ];
  const TOOLS = [
    ['>As we know, in a right triangle with long side \\(r\\) and angle \\(\\theta\\), the sides next to and opposite the angle are'],
    [r`\text{adjacent}=r\cos\theta,\qquad \text{opposite}=r\sin\theta`, '← what cos and sin mean', 'A'],
    ['>Pythagoras on that triangle, then divide by \\(r^2\\):'],
    [r`(r\cos\theta)^2+(r\sin\theta)^2=r^2\quad\Rightarrow\quad \sin^2\theta+\cos^2\theta=1`, '', 'B'],
    ['>Angles can be measured in degrees or in radians. One full turn is'],
    [r`360^\circ=2\pi\ \text{rad},\qquad 180^\circ=\pi,\qquad 90^\circ=\tfrac{\pi}{2}`, '', 'C'],
    ['>The angle-sum rule from trigonometry:'],
    [r`\sin(a+b)=\sin a\cos b+\cos a\sin b`, '', 'D'],
    ['>And four values worth knowing by heart:'],
    [r`\sin 0=0,\quad \cos 0=1,\quad \sin\tfrac{\pi}{2}=1,\quad \cos\tfrac{\pi}{2}=0`, '', 'E'],
  ];
  const EX1 = [
    ['>Worked example 1. A pump runs at 1490 rpm. Find 1X, 2X and 3X in hertz, the time for one turn, and \\(\\omega_0\\).'],
    ['>1X: substitute the speed in (13):'],
    [r`f_1=\frac{1490\ \text{rev/min}}{60\ \text{s/min}}=24.8333\ \text{rev/s}=24.83\ \text{Hz}`, '', 15],
    ['>2X and 3X: put \\(n=2\\) and \\(n=3\\) in (14), with (15):'],
    [r`f_2=2\times 24.8333=49.67\ \text{Hz},\qquad f_3=3\times 24.8333=74.50\ \text{Hz}`, '', 16],
    ['>Time for one turn. From (4), \\(T=1/f\\):'],
    [r`T=\frac{1}{24.8333}=0.040268\ \text{s}=0.040268\times1000\ \text{ms}=40.27\ \text{ms}`, '', 17],
    ['>Angular speed, from (4):'],
    [r`\omega_0=2\pi f_1=2\times3.1416\times24.8333=156.03\ \text{rad/s}`, '', 18],
    ['>Check: by (4), \\(\\omega_0T\\) must be one full turn, \\(2\\pi\\):'],
    [r`\omega_0T=156.03\times0.040268=6.2832=2\pi\ \checkmark`, ''],
  ];
  const EX2 = [
    ['>Worked example 2. At 1X a fan has a cosine part \\(a=3\\) mm/s and a sine part \\(b=4\\) mm/s:'],
    [r`x(t)=3\cos(\omega_0t)+4\sin(\omega_0t)`, '← write it as one sine', 19],
    ['>Size, from (12): square each part, add, then take the square root:'],
    [r`c=\sqrt{3^2+4^2}=\sqrt{9+16}=\sqrt{25}=5\ \text{mm/s}`, '← the 1X peak', 20],
    ['>Phase, from (12). Both parts are positive, so \\(\\varphi\\) is in the first quadrant and the calculator is right:'],
    [r`\tan\varphi=\frac{a}{b}=\frac{3}{4}=0.75\quad\Rightarrow\quad\varphi=\tan^{-1}(0.75)=36.87^\circ`, '', 21],
    [r`x(t)=5\sin(\omega_0t+36.87^\circ)`, '', 22, 'box'],
    ['>Check at \\(t=0\\). From (19) and (E): \\(3(1)+4(0)=3\\). From (22): \\(5\\sin36.87^\\circ=5(0.6)=3\\) ✓'],
    ['>Part (b): watch the quadrant. Now \\(a=1.2\\) and \\(b=-0.5\\):'],
    [r`c=\sqrt{1.2^2+(-0.5)^2}=\sqrt{1.44+0.25}=\sqrt{1.69}=1.3`, '', 23],
    [r`\tan\varphi=\frac{1.2}{-0.5}=-2.4\quad\Rightarrow\quad \tan^{-1}(-2.4)=-67.38^\circ`, '← the calculator’s answer', 24],
    ['>But from (10), \\(b=c\\cos\\varphi\\) is negative and \\(a=c\\sin\\varphi\\) is positive. So \\(\\cos\\varphi<0\\) and \\(\\sin\\varphi>0\\): \\(\\varphi\\) is in the second quadrant. Tangent repeats every 180°, so add 180°:'],
    [r`\varphi=-67.38^\circ+180^\circ=112.62^\circ`, '← the right answer', 25],
    ['>Check with (10):'],
    [r`c\sin\varphi=1.3\times0.9231=1.2=a\ \checkmark,\qquad c\cos\varphi=1.3\times(-0.3846)=-0.5=b\ \checkmark`, ''],
  ];
  const SUMMARY = [
    ['>Everything in this lesson on one card:'],
    [r`x(t)=A\sin(\omega t+\varphi),\qquad \omega=2\pi f=\frac{2\pi}{T}`, '← from (3), (4), (6)', '', 'box'],
    [r`\cos\omega t=\sin(\omega t+90^\circ)`, '← from (8)', '', 'box'],
    [r`a\cos\omega t+b\sin\omega t=c\sin(\omega t+\varphi),\quad c=\sqrt{a^2+b^2},\quad \tan\varphi=\frac{a}{b}`, '← from (12): check the quadrant', '', 'box'],
    [r`f_n=n\times\frac{\text{rpm}}{60}`, '← from (13), (14)', '', 'box'],
  ];
  const WORK = [GOAL, TOOLS, ...DERIV, EX1, EX2];

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
      ['>Worked solution. 1X: substituting the speed in (13),'],
      [r`f_1=\frac{${R}\ \text{rev/min}}{60\ \text{s/min}}=${F(f1)}\ \text{rev/s}=${F(f1)}\ \text{Hz}`, '', 26],
      ['>2X: putting \\(n=2\\) and (26) in (14):'],
      [r`f_2=2\times ${F(f1)}=${F(2 * f1)}\ \text{Hz}`, ''],
      ['>Time for one turn. From (4), \\(T=1/f\\); using (26):'],
      [r`T=\frac{1}{${F(f1)}}=${F(1 / f1, 5)}\ \text{s}=${F(1 / f1, 5)}\times 1000\ \text{ms}=${F(1000 / f1)}\ \text{ms}`, ''],
      ['>Amplitude, from (12). First square each part:'],
      [r`a^2=${a}^2=${F(a * a)},\qquad b^2=${b}^2=${F(b * b)}`, ''],
      ['>Add them:'],
      [r`a^2+b^2=${F(a * a)}+${F(b * b)}=${F(a * a + b * b)}`, ''],
      ['>Take the square root:'],
      [r`c=\sqrt{${F(a * a + b * b)}}=${F(c)}\ \text{mm/s}`, '← the 1X peak'],
      ['>Phase, from (12). Divide:'],
      [r`\tan\varphi=\frac{${a}}{${b}}=${F(a / b, 4)}`, ''],
      ['>Then take the inverse tangent (calculator in degrees mode):'],
      [r`\varphi=\tan^{-1}(${F(a / b, 4)})=${F(ph, 1)}^\circ`, '← the answer'],
    ];
  });
  WORK.push(SUMMARY);

  // boards for the new steps
  function triangleBoard(g, s, api) {
    const c = g.col, ctx = g.ctx, R = Math.min(g.h * 0.36, g.w * 0.2), cx = g.w * 0.35, cy = g.h * 0.5;
    const th = s.th * Math.PI / 180, px = cx + R * Math.cos(th), py = cy - R * Math.sin(th);
    ctx.strokeStyle = c.line; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - R * 1.2, cy); ctx.lineTo(cx + R * 1.2, cy); ctx.moveTo(cx, cy - R * 1.2); ctx.lineTo(cx, cy + R * 1.2); ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = c.blue; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, cy); ctx.stroke();
    ctx.strokeStyle = c.good; ctx.beginPath(); ctx.moveTo(px, cy); ctx.lineTo(px, py); ctx.stroke();
    ctx.strokeStyle = c.orange; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
    ctx.fillStyle = c.orange; ctx.beginPath(); ctx.arc(px, py, 6, 0, TAU); ctx.fill();
    ctx.strokeStyle = c.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx, cy, R * 0.2, 0, -th, true); ctx.stroke();
    g.text('θ', cx + R * 0.3 * Math.cos(th / 2), cy - R * 0.3 * Math.sin(th / 2), { size: 13, color: c.ink });
    g.text('r cos θ', (cx + px) / 2, cy + (Math.sin(th) >= 0 ? 16 : -14), { size: 12, color: c.blue });
    g.text('r sin θ', px + (Math.cos(th) >= 0 ? 34 : -34), (cy + py) / 2, { size: 12, color: c.good });
    const co = Math.cos(th), si = Math.sin(th);
    g.text(`cos θ = ${co.toFixed(3)}`, g.w * 0.78, g.h * 0.36, { size: 14, color: c.blue });
    g.text(`sin θ = ${si.toFixed(3)}`, g.w * 0.78, g.h * 0.48, { size: 14, color: c.good });
    g.text(`sin²+cos² = ${(co * co + si * si).toFixed(3)}`, g.w * 0.78, g.h * 0.6, { size: 14, color: c.ink });
    api.legend([['r cos θ', c.blue], ['r sin θ', c.good], ['r', c.orange]]);
  }
  function ordersBoard(g, rpm, order, api) {
    const c = g.col, f1 = rpm / 60;
    const P = g.plot({ box: [0.06, 0.1, 0.9, 0.6], x: [0, 0.2], y: [-1.5, 1.5] });
    P.axes({ grid: [0.05, 0.1, 0.15], ticks: [[0.05, '50 ms'], [0.1, '100 ms'], [0.15, '150 ms'], [0.2, '200 ms']] });
    P.curve((x) => Math.sin(TAU * f1 * x), { color: c.muted, width: 1.6, dash: [5, 5], n: 1200 });
    P.curve((x) => Math.sin(TAU * f1 * order * x), { color: c.blue, width: 2.6, glow: true, n: 1200 });
    const B = g.plot({ box: [0.06, 0.78, 0.9, 0.14], x: [0, 400], y: [0, 1.2] });
    const ctx = g.ctx;
    ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(B.X(0), B.Y(0)); ctx.lineTo(B.X(400), B.Y(0)); ctx.stroke();
    for (let n = 1; n <= 6; n++) {
      const fx = n * f1; if (fx > 400) break;
      ctx.fillStyle = n <= order ? c.blue : c.line;
      ctx.fillRect(B.X(fx) - 3, B.Y(1), 6, B.Y(0) - B.Y(1));
    }
    [0, 100, 200, 300, 400].forEach((hz) => g.text(hz + ' Hz', B.X(hz), B.Y(0) + 12, { size: 10 }));
    api.legend([['1X', c.muted], [`${order}X`, c.blue]]);
    api.verdict(`1X = ${f1.toFixed(2)} Hz · ${order}X = ${(f1 * order).toFixed(2)} Hz`, '');
  }
  function sumBoard(g, a, b, api) {
    const c = g.col, top = Math.ceil(Math.hypot(a, b) * 1.25 * 2) / 2;
    const P = g.plot({ box: [0.06, 0.08, 0.6, 0.8], x: [0, 2], y: [-top, top] });
    P.axes({ grid: [1], ticks: [[1, 'T'], [2, '2T']] });
    P.curve((x) => a * Math.cos(TAU * x), { color: c.blue, width: 1.6, alpha: 0.85 });
    P.curve((x) => b * Math.sin(TAU * x), { color: c.good, width: 1.6, alpha: 0.85 });
    P.curve((x) => a * Math.cos(TAU * x) + b * Math.sin(TAU * x), { color: c.orange, width: 3, glow: true });
    const ctx = g.ctx, S = Math.min(g.w * 0.1, g.h * 0.26) / Math.max(Math.abs(a), Math.abs(b)), ox = g.w * 0.8, oy = g.h * 0.62;
    ctx.lineWidth = 3;
    ctx.strokeStyle = c.good; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + b * S, oy); ctx.stroke();
    ctx.strokeStyle = c.blue; ctx.beginPath(); ctx.moveTo(ox + b * S, oy); ctx.lineTo(ox + b * S, oy - a * S); ctx.stroke();
    ctx.strokeStyle = c.orange; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + b * S, oy - a * S); ctx.stroke();
    const cn = Math.hypot(a, b), ph = Math.atan2(a, b) * 180 / Math.PI;
    api.legend([[`${a} cos`, c.blue], [`${b} sin`, c.good], ['sum', c.orange]]);
    api.verdict(`c = ${cn.toFixed(2)},  φ = ${ph.toFixed(2)}°`, 'good');
  }

  Lab.lesson({
    work: WORK,
    heads: true,
    next: '../build-a-signal/',
    state: { A: 1, k: 1, phd: 0, a: 0.6, b: 0.8, rpm: 1490, order: 1, th: 35, ex2: 'a' },
    steps: [
      {
        part: 'Goal',
        title: 'Where we are going',
        text: `<p>Every vibration spectrum is built from sines and cosines. This lesson derives them from a point going round a shaft, the way you would in a maths class, then solves two examples on a calculator.</p>
               <p class="hint">The working builds up below the board. Click any heading there to fold it away.</p>`,
        draw(g, s, t, api) { phasor(g, s, t, { A: 1, k: 1, ph: 0, color: g.col.blue }); api.legend([['height of a point on the shaft', g.col.blue]]); },
      },
      {
        part: 'What we already know',
        title: 'The tools',
        text: `<p>Five facts from school trigonometry, lettered (A) to (E) so the working can point back to them.</p>
               <p>On the board: drag the angle. The blue side is \\(r\\cos\\theta\\), the green side \\(r\\sin\\theta\\), and \\(\\sin^2+\\cos^2\\) stays 1.</p>`,
        controls: [{ type: 'range', key: 'th', label: 'Angle θ', min: 0, max: 360, step: 1, fmt: (v) => v + '°' }],
        draw(g, s, t, api) { triangleBoard(g, s, api); },
      },
      {
        part: 'Derivation',
        title: 'A point going round',
        text: `<p>A shaft turns. Follow one point on it: its height, plotted against time, is a <b>sine</b>.</p>
               <p>One full circle is one period \\(T\\). The number of turns per second is the frequency \\(f\\), and \\(\\omega=2\\pi f\\) is the same thing measured in radians per second.</p>`,
        draw(g, s, t, api) { phasor(g, s, t, { A: 1, k: 1, ph: 0, color: g.col.blue }); api.legend([['height of the point', g.col.blue]]); },
      },
      {
        part: 'Derivation',
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
        part: 'Derivation',
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
        part: 'Derivation',
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
        part: 'Derivation',
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
        part: 'Worked example 1',
        title: 'A pump at 1490 rpm',
        text: `<p>From running speed to every number an analyst needs: 1X, 2X and 3X in hertz, the time for one turn, and the angular speed. Every operation is written out below.</p>`,
        draw(g, s, t, api) { ordersBoard(g, 1490, 3, api); },
      },
      {
        part: 'Worked example 2',
        title: 'One peak from two parts',
        text: `<p>A cosine part and a sine part at 1X combine into one peak and one phase. Part (b) shows the trap: when \\(b\\) is negative, the calculator’s angle is 180° out.</p>`,
        controls: [{ type: 'choice', key: 'ex2', options: [['a', '(a) a = 3, b = 4'], ['b', '(b) a = 1.2, b = −0.5']] }],
        draw(g, s, t, api) { s.ex2 === 'a' ? sumBoard(g, 3, 4, api) : sumBoard(g, 1.2, -0.5, api); },
      },
      {
        part: 'Your turn',
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
      {
        part: 'Summary',
        title: 'On one card',
        text: `<p>The four results of this lesson, each derived above. Next lesson: why a repeating signal can only contain whole orders, and how to build any shape from them.</p>`,
        draw(g, s, t, api) { sumBoard(g, 3, 4, api); },
      },
    ],
  });
})();
