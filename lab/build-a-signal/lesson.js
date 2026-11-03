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

  // the working, as it would be written in class: sentences ('>'), equations, margin notes,
  // and equation numbers on the right that later lines refer back to
  const r = String.raw;
  const DERIV = [
    [
      ['>A machine turns once every \\(T\\) seconds, so its vibration repeats every turn:'],
      [r`f(t+T)=f(t)`, '← repeats every turn', 1],
      ['>One revolution takes'],
      [r`T=\frac{60}{\text{rpm}}\ \text{s},\qquad \omega_0=\frac{2\pi}{T}\quad\Rightarrow\quad \omega_0 T=2\pi`, '← ω₀ is running speed in rad/s', 2],
    ],
    [
      ['>Take a sine at \\(m\\) times running speed and shift it by one turn:'],
      [r`\sin\big(m\omega_0(t+T)\big)=\sin(m\omega_0 t+m\,\omega_0 T)`, '← multiply out'],
      ['>Substituting \\(\\omega_0 T=2\\pi\\) from (2):'],
      [r`\sin\big(m\omega_0(t+T)\big)=\sin(m\omega_0 t+2\pi m)`, '', 3],
      ['>By (A), a sine repeats every \\(2\\pi\\), and only then. So for (3) to equal \\(\\sin(m\\omega_0 t)\\) at every \\(t\\), \\(2\\pi m\\) must be a whole number of turns:'],
      [r`m=1,2,3,\dots`, '← only whole multiples fit', 4],
    ],
    [
      ['>Add up sines whose frequencies obey (4):'],
      [r`f(t)=b_1\sin(\omega_0 t)+b_2\sin(2\omega_0 t)+b_3\sin(3\omega_0 t)`, '', 5],
      ['>Each term repeats every turn, so the sum (5) obeys (1) too. The peak at \\(n\\)X has height \\(|b_n|\\).'],
    ],
    [
      ['>A lane can hold a cosine as well. By (B):'],
      [r`a_n\cos(n\omega_0 t)+b_n\sin(n\omega_0 t)=c_n\sin(n\omega_0 t+\varphi_n)`, '', 6],
      [r`c_n=\sqrt{a_n^2+b_n^2},\qquad \tan\varphi_n=\frac{a_n}{b_n}`, '← cₙ is the peak you see', 7],
    ],
    [
      ['>How much \\(n\\)X is inside \\(f\\)? Multiply by that sine and average over one turn (why this works: step 8):'],
      [r`b_n=\frac{2}{T}\int_0^{T}f(t)\sin(n\omega_0 t)\,dt`, '', 8],
      ['>For the square wave, \\(f=+1\\) on the first half and \\(-1\\) on the second, so (8) splits in two:'],
      [r`b_n=\frac{2}{T}\Big[\int_0^{T/2}\!\sin(n\omega_0 t)\,dt-\int_{T/2}^{T}\!\sin(n\omega_0 t)\,dt\Big]`, '', 9],
      ['>By (C):'],
      [r`\int\sin(n\omega_0 t)\,dt=-\frac{\cos(n\omega_0 t)}{n\omega_0}`, '← antiderivative', 10],
      ['>Putting the limits into (10), with \\(\\omega_0\\tfrac{T}{2}=\\pi\\) and \\(\\omega_0 T=2\\pi\\) from (2):'],
      [r`\int_0^{T/2}\!\sin(n\omega_0 t)\,dt=\frac{-\cos n\pi+\cos 0}{n\omega_0}=\frac{1-\cos n\pi}{n\omega_0}`, '', 11],
      [r`\int_{T/2}^{T}\!\sin(n\omega_0 t)\,dt=\frac{-\cos 2n\pi+\cos n\pi}{n\omega_0}=\frac{\cos n\pi-1}{n\omega_0}`, '← cos 2nπ = 1', 12],
      ['>Substituting (11) and (12) in (9):'],
      [r`b_n=\frac{2}{T}\cdot\frac{(1-\cos n\pi)-(\cos n\pi-1)}{n\omega_0}=\frac{4\,(1-\cos n\pi)}{n\,\omega_0 T}`, '← collect the brackets'],
      ['>Using \\(\\omega_0 T=2\\pi\\) once more:'],
      [r`b_n=\frac{2}{\pi n}\,\big(1-\cos n\pi\big)`, '', 13],
      ['>By (D), \\(\\cos n\\pi=(-1)^n\\). So for odd \\(n\\) the bracket in (13) is \\(1-(-1)=2\\), and for even \\(n\\) it is \\(1-1=0\\):'],
      [r`b_n=\frac{4}{\pi n}\ \ (n\ \text{odd}),\qquad b_n=0\ \ (n\ \text{even})`, '← falls like 1/n', 14],
    ],
    [
      ['>Putting sines and cosines of every lane together, any repeating signal can be written as'],
      [r`f(t)=a_0+\sum_{n=1}^{\infty}\big[a_n\cos(n\omega_0 t)+b_n\sin(n\omega_0 t)\big]`, '← the Fourier series', 15],
      ['>Each coefficient is found as in (8). Multiplying by a sine or cosine and averaging over a turn keeps only the matching lane, because by (E) all the others average to zero:'],
      [r`a_0=\frac{1}{T}\!\int_0^T\! f(t)\,dt`, '← the DC level', 16],
      [r`a_n=\frac{2}{T}\!\int_0^T\! f(t)\cos(n\omega_0 t)\,dt,\qquad b_n=\frac{2}{T}\!\int_0^T\! f(t)\sin(n\omega_0 t)\,dt`, '', 17],
      ['>An FFT computes these integrals from sampled data: that is what the analyser does.'],
    ],
  ];

  const GOAL = [
    ['>By the end of this lesson we will have shown why a repeating signal contains only whole orders, and derived the formulas that measure each one:'],
    [r`f(t)=a_0+\sum_{n=1}^{\infty}\big[a_n\cos(n\omega_0 t)+b_n\sin(n\omega_0 t)\big]`, '← the Fourier series', '', 'box'],
    [r`a_n=\frac{2}{T}\int_0^T f(t)\cos(n\omega_0 t)\,dt,\qquad b_n=\frac{2}{T}\int_0^T f(t)\sin(n\omega_0 t)\,dt`, '', '', 'box'],
    [r`\text{square wave:}\quad b_n=\frac{4}{\pi n}\ (n\ \text{odd}),\qquad 0\ (n\ \text{even})`, '', '', 'box'],
    ['>Then two shapes worked out in full: a square wave with real numbers, and a sawtooth.'],
  ];
  const TOOLS = [
    ['>A sine repeats every full turn, and only after whole turns:'],
    [r`\sin(\theta+2\pi m)=\sin\theta\quad\text{for every }\theta\iff m\ \text{is a whole number}`, '', 'A'],
    ['>From Lesson 1, (12): a cosine and a sine at the same frequency make one shifted sine:'],
    [r`a\cos\theta+b\sin\theta=c\sin(\theta+\varphi),\qquad c=\sqrt{a^2+b^2},\quad \tan\varphi=\frac{a}{b}`, '', 'B'],
    ['>Two antiderivatives, for any constant \\(k\\neq0\\):'],
    [r`\int\sin(kt)\,dt=-\frac{\cos(kt)}{k},\qquad \int\cos(kt)\,dt=\frac{\sin(kt)}{k}`, '', 'C'],
    ['>For a whole number \\(n\\):'],
    [r`\cos n\pi=(-1)^n,\qquad \sin n\pi=0`, '← cos π = −1, cos 2π = 1, …', 'D'],
    ['>Orthogonality: over one turn, two different harmonics (or a sine and a cosine) multiply to zero area. Derived line by line in Lesson 4:'],
    [r`\int_0^T\!\sin(n\omega_0t)\sin(m\omega_0t)\,dt=\int_0^T\!\cos(n\omega_0t)\cos(m\omega_0t)\,dt=\begin{cases}T/2,&n=m\\0,&n\neq m\end{cases},\quad \int_0^T\!\sin\cos\,dt=0`, '', 'E'],
    ['>Integration by parts, for example 2:'],
    [r`\int u\,dv=uv-\int v\,du`, '', 'F'],
  ];
  const EX1 = [
    ['>Worked example 1. A vibrating screen’s velocity is close to a square wave of amplitude \\(A=2\\) mm/s, at 1480 rpm. Find the first three peaks and their frequencies.'],
    [r`f(t)=\begin{cases}+2, & 0<t<\tfrac{T}{2}\\ -2, & \tfrac{T}{2}<t<T\end{cases}`, '← twice the square wave used in (9)', 18],
    ['>The integral (8) is linear: doubling \\(f\\) doubles every coefficient. So from (14):'],
    [r`b_n=2\times\frac{4}{\pi n}=\frac{8}{\pi n}\ \ (n\ \text{odd}),\qquad b_n=0\ \ (n\ \text{even})`, '', 19],
    ['>Put \\(n=1,3,5\\) in (19), with \\(\\pi=3.1416\\):'],
    [r`b_1=\frac{8}{3.1416}=2.546,\qquad b_3=\frac{8}{3\times3.1416}=\frac{8}{9.4248}=0.849,\qquad b_5=\frac{8}{15.708}=0.509\ \ \text{mm/s}`, '', 20],
    ['>Frequencies, from Lesson 1, (13) and (14):'],
    [r`f_1=\frac{1480}{60}=24.67\ \text{Hz},\qquad f_3=3\times24.67=74.00\ \text{Hz},\qquad f_5=5\times24.67=123.33\ \text{Hz}`, '', 21],
    ['>Check the \\(1/n\\) law from (14):'],
    [r`\frac{b_3}{b_1}=\frac{0.849}{2.546}=0.333=\frac{1}{3}\ \checkmark,\qquad b_2=b_4=0`, '← no even harmonics'],
  ];
  const EX2 = [
    ['>Worked example 2. A sawtooth: rises steadily through each turn, then drops back. Any full turn works in (16) and (17); from \\(-T/2\\) to \\(T/2\\) is easiest:'],
    [r`f(t)=\frac{2t}{T},\qquad -\tfrac{T}{2}<t<\tfrac{T}{2}`, '← from −1 up to +1', 22],
    ['>DC from (16):'],
    [r`a_0=\frac{1}{T}\int_{-T/2}^{T/2}\frac{2t}{T}\,dt=\frac{1}{T^2}\Big[t^2\Big]_{-T/2}^{T/2}=\frac{1}{T^2}\Big(\frac{T^2}{4}-\frac{T^2}{4}\Big)=0`, '', 23],
    ['>Sine parts from (17). Write \\(k=n\\omega_0\\), so \\(k\\tfrac{T}{2}=n\\pi\\) by (2):'],
    [r`b_n=\frac{2}{T}\int_{-T/2}^{T/2}\frac{2t}{T}\sin(kt)\,dt=\frac{4}{T^2}\int_{-T/2}^{T/2}t\sin(kt)\,dt`, '', 24],
    ['>Integrate by parts (F), with \\(u=t\\) and \\(dv=\\sin(kt)\\,dt\\). Then \\(du=dt\\) and, by (C), \\(v=-\\cos(kt)/k\\):'],
    [r`\int t\sin(kt)\,dt=-\frac{t\cos(kt)}{k}+\int\frac{\cos(kt)}{k}\,dt=-\frac{t\cos(kt)}{k}+\frac{\sin(kt)}{k^2}`, '', 25],
    ['>Put in the limits \\(\\pm T/2\\). The sine terms are \\(\\sin(\\pm n\\pi)=0\\) by (D). The cosine terms, with \\(\\cos(-n\\pi)=\\cos n\\pi\\):'],
    [r`\Big[-\frac{t\cos(kt)}{k}\Big]_{-T/2}^{T/2}=-\frac{T}{2}\frac{\cos n\pi}{k}-\frac{T}{2}\frac{\cos n\pi}{k}=-\frac{T(-1)^n}{n\omega_0}`, '← (D)', 26],
    ['>Substitute (26) in (24), then use \\(\\omega_0T=2\\pi\\):'],
    [r`b_n=\frac{4}{T^2}\cdot\Big(-\frac{T(-1)^n}{n\omega_0}\Big)=-\frac{4(-1)^n}{n\,\omega_0T}=\frac{2\,(-1)^{n+1}}{\pi n}`, '', 27, 'box'],
    ['>The cosine parts vanish: by parts with \\(\\cos\\), every term at \\(\\pm T/2\\) is a \\(\\sin(\\pm n\\pi)\\) or cancels in pairs, so'],
    [r`a_n=0`, '← the sawtooth is all sines', 28],
    ['>The numbers from (27):'],
    [r`b_1=\frac{2}{\pi}=0.637,\quad b_2=-\frac{2}{2\pi}=-0.318,\quad b_3=\frac{2}{3\pi}=0.212,\quad b_4=-\frac{2}{4\pi}=-0.159`, '', 29],
    ['>The peaks \\(|b_n|=2/(\\pi n)\\) fall like \\(1/n\\), as for the square wave, but this time every harmonic is there, the even ones too. Lesson 3 explains why.'],
  ];
  const SUMMARY = [
    ['>Everything in this lesson on one card:'],
    [r`\text{repeats every turn}\ \Rightarrow\ \text{only whole orders } n=1,2,3,\dots`, '← from (4)', '', 'box'],
    [r`f(t)=a_0+\sum_n\big[a_n\cos(n\omega_0t)+b_n\sin(n\omega_0t)\big]`, '← (15)', '', 'box'],
    [r`a_0=\frac{1}{T}\!\int_0^T\!f\,dt,\quad a_n=\frac{2}{T}\!\int_0^T\!f\cos(n\omega_0t)\,dt,\quad b_n=\frac{2}{T}\!\int_0^T\!f\sin(n\omega_0t)\,dt`, '← (16), (17)', '', 'box'],
    [r`\text{square: }\frac{4}{\pi n}\ \text{odd only};\qquad \text{sawtooth: }\frac{2}{\pi n}\ \text{every }n`, '← (14), (27)', '', 'box'],
  ];
  const WORK = [GOAL, TOOLS, ...DERIV, EX1, EX2];

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
      ['>Worked solution. Start from the Fourier series (15). Over one turn our signal is'],
      [r`f(t)=\begin{cases}+A=+${A}, & 0<t<\tfrac{T}{2}\\ -A=-${A}, & \tfrac{T}{2}<t<T\end{cases}`, '← A in mm/s', 30],
      ['>DC: substituting (30) in (16),'],
      [r`a_0=\frac{1}{T}\Big[A\cdot\tfrac{T}{2}+(-A)\cdot\tfrac{T}{2}\Big]=0`, '← as long up as down', 31],
      ['>Cosine parts: substituting (30) in (17) and splitting where \\(f\\) flips,'],
      [r`a_n=\frac{2A}{T}\Big[\int_0^{T/2}\!\cos(n\omega_0 t)\,dt-\int_{T/2}^{T}\!\cos(n\omega_0 t)\,dt\Big]`, ''],
      ['>We know that \\(\\int\\cos(n\\omega_0 t)\\,dt=\\sin(n\\omega_0 t)/(n\\omega_0)\\), and the sine of any multiple of \\(\\pi\\) is 0:'],
      [r`a_n=\frac{2A}{T}\cdot\frac{\sin n\pi-(\sin 2n\pi-\sin n\pi)}{n\omega_0}=0`, '← only sines are left', 32],
      ['>Sine parts: substituting (30) in (17) gives (9) with every value multiplied by \\(A\\). The same steps, (10) to (13), give'],
      [r`b_n=\frac{2A}{\pi n}\,\big(1-\cos n\pi\big)`, '', 33],
      ['>We know that \\(\\cos n\\pi=(-1)^n\\). So from (33):'],
      [r`n\ \text{odd}:\quad 1-\cos n\pi=1-(-1)=2\quad\Rightarrow\quad b_n=\frac{4A}{\pi n}`, '', 34],
      [r`n\ \text{even}:\quad 1-\cos n\pi=1-1=0\quad\Rightarrow\quad b_n=0`, '← this is why the evens vanish', 35],
      ['>Now the numbers. Putting \\(n=1\\) in (34):'],
      [r`b_1=\frac{4\times ${A}}{\pi\times 1}=\frac{${F(4 * A, 2)}}{${pi}}=${F(4 * A / Math.PI)}\ \text{mm/s}`, '← 1X'],
      ['>Putting \\(n=2\\) in (35):'],
      [r`b_2=0`, '← 2X: exactly zero'],
      ['>Putting \\(n=3\\) in (34):'],
      [r`b_3=\frac{4\times ${A}}{\pi\times 3}=\frac{${F(4 * A, 2)}}{${F(3 * Math.PI, 3)}}=${F(4 * A / (3 * Math.PI))}\ \text{mm/s}`, '← 3X'],
      ['>3X in hertz. From (2), one turn per \\(60/\\text{rpm}\\) seconds, so \\(n\\)X is \\(n\\times\\text{rpm}/60\\):'],
      [r`f_3=3\times\frac{${R}}{60}=\frac{${3 * R}}{60}=${F(R / 20, 2)}\ \text{Hz}`, ''],
      ['>Dividing (34) by \\(b_1\\):'],
      [r`\frac{b_n}{b_1}=\frac{4A/(\pi n)}{4A/\pi}=\frac{1}{n}`, '← A and π cancel', 36],
      ['>We need (36) below \\(' + p + '\\%\\):'],
      [r`\frac{1}{n}<${p / 100}\quad\Rightarrow\quad n>\frac{1}{${p / 100}}=${F(100 / p, 2)}`, ''],
      ['>By (35) the even harmonics are zero, so the first odd \\(n\\) above that is'],
      [r`n=${n}`, '← the answer'],
    ];
  });
  WORK.push(SUMMARY);

  const saw = SHAPES.sawtooth.f;
  function halfArea(g, s, api) {
    const c = g.col, n = s.ia;
    const Pl = g.plot({ box: [0.06, 0.1, 0.9, 0.62], x: [0, 1], y: [-1.35, 1.35] });
    Pl.axes({ grid: [0.5], ticks: [[0.5, 'T/2'], [1, 'T']] });
    const f = (x) => Math.sin(TAU * n * x);
    Pl.area(f, { from: 0, to: 0.5, alpha: 0.35 });
    Pl.curve(f, { color: c.blue, width: 2.6, glow: true });
    api.legend([[`sin(${n}ω₀t)`, c.blue], ['area from 0 to T/2', c.good]]);
    const v = (1 - Math.cos(n * Math.PI)) / (n * TAU);
    api.verdict(`∫₀^(T/2) = (1 − cos ${n}π)/(${n}ω₀) = ${v.toFixed(3)} T`, 'good');
  }

  Lab.lesson({
    work: WORK,
    heads: true,
    next: '../why-evens-vanish/',
    state: { m: 2.3, b1: 1, b2: 0.5, b3: 0.3, a2: 0.4, s2: 0.3, N: 1, shape: 'square', Nm: 3, ia: 1, Ns: 4, N1: 5 },
    steps: [
      {
        part: 'Goal',
        title: 'Where we are going',
        text: `<p>Any repeating vibration can be built from sines and cosines at whole multiples of running speed. This lesson proves it, derives the formulas that measure each harmonic, and works two shapes out in full.</p>
               <p class="hint">The working builds up below the board. Click any heading there to fold it away.</p>`,
        draw(g, s, t, api) {
          const c = g.col, P = g.plot(WAVE);
          P.axes({ grid: [1, 2], ticks: TICKS });
          P.curve(machine, { color: c.ink, width: 2.4, to: 3 * ease(t / 2), glow: true });
          api.legend([['a machine signal', c.ink]]);
        },
      },
      {
        part: 'What we already know',
        title: 'The tools',
        text: `<p>Six facts, lettered (A) to (F). On the board: the area under a harmonic over half a turn, which the square-wave derivation uses. Odd \\(n\\) leaves area; even \\(n\\) cancels.</p>`,
        controls: [{ type: 'range', key: 'ia', label: 'Harmonic n', min: 1, max: 6, step: 1, fmt: (v) => `n = ${v}` }],
        draw(g, s, t, api) { halfArea(g, s, api); },
      },
      {
        part: 'Derivation',
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
        part: 'Derivation',
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
        part: 'What it means',
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
        part: 'Derivation',
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
        part: 'Derivation',
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
        part: 'Derivation',
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
        part: 'Worked example 1',
        title: 'A square wave, with numbers',
        text: `<p>A vibrating screen at 1480 rpm with a square-wave velocity of 2 mm/s. The peaks at 1X, 3X and 5X, their frequencies, and a check of the \\(1/n\\) law.</p>`,
        controls: [{ type: 'range', key: 'N1', label: 'Harmonics used', min: 1, max: 15, step: 1, fmt: (v) => 'up to ' + v + 'X' }],
        draw(g, s, t, api) {
          const c = g.col, C = coeffs('square', SHAPES.square.f);
          const P = g.plot({ ...WAVE, y: [-3.4, 3.4] }); P.axes({ grid: [1, 2], ticks: TICKS });
          P.curve((x) => 2 * SHAPES.square.f(x), { color: c.muted, width: 1.6, dash: [5, 5] });
          P.curve((x) => 2 * partial(C, s.N1)(x), { color: c.ink, width: 2.8, glow: true, n: 1400 });
          const amps = [0]; for (let k = 1; k <= 12; k++) amps.push(k <= s.N1 ? 2 * C.amp[k] : 0);
          g.plot({ ...SPEC, y: [0, 2.9] }).bars(amps, { ghost: true, noDC: true });
          api.legend([['square wave, A = 2 mm/s', c.muted], [`sum up to ${s.N1}X`, c.ink]]);
          api.verdict('b₁ = 2.546 · b₃ = 0.849 · b₅ = 0.509 mm/s', '');
        },
      },
      {
        part: 'Worked example 2',
        title: 'A sawtooth, by parts',
        text: `<p>A sawtooth rises steadily, then drops back. Its coefficients need integration by parts, written out line by line. This time the even harmonics are there too.</p>`,
        controls: [{ type: 'range', key: 'Ns', label: 'Harmonics used', min: 1, max: 15, step: 1, fmt: (v) => 'up to ' + v + 'X' }],
        draw(g, s, t, api) {
          const c = g.col, C = coeffs('sawtooth', saw);
          const P = g.plot(WAVE); P.axes({ grid: [1, 2], ticks: TICKS });
          P.curve(saw, { color: c.muted, width: 1.6, dash: [5, 5] });
          P.curve(partial(C, s.Ns), { color: c.ink, width: 2.8, glow: true, n: 1400 });
          const amps = [0]; for (let k = 1; k <= 12; k++) amps.push(k <= s.Ns ? C.amp[k] : 0);
          g.plot({ ...SPEC, y: [0, 0.8] }).bars(amps, { ghost: true, noDC: true });
          api.legend([['sawtooth', c.muted], [`sum up to ${s.Ns}X`, c.ink]]);
          api.verdict('|bₙ| = 2/(πn): 0.637, 0.318, 0.212, 0.159 …', '');
        },
      },
      {
        part: 'Your turn',
        title: 'Try it with a calculator',
        tryLabel: 'Your answers',
        text: (s) => {
          if (!s.ex) newEx2(s);
          const { A, R, p } = s.ex;
          return `<div class="problem"><p>A vibrating screen is driven so its velocity is close to a <b>square wave</b> of amplitude \\(A=${A}\\) mm/s, at <b>${R} rpm</b>.</p>
                  <p>Start from the Fourier coefficients (step 8) and work out each peak, type it in and press Check. Show working derives everything from scratch. The last one asks: which is the first harmonic whose peak is below <b>${p}%</b> of 1X?</p></div>`;
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
      {
        part: 'Summary',
        title: 'On one card',
        text: `<p>The results of this lesson, each derived above. Next lesson: why the square wave has no even harmonics but the sawtooth does.</p>`,
        draw(g, s, t, api) {
          const c = g.col, C = coeffs('machine', machine);
          const P = g.plot(WAVE); P.axes({ grid: [1, 2], ticks: TICKS });
          P.curve(machine, { color: c.muted, width: 1.6, dash: [5, 5] });
          P.curve(partial(C, 12), { color: c.ink, width: 2.8, glow: true, n: 1400 });
          const amps = [0]; for (let k = 1; k <= 12; k++) amps.push(C.amp[k]);
          g.plot({ ...SPEC, y: [0, 0.75] }).bars(amps, { ghost: true, noDC: true });
          api.legend([['machine signal', c.muted], ['its Fourier series', c.ink]]);
        },
      },
    ],
  });
})();
