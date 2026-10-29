// Lesson: why even harmonics vanish (half-wave symmetry), step by step.
(function () {
  const { TAU, ease, fourier, integral } = Lab;
  const sq = (t) => Math.sign(Math.sin(TAU * t));
  const TICKS = [[0.5, 'T/2'], [1, 'T'], [1.5, '3T/2'], [2, '2T']];
  const WAVE = { box: [0.06, 0.07, 0.9, 0.56], x: [0, 2], y: [-1.6, 1.6] };
  const SPEC = { box: [0.06, 0.74, 0.9, 0.18], x: [-0.6, 9.6], y: [0, 1.45] };
  const sqAmps = [0, ...Array.from({ length: 9 }, (_, i) => ((i + 1) % 2 ? 4 / (Math.PI * (i + 1)) : 0))];

  const wavePlot = (g) => { const P = g.plot(WAVE); P.axes({ grid: [0.5, 1, 1.5], ticks: TICKS }); return P; };

  // the working, line by line, as you'd write it on paper: [maths, margin note]
  const r = String.raw;
  const WORK = [
    [
      [r`f(t)=\begin{cases}+1, & 0<t<\tfrac{T}{2}\\[2pt] -1, & \tfrac{T}{2}<t<T\end{cases}`, '← the square wave, one turn'],
      [r`\text{spectrum: } 1\text{X},\ 3\text{X},\ 5\text{X},\dots \qquad 2\text{X}=4\text{X}=\dots=0\ \ ?`, '← why exactly zero?'],
    ],
    [
      [r`g(t)=f\!\left(t+\tfrac{T}{2}\right)`, '← the wave, half a turn later'],
      [r`0<t<\tfrac{T}{2}:\quad g(t)=f(\text{second half})=-1`, '← read it off the sketch'],
      [r`\tfrac{T}{2}<t<T:\quad g(t)=f(\text{next first half})=+1`, ''],
      [r`\Rightarrow\ g(t)=-f(t)`, '← the copy is upside down'],
    ],
    [
      [r`-g(t)=f(t)`, '← flip it: lands on itself'],
      [r`\boxed{\,f\!\left(t+\tfrac{T}{2}\right)=-f(t)\,}`, '← half-wave symmetry'],
    ],
    [
      [r`\sin\!\Big(n\omega_0\big(t+\tfrac{T}{2}\big)\Big)=\sin\!\Big(n\omega_0 t+n\,\tfrac{\omega_0 T}{2}\Big)`, '← multiply out'],
      [r`=\sin(n\omega_0 t+n\pi)`, '← one turn: ω₀T = 2π'],
      [r`=(-1)^n\,\sin(n\omega_0 t)`, '← every π flips the sign'],
      [r`n\ \text{odd: flips}\qquad n\ \text{even: doesn't}`, ''],
    ],
    [
      [r`f(t)=\sum_{n} b_n\sin(n\omega_0 t)`, '← write f as its harmonics'],
      [r`f\!\left(t+\tfrac{T}{2}\right)=\sum_{n}(-1)^n\,b_n\sin(n\omega_0 t)`, '← use step 4'],
      [r`-f(t)=\sum_{n}(-b_n)\sin(n\omega_0 t)`, ''],
      [r`(-1)^n\,b_n=-b_n\quad\text{for every } n`, '← symmetry: match term by term'],
      [r`n\ \text{even}:\ b_n=-b_n\ \Rightarrow\ 2b_n=0\ \Rightarrow\ b_n=0`, '← same for the cosines, aₙ'],
    ],
    [
      [r`b_n=\frac{2}{T}\int_0^{T} f(t)\sin(n\omega_0 t)\,dt`, '← area of f × harmonic'],
      [r`=\frac{2}{T}\Big[\int_0^{T/2}\!\!+\int_{T/2}^{T}\Big]`, '← split into two halves'],
      [r`\int_{T/2}^{T}\!f\sin\,dt=\int_0^{T/2}\!f\!\left(s+\tfrac{T}{2}\right)\sin(n\omega_0 s+n\pi)\,ds`, '← put t = s + T/2'],
      [r`=\int_0^{T/2}\!\big(-f(s)\big)(-1)^n\sin(n\omega_0 s)\,ds`, '← steps 3 and 4'],
      [r`b_n=\frac{2}{T}\big(1-(-1)^n\big)\int_0^{T/2}\!f\sin\,ds`, '← even n: 1 − 1 = 0'],
      [r`\text{square, } n\text{ odd}:\ b_n=\frac{4}{T}\int_0^{T/2}\!\sin(n\omega_0 s)\,ds=\frac{4}{\pi n}`, '← second half doubles the first'],
    ],
    [
      [r`f(t)=\max\big(\sin\omega_0 t,\,-L\big)`, '← limited on one side only'],
      [r`f\!\left(t+\tfrac{T}{2}\right)=\max(-\sin\omega_0 t,\,-L)`, ''],
      [r`-f(t)=\min(-\sin\omega_0 t,\,L)`, ''],
      [r`L<1:\ \ f\!\left(t+\tfrac{T}{2}\right)\neq-f(t)`, '← symmetry broken'],
      [r`\Rightarrow\ \text{nothing forces } b_2, b_4,\dots \text{ or } a_0 \text{ to zero}`, '← evens and DC appear'],
    ],
    [
      [r`\boxed{\,f\!\left(t+\tfrac{T}{2}\right)=-f(t)\iff a_0=0,\ a_n=b_n=0\ \text{for even } n\,}`, '← the whole lesson in one line'],
    ],
  ];


  // ---- calculator exercise: random but realistic numbers
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const newEx3 = (s) => { s.ex = { A: pick([2, 2.5, 3, 4, 5, 6, 8, 10, 12]) }; s.showSol = false; };
  const F = (x, d = 3) => (+x.toFixed(d)).toString();
  WORK.push((s) => {
    if (!s.ex) newEx3(s);
    const { A } = s.ex, P = Math.PI;
    const given = [r`A\max(\sin\omega_0 t,0)=\frac{A}{\pi}+\frac{A}{2}\sin\omega_0 t-\frac{2A}{\pi}\!\sum_{n\ \text{even}}\!\frac{\cos(n\omega_0 t)}{n^2-1}`, '← given: the cut sine, scaled by A'];
    if (!s.showSol) return [given];
    return [
      given,
      [r`\text{DC}=\frac{A}{\pi}=\frac{${A}}{\pi}=${F(A / P)}`, '← the offset'],
      [r`1\text{X}=\frac{A}{2}=${F(A / 2)}`, ''],
      [r`2\text{X}=\frac{2A}{\pi(2^2-1)}=\frac{2\times ${A}}{3\pi}=${F(2 * A / (3 * P))}`, '← even: allowed now'],
      [r`3\text{X}=0`, '← no odd terms beyond 1X'],
      [r`4\text{X}=\frac{2A}{\pi(4^2-1)}=\frac{2\times ${A}}{15\pi}=${F(2 * A / (15 * P))}`, '← falls like 1/n²'],
      [r`\frac{2\text{X}}{1\text{X}}=\frac{2A/3\pi}{A/2}=\frac{4}{3\pi}\approx 0.424`, '← same for any A'],
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
               <p>See it in 3D in the <a href="../../explainers/">harmonics video</a>, or build waves harmonic by harmonic in the <a href="../build-a-signal/">next lesson</a>.</p>`,
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
                  <p>The cut sine's series is on the page below. Work out each peak, type it in and press Check.</p></div>`;
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
          P.curve(f, { color: c.ink, width: 2.8, glow: true });
          const B = g.plot({ ...SPEC, y: [0, 0.75 * A] });
          const vals = [A / Math.PI, A / 2, ...Array.from({ length: 8 }, (_, i) => ((i + 2) % 2 ? 0 : 2 * A / (Math.PI * ((i + 2) ** 2 - 1))))];
          B.bars(s.showSol ? vals : vals.map(() => 0), { ghost: true });
          api.legend([[`peak A = ${A} mm/s, cut at zero`, c.ink], ['the full sine', c.muted]]);
        },
      },
    ],
  });
})();
