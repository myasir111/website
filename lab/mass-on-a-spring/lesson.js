// Lesson: a mass on a spring, the first physics lesson. Why it picks its own frequency.
(function () {
  const { TAU, ease } = Lab;
  const r = String.raw;

  // A mass hanging on a spring (left), its height traced over time (right).
  // m in kg, k in N/m, A in board units; the board runs in real time.
  function springBoard(g, t, o) {
    const c = g.col, ctx = g.ctx;
    const w = Math.sqrt(o.k / o.m), f = w / TAU;
    const P = g.plot({ box: [0.36, 0.1, 0.6, 0.72], x: [0, 3], y: [-1.6, 1.6] });
    P.axes({ grid: [1, 2], ticks: [[1, '1 s'], [2, '2 s'], [3, '3 s']] });
    const x = (tt) => o.A * Math.cos(w * tt);                 // released from x = A at t = 0
    const now = t % 30;
    const cx = g.w * 0.17, top = g.h * 0.08, rest = P.Y(0), U = (P.Y(0) - P.Y(1));
    const y = rest - U * x(now);                               // screen y of the mass centre
    const box = Math.min(g.w * 0.09, g.h * 0.16) * (0.75 + 0.25 * Math.min(o.m / 2, 2));
    // ceiling
    ctx.strokeStyle = c.line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - box, top); ctx.lineTo(cx + box, top); ctx.stroke();
    // spring: a zigzag from the ceiling to the top of the mass
    const y1 = y - box / 2, coils = 12, wid = box * 0.35;
    ctx.strokeStyle = c.ink; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(cx, top);
    for (let i = 1; i <= coils; i++) ctx.lineTo(cx + (i % 2 ? wid : -wid), top + (y1 - top) * i / (coils + 1));
    ctx.lineTo(cx, y1); ctx.stroke();
    // the mass
    ctx.fillStyle = c.blue; ctx.fillRect(cx - box / 2, y - box / 2, box, box);
    const lab = o.label || `${o.m} kg`;                       // shrink the label to fit the block on a phone
    g.text(lab, cx, y + 4, { size: Math.max(8, Math.min(12, (box - 6) / (lab.length * 0.62))), color: c.bg, weight: 600 });
    // rest line, and the spring force arrow (F = -kx), drawn opposite the displacement
    ctx.setLineDash([4, 5]); ctx.strokeStyle = c.muted; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - box * 1.3, rest); ctx.lineTo(P.X(0), rest); ctx.stroke(); ctx.setLineDash([]);
    if (o.force) {
      const F = -x(now), ax = cx + box * 0.95, len = U * 0.9 * F / Math.max(o.A, 0.01);
      ctx.strokeStyle = c.orange; ctx.fillStyle = c.orange; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(ax, y); ctx.lineTo(ax, y - len); ctx.stroke();
      if (Math.abs(len) > 6) { const d = Math.sign(len); ctx.beginPath(); ctx.moveTo(ax, y - len); ctx.lineTo(ax - 6, y - len + 9 * d); ctx.lineTo(ax + 6, y - len + 9 * d); ctx.fill(); }
    }
    // the trace: the newest point sits at the left edge of the plot, older points to the right
    P.curve((s) => x(now - s), { color: c.blue, width: 2.8, glow: true, n: 900 });
    if (o.accel) P.curve((s) => -x(now - s), { color: c.orange, width: 1.8, dash: [6, 5], n: 900 });
    ctx.setLineDash([3, 4]); ctx.strokeStyle = c.muted; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx + box / 2, y); ctx.lineTo(P.X(0), y); ctx.stroke(); ctx.setLineDash([]);
    return { w, f };
  }

  // ---------------- the working, line by line ----------------
  const GOAL = [
    ['>By the end of this lesson we will have answered:'],
    ['>Why does a mass on a spring bounce at a rhythm of its own?'],
    ['>Why doesn’t pulling it further change that rhythm?'],
    ['>How does the rhythm depend on the mass and the stiffness, and why a square root?'],
    ['>Then we solve two examples with every operation shown, and you try one yourself.'],
  ];
  const TOOLS = [
    ['>Hooke’s law: a spring stretched by \\(x\\) pulls back with a force proportional to the stretch:'],
    [r`F=-k\,x`, '← k = stiffness, in N/m', 'A'],
    ['>Newton’s second law: force equals mass times acceleration:'],
    [r`F=m\,a`, '', 'B'],
    ['>Acceleration is how fast the velocity changes, and velocity is how fast the position changes:'],
    [r`v=\frac{dx}{dt},\qquad a=\frac{dv}{dt}=\frac{d^2x}{dt^2}`, '', 'C'],
    ['>Differentiating a sine twice, from calculus:'],
    [r`\frac{d}{dt}\cos(\omega t)=-\omega\sin(\omega t),\qquad \frac{d^2}{dt^2}\cos(\omega t)=-\omega^2\cos(\omega t)`, '', 'D'],
    ['>And from Lesson 1, (4): one full turn of a sine takes \\(T\\), with'],
    [r`\omega=2\pi f=\frac{2\pi}{T}`, '', 'E'],
  ];
  const DERIV = [
    [
      ['>Measure \\(x\\) from where the mass hangs at rest, positive upward. Gravity is already balanced there by the stretch at rest, so the only extra force is the spring’s pull back, from (A). Put it into (B):'],
      [r`m\,a=-k\,x`, '', 1],
      ['>Write the acceleration with (C):'],
      [r`m\,\frac{d^2x}{dt^2}=-k\,x\quad\Rightarrow\quad \frac{d^2x}{dt^2}=-\frac{k}{m}\,x`, '← the equation of motion', 2],
      ['>In words: the acceleration is always proportional to the displacement, and always points back towards rest.'],
    ],
    [
      ['>From (D), a cosine has exactly that property: differentiate it twice and you get it back, times \\(-\\omega^2\\). So try'],
      [r`x(t)=A\cos(\omega t)`, '← released from x = A at t = 0', 3],
      ['>Differentiate twice with (D):'],
      [r`\frac{d^2x}{dt^2}=-\omega^2A\cos(\omega t)=-\omega^2\,x`, '', 4],
      ['>Compare (4) with (2). They match for every \\(t\\) only if'],
      [r`\omega^2=\frac{k}{m}`, '', 5],
    ],
    [
      ['>The amplitude \\(A\\) appears on both sides of (4), so it cancels. Nothing in (5) depends on \\(A\\):'],
      [r`\omega\ \text{depends on}\ k\ \text{and}\ m\ \text{only, not on}\ A`, '← pull it twice as far: same rhythm'],
      ['>That only works because the force in (A) grows in step with the stretch. A spring that stiffens as it stretches would change its rhythm with amplitude.'],
    ],
    [
      ['>Take the square root of (5) and use (E). This is the <b>natural frequency</b>:'],
      [r`\omega_n=\sqrt{\frac{k}{m}},\qquad f_n=\frac{1}{2\pi}\sqrt{\frac{k}{m}},\qquad T=2\pi\sqrt{\frac{m}{k}}`, '', 6, 'box'],
      ['>Double the mass and \\(f_n\\) changes by \\(1/\\sqrt2\\):'],
      [r`f_n'=\frac{1}{2\pi}\sqrt{\frac{k}{2m}}=\frac{1}{\sqrt2}\,f_n\approx0.71\,f_n`, '← about 29% lower, not half', 7],
    ],
    [
      ['>At rest, the spring holds the weight. If that weight stretches it by \\(\\delta\\), from (A) the stretch force equals the weight:'],
      [r`k\,\delta=m\,g\quad\Rightarrow\quad \frac{k}{m}=\frac{g}{\delta}`, '', 8],
      ['>Put (8) in (6). The mass and the stiffness drop out; only the sag is left:'],
      [r`f_n=\frac{1}{2\pi}\sqrt{\frac{g}{\delta}}`, '', 9, 'box'],
      ['>With \\(g=9.81\\) m/s² and \\(\\delta\\) in millimetres, \\(\\sqrt{9810}/2\\pi=15.76\\):'],
      [r`f_n\approx\frac{15.76}{\sqrt{\delta_{\text{mm}}}}\ \text{Hz}`, '← sag 1 mm: 15.8 Hz', 10],
    ],
  ];
  const EX1 = [
    ['>Worked example 1. A 500 kg pump sits on mounts with a combined stiffness \\(k=2.0\\times10^6\\) N/m. Find \\(\\omega_n\\), \\(f_n\\) and the period, and compare with 1X at 1480 rpm.'],
    ['>Angular frequency, from (6):'],
    [r`\omega_n=\sqrt{\frac{2.0\times10^6}{500}}=\sqrt{4000}=63.25\ \text{rad/s}`, '', 11],
    ['>In hertz, from (E):'],
    [r`f_n=\frac{63.25}{2\pi}=\frac{63.25}{6.2832}=10.07\ \text{Hz}`, '', 12],
    ['>Period:'],
    [r`T=\frac{1}{f_n}=\frac{1}{10.07}=0.0993\ \text{s}=99.3\ \text{ms}`, '', 13],
    ['>Running speed, from Lesson 1:'],
    [r`f_{1X}=\frac{1480}{60}=24.67\ \text{Hz},\qquad \frac{f_{1X}}{f_n}=\frac{24.67}{10.07}=2.45`, '', 14],
    ['>The pump runs at 2.45 times the natural frequency of its mounts, well clear of it. Lesson 10 shows why that ratio matters.'],
  ];
  const EX2 = [
    ['>Worked example 2. An 800 kg fan is set down on its mounts and they compress 3 mm. What is its natural frequency on the mounts, and how stiff are they?'],
    ['>From (9), with \\(\\delta=0.003\\) m:'],
    [r`f_n=\frac{1}{2\pi}\sqrt{\frac{9.81}{0.003}}=\frac{\sqrt{3270}}{6.2832}=\frac{57.18}{6.2832}=9.10\ \text{Hz}`, '', 15],
    ['>Check with the shortcut (10):'],
    [r`f_n\approx\frac{15.76}{\sqrt3}=\frac{15.76}{1.732}=9.10\ \text{Hz}\ \checkmark`, ''],
    ['>Stiffness, from (8):'],
    [r`k=\frac{m\,g}{\delta}=\frac{800\times9.81}{0.003}=2.62\times10^6\ \text{N/m}`, '', 16],
    ['>Check with (6): \\(\\sqrt{2.616\\times10^6/800}/2\\pi=\\sqrt{3270}/2\\pi=9.10\\) Hz ✓. A ruler and the sag were enough: no mass or stiffness needed.'],
  ];
  const SUMMARY = [
    ['>Everything in this lesson on one card:'],
    [r`m\,\ddot x=-k\,x`, '← from (2)', '', 'box'],
    [r`x(t)=A\cos(\omega_n t),\qquad \omega_n=\sqrt{k/m}`, '← from (3), (5)', '', 'box'],
    [r`f_n=\frac{1}{2\pi}\sqrt{\frac{k}{m}}\ \ \text{and the amplitude doesn’t change it}`, '← from (6)', '', 'box'],
    [r`f_n=\frac{1}{2\pi}\sqrt{\frac{g}{\delta}}\approx\frac{15.76}{\sqrt{\delta_{\text{mm}}}}\ \text{Hz}`, '← from (9), (10)', '', 'box'],
  ];
  const WORK = [GOAL, TOOLS, ...DERIV, EX1, EX2];

  // ---------------- calculator exercise ----------------
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const newEx = (s) => {
    s.ex = { m: pick([120, 250, 400, 650, 900, 1500]), k: pick([0.8, 1.2, 2.5, 4.0, 6.0]) * 1e6 };
    s.showSol = false;
  };
  const F = (x, d = 2) => (+x.toFixed(d)).toString();
  WORK.push((s) => {
    if (!s.showSol) return [];
    const { m, k } = s.ex, w = Math.sqrt(k / m), f = w / TAU, d = m * 9.81 / k * 1000;
    return [
      ['>Worked solution. Angular frequency, from (6):'],
      [r`\omega_n=\sqrt{\frac{${F(k / 1e6, 1)}\times10^6}{${m}}}=\sqrt{${F(k / m, 1)}}=${F(w)}\ \text{rad/s}`, '', 17],
      ['>In hertz:'],
      [r`f_n=\frac{${F(w)}}{2\pi}=\frac{${F(w)}}{6.2832}=${F(f)}\ \text{Hz}`, ''],
      ['>Period:'],
      [r`T=\frac{1}{${F(f)}}=${F(1 / f, 4)}\ \text{s}=${F(1000 / f, 1)}\ \text{ms}`, ''],
      ['>Sag at rest, from (8):'],
      [r`\delta=\frac{m\,g}{k}=\frac{${m}\times9.81}{${F(k / 1e6, 1)}\times10^6}=${F(d / 1000, 6)}\ \text{m}=${F(d, 2)}\ \text{mm}`, ''],
      ['>Check with (10): \\(15.76/\\sqrt{' + F(d, 2) + '}=' + F(15.76 / Math.sqrt(d)) + '\\) Hz ✓'],
    ];
  });
  WORK.push(SUMMARY);

  Lab.lesson({
    work: WORK,
    heads: true,
    next: '../',
    state: { m: 1, k: 40, A: 1, mm: 1, ex2: 'a' },
    steps: [
      {
        part: 'The puzzle',
        title: 'Why does it keep its own time?',
        text: `<p>Hang a mass on a spring, pull it down and let go. It bounces at a rhythm of its own. Pull it twice as far and it swings twice as wide, yet the rhythm doesn't change.</p><p>Why not? And why does a heavier mass bounce slower, but not twice as slow for twice the mass?</p>
               <p class="hint">The working builds up below the board. Click any heading there to fold it away.</p>`,
        draw(g, s, t, api) { springBoard(g, t, { m: 1, k: 40, A: 1 }); api.legend([['height of the mass', g.col.blue]]); },
      },
      {
        part: 'What we already know',
        title: 'The tools',
        text: `<p>Five facts, lettered (A) to (E). Hooke's law and \\(F=ma\\) come from school physics; the derivatives of a sine come from calculus.</p>
               <p>On the board, the orange arrow is the spring's force. It always points back towards rest.</p>`,
        draw(g, s, t, api) { springBoard(g, t, { m: 1, k: 40, A: 1, force: true }); api.legend([['height', g.col.blue], ['spring force', g.col.orange]]); },
      },
      {
        part: 'Derivation',
        title: 'Newton meets Hooke',
        text: `<p>Put the spring's force into \\(F=ma\\) and you get one equation: the acceleration is proportional to the displacement, and opposite to it.</p>
               <p>Watch the arrow: biggest at the ends of the swing, zero as the mass passes rest.</p>`,
        draw(g, s, t, api) { springBoard(g, t, { m: 1, k: 40, A: 1, force: true }); api.legend([['height', g.col.blue], ['force, so acceleration', g.col.orange]]); },
      },
      {
        part: 'Derivation',
        title: 'Guess a cosine',
        text: `<p>Which shape is its own second derivative, flipped? A cosine. The dashed orange line is the acceleration: the same curve, upside down.</p>
               <p>That only fits the equation for one value of \\(\\omega\\), and it's set by \\(k\\) and \\(m\\).</p>`,
        draw(g, s, t, api) { springBoard(g, t, { m: 1, k: 40, A: 1, accel: true }); api.legend([['x(t)', g.col.blue], ['acceleration, scaled', g.col.orange]]); },
      },
      {
        part: 'Derivation',
        title: 'Why the swing size doesn’t matter',
        text: `<p>Drag the amplitude. The swing gets bigger or smaller, and the rhythm stays exactly the same.</p>
               <p>The amplitude cancels out of the equation, so it can't set the frequency.</p>`,
        controls: [{ type: 'range', key: 'A', label: 'Amplitude', min: 0.2, max: 1.5, step: 0.05, fmt: (v) => v.toFixed(2) }],
        draw(g, s, t, api) { const r0 = springBoard(g, t, { m: 1, k: 40, A: s.A }); api.legend([['height of the mass', g.col.blue]]); api.verdict(`f = ${r0.f.toFixed(2)} Hz at any amplitude`, 'good'); },
      },
      {
        part: 'Derivation',
        title: 'Heavier is slower, by a square root',
        text: `<p>The natural frequency is \\(f_n=\\frac{1}{2\\pi}\\sqrt{k/m}\\). Drag the mass and the stiffness.</p>
               <p>Double the mass and the frequency drops to about 0.71 of what it was, not half. Four times the mass halves it.</p>`,
        controls: [
          { type: 'range', key: 'm', label: 'Mass m', min: 0.5, max: 4, step: 0.5, fmt: (v) => v + ' kg' },
          { type: 'range', key: 'k', label: 'Stiffness k', min: 10, max: 160, step: 10, fmt: (v) => v + ' N/m' },
        ],
        draw(g, s, t, api) { const r0 = springBoard(g, t, { m: s.m, k: s.k, A: 1 }); api.legend([['height of the mass', g.col.blue]]); api.verdict(`f_n = ${r0.f.toFixed(2)} Hz`, ''); },
      },
      {
        part: 'Derivation',
        title: 'The sag shortcut',
        text: `<p>On site you rarely know \\(k\\) and \\(m\\), but you can measure how far a machine sinks into its mounts. That sag alone gives the natural frequency.</p>
               <p>1 mm of sag means about 15.8 Hz. Four times the sag halves the frequency.</p>`,
        controls: [{ type: 'range', key: 'mm', label: 'Sag at rest, δ', min: 0.25, max: 25, step: 0.25, fmt: (v) => v + ' mm' }],
        draw(g, s, t, api) {
          const fn = Math.sqrt(9.81 / (s.mm / 1000)) / TAU;
          springBoard(g, t, { m: 1, k: Math.pow(fn / 10 * TAU, 2), A: 1, label: 'm' });   // shown 10× slower
          api.legend([['height, in 10× slow motion', g.col.blue]]);
          api.verdict(`sag ${s.mm} mm → f_n = ${fn.toFixed(2)} Hz`, 'good');
        },
      },
      {
        part: 'Worked example 1',
        title: 'A pump on its mounts',
        text: `<p>A 500 kg pump on mounts of \\(2.0\\times10^6\\) N/m. Its natural frequency, its period, and how far it sits from running speed. Every operation is written out below.</p>`,
        draw(g, s, t, api) { springBoard(g, t, { m: 2, k: 40, A: 1, label: 'pump' }); api.legend([['height of the mass', g.col.blue]]); api.verdict('f_n = 10.07 Hz · 1X = 24.67 Hz', ''); },
      },
      {
        part: 'Worked example 2',
        title: 'A fan from its sag',
        text: `<p>An 800 kg fan sinks 3 mm into its mounts. That one measurement gives its natural frequency and the stiffness of the mounts.</p>`,
        draw(g, s, t, api) { springBoard(g, t, { m: 3, k: 40, A: 1, label: 'fan' }); api.legend([['height of the mass', g.col.blue]]); api.verdict('sag 3 mm → f_n = 9.10 Hz', 'good'); },
      },
      {
        part: 'Your turn',
        title: 'Try it with a calculator',
        tryLabel: 'Your answers',
        text: (s) => {
          if (!s.ex) newEx(s);
          const { m, k } = s.ex;
          return `<div class="problem"><p>A machine of <b>${m} kg</b> sits on mounts with a combined stiffness of <b>${(k / 1e6).toFixed(1)} × 10⁶ N/m</b>.</p>
                  <p>Work these out with a calculator, type them in and press Check. Stuck? Show the working: it's written onto the page, line by line.</p></div>`;
        },
        controls: [
          { type: 'answer', label: 'Natural frequency f<sub>n</sub>', unit: 'Hz', value: (s) => Math.sqrt(s.ex.k / s.ex.m) / TAU, rel: 0.01 },
          { type: 'answer', label: 'Period T', unit: 'ms', value: (s) => 1000 * TAU / Math.sqrt(s.ex.k / s.ex.m), rel: 0.01 },
          { type: 'answer', label: 'Sag at rest, δ', unit: 'mm', value: (s) => s.ex.m * 9.81 / s.ex.k * 1000, rel: 0.02 },
          { type: 'check' },
          { type: 'button', label: 'Show working', action: (s, api) => { s.showSol = true; api.rewrite(); } },
          { type: 'button', label: 'New numbers', action: (s, api) => { newEx(s); api.refresh(); api.rewrite(); } },
        ],
        draw(g, s, t, api) { if (!s.ex) newEx(s); springBoard(g, t, { m: 2, k: 40, A: 1, label: `${s.ex.m} kg` }); api.legend([['height of the mass', g.col.blue]]); },
      },
      {
        part: 'Summary',
        title: 'On one card',
        text: `<p>The four results of this lesson, each derived above. Next lesson: why the bouncing dies away, and how one ring-down tells you the damping.</p>`,
        draw(g, s, t, api) { springBoard(g, t, { m: 1, k: 40, A: 1, force: true }); api.legend([['height', g.col.blue], ['spring force', g.col.orange]]); },
      },
    ],
  });
})();
