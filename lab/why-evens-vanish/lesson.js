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
  const DERIV = [
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
      ['>By (B), \\(n\\,\\omega_0 T/2=n\\pi\\):'],
      [r`=\sin(n\omega_0 t+n\pi)`, ''],
      ['>By (A), adding \\(\\pi\\) flips a sine’s sign. Adding \\(n\\pi\\) flips it \\(n\\) times, and by (C):'],
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
      ['>Shift by half a turn, using (A):'],
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

  const GOAL = [
    ['>By the end of this lesson we will have proved, in a few lines, why a square wave has no 2X, 4X, 6X:'],
    [r`f\!\left(t+\tfrac{T}{2}\right)=-f(t)\iff a_0=0\ \text{and}\ a_n=b_n=0\ \text{for every even } n`, '← half-wave symmetry', '', 'box'],
    ['>and what breaks it: a one-sided distortion brings the evens back. Then we test two signals, with numbers.'],
  ];
  const TOOLS = [
    ['>Half a turn flips a sine and a cosine:'],
    [r`\sin(\theta+\pi)=-\sin\theta,\qquad \cos(\theta+\pi)=-\cos\theta`, '', 'A'],
    ['>One turn is \\(2\\pi\\), so half a turn of running speed is \\(\\pi\\):'],
    [r`\omega_0T=2\pi\quad\Rightarrow\quad \omega_0\tfrac{T}{2}=\pi`, '', 'B'],
    ['>Powers of \\(-1\\):'],
    [r`(-1)^n=+1\ \ (n\ \text{even}),\qquad (-1)^n=-1\ \ (n\ \text{odd})`, '', 'C'],
    ['>From Lesson 2, (15) to (17): the Fourier series and its coefficients:'],
    [r`f=a_0+\sum_n\big[a_n\cos(n\omega_0t)+b_n\sin(n\omega_0t)\big],\quad a_0=\tfrac1T\!\int_0^T\!f,\quad a_n,b_n=\tfrac2T\!\int_0^T\!f\cos,\ f\sin`, '', 'D'],
    ['>Product-to-sum rules:'],
    [r`\sin x\cos y=\tfrac12\big[\sin(x{+}y)+\sin(x{-}y)\big],\qquad \sin x\sin y=\tfrac12\big[\cos(x{-}y)-\cos(x{+}y)\big]`, '', 'E'],
    ['>From Lesson 2, (11): the area of one harmonic over half a turn:'],
    [r`\int_0^{T/2}\!\sin(k\omega_0t)\,dt=\frac{1-\cos k\pi}{k\,\omega_0}`, '← 2/(kω₀) for odd k, 0 for even k', 'F'],
  ];
  const EX1 = [
    ['>Worked example 1. Does this signal have half-wave symmetry?'],
    [r`f(t)=\sin(\omega_0t)+0.3\sin(3\omega_0t)`, '', 19],
    ['>Shift by half a turn. By (B), the 1X angle grows by \\(\\pi\\) and the 3X angle by \\(3\\pi\\):'],
    [r`f\!\left(t+\tfrac{T}{2}\right)=\sin(\omega_0t+\pi)+0.3\sin(3\omega_0t+3\pi)`, '', 20],
    ['>By (A) and (C), \\(+\\pi\\) flips the sine once and \\(+3\\pi\\) flips it three times, \\((-1)^3=-1\\):'],
    [r`f\!\left(t+\tfrac{T}{2}\right)=-\sin(\omega_0t)-0.3\sin(3\omega_0t)=-f(t)\ \checkmark`, '← symmetric: odd harmonics only', 21],
    ['>Check with numbers at \\(\\omega_0t=45^\\circ\\), and half a turn later at \\(225^\\circ\\) (\\(3\\times225^\\circ=675^\\circ=315^\\circ\\)):'],
    [r`f=\sin45^\circ+0.3\sin135^\circ=0.7071+0.3(0.7071)=0.9192`, ''],
    [r`f\!\left(t+\tfrac{T}{2}\right)=\sin225^\circ+0.3\sin315^\circ=-0.7071+0.3(-0.7071)=-0.9192\ \checkmark`, ''],
    ['>Now add a small 2X:'],
    [r`f_2(t)=\sin(\omega_0t)+0.3\sin(3\omega_0t)+0.2\cos(2\omega_0t)`, '', 22],
    ['>The 2X angle grows by \\(2\\pi\\), a whole turn, so by (C) the 2X term comes back unchanged, \\((-1)^2=+1\\):'],
    [r`f_2\!\left(t+\tfrac{T}{2}\right)=-\sin(\omega_0t)-0.3\sin(3\omega_0t)+0.2\cos(2\omega_0t)\neq-f_2(t)`, '← symmetry broken', 23],
    ['>Check at \\(t=0\\) and half a turn later. By (A), (C) and \\(\\cos 0=\\cos360^\\circ=1\\):'],
    [r`f_2(0)=0+0+0.2(1)=0.2,\qquad f_2\!\left(\tfrac{T}{2}\right)=\sin180^\circ+0.3\sin540^\circ+0.2\cos360^\circ=0.2`, '← symmetry needs −0.2 ✗'],
    ['>One even harmonic is enough to break the symmetry, which is exactly why a symmetric wave can’t contain any.'],
  ];
  const EX2 = [
    ['>Worked example 2. A wave that repeats every half turn, with peak 1:'],
    [r`f(t)=\big|\sin(\omega_0t)\big|`, '← both halves point up', 24],
    ['>Shift by half a turn. By (A), \\(|\\sin(\\omega_0t+\\pi)|=|-\\sin\\omega_0t|=|\\sin\\omega_0t|\\):'],
    [r`f\!\left(t+\tfrac{T}{2}\right)=+f(t)`, '← the opposite of (4)', 25],
    ['>Repeat the split of (12) with (25) instead of (4): the second half of each integral is now \\((-1)^n\\) times the first, not \\((-1)^{n+1}\\):'],
    [r`b_n=\frac{2}{T}\,\big(1+(-1)^n\big)\int_0^{T/2}\!f\sin(n\omega_0s)\,ds`, '← odd n: 1 − 1 = 0, and the same for aₙ', 26],
    ['>So every odd harmonic is zero, 1X included. On the first half \\(f=\\sin\\omega_0t\\). DC from (D), using (F) with \\(k=1\\):'],
    [r`a_0=\frac{1}{T}\int_0^T\!|\sin\omega_0t|\,dt=\frac{2}{T}\int_0^{T/2}\!\sin\omega_0t\,dt=\frac{2}{T}\cdot\frac{1-\cos\pi}{\omega_0}=\frac{4}{\omega_0T}=\frac{2}{\pi}`, '', 27],
    ['>Even cosine parts. From (D) and (26) the bracket is 2; then (E) with \\(x=\\omega_0t\\), \\(y=n\\omega_0t\\), and \\(\\sin(x-y)=-\\sin((n-1)\\omega_0t)\\):'],
    [r`a_n=\frac{2}{T}\cdot2\!\int_0^{T/2}\!\sin(\omega_0t)\cos(n\omega_0t)\,dt=\frac{2}{T}\!\int_0^{T/2}\!\big[\sin((n{+}1)\omega_0t)-\sin((n{-}1)\omega_0t)\big]dt`, '', 28],
    ['>\\(n\\) is even, so \\(n\\pm1\\) are odd, and by (F) each integral is \\(2/((n\\pm1)\\omega_0)\\):'],
    [r`a_n=\frac{2}{T}\Big[\frac{2}{(n{+}1)\omega_0}-\frac{2}{(n{-}1)\omega_0}\Big]=\frac{4}{\omega_0T}\cdot\frac{(n-1)-(n+1)}{n^2-1}=-\frac{4}{\pi\,(n^2-1)}`, '', 29],
    ['>Even sine parts: by (E), \\(\\sin\\cdot\\sin\\) turns into cosines, which integrate to sines of multiples of \\(\\pi\\), all 0:'],
    [r`b_n=0`, '', 30],
    ['>The numbers, from (27) and (29), with \\(\\pi=3.1416\\):'],
    [r`\text{DC}=\frac{2}{\pi}=0.637,\qquad 2\text{X}=\frac{4}{3\pi}=\frac{4}{9.4248}=0.424,\qquad 4\text{X}=\frac{4}{15\pi}=\frac{4}{47.124}=0.085`, ''],
    [r`1\text{X}=3\text{X}=5\text{X}=0`, '← by (26)'],
    ['>A wave that repeats every half turn has only DC and even harmonics: the mirror image of half-wave symmetry.'],
  ];
  const SUMMARY = [
    ['>Everything in this lesson on one card:'],
    [r`f\!\left(t+\tfrac{T}{2}\right)=-f(t)\ \Rightarrow\ \text{DC and every even harmonic}=0`, '← (4) to (10)', '', 'box'],
    [r`f\!\left(t+\tfrac{T}{2}\right)=+f(t)\ \Rightarrow\ \text{every odd harmonic}=0`, '← (25), (26)', '', 'box'],
    [r`\text{one-sided distortion}\ \Rightarrow\ \text{evens and DC appear}`, '← (16) to (18)', '', 'box'],
  ];
  const WORK = [GOAL, TOOLS, ...DERIV, EX1, EX2];

  // ---- calculator exercise: random but realistic numbers
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const newEx3 = (s) => { s.ex = { A: pick([2, 2.5, 3, 4, 5, 6, 8, 10, 12]) }; s.showSol = false; };
  const F = (x, d = 3) => (+x.toFixed(d)).toString();
  WORK.push((s) => {
    if (!s.ex) newEx3(s);
    const { A } = s.ex, P = Math.PI;
    const given = [
      ['>Worked example. Over one turn the signal is'],
      [r`f(t)=\begin{cases}A\sin(\omega_0 t), & 0<t<\tfrac{T}{2}\\ 0, & \tfrac{T}{2}<t<T\end{cases}\qquad A=${A}\ \text{mm/s}`, '← the bottom half cut off', 31],
    ];
    if (!s.showSol) return given;
    return [
      ...given,
      ['>We use the coefficient formulas (D), from Lesson 2. Since \\(f=0\\) on the second half, only \\(0\\) to \\(T/2\\) counts.'],
      ['>DC. Substituting (31) in (D):'],
      [r`a_0=\frac{A}{T}\int_0^{T/2}\!\sin(\omega_0 t)\,dt=\frac{A}{T}\cdot\frac{1-\cos\pi}{\omega_0}=\frac{2A}{\omega_0 T}`, ''],
      ['>We know that \\(\\omega_0 T=2\\pi\\):'],
      [r`a_0=\frac{A}{\pi}`, '← the DC offset', 32],
      ['>1X, sine part. We know that \\(\\sin^2x=\\tfrac12(1-\\cos 2x)\\):'],
      [r`b_1=\frac{2A}{T}\int_0^{T/2}\!\sin^2(\omega_0 t)\,dt=\frac{A}{T}\int_0^{T/2}\!\big(1-\cos 2\omega_0 t\big)\,dt`, ''],
      [r`=\frac{A}{T}\Big[t-\frac{\sin 2\omega_0 t}{2\omega_0}\Big]_0^{T/2}=\frac{A}{T}\Big[\frac{T}{2}-\frac{\sin 2\pi}{2\omega_0}\Big]=\frac{A}{2}`, '← sin 2π = 0', 33],
      ['>1X, cosine part. We know that \\(\\sin x\\cos x=\\tfrac12\\sin 2x\\):'],
      [r`a_1=\frac{A}{T}\int_0^{T/2}\!\sin 2\omega_0 t\,dt=\frac{A}{T}\cdot\frac{1-\cos 2\pi}{2\omega_0}=0`, '← cos 2π = 1', 34],
      ['>So by (33) and (34), the 1X peak is \\(A/2\\).'],
      ['>Now \\(n\\ge 2\\), cosine part. We know that \\(\\sin x\\cos y=\\tfrac12\\big[\\sin(x+y)+\\sin(x-y)\\big]\\):'],
      [r`a_n=\frac{2A}{T}\int_0^{T/2}\!\sin(\omega_0 t)\cos(n\omega_0 t)\,dt`, '← (31) in (D)'],
      [r`=\frac{A}{T}\int_0^{T/2}\!\big[\sin((n{+}1)\omega_0 t)-\sin((n{-}1)\omega_0 t)\big]dt`, '', 35],
      ['>Integrating (35) from \\(0\\) to \\(T/2\\), with \\(\\omega_0\\tfrac{T}{2}=\\pi\\):'],
      [r`a_n=\frac{A}{T}\Big[\frac{1-\cos((n{+}1)\pi)}{(n{+}1)\,\omega_0}-\frac{1-\cos((n{-}1)\pi)}{(n{-}1)\,\omega_0}\Big]`, '', 36],
      ['>If \\(n\\) is odd, \\(n\\pm1\\) are even, so both cosines in (36) are \\(+1\\) and both brackets are \\(1-1=0\\):'],
      [r`a_n=0\qquad(n\ \text{odd})`, '← why 3X, 5X… are zero', 37],
      ['>If \\(n\\) is even, \\(n\\pm1\\) are odd, so both cosines are \\(-1\\) and both brackets are \\(1-(-1)=2\\):'],
      [r`a_n=\frac{2A}{\omega_0 T}\Big[\frac{1}{n{+}1}-\frac{1}{n{-}1}\Big]`, ''],
      ['>We know that \\(\\frac{1}{n+1}-\\frac{1}{n-1}=\\frac{(n-1)-(n+1)}{n^2-1}=\\frac{-2}{n^2-1}\\), and \\(\\omega_0T=2\\pi\\):'],
      [r`a_n=-\frac{2A}{\pi\,(n^2-1)}\qquad(n\ \text{even})`, '← why 2X, 4X… survive', 38],
      ['>Finally \\(n\\ge 2\\), sine part. We know that \\(\\sin x\\sin y=\\tfrac12\\big[\\cos(x-y)-\\cos(x+y)\\big]\\):'],
      [r`b_n=\frac{2A}{T}\int_0^{T/2}\!\sin(\omega_0 t)\sin(n\omega_0 t)\,dt`, '← (31) in (D)'],
      [r`=\frac{A}{T}\int_0^{T/2}\!\big[\cos((n{-}1)\omega_0 t)-\cos((n{+}1)\omega_0 t)\big]dt`, ''],
      ['>Integrating from \\(0\\) to \\(T/2\\):'],
      [r`b_n=\frac{A}{T}\Big[\frac{\sin((n{-}1)\pi)}{(n{-}1)\,\omega_0}-\frac{\sin((n{+}1)\pi)}{(n{+}1)\,\omega_0}\Big]`, ''],
      ['>The sine of any multiple of \\(\\pi\\) is 0, so'],
      [r`b_n=0\qquad(n\ge 2)`, '', 39],
      ['>Collecting (32), (33), (34), (37), (38) and (39) into the Fourier series:'],
      [r`\boxed{\,f(t)=\frac{A}{\pi}+\frac{A}{2}\sin\omega_0 t-\frac{2A}{\pi}\sum_{n\ \text{even}}\frac{\cos(n\omega_0 t)}{n^2-1}\,}`, '← the series, now earned', 40],
      ['>Now the numbers, with \\(A=' + A + '\\) mm/s. DC from (32):'],
      [r`\text{DC}=\frac{${A}}{${P.toFixed(4)}}=${F(A / P)}\ \text{mm/s}`, ''],
      ['>1X from (33):'],
      [r`1\text{X}=\frac{${A}}{2}=${F(A / 2)}\ \text{mm/s}`, ''],
      ['>2X: put \\(n=2\\) in (38), and take the size:'],
      [r`2\text{X}=\frac{2\times ${A}}{\pi\,(2^2-1)}=\frac{${F(2 * A, 2)}}{${F(3 * P, 3)}}=${F(2 * A / (3 * P))}\ \text{mm/s}`, ''],
      ['>3X: \\(n=3\\) is odd, so by (37) and (39)'],
      [r`3\text{X}=0`, '← exactly zero'],
      ['>4X: put \\(n=4\\) in (38):'],
      [r`4\text{X}=\frac{2\times ${A}}{\pi\,(4^2-1)}=\frac{${F(2 * A, 2)}}{${F(15 * P, 3)}}=${F(2 * A / (15 * P))}\ \text{mm/s}`, ''],
      ['>Dividing 2X by 1X:'],
      [r`\frac{2\text{X}}{1\text{X}}=\frac{2A/(3\pi)}{A/2}=\frac{4}{3\pi}=${F(4 / (3 * P), 3)}`, '← A cancels: same for any A'],
    ];
  });
  WORK.push(SUMMARY);

  Lab.lesson({
    work: WORK,
    heads: true,
    next: '../fft-by-hand/',
    state: { shift: 0.5, n: 2, b2: 0.3, clip: 1, e1: 'sym' },
    steps: [
      {
        part: 'Goal',
        title: 'Where we are going',
        text: `<p>A square wave has peaks at 1X, 3X, 5X… and exactly nothing at 2X, 4X, 6X. This lesson proves why, with one idea, symmetry, then tests two signals with numbers.</p>
               <p class="hint">The working builds up below the board. Click any heading there to fold it away.</p>`,
        draw(g, s, t, api) {
          const P = wavePlot(g), c = g.col;
          P.curve(sq, { color: c.ink, width: 2.6, glow: true });
          g.plot(SPEC).bars(sqAmps, { ghost: true, noDC: true });
          api.legend([['square wave', c.ink]]);
        },
      },
      {
        part: 'What we already know',
        title: 'The tools',
        text: `<p>Six facts, lettered (A) to (F). The key one is (A): shift a sine by half a turn and it comes back upside down. On the board, the dashed copy is \\(\\sin(\\theta+\\pi)\\).</p>`,
        draw(g, s, t, api) {
          const P = wavePlot(g), c = g.col;
          P.curve((x) => Math.sin(TAU * x), { color: c.blue, width: 2.6, glow: true });
          P.curve((x) => Math.sin(TAU * x + Math.PI), { color: c.orange, width: 2.2, dash: [7, 5] });
          api.legend([['sin θ', c.blue], ['sin(θ + π) = −sin θ', c.orange]]);
        },
      },
      {
        part: 'The question',
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
        part: 'Derivation',
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
        part: 'Derivation',
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
        part: 'Derivation',
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
        part: 'Derivation',
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
        part: 'Derivation',
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
        part: 'What it means',
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
        part: 'What it means',
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
        part: 'Worked example 1',
        title: 'Test a signal',
        text: `<p>Apply the half-turn test to a signal with 1X and 3X, with numbers. Then add a little 2X and watch the test fail.</p>`,
        controls: [{ type: 'choice', key: 'e1', options: [['sym', 'sin + 0.3 sin 3'], ['two', '+ 0.2 cos 2']] }],
        draw(g, s, t, api) {
          const P = wavePlot(g), c = g.col, k2 = s.e1 === 'two' ? 0.2 : 0;
          const f = (x) => Math.sin(TAU * x) + 0.3 * Math.sin(3 * TAU * x) + k2 * Math.cos(2 * TAU * x);
          const copy = (x) => -f(x + 0.5);
          P.between(f, copy, { alpha: 0.28 });
          P.curve(f, { color: c.ink, width: 2.6 });
          P.curve(copy, { color: k2 ? c.orange : c.good, width: k2 ? 2.4 : 5, alpha: k2 ? 1 : 0.75, dash: k2 ? [7, 5] : [] });
          api.legend([['f(t)', c.ink], ['−f(t + T/2)', k2 ? c.orange : c.good]]);
          api.verdict(k2 ? 'f(0) = 0.2 but −f(T/2) = −0.2 ✗' : 'Lands on itself ✓', k2 ? 'bad' : 'good');
        },
      },
      {
        part: 'Worked example 2',
        title: 'A wave that repeats every half turn',
        text: `<p>\\(|\\sin\\omega_0t|\\): both halves point up, so half a turn later it is the same, not flipped. The result is the mirror image of this lesson: the odd harmonics vanish and only DC and the evens are left.</p>`,
        draw(g, s, t, api) {
          const c = g.col, f = (x) => Math.abs(Math.sin(TAU * x));
          const P = wavePlot(g);
          P.curve((x) => Math.sin(TAU * x), { color: c.muted, width: 1.4, dash: [5, 5] });
          P.curve(f, { color: c.ink, width: 2.8, glow: true });
          const F = fourier(f, 9, 1024);
          g.plot({ ...SPEC, y: [0, 0.8] }).bars([Math.abs(F.dc), ...Array.from(F.amp).slice(1)], { ghost: true });
          api.legend([['|sin ω₀t|', c.ink], ['sin ω₀t', c.muted]]);
          api.verdict('DC = 0.637 · 2X = 0.424 · 4X = 0.085 · odd = 0', 'good');
        },
      },
      {
        part: 'Your turn',
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
      {
        part: 'Summary',
        title: 'On one card',
        text: `<p>Three rules, each derived above. Next lesson: how an FFT actually computes these coefficients from samples, by hand.</p>`,
        draw(g, s, t, api) {
          const c = g.col;
          const cut = (x) => Math.max(Math.sin(TAU * x), 0);
          [[sq, 0.03, 'symmetric'], [cut, 0.53, 'one-sided']].forEach(([f, l, name]) => {
            const P = g.plot({ box: [l, 0.08, 0.44, 0.48], x: [0, 2], y: [-1.5, 1.5] });
            P.axes({ grid: [1] });
            P.curve(f, { color: c.ink, width: 2.2, glow: true });
            g.text(name, g.w * (l + 0.22), g.h * 0.06, { size: 12 });
            const F = fourier(f, 8, 1024);
            g.plot({ box: [l, 0.7, 0.44, 0.2], x: [-0.6, 8.6], y: [0, 1.35] }).bars([Math.abs(F.dc), ...Array.from(F.amp).slice(1)], { ghost: true });
          });
          api.legend([]);
        },
      },
    ],
  });
})();
