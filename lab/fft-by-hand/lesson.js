// Lesson 4: an FFT by hand. Derive the formula from the Fourier series, see what it means,
// then solve two examples on a calculator with every operation shown, like class notes.
(function () {
  const { TAU, ease, integral } = Lab;
  const N = 8;
  const K = [...Array(N).keys()];
  const sig = (a1, b1, a2) => (t) => a1 * Math.cos(TAU * t) + b1 * Math.sin(TAU * t) + a2 * Math.cos(2 * TAU * t);
  const samples = (f) => K.map((k) => f(k / N));
  const dft = (x, n) => {
    let re = 0, im = 0;
    x.forEach((v, k) => { re += v * Math.cos(TAU * n * k / N); im -= v * Math.sin(TAU * n * k / N); });
    return { re: re / N, im: im / N };
  };
  // number formatting: up to d decimals, no "-0"; P() wraps negatives in brackets for sums
  const F = (v, d = 4) => {
    const r = +(+v).toFixed(d);
    return (Object.is(r, -0) || Math.abs(r) < 1e-12 ? 0 : r).toString();
  };
  const P = (v, d = 4) => (+F(v, d) < 0 ? `(${F(v, d)})` : F(v, d));
  const r = String.raw;

  // example 1: x = 0.6 cos + 0.8 sin + 0.5 cos 2   |   example 2: x = 0.4 + 2 cos(w t - 60 deg)
  const f1 = sig(0.6, 0.8, 0.5), x1 = samples(f1);
  const f2 = (t) => 0.4 + 2 * Math.cos(TAU * t - Math.PI / 3), x2 = samples(f2);

  // ---- sketches
  function waveWithSamples(g, f, xs, box = [0.06, 0.08, 0.9, 0.62], yr = 1.7) {
    const c = g.col;
    const Pl = g.plot({ box, x: [0, 1], y: [-yr, yr] });
    Pl.axes({ grid: K.slice(1).map((k) => k / N), ticks: [[0.5, 'T/2'], [1, 'T']] });
    Pl.curve(f, { color: c.muted, width: 1.6, dash: [5, 5] });
    xs.forEach((v, k) => {
      if (v === null) return;
      const ctx = g.ctx;
      ctx.strokeStyle = c.blue; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(Pl.X(k / N), Pl.Y(0)); ctx.lineTo(Pl.X(k / N), Pl.Y(v)); ctx.stroke();
      Pl.dot(k / N, v, { color: c.blue, r: 5 });
      g.text(`x${k}`, Pl.X(k / N), Pl.Y(0) + (v >= 0 ? 14 : -10), { size: 11, color: c.muted });
    });
    return Pl;
  }

  // the winding machine: each sample becomes an arrow at angle -2πnk/N; the dot is their average
  function winding(g, xs, n, t, cx, cy, R, scale = 1.4) {
    const c = g.col, ctx = g.ctx;
    ctx.strokeStyle = c.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - R * 1.15, cy); ctx.lineTo(cx + R * 1.15, cy);
    ctx.moveTo(cx, cy - R * 1.15); ctx.lineTo(cx, cy + R * 1.15); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    g.text('Re', cx + R * 1.15, cy - 10, { size: 11 }); g.text('Im', cx + 12, cy - R * 1.12, { size: 11 });
    const grow = ease(t / 1.2);
    let sre = 0, sim = 0;
    xs.forEach((v, k) => {
      const ang = -TAU * n * k / N * grow;
      const px = v * Math.cos(ang), py = v * Math.sin(ang);
      sre += px; sim += py;
      ctx.strokeStyle = c.blue; ctx.globalAlpha = 0.55; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + px / scale * R, cy - py / scale * R); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = c.blue; ctx.beginPath(); ctx.arc(cx + px / scale * R, cy - py / scale * R, 4, 0, TAU); ctx.fill();
    });
    const re = sre / N, im = sim / N;
    const dx = cx + re / scale * R, dy = cy - im / scale * R;
    ctx.strokeStyle = c.orange; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(dx, dy); ctx.stroke();
    ctx.fillStyle = c.orange; ctx.beginPath(); ctx.arc(dx, dy, 7, 0, TAU); ctx.fill();
    return { re, im };
  }

  // one complex number X = re + i im as an arrow, with its real (blue) and imaginary (green) parts
  function phasor(g, re, im, cx, cy, R, scale, labels = true) {
    const c = g.col, ctx = g.ctx;
    ctx.strokeStyle = c.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - R * 1.2, cy); ctx.lineTo(cx + R * 1.2, cy); ctx.moveTo(cx, cy - R * 1.2); ctx.lineTo(cx, cy + R * 1.2); ctx.stroke();
    g.text('Re', cx + R * 1.2, cy - 10, { size: 11 }); g.text('Im', cx + 12, cy - R * 1.17, { size: 11 });
    const dx = cx + re / scale * R, dy = cy - im / scale * R;
    ctx.setLineDash([4, 4]); ctx.strokeStyle = c.good; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(dx, cy); ctx.lineTo(dx, dy); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = c.blue; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(dx, cy); ctx.stroke();
    ctx.strokeStyle = c.orange; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(dx, dy); ctx.stroke();
    ctx.fillStyle = c.orange; ctx.beginPath(); ctx.arc(dx, dy, 7, 0, TAU); ctx.fill();
    const a = Math.atan2(im, re);
    ctx.strokeStyle = c.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.2, 0, -a, a > 0); ctx.stroke();       // canvas y points down
    if (labels) {
      g.text('½aₙ', (cx + dx) / 2, cy + (im < 0 ? -12 : 14), { size: 12, color: c.blue });
      g.text('−½bₙ', dx + 30, (cy + dy) / 2, { size: 12, color: c.good });
      g.text('θₙ', cx + R * 0.32 * Math.cos(a / 2), cy - R * 0.32 * Math.sin(a / 2), { size: 12, color: c.ink });
    }
  }

  // a product of two functions over one period, shaded positive / negative, with its integral
  function productBoard(g, f, h, api, labels) {
    const c = g.col;
    const Pl = g.plot({ box: [0.06, 0.1, 0.9, 0.62], x: [0, 1], y: [-1.35, 1.35] });
    Pl.axes({ ticks: [[0.5, 'T/2'], [1, 'T']] });
    const prod = (t) => f(t) * h(t);
    Pl.area(prod, { alpha: 0.3 });
    Pl.curve(f, { color: c.blue, width: 1.3, alpha: 0.55 });
    Pl.curve(h, { color: c.muted, width: 1.3, dash: [4, 4] });
    Pl.curve(prod, { color: c.orange, width: 2.6, glow: true });
    api.legend(labels);
    return integral(prod, 0, 1);
  }

  // ---- worked-example helpers (every operation written out)
  const deg = (k, n = 1) => (45 * n * k) % 360;           // angles reduced to one turn
  const table = (xs, n) => r`\begin{array}{c|c|r|r|r|r|r} k & ${n === 1 ? r`\theta_k` : n + r`\theta_k`} & x_k & \cos & \sin & x_k\cos & x_k\sin \\ \hline ` +
    xs.map((v, k) => {
      const ct = Math.cos(TAU * n * k / N), st = Math.sin(TAU * n * k / N);
      return `${k} & ${deg(k, n)}^\\circ & ${F(v)} & ${F(ct)} & ${F(st)} & ${F(v * ct)} & ${F(v * st)}`;
    }).join(r` \\ `) + r` \end{array}`;
  const sums = (xs, n) => {
    let sc = 0, ss = 0;
    xs.forEach((v, k) => { sc += v * Math.cos(TAU * n * k / N); ss += v * Math.sin(TAU * n * k / N); });
    return { sc, ss };
  };
  const sumLine = (xs, n, trig) => {
    const fn = trig === 'cos' ? Math.cos : Math.sin;
    const terms = xs.map((v, k) => v * fn(TAU * n * k / N));
    const tot = terms.reduce((a, b) => a + b, 0);
    const ang = n === 1 ? r`\theta_k` : n + r`\theta_k`;
    return r`\sum_k x_k\${trig} ${ang}=` + terms.map((v, i) => (i ? P(v) : F(v))).join('+') + `=${F(tot)}`;
  };

  // ---- calculator exercise
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const newEx = (s) => {
    s.ex = { a1: pick([0.3, 0.4, 0.5, 0.6, 0.8, 1.0, 1.2]) * pick([1, -1]), b1: pick([0.2, 0.4, 0.5, 0.6, 0.9, 1.1]),
             a2: pick([0.2, 0.3, 0.4, 0.5]) };
    s.showSol = false;
  };

  // ---- the working, as in class: sentences ('>'), equations, notes, equation numbers, 'box' for results
  const WORK = [];

  // 1. Goal
  WORK.push([
    ['>By the end of this lesson we will have derived, line by line, the formula an FFT computes for every frequency bin:'],
    [r`X_n=\frac{1}{N}\sum_{k=0}^{N-1}x_k\,e^{-i\,2\pi nk/N}`, '← where we are heading', '', 'box'],
    ['>and what its two parts mean for a vibration: the real and imaginary parts, the size you read on an analyser, and the phase.'],
    [r`X_n=\tfrac12\,(a_n-i\,b_n),\qquad 2|X_n|=c_n,\qquad \theta_n=\arg X_n`, '', '', 'box'],
    ['>Then we use it twice on a calculator, with every operation shown.'],
  ]);

  // 2. What we already know
  WORK.push([
    ['>As we know, any signal that repeats every \\(T\\) seconds can be written as a Fourier series: a constant plus cosines and sines at whole multiples of the running speed:'],
    [r`x(t)=a_0+\sum_{m=1}^{\infty}\big[a_m\cos(m\omega_0 t)+b_m\sin(m\omega_0 t)\big],\qquad \omega_0=\frac{2\pi}{T}`, '← the harmonics', 1],
    ['>From trigonometry, a product of two cosines or sines turns into a sum:'],
    [r`\cos A\cos B=\tfrac12\big[\cos(A-B)+\cos(A+B)\big]`, '', 2],
    [r`\sin A\cos B=\tfrac12\big[\sin(A+B)+\sin(A-B)\big]`, '', 3],
    [r`\sin A\sin B=\tfrac12\big[\cos(A-B)-\cos(A+B)\big]`, '', 4],
    ['>Over one period, a whole number \\(p\\neq0\\) of cosine or sine cycles has zero net area (the board shows it):'],
    [r`\int_0^T\cos(p\,\omega_0 t)\,dt=0,\qquad \int_0^T\sin(p\,\omega_0 t)\,dt=0\qquad (p=\pm1,\pm2,\dots)`, '← ups and downs cancel', 5],
    ['>And for \\(p=0\\), \\(\\cos 0=1\\) and \\(\\sin 0=0\\):'],
    [r`\int_0^T\cos(0)\,dt=\int_0^T 1\,dt=T`, '', 6],
    ['>Finally, Euler’s formula:'],
    [r`e^{i\theta}=\cos\theta+i\sin\theta,\qquad e^{-i\theta}=\cos\theta-i\sin\theta`, '', 7],
  ]);

  // 3. Orthogonality
  WORK.push([
    ['>Take two harmonics, \\(n\\) and \\(m\\) (whole numbers, both at least 1), and integrate their product over one period. Using (2) with \\(A=n\\omega_0t\\), \\(B=m\\omega_0t\\):'],
    [r`\int_0^T\cos(n\omega_0t)\cos(m\omega_0t)\,dt=\tfrac12\int_0^T\cos\big((n-m)\omega_0t\big)dt+\tfrac12\int_0^T\cos\big((n+m)\omega_0t\big)dt`, '', 8],
    ['>\\(n+m\\geq2\\), so the second integral is 0 by (5). The first is also 0 by (5), unless \\(n=m\\): then it is \\(\\cos 0\\), which gives \\(T\\) by (6). So'],
    [r`\int_0^T\cos(n\omega_0t)\cos(m\omega_0t)\,dt=\begin{cases}T/2, & n=m\\ 0, & n\neq m\end{cases}`, '', 9],
    ['>Exactly the same steps with (4) and (3):'],
    [r`\int_0^T\sin(n\omega_0t)\sin(m\omega_0t)\,dt=\begin{cases}T/2, & n=m\\ 0, & n\neq m\end{cases}`, '', 10],
    [r`\int_0^T\sin(n\omega_0t)\cos(m\omega_0t)\,dt=0\quad\text{for all }n,m`, '← by (3): both terms are sines, 0 by (5)', 11],
    ['>This is called orthogonality: two different harmonics, or a sine and a cosine, multiply to zero net area. Only a harmonic times itself survives.'],
  ]);

  // 4. Picking out a_n and b_n
  WORK.push([
    ['>Multiply both sides of (1) by \\(\\cos(n\\omega_0t)\\), for one chosen \\(n\\geq1\\), and integrate over one period:'],
    [r`\int_0^T x\cos(n\omega_0t)\,dt=a_0\!\int_0^T\!\cos(n\omega_0t)\,dt+\sum_m\Big[a_m\!\int_0^T\!\cos(m\omega_0t)\cos(n\omega_0t)\,dt+b_m\!\int_0^T\!\sin(m\omega_0t)\cos(n\omega_0t)\,dt\Big]`, '', 12],
    ['>Term by term: the \\(a_0\\) term is 0 by (5). Every \\(b_m\\) term is 0 by (11). Every \\(a_m\\) term is 0 by (9), except \\(m=n\\), which gives \\(a_n\\cdot T/2\\):'],
    [r`\int_0^T x(t)\cos(n\omega_0t)\,dt=a_n\,\frac{T}{2}`, '← one term survives', 13],
    ['>Divide both sides by \\(T/2\\):'],
    [r`a_n=\frac{2}{T}\int_0^T x(t)\cos(n\omega_0t)\,dt`, '', 14],
    ['>Multiplying (1) by \\(\\sin(n\\omega_0t)\\) instead, (10) and (11) leave only \\(b_n\\):'],
    [r`b_n=\frac{2}{T}\int_0^T x(t)\sin(n\omega_0t)\,dt`, '', 15],
    ['>And integrating (1) as it is, (5) removes every harmonic and (6) leaves \\(a_0T\\):'],
    [r`a_0=\frac{1}{T}\int_0^T x(t)\,dt`, '← the average (DC)', 16],
  ]);

  // 5. One complex number
  WORK.push([
    ['>That is two integrals per harmonic. Euler’s formula packs them into one complex number. Define'],
    [r`X_n=\frac{1}{T}\int_0^T x(t)\,e^{-i\,n\omega_0 t}\,dt`, '← the winding machine from the video', 17],
    ['>Substitute \\(e^{-i\\theta}\\) from (7) with \\(\\theta=n\\omega_0t\\), and split the integral:'],
    [r`X_n=\frac{1}{T}\int_0^T x(t)\cos(n\omega_0t)\,dt\;-\;i\,\frac{1}{T}\int_0^T x(t)\sin(n\omega_0t)\,dt`, '', 18],
    ['>Compare with (14) and (15): \\(\\tfrac1T\\) is half of \\(\\tfrac2T\\), so each integral is half a coefficient:'],
    [r`X_n=\tfrac12\,a_n-i\,\tfrac12\,b_n=\tfrac12\,(a_n-i\,b_n)`, '← Re: cosine, Im: minus sine', 19, 'box'],
    ['>Now the size and the phase. Write the \\(n\\)th harmonic as one cosine with amplitude \\(c_n\\) and phase \\(\\theta_n\\), and expand it with \\(\\cos(A+B)=\\cos A\\cos B-\\sin A\\sin B\\):'],
    [r`c_n\cos(n\omega_0t+\theta_n)=c_n\cos\theta_n\cos(n\omega_0t)-c_n\sin\theta_n\sin(n\omega_0t)`, '', 20],
    ['>Match the cosine and sine terms with \\(a_n\\cos+b_n\\sin\\) in (1):'],
    [r`a_n=c_n\cos\theta_n,\qquad b_n=-c_n\sin\theta_n`, '', 21],
    ['>Square and add (using \\(\\cos^2+\\sin^2=1\\)), then divide the second by the first, and compare with (19):'],
    [r`c_n=\sqrt{a_n^2+b_n^2}=2\,|X_n|,\qquad \tan\theta_n=\frac{-b_n}{a_n}=\frac{\operatorname{Im}X_n}{\operatorname{Re}X_n}`, '← θₙ is the angle of Xₙ', 22, 'box'],
  ]);

  // 6. From the integral to the sum
  WORK.push([
    ['>An analyser never has the curve, only samples. Take \\(N\\) equally spaced samples in one period:'],
    [r`t_k=\frac{kT}{N},\qquad x_k=x(t_k),\qquad dt\to\frac{T}{N},\qquad k=0,1,\dots,N-1`, '', 23],
    ['>In (17), the integral becomes a sum of \\(N\\) thin rectangles, each \\(T/N\\) wide:'],
    [r`X_n=\frac{1}{T}\sum_{k=0}^{N-1}x_k\,e^{-i\,n\omega_0\,kT/N}\cdot\frac{T}{N}`, '', 24],
    ['>The \\(T\\)’s cancel, and \\(\\omega_0T=2\\pi\\) from (1):'],
    [r`X_n=\frac{1}{N}\sum_{k=0}^{N-1}x_k\,e^{-i\,2\pi nk/N}`, '← the DFT. An FFT is a fast way to compute it.', 25, 'box'],
    ['>If every harmonic in the signal lies below \\(N/2\\), sampled sines and cosines are orthogonal too, and (25) gives exactly the same \\(X_n\\) as the integral.'],
    ['>Split (25) with (7), as in (18), into two sums you can do on a calculator, with \\(\\theta_k=2\\pi k/N\\):'],
    [r`\operatorname{Re}X_n=\frac{1}{N}\sum_k x_k\cos(n\theta_k)`, '', 26],
    [r`\operatorname{Im}X_n=-\frac{1}{N}\sum_k x_k\sin(n\theta_k)`, '← note the minus sign', 27],
  ]);

  // 7. The mirror
  WORK.push([
    ['>What about the bins above \\(N/2\\)? Put \\(n\\to N-n\\) in (25) and split the exponent:'],
    [r`X_{N-n}=\frac{1}{N}\sum_k x_k\,e^{-i2\pi(N-n)k/N}=\frac{1}{N}\sum_k x_k\,e^{-i2\pi k}\,e^{+i2\pi nk/N}`, '', 28],
    ['>\\(k\\) is a whole number, so by (7) \\(e^{-i2\\pi k}=\\cos2\\pi k-i\\sin2\\pi k=1-0=1\\):'],
    [r`X_{N-n}=\frac{1}{N}\sum_k x_k\,e^{+i2\pi nk/N}`, '', 29],
    ['>The samples \\(x_k\\) are real, so this is (25) with the sign of \\(i\\) flipped: the complex conjugate.'],
    [r`X_{N-n}=\overline{X_n}`, '← same size, opposite angle', 30, 'box'],
    ['>So the top half adds nothing new. Each harmonic’s size \\(c_n\\) is shared between \\(X_n\\) and its mirror, which is why the peak is \\(2|X_n|\\) in (22). Bin 0 is its own partner, so it is not doubled: by (16) and (17), \\(X_0=a_0\\).'],
  ]);

  // 8. What it means: wind the samples
  WORK.push([
    ['>Read (25) as a picture: each sample \\(x_k\\) becomes an arrow of length \\(x_k\\) at angle \\(-2\\pi nk/N\\), and \\(X_n\\) is the average of the \\(N\\) arrows (the orange dot).'],
    ['>When \\(n\\) matches a harmonic in the signal, the arrows pile up on one side and the dot moves out. Otherwise orthogonality, (9) to (11), makes them cancel.'],
  ]);

  // 9. Example 1: sampling
  WORK.push([
    ['>Worked example 1. Find the spectrum of'],
    [r`x(t)=0.6\cos(\omega_0 t)+0.8\sin(\omega_0 t)+0.5\cos(2\omega_0 t)`, '← a₁ = 0.6, b₁ = 0.8, a₂ = 0.5', 31],
    ['>Use \\(N=8\\). By (23), \\(\\theta_k=2\\pi k/8\\): steps of 45°.'],
    [r`\theta_k=0^\circ,\ 45^\circ,\ 90^\circ,\ 135^\circ,\ 180^\circ,\ 225^\circ,\ 270^\circ,\ 315^\circ`, '', 32],
    ['>Put each angle into (31): \\(x_k=0.6\\cos\\theta_k+0.8\\sin\\theta_k+0.5\\cos2\\theta_k\\). Every operation (4 decimal places):'],
    ...x1.map((v, k) => {
      const c = Math.cos(TAU * k / N), s = Math.sin(TAU * k / N), c2 = Math.cos(2 * TAU * k / N);
      return [r`x_${k}=0.6(${F(c)})+0.8(${F(s)})+0.5(${F(c2)})=${F(0.6 * c)}+${P(0.8 * s)}+${P(0.5 * c2)}=${F(v)}`, `θ = ${deg(k)}°, 2θ = ${deg(k, 2)}°`];
    }),
  ]);

  // 10. Example 1: bin 1
  {
    const { sc, ss } = sums(x1, 1), re = sc / N, im = -ss / N;
    WORK.push([
      ['>Bin \\(n=1\\). Multiply each sample by \\(\\cos\\theta_k\\) and by \\(\\sin\\theta_k\\):'],
      [table(x1, 1), ''],
      ['>Add each product column, term by term:'],
      [sumLine(x1, 1, 'cos'), '', 33],
      [sumLine(x1, 1, 'sin'), '', 34],
      ['>Divide by \\(N=8\\) using (26) and (27). Mind the minus sign in (27):'],
      [r`\operatorname{Re}X_1=\frac{${F(sc)}}{8}=${F(re)},\qquad \operatorname{Im}X_1=-\frac{${F(ss)}}{8}=${F(im)}`, '', 35],
      [r`X_1=0.3-0.4\,i`, '← one bin, two numbers', 36],
      ['>The size, by (22):'],
      [r`2|X_1|=2\sqrt{0.3^2+(-0.4)^2}=2\sqrt{0.09+0.16}=2\sqrt{0.25}=2(0.5)=1.0`, '← the 1X peak', 37],
      ['>The phase, by (22). Re is positive and Im is negative, so the arrow is in the fourth quadrant and the calculator’s answer is the right one:'],
      [r`\theta_1=\tan^{-1}\Big(\frac{-0.4}{0.3}\Big)=\tan^{-1}(-1.3333)=-53.13^\circ`, '', 38],
      ['>Check with (19), using \\(a_1=0.6,\\ b_1=0.8\\) from (31):'],
      [r`\tfrac12\,(0.6-0.8\,i)=0.3-0.4\,i\ \checkmark`, '← the FFT found a₁ and b₁'],
      ['>So the 1X part of (31) is \\(1.0\\cos(\\omega_0t-53.13^\\circ)\\): size from (37), timing from (38).'],
    ]);
  }

  // 11. Example 1: bins 2, 3 and 7
  {
    const b2 = sums(x1, 2), b3 = sums(x1, 3);
    WORK.push([
      ['>Bin \\(n=2\\): the angles are now \\(2\\theta_k\\), steps of 90°.'],
      [table(x1, 2), ''],
      [sumLine(x1, 2, 'cos'), '', 39],
      [sumLine(x1, 2, 'sin'), '', 40],
      [r`X_2=\frac{${F(b2.sc)}}{8}-i\,\frac{${F(b2.ss)}}{8}=0.25,\qquad 2|X_2|=0.5,\qquad \theta_2=0^\circ`, '← a pure cosine of 0.5 at 2X, as in (31) ✓', 41],
      ['>Bin \\(n=3\\): steps of 135°. There is no 3X in (31), so the products cancel, exactly as orthogonality (9) to (11) says:'],
      [sumLine(x1, 3, 'cos'), ''],
      [sumLine(x1, 3, 'sin'), ''],
      [r`X_3=\frac{${F(b3.sc)}}{8}-i\,\frac{${F(b3.ss)}}{8}=0`, '', 42],
      ['>Bin \\(n=7=N-1\\): no need to add anything up. By the mirror rule (30), with (36):'],
      [r`X_7=\overline{X_1}=0.3+0.4\,i`, '← same size, opposite angle', 43],
      ['>The one-sided spectrum an analyser shows: a peak of 1.0 at 1X with phase −53.13°, and 0.5 at 2X with phase 0°.'],
    ]);
  }

  // 12. Example 2: expand and sample
  WORK.push([
    ['>Worked example 2. A sensor with a small offset reads'],
    [r`x(t)=0.4+2\cos(\omega_0 t-60^\circ)`, '← offset, plus 1X with a phase', 44],
    ['>This is not yet in the form (1). Expand with \\(\\cos(A-B)=\\cos A\\cos B+\\sin A\\sin B\\):'],
    [r`2\cos(\omega_0t-60^\circ)=2\cos60^\circ\cos(\omega_0t)+2\sin60^\circ\sin(\omega_0t)=2(0.5)\cos(\omega_0t)+2(0.8660)\sin(\omega_0t)`, '', 45],
    [r`x(t)=0.4+1.0\cos(\omega_0t)+1.7321\sin(\omega_0t)`, '← a₀ = 0.4, a₁ = 1.0, b₁ = 1.7321', 46],
    ['>So, before doing any sums, (19) and (16) predict'],
    [r`X_0=0.4,\qquad X_1=\tfrac12(1.0-1.7321\,i)=0.5-0.8660\,i`, '← now check it the hard way', 47],
    ['>Sample at the angles (32): \\(x_k=0.4+2\\cos(\\theta_k-60^\\circ)\\). Every operation:'],
    ...x2.map((v, k) => {
      const a = deg(k) - 60, c = Math.cos(a * Math.PI / 180);
      return [r`x_${k}=0.4+2\cos(${a}^\circ)=0.4+2(${F(c)})=0.4+${P(2 * c)}=${F(v)}`, ''];
    }),
  ]);

  // 13. Example 2: bins 0 and 1
  {
    const b0 = x2.reduce((a, b) => a + b, 0), b1 = sums(x2, 1), re = b1.sc / N, im = -b1.ss / N;
    WORK.push([
      ['>Bin \\(n=0\\): every angle is 0, \\(\\cos0=1\\) and \\(\\sin0=0\\), so (26) is just the average of the samples:'],
      [r`X_0=\frac{1}{8}\big(` + x2.map((v, i) => (i ? P(v) : F(v))).join('+') + r`\big)=\frac{${F(b0)}}{8}=${F(b0 / N)}`, '← the offset a₀ (no mirror, not doubled)', 48],
      ['>Bin \\(n=1\\):'],
      [table(x2, 1), ''],
      [sumLine(x2, 1, 'cos'), '', 49],
      [sumLine(x2, 1, 'sin'), '', 50],
      [r`\operatorname{Re}X_1=\frac{${F(b1.sc)}}{8}=${F(re)},\qquad \operatorname{Im}X_1=-\frac{${F(b1.ss)}}{8}=${F(im)}`, '', 51],
      ['>Size and phase by (22). Fourth quadrant again (Re > 0, Im < 0):'],
      [r`2|X_1|=2\sqrt{0.5^2+(-0.866)^2}=2\sqrt{0.25+0.75}=2\sqrt{1}=2.0`, '', 52],
      [r`\theta_1=\tan^{-1}\Big(\frac{-0.866}{0.5}\Big)=\tan^{-1}(-1.7321)=-60^\circ`, '', 53],
      ['>Both match (44): from 8 numbers the FFT recovers the offset 0.4, the 1X size 2.0 and the phase −60°. ✓'],
    ]);
  }

  // 14. Your turn
  WORK.push((s) => {
    if (!s.ex) newEx(s);
    const { a1, b1, a2 } = s.ex;
    const f = sig(a1, b1, a2), xs = samples(f);
    const given = [
      ['>Your turn. The signal is'],
      [r`x(t)=${a1}\cos(\omega_0 t)+${b1}\sin(\omega_0 t)+${a2}\cos(2\omega_0 t)`, '← sample it 8 times per turn', 54],
    ];
    if (!s.showSol) return given;
    const { sc, ss } = sums(xs, 1);
    const re = sc / N, im = -ss / N, mag = 2 * Math.hypot(re, im), ph = Math.atan2(im, re) * 180 / Math.PI;
    return [
      ...given,
      ['>Samples at the angles (32), then the products for bin 1, as in example 1:'],
      [table(xs, 1), ''],
      [sumLine(xs, 1, 'cos'), ''],
      [sumLine(xs, 1, 'sin'), ''],
      ['>Using (26) and (27):'],
      [r`\operatorname{Re}X_1=\frac{${F(sc, 3)}}{8}=${F(re, 3)},\qquad \operatorname{Im}X_1=-\frac{${F(ss, 3)}}{8}=${F(im, 3)}`, '', 55],
      ['>The size, by (22):'],
      [r`2|X_1|=2\sqrt{${P(re, 3)}^2+${P(im, 3)}^2}=${F(mag, 3)}`, ''],
      ['>The phase, by (22). Watch the quadrant: use the signs of Re and Im.'],
      [r`\theta_1=\tan^{-1}\Big(\frac{${F(im, 3)}}{${F(re, 3)}}\Big)=${F(ph, 1)}^\circ`, re < 0 ? '← Re < 0: the calculator is 180° out, add or subtract 180°' : ''],
      ['>Check with (19):'],
      [r`\tfrac12\big(${a1}-${b1}\,i\big)=${F(a1 / 2, 3)}${b1 / 2 >= 0 ? '-' : '+'}${F(Math.abs(b1 / 2), 3)}\,i\ \checkmark`, ''],
    ];
  });

  // 15. Summary
  WORK.push([
    ['>Everything in this lesson on one card:'],
    [r`X_n=\frac{1}{N}\sum_{k=0}^{N-1}x_k\,e^{-i2\pi nk/N}`, '← the DFT, from (25)', '', 'box'],
    [r`X_n=\tfrac12(a_n-i\,b_n),\qquad X_0=a_0`, '← from (19) and (16)', '', 'box'],
    [r`\text{peak}=2|X_n|=\sqrt{a_n^2+b_n^2},\qquad \theta_n=\arg X_n`, '← from (22)', '', 'box'],
    [r`X_{N-n}=\overline{X_n}`, '← the mirror, from (30)', '', 'box'],
    ['>Size tells you how much. Phase tells you where and why.'],
  ]);

  Lab.lesson({
    work: WORK,
    heads: true,
    next: '../',
    state: { n: 1, pf: 'cos', pp: 1, on: 1, om: 2, oc: 'cc', pn: 1, pt: 'cos', n2: 1 },
    steps: [
      {
        part: 'Goal',
        title: 'Where we are going',
        text: `<p>An analyser turns 8, 1024 or 65 536 samples into a spectrum. This lesson derives the formula it uses, from scratch, the way you would in a maths class.</p>
               <p>Then we solve two examples on a calculator, every operation written out, and you try one yourself.</p>
               <p class="hint">The working builds up below the board. Click any heading there to fold it away.</p>`,
        draw(g, s, t, api) {
          waveWithSamples(g, f1, x1.map((v, k) => (k <= Math.floor(t * 4) ? v : null)));
          api.legend([['a machine signal', g.col.muted], ['8 samples', g.col.blue]]);
        },
      },
      {
        part: 'What we already know',
        title: 'The tools',
        text: `<p>Four facts carry the whole derivation: the Fourier series (1), three product-to-sum identities (2)–(4), zero net area over whole cycles (5)–(6), and Euler’s formula (7).</p>
               <p>On the board: any whole number of cycles has as much area above the line as below. Change the number of cycles.</p>`,
        controls: [
          { type: 'choice', key: 'pf', options: [['cos', 'cos(pω₀t)'], ['sin', 'sin(pω₀t)']] },
          { type: 'range', key: 'pp', label: 'Cycles p', min: 1, max: 5, step: 1, fmt: (v) => `p = ${v}` },
        ],
        draw(g, s, t, api) {
          const c = g.col, fn = s.pf === 'cos' ? Math.cos : Math.sin, f = (tt) => fn(TAU * s.pp * tt);
          const Pl = g.plot({ box: [0.06, 0.1, 0.9, 0.62], x: [0, 1], y: [-1.35, 1.35] });
          Pl.axes({ ticks: [[0.5, 'T/2'], [1, 'T']] });
          Pl.area(f, { alpha: 0.3 });
          Pl.curve(f, { color: c.blue, width: 2.6, glow: true });
          api.legend([['area above', c.good], ['area below', c.bad]]);
          api.verdict(`∫₀ᵀ ${s.pf}(${s.pp}ω₀t) dt = ${F(integral(f, 0, 1), 3)}`, 'good');
        },
      },
      {
        part: 'Derivation',
        title: 'Orthogonality',
        text: `<p>The key fact: multiply two different harmonics and the result has zero net area over a period. Multiply a harmonic by itself and you get \\(T/2\\).</p>
               <p>Set \\(n\\) and \\(m\\) on the board. The orange curve is their product; the green and red areas cancel unless \\(n=m\\).</p>`,
        controls: [
          { type: 'choice', key: 'oc', options: [['cc', 'cos × cos'], ['ss', 'sin × sin'], ['sc', 'sin × cos']] },
          { type: 'range', key: 'on', label: 'Harmonic n', min: 1, max: 4, step: 1, fmt: (v) => `n = ${v}` },
          { type: 'range', key: 'om', label: 'Harmonic m', min: 1, max: 4, step: 1, fmt: (v) => `m = ${v}` },
        ],
        draw(g, s, t, api) {
          const c = g.col;
          const fa = s.oc === 'cc' ? Math.cos : Math.sin, fb = s.oc === 'ss' ? Math.sin : Math.cos;
          const nm = { cc: ['cos', 'cos'], ss: ['sin', 'sin'], sc: ['sin', 'cos'] }[s.oc];
          const v = productBoard(g, (tt) => fa(TAU * s.on * tt), (tt) => fb(TAU * s.om * tt), api,
            [[`${nm[0]}(${s.on}ω₀t)`, c.blue], [`${nm[1]}(${s.om}ω₀t)`, c.muted], ['product', c.orange]]);
          api.verdict(`∫₀ᵀ product dt = ${F(v, 3)} T${Math.abs(v - 0.5) < 1e-3 ? '  = T/2' : ''}`, 'good');
        },
      },
      {
        part: 'Derivation',
        title: 'Picking out one harmonic',
        text: `<p>Multiply the whole signal by \\(\\cos(n\\omega_0t)\\) and integrate. By orthogonality, every harmonic except the \\(n\\)th drops out, which leaves \\(a_n\\).</p>
               <p>On the board, the signal from example 1 times \\(\\cos(n\\omega_0t)\\) or \\(\\sin(n\\omega_0t)\\). The net area, times \\(2/T\\), is the coefficient.</p>`,
        controls: [
          { type: 'choice', key: 'pt', options: [['cos', '× cos(nω₀t) → aₙ'], ['sin', '× sin(nω₀t) → bₙ']] },
          { type: 'range', key: 'pn', label: 'Harmonic n', min: 1, max: 3, step: 1, fmt: (v) => `n = ${v}` },
        ],
        draw(g, s, t, api) {
          const c = g.col, fn = s.pt === 'cos' ? Math.cos : Math.sin;
          const v = productBoard(g, f1, (tt) => fn(TAU * s.pn * tt), api,
            [['x(t)', c.blue], [`${s.pt}(${s.pn}ω₀t)`, c.muted], ['product', c.orange]]);
          api.verdict(`${s.pt === 'cos' ? 'a' : 'b'}${s.pn} = (2/T)∫ = ${F(2 * v, 3)}`, 'good');
        },
      },
      {
        part: 'Derivation',
        title: 'One complex number',
        text: `<p>Euler’s formula combines the cosine integral and the sine integral into one complex number, \\(X_n\\). Its real part is half of \\(a_n\\); its imaginary part is minus half of \\(b_n\\).</p>
               <p>Written as one cosine, \\(c_n\\cos(n\\omega_0t+\\theta_n)\\), the harmonic’s size is twice the arrow’s length and its phase is the arrow’s angle.</p>`,
        draw(g, s, t, api) {
          const c = g.col, R = Math.min(g.h * 0.38, g.w * 0.22);
          phasor(g, 0.3 * ease(t / 1.2), -0.4 * ease(t / 1.2), g.w * 0.42, g.h * 0.45, R, 0.55);
          api.legend([['Re Xₙ = ½aₙ', c.blue], ['Im Xₙ = −½bₙ', c.good], ['Xₙ', c.orange]]);
        },
      },
      {
        part: 'Derivation',
        title: 'From the integral to a sum',
        text: `<p>An analyser has samples, not a curve. Replace the integral by \\(N\\) thin rectangles, one per sample, and it becomes the DFT, the formula every FFT computes.</p>
               <p>On the board, the area under \\(x(t)\\cos(\\omega_0t)\\) and the 8 rectangles give the same answer.</p>`,
        draw(g, s, t, api) {
          const c = g.col, ctx = g.ctx;
          const prod = (tt) => f1(tt) * Math.cos(TAU * tt);
          const Pl = g.plot({ box: [0.06, 0.1, 0.9, 0.62], x: [0, 1], y: [-1.35, 1.35] });
          Pl.axes({ grid: K.slice(1).map((k) => k / N), ticks: [[0.5, 'T/2'], [1, 'T']] });
          Pl.area(prod, { alpha: 0.18 });
          const show = Math.min(N, Math.floor(t * 4) + 1);
          for (let k = 0; k < show; k++) {
            const v = prod(k / N);
            ctx.fillStyle = c.blue; ctx.globalAlpha = 0.28;
            ctx.fillRect(Pl.X(k / N), Math.min(Pl.Y(v), Pl.Y(0)), Pl.X(1 / N) - Pl.X(0), Math.abs(Pl.Y(v) - Pl.Y(0)));
            ctx.globalAlpha = 1; ctx.strokeStyle = c.blue; ctx.lineWidth = 1.5;
            ctx.strokeRect(Pl.X(k / N), Math.min(Pl.Y(v), Pl.Y(0)), Pl.X(1 / N) - Pl.X(0), Math.abs(Pl.Y(v) - Pl.Y(0)));
          }
          Pl.curve(prod, { color: c.orange, width: 2.4 });
          api.legend([['x(t)·cos(ω₀t)', c.orange], ['8 rectangles', c.blue]]);
          api.verdict(`(1/T)∫ = ${F(integral(prod, 0, 1), 3)}    (1/N)Σ = ${F(sums(x1, 1).sc / N, 3)}`, 'good');
        },
      },
      {
        part: 'Derivation',
        title: 'Why half is a mirror',
        text: `<p>Bin \\(N-n\\) is bin \\(n\\) wound the other way: the complex conjugate. It carries no new information, so analysers drop the top half and double the rest.</p>
               <p>Slide through the bins: 7 mirrors 1, 6 mirrors 2.</p>`,
        controls: [{ type: 'range', key: 'n', label: 'Bin n', min: 0, max: 7, step: 1, fmt: (v) => `n = ${v}`, onInput: (s, api) => api.restart() }],
        draw(g, s, t, api) {
          const c = g.col, R = Math.min(g.h * 0.36, g.w * 0.18);
          const X = winding(g, x1, s.n, t, g.w * 0.22, g.h * 0.45, R);
          const B = g.plot({ box: [0.48, 0.1, 0.48, 0.7], x: [-0.6, 7.6], y: [0, 0.6] });
          const mags = K.map((n) => { const d = dft(x1, n); return Math.hypot(d.re, d.im); });
          B.bars(mags, { labels: false, color: (k) => (k === s.n ? c.orange : k >= 4 ? c.muted : c.blue) });
          K.forEach((n) => g.text(`X${n}`, B.X(n), B.Y(0) + 13, { size: 11 }));
          api.legend([['|Xₙ| for every bin', c.blue], ['mirror half', c.muted]]);
          api.verdict(`X${s.n} = ${F(X.re, 3)} ${X.im < 0 ? '−' : '+'} ${F(Math.abs(X.im), 3)} i`, '');
        },
      },
      {
        part: 'What it means',
        title: 'Wind the samples',
        text: `<p>Equation (25) as a picture. Each sample becomes an arrow at angle \\(-2\\pi nk/8\\), and the orange dot is their average: \\(X_n\\).</p>
               <p>Try \\(n=1\\) and \\(n=2\\) (the signal has those), then \\(n=3\\) (it doesn’t).</p>`,
        controls: [{ type: 'range', key: 'n', label: 'Bin n', min: 0, max: 7, step: 1, fmt: (v) => `n = ${v}`, onInput: (s, api) => api.restart() }],
        draw(g, s, t, api) {
          const R = Math.min(g.h * 0.4, g.w * 0.2);
          waveWithSamples(g, f1, x1, [0.04, 0.12, 0.48, 0.7]);
          const X = winding(g, x1, s.n, t, g.w * 0.77, g.h * 0.5, R);
          api.legend([['samples as arrows', g.col.blue], ['average = Xₙ', g.col.orange]]);
          api.verdict(`X${s.n} = ${F(X.re, 3)} ${X.im < 0 ? '−' : '+'} ${F(Math.abs(X.im), 3)} i`, '');
        },
      },
      {
        part: 'Worked example 1',
        title: 'Take the samples',
        text: `<p>A signal with a 1X part (cosine and sine) and a 2X cosine. Sample it 8 times per turn, at 45° steps.</p>
               <p>Every sample is worked out in full below the board.</p>`,
        draw(g, s, t, api) {
          const Pl = waveWithSamples(g, f1, x1.map((v, k) => (k <= Math.floor(t * 3) ? v : null)));
          x1.forEach((v, k) => { if (k <= Math.floor(t * 3)) g.text(F(v, 2), Pl.X(k / N), Pl.Y(v) + (v >= 0 ? -14 : 16), { size: 11, color: g.col.ink }); });
          api.legend([['x(t) from (31)', g.col.muted], ['samples xₖ', g.col.blue]]);
        },
      },
      {
        part: 'Worked example 1',
        title: 'Bin 1, by hand',
        text: `<p>Multiply each sample by \\(\\cos\\theta_k\\) and \\(\\sin\\theta_k\\), add the columns, divide by 8. Out come the real and imaginary parts, then the size and the phase.</p>
               <p>The board shows the same result as the average of 8 arrows.</p>`,
        draw(g, s, t, api) {
          const R = Math.min(g.h * 0.4, g.w * 0.2);
          waveWithSamples(g, f1, x1, [0.04, 0.12, 0.48, 0.7]);
          winding(g, x1, 1, t, g.w * 0.77, g.h * 0.5, R);
          api.legend([['samples as arrows', g.col.blue], ['X₁ = 0.3 − 0.4i', g.col.orange]]);
        },
      },
      {
        part: 'Worked example 1',
        title: 'Bins 2, 3 and 7',
        text: `<p>Bin 2 finds the 2X cosine. Bin 3 finds nothing, because the products cancel. Bin 7 needs no work at all: it is the mirror of bin 1.</p>
               <p>Slide through all eight bins.</p>`,
        controls: [{ type: 'range', key: 'n', label: 'Bin n', min: 0, max: 7, step: 1, fmt: (v) => `n = ${v}`, onInput: (s, api) => api.restart() }],
        draw(g, s, t, api) {
          const c = g.col, R = Math.min(g.h * 0.36, g.w * 0.18);
          const X = winding(g, x1, s.n, t, g.w * 0.22, g.h * 0.45, R);
          const B = g.plot({ box: [0.48, 0.1, 0.48, 0.7], x: [-0.6, 7.6], y: [0, 0.6] });
          const mags = K.map((n) => { const d = dft(x1, n); return Math.hypot(d.re, d.im); });
          B.bars(mags, { labels: false, color: (k) => (k === s.n ? c.orange : k >= 4 ? c.muted : c.blue) });
          K.forEach((n) => g.text(`X${n}`, B.X(n), B.Y(0) + 13, { size: 11 }));
          api.legend([['|Xₙ|', c.blue], ['mirror half', c.muted]]);
          api.verdict(`X${s.n} = ${F(X.re, 3)} ${X.im < 0 ? '−' : '+'} ${F(Math.abs(X.im), 3)} i`, '');
        },
      },
      {
        part: 'Worked example 2',
        title: 'An offset and a phase',
        text: `<p>This time the signal comes as an amplitude and a phase, plus a small offset, the way a sensor often reads. First rewrite it in the form (1), then sample it.</p>`,
        draw(g, s, t, api) {
          const Pl = waveWithSamples(g, f2, x2.map((v, k) => (k <= Math.floor(t * 3) ? v : null)), [0.06, 0.08, 0.9, 0.62], 2.7);
          x2.forEach((v, k) => { if (k <= Math.floor(t * 3)) g.text(F(v, 2), Pl.X(k / N), Pl.Y(v) + (v >= 0 ? -14 : 16), { size: 11, color: g.col.ink }); });
          api.legend([['x(t) from (44)', g.col.muted], ['samples xₖ', g.col.blue]]);
        },
      },
      {
        part: 'Worked example 2',
        title: 'Bins 0 and 1',
        text: `<p>Bin 0 is just the average: the offset. It has no mirror, so it isn’t doubled. Bin 1 gives back the size 2.0 and the phase −60°.</p>`,
        controls: [{ type: 'choice', key: 'n2', options: [[0, 'Bin 0'], [1, 'Bin 1']], onPick: (s, api) => api.restart() }],
        draw(g, s, t, api) {
          const c = g.col, R = Math.min(g.h * 0.36, g.w * 0.18);
          const X = winding(g, x2, s.n2, t, g.w * 0.25, g.h * 0.45, R, 2.6);
          const B = g.plot({ box: [0.52, 0.1, 0.44, 0.7], x: [-0.6, 4.6], y: [0, 2.2] });
          const one = [0, 1, 2, 3, 4].map((n) => { const d = dft(x2, n); return (n === 0 ? 1 : 2) * Math.hypot(d.re, d.im); });
          B.bars(one, { color: (k) => (k === s.n2 ? c.orange : c.blue) });
          api.legend([['one-sided spectrum', c.blue], ['this bin', c.orange]]);
          api.verdict(`X${s.n2} = ${F(X.re, 3)} ${X.im < 0 ? '−' : '+'} ${F(Math.abs(X.im), 3)} i`, '');
        },
      },
      {
        part: 'Your turn',
        title: 'Try it with a calculator',
        tryLabel: 'Your answers',
        text: (s) => {
          if (!s.ex) newEx(s);
          const { a1, b1, a2 } = s.ex;
          return `<div class="problem"><p>A signal is \\(x(t)=${a1}\\cos\\omega_0 t+${b1}\\sin\\omega_0 t+${a2}\\cos 2\\omega_0 t\\), sampled 8 times per turn.</p>
                  <p>Work out bin 1 by hand, as in example 1. Calculator in degrees for the phase.</p></div>`;
        },
        controls: [
          { type: 'answer', label: 'Real part of \\(X_1\\)', unit: '', value: (s) => { const x = samples(sig(s.ex.a1, s.ex.b1, s.ex.a2)); return dft(x, 1).re; }, abs: 0.006 },
          { type: 'answer', label: 'Imaginary part of \\(X_1\\)', unit: '', value: (s) => { const x = samples(sig(s.ex.a1, s.ex.b1, s.ex.a2)); return dft(x, 1).im; }, abs: 0.006 },
          { type: 'answer', label: 'The 1X peak, \\(2|X_1|\\)', unit: '', value: (s) => Math.hypot(s.ex.a1, s.ex.b1), rel: 0.02 },
          { type: 'answer', label: 'Phase \\(\\theta_1\\)', unit: 'degrees', value: (s) => Math.atan2(-s.ex.b1 / 2, s.ex.a1 / 2) * 180 / Math.PI, abs: 1.5 },
          { type: 'check' },
          { type: 'button', label: 'Show working', action: (s, api) => { s.showSol = true; api.rewrite(); } },
          { type: 'button', label: 'New numbers', action: (s, api) => { newEx(s); api.refresh(); api.rewrite(); } },
        ],
        draw(g, s, t, api) {
          if (!s.ex) newEx(s);
          const { a1, b1, a2 } = s.ex, f = sig(a1, b1, a2), xs = samples(f);
          const R = Math.min(g.h * 0.4, g.w * 0.2);
          waveWithSamples(g, f, xs, [0.04, 0.12, 0.48, 0.7], 2.0);
          if (s.showSol) winding(g, xs, 1, t, g.w * 0.77, g.h * 0.5, R);
          api.legend([['your signal', g.col.muted], ['8 samples', g.col.blue]]);
        },
      },
      {
        part: 'Summary',
        title: 'On one card',
        text: `<p>Four boxed results, each derived above: the DFT, what its real and imaginary parts are, how size and phase come out of it, and why half of it is a mirror.</p>
               <p>Next in the series: what happens when the signal doesn’t fit a whole number of times in the window. That is leakage.</p>`,
        draw(g, s, t, api) {
          const c = g.col, R = Math.min(g.h * 0.38, g.w * 0.22);
          phasor(g, 0.3, -0.4, g.w * 0.42, g.h * 0.45, R, 0.55);
          api.legend([['Re Xₙ = ½aₙ', c.blue], ['Im Xₙ = −½bₙ', c.good], ['Xₙ', c.orange]]);
        },
      },
    ],
  });
})();
