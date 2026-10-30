// Lesson: why even harmonics vanish (half-wave symmetry), step by step.
(function () {
  const { TAU, ease, fourier, integral } = Lab;
  const sq = (t) => Math.sign(Math.sin(TAU * t));
  const TICKS = [[0.5, 'T/2'], [1, 'T'], [1.5, '3T/2'], [2, '2T']];
  const WAVE = { box: [0.06, 0.07, 0.9, 0.56], x: [0, 2], y: [-1.6, 1.6] };
  const SPEC = { box: [0.06, 0.74, 0.9, 0.18], x: [-0.6, 9.6], y: [0, 1.45] };
  const sqAmps = [0, ...Array.from({ length: 9 }, (_, i) => ((i + 1) % 2 ? 4 / (Math.PI * (i + 1)) : 0))];

  const wavePlot = (g) => { const P = g.plot(WAVE); P.axes({ grid: [0.5, 1, 1.5], ticks: TICKS }); return P; };

  // the working, as it would be written in class: sentences ('>'), equations, margin notes,
  // and equation numbers on the right that later lines refer back to
  const r = String.raw;
  const WORK = [
    [
      ['>Over one turn, the square wave is'],
      [r`f(t)=\begin{cases}+1, & 0<t<\tfrac{T}{2}\\[2pt] -1, & \tfrac{T}{2}<t<T\end{cases}`, '← the square wave', 1],
      ['>Its spectrum has 1X, 3X, 5X… and 2X = 4X = 6X = 0. Not small: exactly zero. Why?'],
    ],
    [
      ['>Shift the wave by half a turn and call the result \\(g\\):'],
      [r`g(t)=f\!\left(t+\tfrac{T}{2}\right)`, '← the wave, half a turn later', 2],
      ['>Reading the values off (1):'],
      [r`0<t<\tfrac{T}{2}:\quad g(t)=f(\text{second half})=-1`, ''],
      [r`\tfrac{T}{2}<t<T:\quad g(t)=f(\text{next first half})=+1`, ''],
      ['>Comparing with (1), \\(g\\) is \\(f\\) upside down:'],
      [r`g(t)=-f(t)`, '', 3],
    ],
    [
      ['>Flip the copy: \\(-g(t)=f(t)\\), it lands on itself. Substituting (2) in (3):'],
      [r`\boxed{\,f\!\left(t+\tfrac{T}{2}\right)=-f(t)\,}`, '← half-wave symmetry', 4],
    ],
    [
      ['>Now give one harmonic the same test. Shift it by half a turn:'],
      [r`\sin\!\Big(n\omega_0\big(t+\tfrac{T}{2}\big)\Big)=\sin\!\Big(n\omega_0 t+n\,\tfrac{\omega_0 T}{2}\Big)`, '← multiply out'],
      ['>We know that \\(\\omega_0 T=2\\pi\\), so \\(n\\,\\omega_0 T/2=n\\pi\\):'],
      [r`=\sin(n\omega_0 t+n\pi)`, ''],
      ['>We know that adding \\(\\pi\\) flips a sine’s sign, \\(\\sin(\\theta+\\pi)=-\\sin\\theta\\). Adding \\(n\\pi\\) flips it \\(n\\) times:'],
      [r`\sin\!\Big(n\omega_0\big(t+\tfrac{T}{2}\big)\Big)=(-1)^n\sin(n\omega_0 t)`, '← odd n flips, even n doesn’t', 5],
    ],
    [
      ['>Write \\(f\\) as its harmonics:'],
      [r`f(t)=\sum_{n} b_n\sin(n\omega_0 t)`, '', 6],
      ['>Shift (6) by half a turn, using (5) on every term:'],
      [r`f\!\left(t+\tfrac{T}{2}\right)=\sum_{n}(-1)^n\,b_n\sin(n\omega_0 t)`, '', 7],
      ['>Multiply (6) by \\(-1\\):'],
      [r`-f(t)=\sum_{n}(-b_n)\sin(n\omega_0 t)`, '', 8],
      ['>By (4), the left sides of (7) and (8) are equal, so every term must match:'],
      [r`(-1)^n\,b_n=-b_n\quad\text{for every } n`, '', 9],
      ['>For even \\(n\\), \\((-1)^n=+1\\), so (9) becomes'],
      [r`b_n=-b_n\ \Rightarrow\ 2b_n=0\ \Rightarrow\ b_n=0\qquad(n\ \text{even})`, '← the same holds for aₙ', 10],
    ],
    [
      ['>Another way to see it. From Lesson 2, equation (8):'],
      [r`b_n=\frac{2}{T}\int_0^{T} f(t)\sin(n\omega_0 t)\,dt`, '← the area of f × harmonic', 11],
      ['>Split (11) into the two halves of the turn:'],
      [r`b_n=\frac{2}{T}\Big[\int_0^{T/2}\!f\sin\,dt+\int_{T/2}^{T}\!f\sin\,dt\Big]`, '', 12],
      ['>In the second half put \\(t=s+\\tfrac{T}{2}\\), then use (4) for \\(f\\) and (5) for the sine:'],
      [r`\int_{T/2}^{T}\!f\sin\,dt=\int_0^{T/2}\!\big(-f(s)\big)\,(-1)^n\sin(n\omega_0 s)\,ds`, ''],
      [r`=(-1)^{n+1}\!\int_0^{T/2}\!f\sin\,ds`, '← (−1)·(−1)ⁿ = (−1)ⁿ⁺¹', 13],
      ['>Substituting (13) in (12):'],
      [r`b_n=\frac{2}{T}\,\big(1-(-1)^n\big)\int_0^{T/2}\!f\sin\,ds`, '← even n: 1 − 1 = 0', 14],
      ['>For the square wave, \\(f=1\\) on the first half; for odd \\(n\\) the bracket is 2, and by Lesson 2, (11):'],
      [r`b_n=\frac{4}{T}\int_0^{T/2}\!\sin(n\omega_0 s)\,ds=\frac{4}{T}\cdot\frac{2}{n\omega_0}=\frac{4}{\pi n}`, '← the second half doubles the first', 15],
    ],
    [
      ['>Now limit the wave on one side only, at a level \\(-L\\):'],
      [r`f(t)=\max\big(\sin\omega_0 t,\,-L\big)`, '← limited on one side', 16],
      ['>Shift by half a turn; we know that \\(\\sin(\\theta+\\pi)=-\\sin\\theta\\):'],
      [r`f\!\left(t+\tfrac{T}{2}\right)=\max(-\sin\omega_0 t,\,-L)`, '', 17],
      ['>Multiply (16) by \\(-1\\):'],
      [r`-f(t)=\min(-\sin\omega_0 t,\,L)`, '', 18],
      ['>For \\(L<1\\), (17) and (18) are different, so the symmetry (4) fails:'],
      [r`f\!\left(t+\tfrac{T}{2}\right)\neq-f(t)`, '← symmetry broken'],
      ['>Without (4) we cannot get from (9) to (10), so nothing forces \\(b_2, b_4,\\dots\\) or \\(a_0\\) to zero: the evens and a DC offset appear.'],
    ],
    [
      ['>In one line:'],
      [r`\boxed{\,f\!\left(t+\tfrac{T}{2}\right)=-f(t)\iff a_0=0,\ a_n=b_n=0\ \text{for every even } n\,}`, '← the whole lesson'],
    ],
  ];

  // ---- calculator exercise: random but realistic numbers
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const newEx3 = (s) => { s.ex = { A: pick([2, 2.5, 3, 4, 5, 6, 8, 10, 12]) }; s.showSol = false; };
  const F = (x, d = 3) => (+x.toFixed(d)).toString();
  WORK.push((s) => {
    if (!s.ex) newEx3(s);
    const { A } = s.ex, P = Math.PI;
    const given = [
      ['>Worked example. Over one turn the signal is'],
      [r`f(t)=\begin{cases}A\sin(\omega_0 t), & 0<t<\tfrac{T}{2}\\ 0, & \tfrac{T}{2}<t<T\end{cases}\qquad A=${A}\ \text{mm/s}`, '← the bottom half cut off', 19],
    ];
    if (!s.showSol) return given;
    return [
      ...given,
      ['>We use the coefficient formulas from Lesson 2, (16) and (17). Since \\(f=0\\) on the second half, only \\(0\\) to \\(T/2\\) counts.'],
      ['>DC. Substituting (19) in (16):'],
      [r`a_0=\frac{A}{T}\int_0^{T/2}\!\sin(\omega_0 t)\,dt=\frac{A}{T}\cdot\frac{1-\cos\pi}{\omega_0}=\frac{2A}{\omega_0 T}`, ''],
      ['>We know that \\(\\omega_0 T=2\\pi\\):'],
      [r`a_0=\frac{A}{\pi}`, '← the DC offset', 20],
      ['>1X, sine part. We know that \\(\\sin^2x=\\tfrac12(1-\\cos 2x)\\):'],
      [r`b_1=\frac{2A}{T}\int_0^{T/2}\!\sin^2(\omega_0 t)\,dt=\frac{A}{T}\int_0^{T/2}\!\big(1-\cos 2\omega_0 t\big)\,dt`, ''],
      [r`=\frac{A}{T}\Big[t-\frac{\sin 2\omega_0 t}{2\omega_0}\Big]_0^{T/2}=\frac{A}{T}\Big[\frac{T}{2}-\frac{\sin 2\pi}{2\omega_0}\Big]=\frac{A}{2}`, '← sin 2π = 0', 21],
      ['>1X, cosine part. We know that \\(\\sin x\\cos x=\\tfrac12\\sin 2x\\):'],
      [r`a_1=\frac{A}{T}\int_0^{T/2}\!\sin 2\omega_0 t\,dt=\frac{A}{T}\cdot\frac{1-\cos 2\pi}{2\omega_0}=0`, '← cos 2π = 1', 22],
      ['>So by (21) and (22), the 1X peak is \\(A/2\\).'],
      ['>Now \\(n\\ge 2\\), cosine part. We know that \\(\\sin x\\cos y=\\tfrac12\\big[\\sin(x+y)+\\sin(x-y)\\big]\\):'],
      [r`a_n=\frac{2A}{T}\int_0^{T/2}\!\sin(\omega_0 t)\cos(n\omega_0 t)\,dt`, '← (19) in (17)'],
      [r`=\frac{A}{T}\int_0^{T/2}\!\big[\sin((n{+}1)\omega_0 t)-\sin((n{-}1)\omega_0 t)\big]dt`, '', 23],
      ['>Integrating (23) from \\(0\\) to \\(T/2\\), with \\(\\omega_0\\tfrac{T}{2}=\\pi\\):'],
      [r`a_n=\frac{A}{T}\Big[\frac{1-\cos((n{+}1)\pi)}{(n{+}1)\,\omega_0}-\frac{1-\cos((n{-}1)\pi)}{(n{-}1)\,\omega_0}\Big]`, '', 24],
      ['>If \\(n\\) is odd, \\(n\\pm1\\) are even, so both cosines in (24) are \\(+1\\) and both brackets are \\(1-1=0\\):'],
      [r`a_n=0\qquad(n\ \text{odd})`, '← why 3X, 5X… are zero', 25],
      ['>If \\(n\\) is even, \\(n\\pm1\\) are odd, so both cosines are \\(-1\\) and both brackets are \\(1-(-1)=2\\):'],
      [r`a_n=\frac{2A}{\omega_0 T}\Big[\frac{1}{n{+}1}-\frac{1}{n{-}1}\Big]`, ''],
      ['>We know that \\(\\frac{1}{n+1}-\\frac{1}{n-1}=\\frac{(n-1)-(n+1)}{n^2-1}=\\frac{-2}{n^2-1}\\), and \\(\\omega_0T=2\\pi\\):'],
      [r`a_n=-\frac{2A}{\pi\,(n^2-1)}\qquad(n\ \text{even})`, '← why 2X, 4X… survive', 26],
      ['>Finally \\(n\\ge 2\\), sine part. We know that \\(\\sin x\\sin y=\\tfrac12\\big[\\cos(x-y)-\\cos(x+y)\\big]\\):'],
      [r`b_n=\frac{2A}{T}\int_0^{T/2}\!\sin(\omega_0 t)\sin(n\omega_0 t)\,dt`, '← (19) in (17)'],
      [r`=\frac{A}{T}\int_0^{T/2}\!\big[\cos((n{-}1)\omega_0 t)-\cos((n{+}1)\omega_0 t)\big]dt`, ''],
      ['>Integrating from \\(0\\) to \\(T/2\\):'],
      [r`b_n=\frac{A}{T}\Big[\frac{\sin((n{-}1)\pi)}{(n{-}1)\,\omega_0}-\frac{\sin((n{+}1)\pi)}{(n{+}1)\,\omega_0}\Big]`, ''],
      ['>The sine of any multiple of \\(\\pi\\) is 0, so'],
      [r`b_n=0\qquad(n\ge 2)`, '', 27],
      ['>Collecting (20), (21), (22), (25), (26) and (27) into the Fourier series:'],
      [r`\boxed{\,f(t)=\frac{A}{\pi}+\frac{A}{2}\sin\omega_0 t-\frac{2A}{\pi}\sum_{n\ \text{even}}\frac{\cos(n\omega_0 t)}{n^2-1}\,}`, '← the series, now earned', 28],
      ['>Now the numbers, with \\(A=' + A + '\\) mm/s. DC from (20):'],
      [r`\text{DC}=\frac{${A}}{${P.toFixed(4)}}=${F(A / P)}\ \text{mm/s}`, ''],
      ['>1X from (21):'],
      [r`1\text{X}=\frac{${A}}{2}=${F(A / 2)}\ \text{mm/s}`, ''],
      ['>2X: put \\(n=2\\) in (26), and take the size:'],
      [r`2\text{X}=\frac{2\times ${A}}{\pi\,(2^2-1)}=\frac{${F(2 * A, 2)}}{${F(3 * P, 3)}}=${F(2 * A / (3 * P))}\ \text{mm/s}`, ''],
      ['>3X: \\(n=3\\) is odd, so by (25) and (27)'],
      [r`3\text{X}=0`, '← exactly zero'],
      ['>4X: put \\(n=4\\) in (26):'],
      [r`4\text{X}=\frac{2\times ${A}}{\pi\,(4^2-1)}=\frac{${F(2 * A, 2)}}{${F(15 * P, 3)}}=${F(2 * A / (15 * P))}\ \text{mm/s}`, ''],
      ['>Dividing 2X by 1X:'],
      [r`\frac{2\text{X}}{1\text{X}}=\frac{2A/(3\pi)}{A/2}=\frac{4}{3\pi}=${F(4 / (3 * P), 3)}`, '← A cancels: same for any A'],
    ];
  });

  Lab.lesson({
    work: WORK,
    next: '../',
    state: { shift: 0.5, n: 2, b2: 0.3, clip: 1 },
    steps: [
      {
        title: 'Start with a square wave',
        text: `<p>Here is a square wave over two turns of a machine. Below it is its spectrum: peaks at 1X, 3X, 5X, 7X, 9X… and nothing at 2X, 4X, 6X, 8X.</p>
               <p>Not small. <b>Exactly zero.</b> Over the next steps we'll see why, using one idea: symmetry.</p>`,
        draw(g, s, t, api) {
          const P = wavePlot(g), c = g.col;
          P.curve(sq, { color: c.ink, width: 2.6, to: 2 * ease(t / 1.4), glow: true });
          const B = g.plot(SPEC);
          B.bars(sqAmps.map((v, k) => (k <= 1 + Math.floor(t * 4) ? v : 0)), { ghost: true, noDC: true });
          api.legend([['f(t)', c.ink]]);
        },
      },
      {
        title: 'Shift it by half a turn',
        text: `<p>Make a copy and slide it left by half a period, \\(T/2\\). The copy is \\(f(t+T/2)\\): at each moment it shows what the wave will be doing half a turn later.</p>
               <p>Drag the slider to move the copy yourself.</p>`,
        controls: [{ type: 'range', key: 'shift', label: 'Shift', min: 0, max: 1, step: 0.01, fmt: (v) => v.toFixed(2) + ' T' }],
        enter(s, api) { api.set('shift', 0.5); },
        draw(g, s, t, api) {
          const P = wavePlot(g), c = g.col;
          const sh = t < 1.8 ? 0.5 * ease(t / 1.8) : s.shift;
          P.curve(sq, { color: c.ink, width: 2.6, glow: true });
          P.curve((x) => sq(x + sh), { color: c.orange, width: 2.6, dash: [7, 5] });
          api.legend([['f(t)', c.ink], ['f(t + shift)', c.orange]]);
          api.verdict(Math.abs(sh - 0.5) < 0.006 ? 'At T/2 the copy is exactly upside down' : '', '');
        },
      },
      {
        title: 'Now flip it',
        text: `<p>Turn the copy upside down: \\(-f(t+T/2)\\). It lands exactly on the original.</p>
               <p>That is the symmetry. Half a turn later, the wave does exactly the opposite of what it is doing now: it pushes down as hard as it pushed up. This is called <b>half-wave symmetry</b>.</p>`,
        controls: [{ type: 'button', label: 'Replay', action: (s, api) => api.restart() }],
        tryLabel: 'Watch again',
        draw(g, s, t, api) {
          const P = wavePlot(g), c = g.col;
          const k = Math.cos(Math.PI * ease((t - 0.4) / 1.6));
          const copy = (x) => k * sq(x + 0.5);
          P.between(sq, copy, { alpha: 0.18 * (1 + k) / 2 });
          P.curve(sq, { color: c.ink, width: 2.6 });
          const done = k < -0.999;
          P.curve(copy, { color: done ? c.good : c.orange, width: done ? 5 : 2.6, alpha: done ? 0.75 : 1, dash: done ? [] : [7, 5] });
          api.legend([['f(t)', c.ink], ['−f(t + T/2)', done ? c.good : c.orange]]);
          api.verdict(done ? 'Lands on itself ✓' : '', 'good');
        },
      },
      {
        title: 'Give each harmonic the same test',
        text: `<p>Shift a harmonic \\(\\sin(n\\omega_0 t)\\) by half a turn and it moves through \\(n\\) half-cycles, so it comes back multiplied by \\((-1)^n\\).</p>
               <p><b>Odd</b> harmonics come back upside down, so the flip puts them back on themselves. <b>Even</b> harmonics come back the right way up, so the flip leaves them inverted.</p>
               <p>Change \\(n\\) and watch which ones pass.</p>`,
        controls: [{ type: 'range', key: 'n', label: 'Harmonic', min: 1, max: 8, step: 1, fmt: (v) => v + 'X', onInput: (s, api) => api.restart() }],
        draw(g, s, t, api) {
          const P = wavePlot(g), c = g.col, n = s.n;
          const sh = 0.5 * ease(t / 1.2), k = Math.cos(Math.PI * ease((t - 1.4) / 1.2));
          const h = (x) => 0.9 * Math.sin(TAU * n * x);
          const copy = (x) => k * h(x + sh);
          const done = t > 2.7, pass = n % 2 === 1;
          P.curve(h, { color: c.blue, width: 2.6 });
          P.curve(copy, { color: done ? (pass ? c.good : c.bad) : c.orange, width: done && pass ? 5 : 2.6,
            alpha: done && pass ? 0.75 : 1, dash: done && pass ? [] : [7, 5] });
          api.legend([[`sin(${n}ω₀t)`, c.blue], ['shifted + flipped', done ? (pass ? c.good : c.bad) : c.orange]]);
          api.verdict(done ? (pass ? `${n}X passes: lands on itself ✓` : `${n}X fails: comes back inverted ✗`) : '', pass ? 'good' : 'bad');
        },
      },
      {
        title: 'So the even parts must be zero',
        text: `<p>The square wave passes the test, so every piece of it must pass too. Suppose it contained some 2X, \\(b_2\\sin(2\\omega_0 t)\\). The test turns that piece into \\(-b_2\\sin(2\\omega_0 t)\\).</p>
               <p>For the whole wave to land on itself we need \\(b_2=-b_2\\), and the only number equal to its own negative is zero. The same goes for 4X, 6X, 8X…</p>
               <p>Add some 2X yourself and watch the symmetry break.</p>`,
        controls: [{ type: 'range', key: 'b2', label: 'Amount of 2X added, b₂', min: -0.6, max: 0.6, step: 0.01, fmt: (v) => v.toFixed(2) }],
        enter(s, api) { if (Math.abs(s.b2) < 0.05) api.set('b2', 0.3); },
        draw(g, s, t, api) {
          const P = wavePlot(g), c = g.col;
          const f = (x) => sq(x) + s.b2 * Math.sin(2 * TAU * x);
          const copy = (x) => -f(x + 0.5);
          P.between(f, copy, { alpha: 0.28 });
          P.curve((x) => s.b2 * Math.sin(2 * TAU * x), { color: c.blue, width: 1.6, alpha: 0.8 });
          P.curve(f, { color: c.ink, width: 2.6 });
          const ok = Math.abs(s.b2) < 0.005;
          P.curve(copy, { color: ok ? c.good : c.orange, width: ok ? 5 : 2.4, alpha: ok ? 0.75 : 1, dash: ok ? [] : [7, 5] });
          api.legend([['f(t) with some 2X', c.ink], ['−f(t + T/2)', ok ? c.good : c.orange], ['the 2X part', c.blue]]);
          api.verdict(ok ? 'Lands on itself: b₂ = 0 ✓' : 'Doesn\'t match: the 2X part flipped sign ✗', ok ? 'good' : 'bad');
        },
      },
      {
        title: 'Another view: each harmonic is an area',
        text: `<p>The size of each harmonic is found by multiplying the wave by that harmonic and adding up the area over one turn. <b style="color:var(--good)">Green</b> adds, <b style="color:var(--bad)">red</b> takes away.</p>
               <p>Pick \\(n\\) and press Sweep. For even \\(n\\) the green and red cancel exactly. For odd \\(n\\) they add up to \\(4/(\\pi n)\\).</p>`,
        controls: [
          { type: 'range', key: 'n', label: 'Harmonic', min: 1, max: 8, step: 1, fmt: (v) => v + 'X', onInput: (s, api) => api.restart() },
          { type: 'button', label: 'Sweep', action: (s, api) => api.restart() },
        ],
        draw(g, s, t, api) {
          const c = g.col, n = s.n;
          const P = g.plot({ box: [0.06, 0.1, 0.9, 0.78], x: [0, 1], y: [-1.4, 1.4] });
          P.axes({ grid: [0.25, 0.5, 0.75], ticks: [[0.5, 'T/2'], [1, 'T']] });
          const prod = (x) => sq(x) * Math.sin(TAU * n * x);
          const u = Math.min(1, Math.max(0, (t - 0.3) / 3.5));
          if (u > 0) P.area(prod, { from: 0, to: Math.max(u, 1e-3), alpha: 0.4 });
          P.curve(sq, { color: c.ink, width: 1.6, alpha: 0.45 });
          P.curve((x) => Math.sin(TAU * n * x), { color: c.blue, width: 1.6, alpha: 0.8 });
          P.curve(prod, { color: c.orange, width: 2.6 });
          if (u > 0 && u < 1) P.vline(u, { color: c.ink });
          const val = u > 0 ? 2 * integral(prod, 0, u, 1200) : 0;
          const shown = Math.abs(val) < 0.005 ? 0 : val;
          g.text(`b${n} = ${shown.toFixed(3)}`, g.w * 0.94, g.h * 0.06, { align: 'right', size: 16, weight: 600, color: c.ink });
          api.legend([['f(t)', c.ink], [`sin(${n}ω₀t)`, c.blue], ['product', c.orange]]);
          if (u >= 1) api.verdict(n % 2 ? `adds up: 4/(${n}π) ≈ ${(4 / (Math.PI * n)).toFixed(3)}` : 'cancels exactly: 0', n % 2 ? 'good' : 'bad');
          else api.verdict('');
        },
      },
      {
        title: 'Break the symmetry',
        text: `<p>Now limit the wave on <b>one side only</b>, like a loose part hitting a stop, or a rub that blocks motion one way. Drag the slider to the left.</p>
               <p>Once the limit is one-sided, shift-and-flip no longer gives the wave back, nothing forces the even harmonics to zero, and they appear in the spectrum along with a DC offset.</p>`,
        controls: [{ type: 'range', key: 'clip', label: 'Limit on the bottom side', min: 0, max: 1, step: 0.01,
          fmt: (v) => (v >= 0.995 ? 'none' : 'at −' + v.toFixed(2)) }],
        draw(g, s, t, api) {
          const c = g.col, L = s.clip;
          const f = (x) => Math.max(Math.sin(TAU * x), -L);
          const P = wavePlot(g);
          const copy = (x) => -f(x + 0.5);
          P.between(f, copy, { alpha: 0.28 });
          P.curve(f, { color: c.ink, width: 2.6, glow: true });
          P.curve(copy, { color: c.orange, width: 2.2, dash: [7, 5] });
          const F = fourier(f, 9, 1024);
          const B = g.plot({ ...SPEC, y: [0, 1.15] });
          B.bars([Math.abs(F.dc), ...Array.from(F.amp).slice(1)], { ghost: true });
          api.legend([['f(t)', c.ink], ['−f(t + T/2)', c.orange]]);
          const sym = L >= 0.995;
          api.verdict(sym ? 'Symmetric: only 1X (a pure sine)' : `One-sided: 2X = ${F.amp[2].toFixed(3)}, DC = ${F.dc.toFixed(3)}`, sym ? 'good' : 'bad');
        },
      },
      {
        title: 'What we found',
        text: `<p>One line of maths explains the empty lanes:</p>
               <ul>
                 <li>If a wave satisfies \\(f(t+T/2)=-f(t)\\), every even harmonic and the DC term are exactly zero. Square and triangle waves both do.</li>
                 <li>On a machine, a distortion that is the same in both directions adds odd harmonics. A one-sided one (looseness against a stop, a rub, clipping on one side) brings in the even harmonics and a DC offset.</li>
               </ul>
               <p>See it in 3D in the <a href="../../explainers/watch-harmonics-in-3d/">harmonics video</a>, or build waves harmonic by harmonic in the <a href="../build-a-signal/">next lesson</a>.</p>`,
        draw(g, s, t, api) {
          const c = g.col;
          const cut = (x) => Math.max(Math.sin(TAU * x), 0);
          [[sq, 0.03, 'symmetric'], [cut, 0.53, 'one-sided']].forEach(([f, l, name]) => {
            const P = g.plot({ box: [l, 0.08, 0.44, 0.48], x: [0, 2], y: [-1.5, 1.5] });
            P.axes({ grid: [1] });
            P.curve(f, { color: c.ink, width: 2.2, glow: true });
            g.text(name, g.w * (l + 0.22), g.h * 0.06, { size: 12 });
            const F = fourier(f, 8, 1024);
            const B = g.plot({ box: [l, 0.7, 0.44, 0.2], x: [-0.6, 8.6], y: [0, 1.35] });
            B.bars([Math.abs(F.dc), ...Array.from(F.amp).slice(1)], { ghost: true });
          });
          api.legend([]);
        },
      },
      {
        title: 'Try it with a calculator',
        tryLabel: 'Your answers',
        text: (s) => {
          if (!s.ex) newEx3(s);
          return `<div class="problem"><p>A part can move freely one way but is stopped hard the other way, so its velocity is a sine of peak \\(A=${s.ex.A}\\) mm/s with one half cut flat at zero. (A simple model of motion limited on one side.)</p>
                  <p>The signal is written out on the page below. Work out each peak from the Fourier coefficients, type it in and press Check. Show working derives every coefficient from scratch.</p></div>`;
        },
        controls: [
          { type: 'answer', label: 'DC offset', unit: 'mm/s', value: (s) => s.ex.A / Math.PI, rel: 0.02 },
          { type: 'answer', label: '1X', unit: 'mm/s', value: (s) => s.ex.A / 2, rel: 0.02 },
          { type: 'answer', label: '2X', unit: 'mm/s', value: (s) => 2 * s.ex.A / (3 * Math.PI), rel: 0.02 },
          { type: 'answer', label: '3X', unit: 'mm/s', value: () => 0, abs: 0.005 },
          { type: 'answer', label: '4X', unit: 'mm/s', value: (s) => 2 * s.ex.A / (15 * Math.PI), rel: 0.03 },
          { type: 'answer', label: 'Ratio 2X / 1X', unit: '', value: () => 4 / (3 * Math.PI), rel: 0.02 },
          { type: 'check' },
          { type: 'button', label: 'Show working', action: (s, api) => { s.showSol = true; api.rewrite(); } },
          { type: 'button', label: 'New numbers', action: (s, api) => { newEx3(s); api.refresh(); api.rewrite(); } },
        ],
        draw(g, s, t, api) {
          if (!s.ex) newEx3(s);
          const c = g.col, A = s.ex.A;
          const f = (x) => A * Math.max(Math.sin(TAU * x), 0);
          const P = g.plot({ ...WAVE, y: [-1.5 * A, 1.5 * A] });
          P.axes({ grid: [0.5, 1, 1.5], ticks: TICKS });
          P.curve((x) => A * Math.sin(TAU * x), { color: c.muted, width: 1.4, dash: [5, 5] });
          if (s.showSol) {                                   // why 3X = 0: the areas cancel
            P.area((x) => f(x) * Math.sin(3 * TAU * x), { from: 0, to: 2, alpha: 0.3 });
            P.curve((x) => A * Math.sin(3 * TAU * x), { color: c.blue, width: 1.4, alpha: 0.6 });
          }
          P.curve(f, { color: c.ink, width: 2.8, glow: true });
          const B = g.plot({ ...SPEC, y: [0, 0.75 * A] });
          const vals = [A / Math.PI, A / 2, ...Array.from({ length: 8 }, (_, i) => ((i + 2) % 2 ? 0 : 2 * A / (Math.PI * ((i + 2) ** 2 - 1))))];
          B.bars(s.showSol ? vals : vals.map(() => 0), { ghost: true });
          api.legend(s.showSol ? [[`peak A = ${A} mm/s, cut at zero`, c.ink], ['3X', c.blue], ['f × 3X: areas cancel', c.good]] : [[`peak A = ${A} mm/s, cut at zero`, c.ink], ['the full sine', c.muted]]);
        },
      },
    ],
  });
})();
