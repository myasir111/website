// Lesson S7: sidebands. Derive why a slow wobble on a fast tone makes twins (amplitude modulation), why they
// are evenly spaced and equally tall, the ladder a timing wobble makes (frequency modulation), why every
// harmonic gets its own, why real twins are uneven, and how long a record must be to see them; then use
// them on a gearbox and on a motor's current.
(function () {
  const { TAU, ease } = Lab;
  const r = String.raw;
  const F = (v, d = 4) => { const x = +(+v).toFixed(d); return (Object.is(x, -0) || Math.abs(x) < 1e-12 ? 0 : x).toString(); };

  // ---- truth: everything on the boards and in the examples is computed here
  const fact = (n) => { let p = 1; for (let i = 2; i <= n; i++) p *= i; return p; };
  function J(n, x) {                                // Bessel function of the first kind, by its power series (fine for |x| < 8)
    if (n < 0) return (n % 2 ? -1 : 1) * J(-n, x);
    let s = 0;
    for (let k = 0; k < 40; k++) s += ((k % 2 ? -1 : 1) * (x / 2) ** (2 * k + n)) / (fact(k) * fact(k + n));
    return s;
  }
  const db = (a) => 20 * Math.log10(Math.max(a, 1e-12));
  const FC = 400, FM = 25;                          // the gearbox from the film: 400 Hz mesh, 25 Hz shaft
  const HARM = [1, 0.5, 0.3];
  // exact complex amplitude of the line at fc + n*fm for (1 + m cos) x cos(wt + b sin): sum over the AM arrows
  const lineAmp = (n, m, b) => J(n, b) + (m / 2) * (J(n - 1, b) + J(n + 1, b));
  // Hann-windowed spectrum (amplitude-scaled) of the AM tone over a record of T seconds, at frequency f
  const hannMemo = {};
  function hannCurve(T) {                            // the whole 340-460 Hz curve for one record length, computed once
    const key = T.toFixed(3);
    if (hannMemo[key]) return hannMemo[key];
    const fs = [], ys = [];
    for (let f = 340; f <= 460; f += 0.5) { fs.push(f); ys.push(hannSpec(T, f)); }
    return (hannMemo[key] = [fs, ys]);
  }
  function hannSpec(T, f, m = 0.5) {
    const fs = 2000, N = Math.round(T * fs); let re = 0, im = 0, sw = 0;
    for (let i = 0; i < N; i++) {
      const t = i / fs, w = 0.5 - 0.5 * Math.cos(TAU * i / (N - 1)), x = (1 + m * Math.cos(TAU * FM * t)) * Math.cos(TAU * FC * t);
      re += w * x * Math.cos(TAU * f * t); im -= w * x * Math.sin(TAU * f * t); sw += w;
    }
    return 2 * Math.hypot(re, im) / sw;
  }
  // the frequencies of the clear peaks of a curve (local maxima above 10% of the largest)
  const peaksOf = (fs, ys) => { const mx = Math.max(...ys); return fs.filter((f, i) => i > 0 && i < ys.length - 1 && ys[i] > ys[i - 1] && ys[i] >= ys[i + 1] && ys[i] > 0.1 * mx); };

  // ---- board helpers
  function stems(g, P, lines, o = {}) {           // lines: [f, height, colour]; height may be negative
    const ctx = g.ctx, k = o.k ?? 1;
    lines.forEach(([f, h, col]) => {
      if (f < P.x0 || f > P.x1) return;
      ctx.strokeStyle = col; ctx.lineWidth = o.width || 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(P.X(f), P.Y(o.base ?? 0)); ctx.lineTo(P.X(f), P.Y((o.base ?? 0) + k * (h - (o.base ?? 0)))); ctx.stroke();
    });
    ctx.lineCap = 'butt';
  }
  const roleCol = (c, n) => (n === 0 ? c.ink : n < 0 ? c.blue : c.orange);
  function freqTicks(P, fs, unit = 'Hz') { return fs.map((f, i) => [f, i === fs.length - 1 ? `${f} ${unit}` : `${f}`]); }

  // a gearbox spectrum: mesh harmonics with AM twins (k = how far the twins have grown)
  function gearBoard(g, t, api, o = {}) {
    const c = g.col, m = o.m ?? 0.5;
    const P = g.plot({ box: [0.06, 0.1, 0.9, 0.62], x: [300, 1300], y: [0, 1.15] });
    P.axes({ ticks: freqTicks(P, [400, 800, 1200]) });
    stems(g, P, HARM.map((a, i) => [FC * (i + 1), a, c.ink]), { k: ease(t / 0.8) });
    const k2 = ease((t - 0.6) / 0.9);
    HARM.forEach((a, i) => stems(g, P, [[FC * (i + 1) - FM, a * m / 2, c.blue], [FC * (i + 1) + FM, a * m / 2, c.orange]], { k: k2 }));
    api.legend([['mesh and its harmonics', c.ink], ['lower twin', c.blue], ['upper twin', c.orange]]);
  }

  // the AM tone in time (two turns) with its envelope, and its spectrum
  function amBoard(g, s, t, api) {
    const c = g.col, m = s.m;
    const S = g.plot({ box: [0.06, 0.06, 0.9, 0.36], x: [0, 2 / FM], y: [-1.6, 1.6] });
    S.axes({ ticks: [[0, '0'], [1 / FM, '40 ms'], [2 / FM, '80 ms']] });
    const rv = ease(t / 1.2);
    [1, -1].forEach((sg) => S.curve((x) => sg * (1 + m * Math.cos(TAU * FM * x)), { color: c.accent, width: 1.6, dash: [6, 4], to: 2 / FM * rv }));
    S.curve((x) => (1 + m * Math.cos(TAU * FM * x)) * Math.cos(TAU * FC * x), { color: c.ink, width: 1.3, n: 1600, to: 2 / FM * rv });
    const P = g.plot({ box: [0.28, 0.56, 0.5, 0.3], x: [340, 460], y: [0, 1.15] });
    P.axes({ ticks: freqTicks(P, [375, 400, 425]) });
    stems(g, P, [[375, m / 2, c.blue], [400, 1, c.ink], [425, m / 2, c.orange]], { k: ease((t - 0.8) / 0.8), width: 5 });
    api.legend([['(1 + m cos Ωt) cos ωt', c.ink], ['its envelope 1 ± m cos Ωt', c.accent]]);
  }

  // the phasor picture: carrier arrow + two arrows turning opposite ways (sg = -1 flips the lower one: FM)
  function phasorBoard(g, s, t, api, sg = 1, gap = FM) {
    const c = g.col, ctx = g.ctx, m = 0.5;
    const P = g.plot({ box: [0.03, 0.06, 0.58, 0.82], x: [-0.1, 1.45], y: [-0.62, 0.62] });
    const th = t * TAU * 0.35 * gap / FM;
    const up = [1 + (m / 2) * Math.cos(th), (m / 2) * Math.sin(th)], lo = [up[0] + sg * (m / 2) * Math.cos(-th), up[1] + sg * (m / 2) * Math.sin(-th)];
    const arrow = (a, b, col, w) => {
      const [x0, y0, x1, y1] = [P.X(a[0]), P.Y(a[1]), P.X(b[0]), P.Y(b[1])], ang = Math.atan2(y1 - y0, x1 - x0);
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - 10 * Math.cos(ang - 0.4), y1 - 10 * Math.sin(ang - 0.4));
      ctx.lineTo(x1 - 10 * Math.cos(ang + 0.4), y1 - 10 * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill();
    };
    ctx.strokeStyle = c.accent; ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]); ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const a = TAU * i / 200, x = 1 + (m / 2) * Math.cos(a) + sg * (m / 2) * Math.cos(-a), y = (m / 2) * Math.sin(a) + sg * (m / 2) * Math.sin(-a);
      i ? ctx.lineTo(P.X(x), P.Y(y)) : ctx.moveTo(P.X(x), P.Y(y));
    }
    ctx.stroke(); ctx.setLineDash([]);
    arrow([0, 0], [1, 0], c.ink, 3.2); arrow([1, 0], up, c.orange, 2.6); arrow(up, lo, c.blue, 2.6);
    P.dot(lo[0], lo[1], { color: c.accent, r: 5 });
    ctx.strokeStyle = c.accent; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(P.X(0), P.Y(0)); ctx.lineTo(P.X(lo[0]), P.Y(lo[1])); ctx.stroke(); ctx.setLineDash([]);
    const Q = g.plot({ box: [0.66, 0.2, 0.3, 0.5], x: [FC - 60, FC + 60], y: [-0.4, 1.1] });
    Q.axes({ ticks: [[FC - gap, `${FC - gap}`], [FC, `${FC}`], [FC + gap, `${FC + gap}`]] });
    stems(g, Q, [[FC - gap, sg * m / 2, c.blue], [FC, 1, c.ink], [FC + gap, m / 2, c.orange]], { width: 5 });
    api.legend([['carrier arrow', c.ink], ['upper twin, turning +Ω', c.orange], ['lower twin, turning −Ω', c.blue], ['their sum', c.accent]]);
    const len = Math.hypot(lo[0], lo[1]), ang = Math.atan2(lo[1], lo[0]);
    return { len, ang };
  }

  // a signed spectrum: lines at fc + n*fm with the exact amplitudes of (1 + m cos) cos(wt + b sin)
  function ladderBoard(g, m, b, t, api, o = {}) {
    const c = g.col, N = o.N ?? 5, top = o.top ?? 1.1;
    const P = g.plot({ box: o.box || [0.08, 0.1, 0.86, 0.62], x: [FC - (N + 0.6) * FM, FC + (N + 0.6) * FM], y: [-0.6, top] });
    P.axes({ ticks: freqTicks(P, [FC - 4 * FM, FC - 2 * FM, FC, FC + 2 * FM, FC + 4 * FM].filter((f) => f > P.x0)) });
    const L = [];
    for (let n = -N; n <= N; n++) L.push([FC + n * FM, lineAmp(n, m, b), roleCol(c, n)]);
    stems(g, P, L, { k: ease(t / 0.8), width: 5 });
    return L;
  }

  // a decibel spectrum, from a list of [f, dB, colour]
  function dbBoard(g, lines, range, ticks, t, o = {}) {
    const P = g.plot({ box: o.box || [0.1, 0.1, 0.84, 0.62], x: range, y: [-60, 4] });
    const ctx0 = g.ctx; ctx0.strokeStyle = g.col.line; ctx0.lineWidth = 1;
    ctx0.beginPath(); ctx0.moveTo(P.l, P.Y(-60)); ctx0.lineTo(P.l + P.w, P.Y(-60)); ctx0.moveTo(P.l, P.t); ctx0.lineTo(P.l, P.Y(-60)); ctx0.stroke();
    ticks.forEach(([f, lab]) => g.text(lab, P.X(f), P.Y(-60) + 13, { size: 11 }));
    [0, -20, -40].forEach((d) => g.text(`${d} dB`, P.l - 6, P.Y(d), { size: 11, align: 'right' }));
    const ctx = g.ctx; ctx.strokeStyle = g.col.line; ctx.setLineDash([2, 4]); ctx.lineWidth = 1;
    [-20, -40].forEach((d) => { ctx.beginPath(); ctx.moveTo(P.l, P.Y(d)); ctx.lineTo(P.l + P.w, P.Y(d)); ctx.stroke(); });
    ctx.setLineDash([]);
    stems(g, P, lines.map(([f, d, col]) => [f, Math.max(d, -59.4), col]), { base: -60, k: ease(t / 0.8), width: o.width || 4 });
    return P;
  }

  // ---- the examples
  const EX1 = { teeth: 16, rpm: 1500, gearTeeth: 32, L: -26 };
  const EX2 = { poles: 4, f: 50, rpm: 1470 };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const newEx = (s) => { s.ex = { z: pick([13, 17, 19, 21, 23, 27, 29]), rpm: pick([985, 1180, 1475, 1490, 2955, 2970, 3570]), L: pick([-20, -24, -28, -30, -34]) }; s.showSol = false; };
  const exNums = (s) => { const fr = s.ex.rpm / 60; return { fr, mesh: s.ex.z * fr, lower: s.ex.z * fr - fr, m: 2 * 10 ** (s.ex.L / 20), T: 2 / fr }; };

  // ---- the working
  const WORK = [];

  // 1. Goal
  WORK.push([
    ['>By the end of this lesson we will have answered:'],
    ['>Why does a slow wobble on a fast tone make two extra lines?'],
    ['>Why is the gap exactly the wobble’s frequency, and what does a timing wobble do instead?'],
    ['>How long must a record be to see twins at all?'],
    ['>Then we solve two examples with every operation shown, and you try one yourself.'],
  ]);

  // 2. Tools
  WORK.push([
    ['>Add \\(\\cos(a+b)=\\cos a\\cos b-\\sin a\\sin b\\) and \\(\\cos(a-b)=\\cos a\\cos b+\\sin a\\sin b\\), then halve. A product of cosines is a sum of cosines:'],
    [r`\cos a\cos b=\tfrac12\cos(a+b)+\tfrac12\cos(a-b)`, '← check it on the board', 'A'],
    ['>Euler, as in Lessons S4 and S5: a cosine is two arrows of half its size, turning opposite ways:'],
    [r`\cos\theta=\tfrac12e^{i\theta}+\tfrac12e^{-i\theta}`, '', 'B'],
    ['>The one fact we accept rather than derive (it is the Fourier series of \\(e^{i\\beta\\sin\\theta}\\), which repeats every turn of \\(\\theta\\)). Its coefficients are the Bessel functions \\(J_n\\):'],
    [r`e^{i\beta\sin\theta}=\sum_{n=-\infty}^{\infty}J_n(\beta)\,e^{in\theta},\qquad J_{-n}(\beta)=(-1)^nJ_n(\beta)`, '← Jacobi–Anger', 'C'],
    ['>For a small \\(\\beta\\) only the first terms matter:'],
    [r`J_0(\beta)\approx1-\frac{\beta^2}{4},\qquad J_1(\beta)\approx\frac{\beta}{2},\qquad J_2(\beta)\approx\frac{\beta^2}{8}`, '', 'D'],
    ['>Decibels compare two sizes:'],
    [r`L=20\log_{10}\frac{A}{A_{\text{ref}}}\iff\frac{A}{A_{\text{ref}}}=10^{L/20}`, '', 'E'],
    ['>From Lesson S5: with a Hann window on a record \\(T\\) seconds long, a steady tone’s peak is \\(4/T\\) wide at its base:'],
    [r`\text{main lobe: }f_0\pm\frac{2}{T}`, '', 'F'],
  ]);

  // 3. AM
  WORK.push([
    ['>A fast tone at \\(\\omega=2\\pi f_c\\) whose size wobbles by a fraction \\(m\\), once per turn of \\(\\Omega=2\\pi f_m\\):'],
    [r`x(t)=(1+m\cos\Omega t)\cos\omega t`, '', 1],
    ['>Multiply out the bracket:'],
    [r`x(t)=\cos\omega t+m\cos\Omega t\,\cos\omega t`, '', 2],
    ['>Use (A) on the second term, with \\(a=\\omega t\\) and \\(b=\\Omega t\\):'],
    [r`m\cos\Omega t\cos\omega t=\tfrac m2\cos(\omega+\Omega)t+\tfrac m2\cos(\omega-\Omega)t`, '', 3],
    [r`x(t)=\cos\omega t+\tfrac m2\cos(\omega+\Omega)t+\tfrac m2\cos(\omega-\Omega)t`, '← three steady tones', 4, 'box'],
    ['>In hertz, an FFT of (1) shows three lines, the outer two each \\(m/2\\) tall:'],
    [r`f_c-f_m,\qquad f_c,\qquad f_c+f_m`, '', 5],
    ['>Nothing extra is vibrating. The twins are the wobble, written as sines and cosines.'],
  ]);

  // 4. Why so even
  WORK.push([
    ['>The gap. In (5), \\(f_c\\) only sets the middle; the twins sit \\(f_m\\) either side of it, whatever \\(f_c\\) is:'],
    [r`\text{gap}=f_m`, '← the frequency of the wobble, nothing else', 6, 'box'],
    ['>The heights. Write the wobble with (B):'],
    [r`1+m\cos\Omega t=1+\tfrac m2e^{i\Omega t}+\tfrac m2e^{-i\Omega t}`, '', 7],
    ['>Two arrows of the same length \\(m/2\\), turning opposite ways. Multiplying by the carrier moves each up by \\(\\omega\\): one lands at \\(\\omega+\\Omega\\), the other at \\(\\omega-\\Omega\\). Equal arrows, equal twins. On the board their sum only stretches and shrinks along the carrier: the size wobbles, the angle does not.'],
    ['>In decibels, by (E), each twin sits below the carrier by'],
    [r`L=20\log_{10}\frac m2`, '', 8, 'box'],
    [r`m=0.1:\quad L=20\log_{10}0.05=-26.0\ \text{dB}`, '', 9],
  ]);

  // 5. FM
  WORK.push([
    ['>Now let the timing wobble instead: the tone runs a little ahead, then a little behind, by up to \\(\\beta\\) radians:'],
    [r`x(t)=\cos(\omega t+\beta\sin\Omega t)`, '', 10],
    ['>Its frequency is how fast its angle turns. Differentiate the angle and divide by \\(2\\pi\\):'],
    [r`f(t)=f_c+\beta f_m\cos\Omega t`, '← the frequency swings ± βf_m', 11],
    ['>Write the cosine as the real part of an arrow and use (C) with \\(\\theta=\\Omega t\\):'],
    [r`e^{i(\omega t+\beta\sin\Omega t)}=e^{i\omega t}\sum_nJ_n(\beta)e^{in\Omega t}=\sum_nJ_n(\beta)\,e^{i(\omega+n\Omega)t}`, '', 12],
    [r`x(t)=\sum_nJ_n(\beta)\cos(\omega+n\Omega)t`, '← a ladder, f_m apart', 13, 'box'],
    ['>The rungs are still \\(f_m\\) apart: the gap is the wobble again. By (C) the odd rungs below the carrier are flipped, \\(J_{-1}=-J_1\\). For a small wobble, by (D):'],
    [r`x(t)\approx\cos\omega t+\tfrac\beta2\cos(\omega+\Omega)t-\tfrac\beta2\cos(\omega-\Omega)t`, '', 14],
    ['>The same twins as (4), but one upside down. On the phasor board (step 4), flipping one arrow turns a stretch into a swing.'],
  ]);

  // 6. Every harmonic
  WORK.push([
    ['>A real gear mesh is no pure cosine. It repeats, so it has harmonics (Lessons S1 and S2):'],
    [r`c(t)=\sum_ka_k\cos k\omega t`, '', 15],
    ['>A size wobble multiplies all of it. By (4), term by term:'],
    [r`(1+m\cos\Omega t)\,a_k\cos k\omega t=a_k\cos k\omega t+\tfrac{a_km}{2}\cos(k\omega\pm\Omega)t`, '← twins around every harmonic (one term each way)', 16, 'box'],
    ['>Every harmonic gets twins \\(f_m\\) either side, in the same proportion \\(m/2\\). A timing wobble shifts time itself, so harmonic \\(k\\) is shifted \\(k\\) times as much in angle:'],
    [r`a_k\cos\big(k\omega t+k\beta\sin\Omega t\big)\quad\Rightarrow\quad\beta_k=k\beta`, '← higher harmonics, wider ladders', 17, 'box'],
  ]);

  // 7. Both
  WORK.push([
    ['>An off-centre gear does both: the mesh bites harder and softer (size) and the teeth arrive early and late (timing). Multiply (14) by \\(1+m\\cos\\Omega t\\) and keep only first-order terms in \\(m\\) and \\(\\beta\\):'],
    [r`x(t)\approx\cos\omega t+\frac{m+\beta}{2}\cos(\omega+\Omega)t+\frac{m-\beta}{2}\cos(\omega-\Omega)t`, '← uneven twins', 18, 'box'],
    ['>One side adds, the other cancels. Exactly, multiply the arrows of (7) into (12) and collect the \\(\\omega-\\Omega\\) terms (every \\(J\\) at \\(\\beta\\)):'],
    [r`\text{lower twin}=J_{-1}+\tfrac m2\big(J_0+J_{-2}\big)=-J_1+\tfrac m2\big(J_0+J_2\big)`, '', 19],
    ['>Bessel functions obey \\(J_0(\\beta)+J_2(\\beta)=2J_1(\\beta)/\\beta\\), so'],
    [r`\text{lower twin}=J_1(\beta)\Big(\frac m\beta-1\Big)`, '← zero when m = β', 20],
    ['>So twins of different heights mean both wobbles are there (with the two wobbles lined up as in (1) and (10); shifted, the sums move but the twins still differ).'],
  ]);

  // 8. Seeing them
  WORK.push([
    ['>By (F), every line in a Hann-windowed spectrum is \\(\\pm2/T\\) wide at its base. Twins \\(f_m\\) apart stand out as separate peaks only when each one’s lobe is narrower than the gap:'],
    [r`\frac2T<f_m\iff T>\frac{2}{f_m}`, '', 21, 'box'],
    ['>In turns of the wobble, \\(Tf_m>2\\): at least two turns. Shorter, and leakage blurs the twins into the carrier, one lump.'],
    [r`f_m=25\ \text{Hz}:\quad T>\frac{2}{25}=0.08\ \text{s}`, '← the board finds three peaks from about 2.5 turns', 22],
  ]);

  // 9. Example 1
  {
    const fr = EX1.rpm / 60, mesh = EX1.teeth * fr, gear = fr * EX1.teeth / EX1.gearTeeth, m = 2 * 10 ** (EX1.L / 20);
    WORK.push([
      ['>Worked example 1. A 16-tooth pinion at 1500 rpm drives a 32-tooth gear. The spectrum shows a big line with a twin either side, each 26 dB below it. Where should the twins be, which shaft are they from, and how deep is the wobble?'],
      [r`f_{\text{pinion}}=\frac{1500}{60}=${F(fr)}\ \text{Hz},\qquad f_{\text{mesh}}=16\times${F(fr)}=${F(mesh)}\ \text{Hz}`, '', 23],
      [r`f_{\text{gear}}=${F(fr)}\times\frac{16}{32}=${F(gear)}\ \text{Hz}`, '', 24],
      ['>By (6), a wobble once per pinion turn puts twins 25 Hz out; once per gear turn, 12.5 Hz out:'],
      [r`\text{pinion: }${F(mesh - fr)},\ ${F(mesh + fr)}\ \text{Hz}\qquad\text{gear: }${F(mesh - gear)},\ ${F(mesh + gear)}\ \text{Hz}`, '← the gap names the shaft', 25],
      ['>The depth, from (8) and (E):'],
      [r`\frac m2=10^{-26/20}=${F(10 ** (EX1.L / 20), 4)}\quad\Rightarrow\quad m=${F(m, 3)}`, '← a 10% size wobble', 26],
      ['>To see the gear’s twins at all, by (21):'],
      [r`T>\frac{2}{${F(gear)}}=${F(2 / gear, 3)}\ \text{s}`, '', 27],
    ]);
  }

  // 10. Example 2
  {
    const sync = 120 * EX2.f / EX2.poles, slip = (sync - EX2.rpm) / sync, gap = 2 * slip * EX2.f;
    WORK.push([
      ['>Worked example 2. A 4-pole induction motor on a 50 Hz supply runs at 1470 rpm. A broken rotor bar makes the current’s size wobble at twice the slip frequency. Where are the twins in the supply current, and how long must the record be?'],
      [r`n_{\text{sync}}=\frac{120\times50}{4}=${F(sync)}\ \text{rpm},\qquad s=\frac{${F(sync)}-1470}{${F(sync)}}=${F(slip, 3)}`, '', 28],
      [r`f_m=2sf=2\times${F(slip, 3)}\times50=${F(gap, 2)}\ \text{Hz}`, '', 29],
      ['>By (5), the twins sit \\(f_m\\) either side of the supply line, the classic \\(f(1\\pm2s)\\):'],
      [r`50\pm${F(gap, 2)}=${F(50 - gap, 2)}\ \text{and}\ ${F(50 + gap, 2)}\ \text{Hz}`, '', 30, 'box'],
      ['>By (21) the record must be longer than'],
      [r`T>\frac{2}{${F(gap, 2)}}=${F(2 / gap, 2)}\ \text{s}`, '', 31],
      ['>In practice much longer: the 50 Hz line is far bigger than the twins, and its skirts must fall below them 2 Hz away. These twins live in the current, not in the vibration spectrum.'],
    ]);
  }

  // 11. Your turn
  WORK.push((s) => {
    if (!s.ex) newEx(s);
    const { z, rpm, L } = s.ex, E = exNums(s);
    const given = [
      ['>Your turn. A pinion with'],
      [r`z=${z}\ \text{teeth},\qquad ${rpm}\ \text{rpm},\qquad \text{twins }${L}\ \text{dB below the mesh}`, '', 32],
    ];
    if (!s.showSol) return given;
    return [
      ...given,
      ['>The shaft and mesh frequencies:'],
      [r`f_r=\frac{${rpm}}{60}=${F(E.fr, 3)}\ \text{Hz},\qquad f_{\text{mesh}}=${z}\times${F(E.fr, 3)}=${F(E.mesh, 2)}\ \text{Hz}`, '', 33],
      ['>The lower twin, by (5), and the depth, by (8):'],
      [r`${F(E.mesh, 2)}-${F(E.fr, 3)}=${F(E.lower, 2)}\ \text{Hz},\qquad m=2\times10^{${L}/20}=${F(E.m, 3)}`, '', 34],
      ['>The shortest record that shows them, by (21):'],
      [r`T>\frac{2}{${F(E.fr, 3)}}=${F(E.T, 4)}\ \text{s}`, '', 35],
    ];
  });

  // 12. Summary
  WORK.push([
    ['>Everything in this lesson on one card:'],
    [r`\text{size: }f_c\pm f_m,\ \tfrac m2\text{ each},\ L=20\log_{10}\tfrac m2`, '← (4), (8)', '', 'box'],
    [r`\text{timing: }J_n(\beta)\text{ at }f_c+nf_m`, '← (13), one twin flipped', '', 'box'],
    [r`\text{harmonic }k:\ m,\ \beta_k=k\beta;\quad\text{both: }\tfrac{m\pm\beta}{2}`, '← (16), (17), (18)', '', 'box'],
    [r`\text{gap}=f_m,\qquad T>\frac{2}{f_m}`, '← (6), (21)', '', 'box'],
    ['>Small, steady sidebands are normal: nothing is made perfect. Growing or multiplying ones are worth a closer look, and their gap tells you where.'],
  ]);

  Lab.lesson({
    work: WORK,
    heads: true,
    next: '../',
    state: { ph: 'am', fb: 5, m: 0.5, fmv: 25, beta: 0.4, hm: 'am', hv: 0.5, mb: 0.3, bb: 0.3, T: 0.4 },
    steps: [
      {
        part: 'The puzzle',
        title: 'Why does every peak have twins?',
        text: `<p>A gearbox spectrum: the gear mesh at 400 Hz and its harmonics, and around every one of them a pair of smaller lines, the same gap apart. Nobody put them there.</p><p>Why twins? Why so evenly spaced? What is that 25 Hz gap telling you, and when do twins mean a tooth is in trouble?</p>
               <p class="hint">The working builds up below the board. Click any heading there to fold it away.</p>`,
        draw(g, s, t, api) { gearBoard(g, t, api); api.verdict('twins 25 Hz either side of every line', 'good'); },
      },
      {
        part: 'What we already know',
        title: 'The tools',
        text: `<p>Six facts, lettered (A) to (F). (A) does most of the work: a product of cosines is a sum of cosines. (C) is the one fact we take on trust.</p>
               <p>On the board, \\(\\cos a\\cos b\\) and \\(\\tfrac12\\cos(a+b)+\\tfrac12\\cos(a-b)\\) are drawn on top of each other. Drag the slow frequency: they never part.</p>`,
        controls: [{ type: 'range', key: 'fb', label: 'Slow frequency', min: 1, max: 10, step: 0.5, fmt: (v) => `${v} cycles` }],
        draw(g, s, t, api) {
          const c = g.col, P = g.plot({ box: [0.06, 0.1, 0.9, 0.62], x: [0, 1], y: [-1.2, 1.2] });
          P.axes();
          const A = 30, B = s.fb, k = ease(t / 1.2);
          const prod = (x) => Math.cos(TAU * A * x) * Math.cos(TAU * B * x), sum = (x) => 0.5 * Math.cos(TAU * (A + B) * x) + 0.5 * Math.cos(TAU * (A - B) * x);
          [1, -1].forEach((sg) => P.curve((x) => sg * Math.abs(Math.cos(TAU * B * x)), { color: c.muted, width: 1.2, dash: [5, 5] }));
          P.curve(prod, { color: c.ink, width: 3.2, n: 1400, to: k });
          P.curve(sum, { color: c.orange, width: 1.4, n: 1400, to: k });
          let worst = 0; for (let i = 0; i <= 2000; i++) worst = Math.max(worst, Math.abs(prod(i / 2000) - sum(i / 2000)));
          api.legend([['cos a · cos b', c.ink], ['½cos(a+b) + ½cos(a−b)', c.orange]]);
          api.verdict(`largest difference anywhere: ${worst.toExponential(1)}`, 'good');
        },
      },
      {
        part: 'Derivation',
        title: 'A size wobble makes twins',
        text: `<p>A 400 Hz tone whose size rises and falls once per 25 Hz turn. Multiply it out and use (A): it is three steady tones, the twins each \\(m/2\\) tall.</p>
               <p>Drag \\(m\\), the depth of the wobble, and watch the twins follow.</p>`,
        controls: [{ type: 'range', key: 'm', label: 'Depth m', min: 0, max: 1, step: 0.01, fmt: (v) => `m = ${v.toFixed(2)}` }],
        draw(g, s, t, api) { amBoard(g, s, t, api); api.verdict(`twins m/2 = ${F(s.m / 2, 3)}, ${F(db(Math.max(s.m, 1e-6) / 2), 1)} dB below the carrier`, 'good'); },
      },
      {
        part: 'Derivation',
        title: 'Why so even',
        text: `<p>The wobble is two equal arrows turning opposite ways (7). Riding on the carrier’s arrow, their sum only stretches and shrinks it: equal twins, one each side, exactly the wobble’s frequency away.</p>
               <p>Drag the wobble frequency: the gap follows it. Then flip one twin, as a timing wobble does (14): the sum stops stretching and swings instead.</p>`,
        controls: [
          { type: 'range', key: 'fmv', label: 'Wobble frequency', min: 5, max: 45, step: 1, fmt: (v) => `${v} Hz` },
          { type: 'choice', key: 'ph', options: [['am', 'Equal twins (size)'], ['fm', 'One flipped (timing)']] },
        ],
        draw(g, s, t, api) {
          const { len, ang } = phasorBoard(g, s, t, api, s.ph === 'fm' ? -1 : 1, s.fmv);
          api.verdict(`gap = ${s.fmv} Hz;  the sum: length ${F(len, 2)}, angle ${F(ang * 180 / Math.PI, 0)}°`, 'good');
        },
      },
      {
        part: 'Derivation',
        title: 'A timing wobble makes a ladder',
        text: `<p>Now the teeth come a little early, then a little late. The frequency swings, and (13) gives a ladder of lines, still the wobble’s frequency apart. The lower odd rungs point down: they are flipped.</p>
               <p>Drag \\(\\beta\\), the size of the timing wobble. Small \\(\\beta\\): one pair. Large: many.</p>`,
        controls: [{ type: 'range', key: 'beta', label: 'Timing wobble β', min: 0, max: 3, step: 0.05, fmt: (v) => `β = ${v.toFixed(2)} rad` }],
        draw(g, s, t, api) {
          const c = g.col; ladderBoard(g, 0, s.beta, t, api, { N: 6 });
          api.legend([['carrier J₀(β)', c.ink], ['upper rungs', c.orange], ['lower rungs', c.blue]]);
          api.verdict(`J₀ = ${F(J(0, s.beta), 3)},  J₁ = ${F(J(1, s.beta), 3)},  J₂ = ${F(J(2, s.beta), 3)}`, 'good');
        },
      },
      {
        part: 'Derivation',
        title: 'Every harmonic gets them',
        text: `<p>A real mesh has harmonics, and the wobble rides on all of them. A size wobble gives every harmonic the same twins in proportion (16). A timing wobble moves harmonic \\(k\\) by \\(k\\) times the angle, so its ladder is wider (17).</p>`,
        controls: [
          { type: 'choice', key: 'hm', options: [['am', 'Size wobble (AM)'], ['fm', 'Timing wobble (FM)']] },
          { type: 'range', key: 'hv', label: 'Depth', min: 0, max: 1, step: 0.02, fmt: (v) => v.toFixed(2) },
        ],
        draw(g, s, t, api) {
          const c = g.col, P = g.plot({ box: [0.06, 0.1, 0.9, 0.62], x: [300, 1300], y: [0, 1.15] });
          P.axes({ ticks: freqTicks(P, [400, 800, 1200]) });
          const rel = [];
          HARM.forEach((a, i) => {
            const k = i + 1, L = [];
            for (let n = -4; n <= 4; n++) {
              const h = s.hm === 'am' ? (n === 0 ? 1 : Math.abs(n) === 1 ? s.hv / 2 : 0) : Math.abs(J(n, k * s.hv));
              if (h > 0.004) L.push([FC * k + n * FM, a * h, roleCol(c, n)]);
            }
            stems(g, P, L, { k: ease(t / 0.8) });
            rel.push(s.hm === 'am' ? s.hv / 2 : Math.abs(J(1, k * s.hv) / J(0, k * s.hv)));
          });
          api.legend([['each harmonic', c.ink], ['its twins', c.orange]]);
          api.verdict(`first twin ÷ its line:  1×: ${F(rel[0], 3)},  2×: ${F(rel[1], 3)},  3×: ${F(rel[2], 3)}`, 'good');
        },
      },
      {
        part: 'What it means',
        title: 'Both at once: uneven twins',
        text: `<p>An off-centre gear wobbles in size and in timing. The size twins point the same way; one timing twin is flipped. Add them: one side grows, the other shrinks (18).</p>
               <p>Make \\(m\\) and \\(\\beta\\) equal: the lower twin vanishes exactly (20).</p>`,
        controls: [
          { type: 'range', key: 'mb', label: 'Size wobble m', min: 0, max: 0.8, step: 0.01, fmt: (v) => `m = ${v.toFixed(2)}` },
          { type: 'range', key: 'bb', label: 'Timing wobble β', min: 0, max: 0.8, step: 0.01, fmt: (v) => `β = ${v.toFixed(2)}` },
        ],
        draw(g, s, t, api) {
          const c = g.col; const L = ladderBoard(g, s.mb, s.bb, t, api, { N: 3 });
          const lo = L.find(([f]) => f === FC - FM)[1], up = L.find(([f]) => f === FC + FM)[1];
          api.legend([['carrier', c.ink], ['upper twin', c.orange], ['lower twin', c.blue]]);
          api.verdict(`lower ${F(lo, 3)}  (½(m−β) = ${F((s.mb - s.bb) / 2, 3)}),  upper ${F(up, 3)}  (½(m+β) = ${F((s.mb + s.bb) / 2, 3)})`,
            Math.abs(Math.abs(lo) - Math.abs(up)) > 0.01 ? 'bad' : 'good');
        },
      },
      {
        part: 'What it means',
        title: 'Seeing them: record at least two turns',
        text: `<p>The FFT of a short record smears every line into a lobe \\(\\pm2/T\\) wide (Lesson S5). Twins 25 Hz apart need the lobes narrower than the gap: a record of more than two turns.</p>
               <p>Shorten the record and watch three peaks become one lump.</p>`,
        controls: [{ type: 'range', key: 'T', label: 'Record length', min: 0.04, max: 0.4, step: 0.005, fmt: (v) => `${(v * 1000).toFixed(0)} ms` }],
        draw(g, s, t, api) {
          const c = g.col, P = g.plot({ box: [0.08, 0.1, 0.86, 0.62], x: [340, 460], y: [0, 1.15] });
          P.axes({ ticks: freqTicks(P, [350, 375, 400, 425, 450]) });
          const [fs, ys] = hannCurve(s.T);
          const ctx = g.ctx, k = ease(t / 0.8);
          ctx.strokeStyle = c.accent; ctx.lineWidth = 2.6; ctx.beginPath();
          fs.forEach((f, i) => { const x = P.X(f), y = P.Y(k * ys[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
          stems(g, P, [[375, 0.25, c.blue], [400, 1, c.ink], [425, 0.25, c.orange]], { width: 2, k: 0.35 });
          const pk = peaksOf(fs, ys), near = (f0) => pk.some((f) => Math.abs(f - f0) < 4), turns = s.T * FM;
          const split = near(FC - FM) && near(FC + FM);
          api.legend([['Hann-windowed spectrum', c.accent], ['the true lines', c.muted]]);
          api.verdict(`${F(turns, 2)} turns: ${split ? 'three peaks, the twins are separate' : pk.length > 1 ? 'one lump (the outer bumps are side lobes, not twins)' : 'one lump'}`, split ? 'good' : 'bad');
        },
      },
      {
        part: 'Worked example 1',
        title: 'Which shaft?',
        text: `<p>A 16-tooth pinion at 1,500 rpm drives a 32-tooth gear. Twins 26 dB below the mesh line. Their gap says which shaft is wobbling, and their height says how much.</p>
               <p>On the board: the spectrum in decibels, the pinion’s twins at ±25 Hz, and where the gear’s would be, at ±12.5 Hz.</p>`,
        draw(g, s, t, api) {
          const c = g.col, m = 2 * 10 ** (EX1.L / 20);
          const P = dbBoard(g, [[375, db(m / 2), c.blue], [400, 0, c.ink], [425, db(m / 2), c.orange]], [360, 440], freqTicks(null, [375, 387.5, 400, 412.5, 425]), t);
          [387.5, 412.5].forEach((f) => P.vline(f, { color: c.muted, dash: [3, 4] }));
          api.legend([['pinion twins, ±25 Hz', c.orange], ['where gear twins would sit, ±12.5 Hz', c.muted]]);
          api.verdict(`m = 2 × 10^(−26/20) = ${F(m, 3)}`, 'good');
        },
      },
      {
        part: 'Worked example 2',
        title: 'A broken rotor bar',
        text: `<p>A 4-pole motor on 50 Hz at 1,470 rpm. The slip is 2%, so a broken rotor bar puts twins at \\(50(1\\pm2s)\\) = 48 and 52 Hz in the supply current.</p>
               <p>The board shows where they sit (the height is an example). They are only 2 Hz from a line far bigger than them.</p>`,
        draw(g, s, t, api) {
          const c = g.col;
          dbBoard(g, [[48, -45, c.blue], [50, 0, c.ink], [52, -45, c.orange]], [45, 55], freqTicks(null, [46, 48, 50, 52, 54]), t);
          api.legend([['supply line, 50 Hz', c.ink], ['broken-bar twins (example level)', c.orange]]);
          api.verdict('gap = 2sf = 2 Hz: record more than 1 s, and in practice much longer', 'good');
        },
      },
      {
        part: 'Your turn',
        title: 'Try it with a calculator',
        tryLabel: 'Your answers',
        text: (s) => {
          if (!s.ex) newEx(s);
          const { z, rpm, L } = s.ex;
          return `<div class="problem"><p>A ${z}-tooth pinion runs at ${rpm} rpm. Around its mesh line there are twins ${L} dB below it, one pinion turn apart.</p>
                  <p>Find the mesh frequency, the lower twin’s frequency, the depth \\(m\\) of the size wobble, and the shortest record that shows the twins.</p></div>`;
        },
        controls: [
          { type: 'answer', label: 'Mesh frequency', unit: 'Hz', value: (s) => exNums(s).mesh, rel: 0.01 },
          { type: 'answer', label: 'Lower twin', unit: 'Hz', value: (s) => exNums(s).lower, rel: 0.01 },
          { type: 'answer', label: 'Depth \\(m\\)', unit: '', value: (s) => exNums(s).m, rel: 0.03 },
          { type: 'answer', label: 'Shortest record, \\(T\\)', unit: 's', value: (s) => exNums(s).T, rel: 0.03 },
          { type: 'check' },
          { type: 'button', label: 'Show working', action: (s, api) => { s.showSol = true; api.rewrite(); } },
          { type: 'button', label: 'New numbers', action: (s, api) => { newEx(s); api.refresh(); api.rewrite(); } },
        ],
        draw(g, s, t, api) {
          if (!s.ex) newEx(s);
          const c = g.col, E = exNums(s), span = 3 * E.fr;
          const ticks = [E.mesh - E.fr, E.mesh, E.mesh + E.fr].map((f, i) => [f, s.showSol ? `${F(f, 1)}${i === 2 ? ' Hz' : ''}` : '?']);
          dbBoard(g, [[E.mesh - E.fr, s.ex.L, c.blue], [E.mesh, 0, c.ink], [E.mesh + E.fr, s.ex.L, c.orange]], [E.mesh - span, E.mesh + span], ticks, t);
          api.legend([['mesh line', c.ink], ['twins, one pinion turn apart', c.orange]]);
        },
      },
      {
        part: 'Summary',
        title: 'On one card',
        text: `<p>Sidebands are a slow wobble written as sines and cosines. A size wobble gives a pair, a timing wobble a ladder; both sit the wobble’s frequency apart, around every harmonic. Uneven twins mean both. To see them, record more than two turns.</p>
               <p>Small and steady is normal. Growing or multiplying is a reason to look, and the gap says where.</p>`,
        draw(g, s, t, api) { gearBoard(g, t, api); },
      },
    ],
  });
})();
