// Lesson 6: wavelets for engineers. Derive the Morlet wavelet transform of a steady tone and of a sharp
// knock, the width of each mark on a wavelet map, and how to read an amplitude off one; then work the
// fan from the video (a 25 Hz hum and a knock once per turn) on a calculator.
(function () {
  const { TAU, ease } = Lab;
  const r = String.raw;
  const PI = Math.PI;
  const F = (v, d = 4) => { const x = +(+v).toFixed(d); return (Object.is(x, -0) || Math.abs(x) < 1e-12 ? 0 : x).toString(); };

  // ---- truth: everything on the boards and in the examples is computed here
  const W0 = 6;                                  // Morlet omega_0
  const HALF = Math.sqrt(2 * Math.log(2));       // 1.1774: e^{-x^2/2} = 1/2
  const scale = (f, w0 = W0) => w0 / (TAU * f);  // seconds
  const dtFull = (f, w0 = W0) => 2 * HALF * scale(f, w0);
  const dfFull = (f, w0 = W0) => 2 * HALF * f / w0;
  const toneW = (A, f0, f, w0 = W0) => { const a = scale(f, w0); return A / 2 * Math.sqrt(TAU * a) * Math.exp(-((a * TAU * f0 - w0) ** 2) / 2); };
  const knockW = (I, t0, b, f) => { const a = scale(f); return I / Math.sqrt(a) * Math.exp(-((t0 - b) ** 2) / (2 * a * a)); };
  const ampFrom = (Wr, f) => 2 * Wr / Math.sqrt(TAU * scale(f));

  // the fan from the video: 1,500 rpm, a knock once per turn that rings a 400 Hz resonance
  const RPM = 1500, F1 = RPM / 60, GAP = 60 / RPM, FR = 400, TR = 0.003;
  const EX = { f1: F1, f2: FR, Wr: 0.30 };

  // ---- a time-frequency picture drawn into the board (cached as an image)
  const HEAT = [[0, [17, 17, 16]], [0.3, [74, 36, 102]], [0.62, [194, 84, 31]], [0.85, [237, 161, 0]], [1, [255, 243, 207]]];
  const heatCol = (v) => {
    v = Math.min(1, Math.max(0, v));
    for (let i = 1; i < HEAT.length; i++) if (v <= HEAT[i][0]) {
      const [a, ca] = HEAT[i - 1], [b, cb] = HEAT[i], u = (v - a) / (b - a);
      return ca.map((x, j) => Math.round(x + (cb[j] - x) * u));
    }
    return HEAT[HEAT.length - 1][1];
  };
  const cache = {};
  function heatImage(key, cols, rows, fn, gamma = 0.6) {      // fn(col, row) -> value; row 0 = top
    if (cache[key]) return cache[key];
    const Z = new Float64Array(cols * rows); let mx = 0;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const v = fn(i, j); Z[j * cols + i] = v; if (v > mx) mx = v; }
    const cv = document.createElement('canvas'); cv.width = cols; cv.height = rows;
    const cx = cv.getContext('2d'), im = cx.createImageData(cols, rows);
    for (let k = 0; k < Z.length; k++) { const c = heatCol((Z[k] / (mx || 1)) ** gamma); im.data.set([c[0], c[1], c[2], 255], 4 * k); }
    cx.putImageData(im, 0, 0);
    return (cache[key] = cv);
  }
  // a time-frequency plane: t in [t0, t1] s, f on a log axis [fLo, fHi]
  function tfPlane(g, box, t0, t1, fLo, fHi) {
    const P = g.plot({ box, x: [t0, t1], y: [0, 1] });
    P.fy = (f) => P.Y(Math.log(f / fLo) / Math.log(fHi / fLo));
    P.fOf = (j, rows) => fLo * (fHi / fLo) ** (1 - (j + 0.5) / rows);
    P.frame = () => { const c = g.col, ctx = g.ctx; ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.strokeRect(P.l, P.t, P.w, P.h); };
    P.fticks = (fs) => fs.forEach((f) => g.text(`${f} Hz`, P.l - 8, P.fy(f), { size: 11, align: 'right' }));
    P.tticks = (ts, unit = 'ms', k = 1000, off = 0) => ts.forEach((t) => g.text(`${F((t - off) * k, 0)} ${unit}`, P.X(t), P.t + P.h + 13, { size: 11 }));
    P.image = (cv, reveal = 1) => {
      const ctx = g.ctx; ctx.imageSmoothingEnabled = true;
      const w = P.w * reveal;
      if (w > 1) ctx.drawImage(cv, 0, 0, cv.width * reveal, cv.height, P.l, P.t, w, P.h);
    };
    return P;
  }

  // the fan signal and its wavelet map (computed once, by direct sums)
  function fanSignal(t) {
    let y = Math.sin(TAU * F1 * t);
    const k = Math.floor((t - 0.012) / GAP);
    for (let j = k - 1; j <= k; j++) { const d = t - (0.012 + j * GAP); if (d >= 0) y += 1.6 * Math.exp(-d / TR) * Math.sin(TAU * FR * d); }
    return y;
  }
  const FAN = { t0: 0.40, t1: 0.64, fLo: 12, fHi: 1000, cols: 240, rows: 72 };
  function fanMap() {
    if (cache.fan) return cache.fan;
    const FS = 4000, { t0, t1, fLo, fHi, cols, rows } = FAN, pad = 0.3, n0 = Math.round((t0 - pad) * FS);
    const x = Float64Array.from({ length: Math.round((t1 - t0 + 2 * pad) * FS) }, (_, i) => fanSignal((n0 + i) / FS));
    return heatImage('fan', cols, rows, (() => {
      let row = -1, cr, ci, n;                    // the wavelet's taps, rebuilt once per row
      return (i, j) => {
        if (j !== row) {
          row = j; const f = fLo * (fHi / fLo) ** (1 - (j + 0.5) / rows), a = scale(f);
          n = Math.ceil(3.5 * a * FS); cr = new Float64Array(2 * n + 1); ci = new Float64Array(2 * n + 1);
          const k = 1 / FS / Math.sqrt(a);
          for (let m = -n; m <= n; m++) { const u = m / FS / a, e = Math.exp(-u * u / 2) * k; cr[m + n] = e * Math.cos(W0 * u); ci[m + n] = -e * Math.sin(W0 * u); }
        }
        const c0 = Math.round((t0 + (t1 - t0) * (i + 0.5) / cols) * FS) - n0 - n;
        let re = 0, im = 0;
        for (let m = 0; m < cr.length; m++) { const v = x[c0 + m]; re += v * cr[m]; im += v * ci[m]; }
        return Math.hypot(re, im);
      };
    })(), 0.45);
  }
  function fanBoard(g, t, api, o = {}) {
    const c = g.col, ctx = g.ctx, { t0, t1, fLo, fHi } = FAN;
    const S = g.plot({ box: [0.1, 0.05, 0.86, 0.22], x: [t0, t1], y: [-2.7, 2.7] });
    S.axes();
    const rv = o.reveal === false ? 1 : ease(t / 2.2);
    S.curve(fanSignal, { color: c.ink, width: 1.4, n: 1600, to: t0 + (t1 - t0) * rv });
    const P = tfPlane(g, [0.1, 0.33, 0.86, 0.56], t0, t1, fLo, fHi);
    P.image(fanMap(), rv); P.frame(); P.fticks([25, 100, 400]);
    P.tticks([t0, t0 + 0.08, t0 + 0.16, t1], 'ms', 1000, t0);
    if (o.widths) {                                // the half-height size of one mark, at 400 Hz and at 25 Hz
      const kt = 0.012 + 12 * GAP;                 // a knock inside the window
      [[FR, c.good], [F1, c.accent]].forEach(([f, col]) => {
        const hw = dtFull(f) / 2, hf = dfFull(f) / 2;
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.ellipse(P.X(kt), P.fy(f), (P.X(kt + hw) - P.X(kt)), Math.abs(P.fy(f + hf) - P.fy(f - hf)) / 2, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      });
      const y = P.t - 8, xa = P.X(kt), xb = P.X(kt + GAP);
      ctx.strokeStyle = c.accent; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.stroke();
      g.text('40 ms', (xa + xb) / 2, y - 9, { size: 11, color: c.accent });
      api.legend([['fan signal', c.ink], ['one knock at 400 Hz (half height)', c.good], ['the same at 25 Hz', c.accent]]);
    } else api.legend([['fan at 1,500 rpm', c.ink], ['wavelet map |W|', c.orange]]);
    return P;
  }

  // the Morlet wavelet in time at frequency f (real part, with its bell)
  function waveletBoard(g, f, w0, t, api, o = {}) {
    const c = g.col, a = scale(f, w0), span = o.span || 0.25;
    const P = g.plot({ box: o.box || [0.06, 0.1, 0.9, 0.62], x: [-span / 2, span / 2], y: [-1.3, 1.3] });
    P.axes({ ticks: [[-span / 2, `${F(-span / 2 * 1000, 0)} ms`], [0, 'b'], [span / 2, `+${F(span / 2 * 1000, 0)} ms`]] });
    const k = ease(t / 1.2);
    [1, -1].forEach((s) => P.curve((x) => s * Math.exp(-((x / a) ** 2) / 2), { color: c.muted, width: 1.3, dash: [5, 5] }));
    P.curve((x) => k * Math.exp(-((x / a) ** 2) / 2) * Math.cos(w0 * x / a), { color: c.blue, width: 2.4, glow: true, n: 1600 });
    const hw = HALF * a;
    if (o.width !== false) {
      const ctx = g.ctx; ctx.strokeStyle = c.accent; ctx.lineWidth = 1.6;
      const y = P.Y(-1.15); ctx.beginPath(); ctx.moveTo(P.X(-hw), y); ctx.lineTo(P.X(hw), y); ctx.stroke();
      [-hw, hw].forEach((x) => { ctx.beginPath(); ctx.moveTo(P.X(x), y - 5); ctx.lineTo(P.X(x), y + 5); ctx.stroke(); });
      g.text(`Δt = ${F(2 * hw * 1000, 1)} ms`, P.X(0), y + 14, { size: 11, color: c.accent });
    }
    api.legend([['real part of ψ', c.blue], ['the bell e^(−u²/2)', c.muted], ...(o.width !== false ? [['width at half height', c.accent]] : [])]);
    return a;
  }

  // how strongly each row answers a steady tone at f0, by (11); log frequency axis
  function toneBoard(g, f0, w0, t, api, o = {}) {
    const c = g.col, ctx = g.ctx, lo = 5, hi = 200, L = Math.log(hi / lo);
    const P = g.plot({ box: o.box || [0.08, 0.1, 0.88, 0.62], x: [0, 1], y: [0, 1.15] });
    const fx = (f) => Math.log(f / lo) / L;
    P.axes({ ticks: [5, 10, 25, 50, 100, 200].map((f) => [fx(f), `${f} Hz`]) });
    const k = ease(t / 1.2), peak = toneW(1, f0, f0, w0);
    const fn = (x) => k * toneW(1, f0, lo * Math.exp(L * x), w0) / peak;
    P.area(fn, { pos: c.orange, alpha: 0.18, n: 600 });
    P.curve(fn, { color: c.orange, width: 2.4, n: 600 });
    const band = [f0 * (1 - HALF / w0), f0 * (1 + HALF / w0)];
    ctx.strokeStyle = c.accent; ctx.lineWidth = 1.6; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(P.X(fx(lo)), P.Y(0.5)); ctx.lineTo(P.X(1), P.Y(0.5)); ctx.stroke(); ctx.setLineDash([]);
    band.forEach((f) => P.dot(fx(f), 0.5, { color: c.accent, r: 4 }));
    P.vline(fx(f0), { color: c.ink, dash: [] });
    g.text(`tone ${F(f0, 1)} Hz`, P.X(fx(f0)), P.t - 6, { size: 11, color: c.ink });
    api.legend([['|W| of each row, ÷ its peak', c.orange], [`half height: ${F(band[0], 1)} to ${F(band[1], 1)} Hz`, c.accent]]);
    return band;
  }

  // ---- calculator exercise
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const newEx = (s) => { s.ex = { rpm: pick([990, 1185, 1480, 1780, 2960, 3560, 745, 1490]), A: pick([1.5, 2.0, 3.0, 4.0, 6.0]) }; s.showSol = false; };
  const exNums = (s) => { const f = s.ex.rpm / 60, a = scale(f); return { f, a, W: s.ex.A / 2 * Math.sqrt(TAU * a), dt: dtFull(f) }; };

  // ---- the working
  const WORK = [];

  // 1. Goal
  WORK.push([
    ['>By the end of this lesson we will have derived what a wavelet map shows for the two things a machine signal is made of. A steady tone of amplitude \\(A\\) at \\(f_0\\) gives a band, the same at every time \\(b\\):'],
    [r`|W(a,b)|\approx\frac{A}{2}\sqrt{2\pi a}\;e^{-(2\pi f_0a-\omega_0)^2/2}`, '← a tone', '', 'box'],
    ['>A sharp knock at \\(t_0\\) gives a flash whose length is set by the row:'],
    [r`|W(a,b)|=\frac{I}{\sqrt a}\;e^{-(t_0-b)^2/(2a^2)}`, '← a knock', '', 'box'],
    ['>and every mark on the map has the same area, whatever its frequency:'],
    [r`\Delta t\cdot\Delta f=\frac{4\ln2}{\pi}\approx0.88`, '← short and tall at high f, long and flat at low f', '', 'box'],
    ['>Then we size the marks for the fan in the video, and read an amplitude off a map by hand.'],
  ]);

  // 2. Tools
  WORK.push([
    ['>The Fourier transform, the continuous form of Lesson 4’s DFT: the signal is matched against an arrow turning at \\(f\\):'],
    [r`X(f)=\int_{-\infty}^{\infty}x(t)\,e^{-i2\pi ft}\,dt`, '', 'A'],
    ['>Euler, as in Lesson 5: a cosine is two arrows, and an arrow has length 1:'],
    [r`\cos\theta=\tfrac12e^{i\theta}+\tfrac12e^{-i\theta},\qquad |e^{i\theta}|=1`, '', 'B'],
    ['>A change of variable. If \\(u=(t-b)/a\\), then'],
    [r`t=b+au,\qquad dt=a\,du`, '', 'C'],
    ['>An arrow \\(e^{i\\theta(t)}\\) turns at \\(d\\theta/dt\\) radians per second, and'],
    [r`\omega=2\pi f`, '← radians per second from hertz', 'D'],
    ['>The Gaussian integral, for any real \\(\\kappa\\). Complete the square, \\(-\\tfrac{u^2}{2}+i\\kappa u=-\\tfrac12(u-i\\kappa)^2-\\tfrac{\\kappa^2}{2}\\); the shifted bell still has area \\(\\sqrt{2\\pi}\\):'],
    [r`\int_{-\infty}^{\infty}e^{-u^2/2}\,e^{i\kappa u}\,du=\sqrt{2\pi}\;e^{-\kappa^2/2}`, '← check it on the board', 'E'],
    ['>An impulse picks out one value of whatever it multiplies:'],
    [r`\int_{-\infty}^{\infty}\delta(t-t_0)\,g(t)\,dt=g(t_0)`, '', 'F'],
    ['>And a bell falls to half its height at'],
    [r`e^{-x^2/2}=\tfrac12\iff x=\sqrt{2\ln2}=1.177`, '', 'G'],
  ]);

  // 3. The wavelet and its family
  WORK.push([
    ['>A wavelet is a short wave inside a bell. The Morlet wavelet is an arrow (B) turning at \\(\\omega_0\\) inside a Gaussian:'],
    [r`\psi(u)=e^{-u^2/2}\,e^{i\omega_0u},\qquad \omega_0=6`, '← its real part is on the board', 1],
    ['>To use it we slide it to a time \\(b\\) and stretch it by a scale \\(a\\), in seconds. Writing \\(u=(t-b)/a\\) as in (C):'],
    [r`\psi_{a,b}(t)=\frac{1}{\sqrt a}\,\psi\!\Big(\frac{t-b}{a}\Big)`, '← centred at b, a times wider', 2],
    ['>The \\(1/\\sqrt a\\) gives every copy the same energy. By (C), with \\(|e^{i\\theta}|=1\\) and \\(\\int e^{-u^2}du=\\sqrt\\pi\\):'],
    [r`\int|\psi_{a,b}(t)|^2dt=\frac1a\int e^{-(t-b)^2/a^2}\,dt=\frac1a\cdot a\sqrt\pi=\sqrt\pi`, '← the same for every a', 3],
    ['>The wavelet transform matches the signal against each copy, exactly as (A) matches it against an arrow:'],
    [r`W(a,b)=\int x(t)\,\psi^{*}_{a,b}(t)\,dt=\frac{1}{\sqrt a}\int x(t)\,e^{-(t-b)^2/(2a^2)}\,e^{-i\omega_0(t-b)/a}\,dt`, '← one number per (a, b)', 4, 'box'],
    ['>The star is the complex conjugate: it turns the arrow backwards, as the minus sign does in (A).'],
  ]);

  // 4. Scale and frequency
  WORK.push([
    ['>Inside (4), the arrow’s angle is \\(\\omega_0(t-b)/a\\). It turns at \\(\\omega_0/a\\) radians per second, so by (D)'],
    [r`2\pi f=\frac{\omega_0}{a}\qquad\Rightarrow\qquad f=\frac{\omega_0}{2\pi a},\qquad a=\frac{\omega_0}{2\pi f}`, '← each scale is a frequency', 5, 'box'],
    ['>For example, the 25 Hz row of a map uses'],
    [r`a=\frac{6}{2\pi\times25}=\frac{6}{157.08}=0.0382\ \text{s}=38.2\ \text{ms}`, '', 6],
    ['>The bell in (4) is \\(e^{-(t-b)^2/(2a^2)}\\): its width is proportional to \\(a\\). Cycles per second times seconds of bell:'],
    [r`f\cdot a=\frac{\omega_0}{2\pi}=0.955`, '← about one cycle per a, at every scale', 7],
    ['>So every copy holds the same number of wiggles. A fast row gets a short burst, a slow row a long one. Slide the frequency on the board.'],
  ]);

  // 5. A tone through the wavelet
  WORK.push([
    ['>Feed in one steady tone of amplitude \\(A\\), at \\(\\Omega=2\\pi f_0\\) radians per second. By (B) it is two arrows:'],
    [r`x(t)=A\cos(\Omega t+\varphi)=\tfrac{A}{2}e^{i\varphi}e^{i\Omega t}+\tfrac{A}{2}e^{-i\varphi}e^{-i\Omega t}`, '', 8],
    ['>Put the forward arrow into (4) and change variable by (C), \\(t=b+au\\), \\(dt=a\\,du\\):'],
    [r`W_+=\frac{A}{2}e^{i\varphi}\frac{1}{\sqrt a}\int e^{i\Omega(b+au)}\,e^{-u^2/2}\,e^{-i\omega_0u}\,a\,du=\frac{A}{2}e^{i\varphi}e^{i\Omega b}\sqrt a\int e^{-u^2/2}\,e^{i(a\Omega-\omega_0)u}\,du`, '', 9],
    ['>The integral is (E) with \\(\\kappa=a\\Omega-\\omega_0\\):'],
    [r`W_+=\frac{A}{2}e^{i\varphi}e^{i\Omega b}\sqrt{2\pi a}\;e^{-(a\Omega-\omega_0)^2/2}`, '', 10],
    ['>The backward arrow gives the same with \\(\\kappa=-a\\Omega-\\omega_0\\). Near the peak \\(a\\Omega\\approx\\omega_0\\), so \\(\\kappa\\approx-12\\) and \\(e^{-72}\\) is nothing. Set it aside, as in Lesson 5. Take the size, with \\(|e^{i\\varphi}|=|e^{i\\Omega b}|=1\\):'],
    [r`|W(a,b)|\approx\frac{A}{2}\sqrt{2\pi a}\;e^{-(a\Omega-\omega_0)^2/2}`, '← a tone', 11, 'box'],
    ['>No \\(b\\) is left in (11): a steady tone is a steady band across the map. It is brightest where \\(a\\Omega=\\omega_0\\), that is where the row’s frequency (5) equals the tone’s. There the exponential is 1:'],
    [r`|W|_{\text{peak}}=\frac{A}{2}\sqrt{2\pi a}\qquad\Rightarrow\qquad A=\frac{2\,|W|_{\text{peak}}}{\sqrt{2\pi a}}`, '← reading an amplitude off the map', 12, 'box'],
  ]);

  // 6. A knock through the wavelet
  WORK.push([
    ['>Now the opposite kind of signal: one sharp knock at \\(t_0\\), idealised as an impulse of strength \\(I\\):'],
    [r`x(t)=I\,\delta(t-t_0)`, '', 13],
    ['>Put it into (4). By (F) the integral just evaluates the wavelet at \\(t_0\\):'],
    [r`W(a,b)=\frac{I}{\sqrt a}\,e^{-(t_0-b)^2/(2a^2)}\,e^{-i\omega_0(t_0-b)/a}`, '', 14],
    ['>Take the size:'],
    [r`|W(a,b)|=\frac{I}{\sqrt a}\,e^{-(t_0-b)^2/(2a^2)}`, '← a knock', 15, 'box'],
    ['>Every row lights up, because a knock contains every frequency. But each row lights only for a time proportional to its \\(a\\): a short flash in the fast rows, a long smear in the slow ones. On the map a knock is a cone pointing at \\(t_0\\).'],
  ]);

  // 7. The size of a mark
  WORK.push([
    ['>How big is each mark? Measure it at half height, (G).'],
    ['>In time, from (15): half height where \\(|t_0-b|/a=1.177\\). The full width of a knock’s flash is'],
    [r`\Delta t=2\times1.177\,a=2.355\,a`, '', 16],
    ['>In frequency, from (11): fix a row \\(f\\) and ask which tones \\(f_0\\) it hears at half height or more. By (5), \\(a\\Omega=\\omega_0f_0/f\\), so the condition \\(|a\\Omega-\\omega_0|\\le1.177\\) becomes'],
    [r`\Big|\frac{\omega_0f_0}{f}-\omega_0\Big|\le1.177\iff|f_0-f|\le\frac{1.177}{\omega_0}\,f=0.196\,f`, '', 17],
    [r`\Delta f=2\times0.196\,f=\frac{2.355\,f}{\omega_0}`, '← a fixed fraction: ±20% with ω₀ = 6', 18],
    ['>Multiply (16) and (18), using \\(f=\\omega_0/(2\\pi a)\\) from (5):'],
    [r`\Delta t\cdot\Delta f=2.355\,a\cdot\frac{2.355}{2\pi a}=\frac{(2\sqrt{2\ln2})^2}{2\pi}=\frac{4\ln2}{\pi}=0.88`, '← no a left', 19, 'box'],
    ['>Every mark on a wavelet map has the same area. What changes is its shape: tall and thin in the fast rows, short and wide in the slow ones. A short-time FFT uses one window for every row, so all its marks are the same shape. That is the whole difference.'],
  ]);

  // 8. Choosing omega_0
  WORK.push([
    ['>Both widths contain \\(\\omega_0\\). Put \\(a=\\omega_0/(2\\pi f)\\) into (16), and look again at (18):'],
    [r`\Delta t=\frac{2.355\,\omega_0}{2\pi f}=\frac{0.375\,\omega_0}{f},\qquad \frac{\Delta f}{f}=\frac{2.355}{\omega_0}`, '', 20],
    ['>A bigger \\(\\omega_0\\) puts more wiggles under the bell (7): sharper in frequency, blurrier in time. The product (19) does not move. It is the short-time FFT’s trade again, but set once as a fraction of \\(f\\), not as a fixed number of hertz.'],
    ['>Why not make \\(\\omega_0\\) small? A wavelet must average to zero, or it answers a constant offset. Use (E) on (1) with \\(\\kappa=\\omega_0\\):'],
    [r`\int\psi(u)\,du=\sqrt{2\pi}\;e^{-\omega_0^2/2}`, '← 4×10⁻⁸ at ω₀ = 6, but 0.03 at ω₀ = 3', 21],
    ['>\\(\\omega_0=6\\) is the usual choice (Torrence and Compo, 1998): as short as it can be while (21) stays negligible.'],
  ]);

  // 9. Example 1
  {
    const a1 = scale(F1), a2 = scale(FR);
    WORK.push([
      ['>Worked example 1. A fan runs at 1500 rpm. It hums at 1X, and something knocks once per turn, ringing near 400 Hz. With \\(\\omega_0=6\\): how big are the marks for the hum and for each knock, and do the knocks show up separately?'],
      [r`f_{1X}=\frac{1500}{60}=25\ \text{Hz},\qquad \text{one turn}=\frac{60}{1500}=0.040\ \text{s}=40\ \text{ms}`, '', 22],
      ['>The scale of each row, by (5):'],
      [r`a_{25}=\frac{6}{2\pi\times25}=${F(a1 * 1000, 2)}\ \text{ms},\qquad a_{400}=\frac{6}{2\pi\times400}=\frac{6}{${F(TAU * 400, 1)}}=${F(a2 * 1000, 3)}\ \text{ms}`, '', 23],
      ['>The time width of a flash, by (16):'],
      [r`\Delta t_{25}=2.355\times${F(a1 * 1000, 2)}=${F(dtFull(F1) * 1000, 1)}\ \text{ms},\qquad \Delta t_{400}=2.355\times${F(a2 * 1000, 3)}=${F(dtFull(FR) * 1000, 2)}\ \text{ms}`, '', 24],
      ['>The band each row hears, by (17) and (18):'],
      [r`25\pm0.196\times25=25\pm${F(0.196 * 25, 1)}\ \text{Hz},\qquad 400\pm0.196\times400=400\pm${F(0.196 * 400, 0)}\ \text{Hz}`, '', 25],
      [`>At 400 Hz each knock is a flash ${F(dtFull(FR) * 1000, 1)} ms wide, and the knocks are 40 ms apart: ${F(GAP / dtFull(FR), 0)} times the width, so they show as separate flashes, one per turn. In the 25 Hz row the same knocks would each last ${F(dtFull(F1) * 1000, 0)} ms, more than twice the gap, and run together. But that row pins the hum to 25 Hz ± 5 Hz.`],
      ['>No single short-time FFT does both. To split knocks 40 ms apart it needs a window shorter than 40 ms, and then by Lesson 5 its bins are at least \\(1/0.040=25\\) Hz apart: the hum sits in bin 1, next to DC, with nothing around it.'],
    ]);
  }

  // 10. Example 2
  {
    const s1 = Math.sqrt(TAU * scale(F1)), s2 = Math.sqrt(TAU * scale(FR));
    WORK.push([
      ['>Worked example 2. On the same fan’s map, the 25 Hz band and a steady 400 Hz gear-mesh band are equally bright: both read \\(|W|=0.30\\) mm/s·√s. Which vibration is bigger?'],
      ['>By (12) we need \\(\\sqrt{2\\pi a}\\) for each row, with \\(a\\) from (23):'],
      [r`\sqrt{2\pi\times${F(scale(F1), 5)}}=\sqrt{${F(s1 * s1, 4)}}=${F(s1)},\qquad \sqrt{2\pi\times${F(scale(FR), 6)}}=\sqrt{${F(s2 * s2, 4)}}=${F(s2)}`, '', 26],
      [r`A_{25}=\frac{2\times0.30}{${F(s1)}}=${F(ampFrom(0.30, F1), 2)}\ \text{mm/s},\qquad A_{400}=\frac{2\times0.30}{${F(s2)}}=${F(ampFrom(0.30, FR), 2)}\ \text{mm/s}`, '', 27],
      ['>Equally bright, but the 400 Hz vibration is four times bigger:'],
      [r`\frac{A_{400}}{A_{25}}=\sqrt{\frac{a_{25}}{a_{400}}}=\sqrt{\frac{400}{25}}=4`, '← slow rows look brighter than they are', 28],
      ['>With the \\(1/\\sqrt a\\) of (2), a reading grows like \\(\\sqrt a\\). Some tools use \\(1/a\\) instead, which makes equal amplitudes equally bright. Check which one yours uses before reading amplitudes off a map, and use (12) when it is \\(1/\\sqrt a\\).'],
    ]);
  }

  // 11. Your turn
  WORK.push((s) => {
    if (!s.ex) newEx(s);
    const { rpm, A } = s.ex, E = exNums(s);
    const given = [
      ['>Your turn. A machine runs at'],
      [r`${rpm}\ \text{rpm},\qquad 1\text{X amplitude }A=${F(A, 1)}\ \text{mm/s},\qquad \omega_0=6`, '', 29],
    ];
    if (!s.showSol) return given;
    return [
      ...given,
      ['>The 1X frequency and its row’s scale, by (5):'],
      [r`f=\frac{${rpm}}{60}=${F(E.f, 3)}\ \text{Hz},\qquad a=\frac{6}{2\pi\times${F(E.f, 3)}}=${F(E.a * 1000, 3)}\ \text{ms}`, '', 30],
      ['>The band’s brightness, by (12):'],
      [r`|W|=\frac{${F(A, 1)}}{2}\sqrt{2\pi\times${F(E.a, 5)}}=${F(A / 2, 2)}\times${F(Math.sqrt(TAU * E.a))}=${F(E.W, 3)}\ \text{mm/s·√s}`, ''],
      ['>The length of a knock’s flash in that row, by (16):'],
      [r`\Delta t=2.355\times${F(E.a * 1000, 3)}=${F(E.dt * 1000, 1)}\ \text{ms}`, ''],
    ];
  });

  // 12. Summary
  WORK.push([
    ['>Everything in this lesson on one card (Morlet wavelet, \\(\\omega_0=6\\)):'],
    [r`f=\frac{\omega_0}{2\pi a}`, '← scale and frequency, (5)', '', 'box'],
    [r`\text{tone: }|W|\approx\tfrac{A}{2}\sqrt{2\pi a}\,e^{-(2\pi f_0a-\omega_0)^2/2},\qquad A=\frac{2|W|_{\text{peak}}}{\sqrt{2\pi a}}`, '← (11), (12)', '', 'box'],
    [r`\text{knock: }|W|=\frac{I}{\sqrt a}\,e^{-(t_0-b)^2/(2a^2)}`, '← (15)', '', 'box'],
    [r`\Delta t=2.355\,a,\qquad \Delta f=0.39\,f,\qquad \Delta t\cdot\Delta f=0.88`, '← (16), (18), (19)', '', 'box'],
    ['>A wavelet map answers which frequency and when. Its marks all have the same area: short bursts for fast things, long ones for slow things.'],
  ]);

  Lab.lesson({
    work: WORK,
    heads: true,
    next: '../',
    state: { kap: 1, fw: 25, f0: 25, k6: 400, tile: 'wav', w0: 6, nrm: 'sqrt' },
    steps: [
      {
        part: 'Goal',
        title: 'Where we are going',
        text: `<p>A spectrum says which frequencies are in a signal, not when. A wavelet map says both. This is the map of the fan from the video: a steady hum along the bottom, and a flash each time it knocks.</p>
               <p>This lesson derives what that map shows and how to read it. The working builds up below the board; click any heading there to fold it away.</p>`,
        draw(g, s, t, api) { fanBoard(g, t, api); },
      },
      {
        part: 'What we already know',
        title: 'The tools',
        text: `<p>Seven facts, lettered (A) to (G). The one doing most of the work is (E): the area under a bell times a turning arrow.</p>
               <p>On the board, the shaded area is \\(e^{-u^2/2}\\cos\\kappa u\\) (the real part; the imaginary part cancels). Drag \\(\\kappa\\) and compare the area with \\(\\sqrt{2\\pi}e^{-\\kappa^2/2}\\).</p>`,
        controls: [{ type: 'range', key: 'kap', label: 'κ', min: 0, max: 4, step: 0.05, fmt: (v) => `κ = ${v.toFixed(2)}` }],
        draw(g, s, t, api) {
          const c = g.col, P = g.plot({ box: [0.06, 0.1, 0.9, 0.62], x: [-5, 5], y: [-1.1, 1.2] });
          P.axes({ ticks: [[-4, '−4'], [-2, '−2'], [0, '0'], [2, '2'], [4, '4']] });
          const f = (u) => Math.exp(-u * u / 2) * Math.cos(s.kap * u);
          P.area(f, { pos: c.good, neg: c.bad, alpha: 0.3 * ease(t / 0.8) });
          [1, -1].forEach((sg) => P.curve((u) => sg * Math.exp(-u * u / 2), { color: c.muted, width: 1.2, dash: [5, 5] }));
          P.curve(f, { color: c.ink, width: 2.4 });
          let area = 0; const du = 0.002; for (let u = -12; u <= 12; u += du) area += f(u) * du;
          api.legend([['e^(−u²/2) cos κu', c.ink], ['area above', c.good], ['area below', c.bad]]);
          api.verdict(`area = ${F(area, 4)},   √(2π)·e^(−κ²/2) = ${F(Math.sqrt(TAU) * Math.exp(-s.kap * s.kap / 2), 4)}`, 'good');
        },
      },
      {
        part: 'Derivation',
        title: 'The wavelet and its copies',
        text: `<p>One wave inside a bell, slid to a time \\(b\\) and stretched by a scale \\(a\\). The wavelet transform \\(W(a,b)\\) is how well the signal matches each copy.</p>
               <p>Drag the frequency: the copy gets shorter as it gets faster, but keeps the same shape.</p>`,
        controls: [{ type: 'range', key: 'fw', label: 'Wavelet frequency', min: 10, max: 100, step: 1, fmt: (v) => `${v} Hz` }],
        draw(g, s, t, api) { const a = waveletBoard(g, s.fw, W0, t, api, { width: false }); api.verdict(`a = ${F(a * 1000, 2)} ms`, 'good'); },
      },
      {
        part: 'Derivation',
        title: 'Each scale is a frequency',
        text: `<p>The arrow inside a copy turns at \\(\\omega_0/a\\) radians per second, so the scale \\(a\\) and the frequency \\(f\\) are the same thing in different units.</p>
               <p>Every copy holds about one cycle per \\(a\\): fast rows get a short burst, slow rows a long one.</p>`,
        controls: [{ type: 'range', key: 'fw', label: 'Wavelet frequency', min: 10, max: 100, step: 1, fmt: (v) => `${v} Hz` }],
        draw(g, s, t, api) { const a = waveletBoard(g, s.fw, W0, t, api); api.verdict(`a = ${F(a * 1000, 2)} ms,   f·a = ${F(s.fw * a, 3)}`, 'good'); },
      },
      {
        part: 'Derivation',
        title: 'A steady tone',
        text: `<p>Put one tone through every row. Each row answers with a bell-shaped strength (11), largest in the row whose frequency matches the tone, and the same at every time \\(b\\).</p>
               <p>On the board, each row’s answer divided by the peak. Move the tone and watch the half-height band stay ±20% wide.</p>`,
        controls: [{ type: 'range', key: 'f0', label: 'Tone frequency', min: 8, max: 120, step: 1, fmt: (v) => `${v} Hz` }],
        draw(g, s, t, api) { const b = toneBoard(g, s.f0, W0, t, api); api.verdict(`rows from ${F(b[0], 1)} to ${F(b[1], 1)} Hz hear it at half height or more`, 'good'); },
      },
      {
        part: 'Derivation',
        title: 'A sharp knock',
        text: `<p>A knock contains every frequency, so every row lights up, but each one for a time proportional to its scale. The map of one knock is a cone pointing at the moment it happened.</p>
               <p>The board is (15), drawn for one knock at the centre.</p>`,
        controls: [{ type: 'range', key: 'k6', label: 'Read the row at', min: 15, max: 800, step: 5, fmt: (v) => `${v} Hz` }],
        draw(g, s, t, api) {
          const c = g.col, ctx = g.ctx, T0 = -0.15, T1 = 0.15, lo = 10, hi = 1000, cols = 200, rows = 80;
          const P = tfPlane(g, [0.12, 0.08, 0.84, 0.66], T0, T1, lo, hi);
          const im = heatImage('cone', cols, rows, (i, j) => { const b = T0 + (T1 - T0) * (i + 0.5) / cols, f = P.fOf(j, rows); return knockW(1, 0, b, f) * Math.sqrt(scale(f)); }, 0.8);
          P.image(im, ease(t / 1.2)); P.frame(); P.fticks([10, 100, 1000]); P.tticks([-0.1, 0, 0.1]);
          const hw = dtFull(s.k6) / 2, y = P.fy(s.k6);
          ctx.strokeStyle = c.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P.X(Math.max(T0, -hw)), y); ctx.lineTo(P.X(Math.min(T1, hw)), y); ctx.stroke();
          api.legend([['one knock (each row scaled to its peak)', c.orange], ['half-height width of that row', c.accent]]);
          api.verdict(`at ${s.k6} Hz the flash lasts ${F(2 * hw * 1000, 1)} ms`, 'good');
        },
      },
      {
        part: 'What it means',
        title: 'Every mark has the same area',
        text: `<p>Measured at half height, a mark is \\(2.355a\\) long and \\(0.39f\\) tall. Multiply, and \\(a\\) cancels: every mark on a wavelet map has the same area, 0.88. The board shows rows at 20, 40, 80, 160 and 320 Hz.</p>
               <p>Switch to the short-time FFT: its marks have the same area too, but one shape for every row.</p>`,
        controls: [{ type: 'choice', key: 'tile', options: [['wav', 'Wavelet'], ['stft', 'Short-time FFT']] }],
        draw(g, s, t, api) {
          const c = g.col, ctx = g.ctx, T = 0.4, FMAX = 460;
          const P = g.plot({ box: [0.1, 0.08, 0.86, 0.66], x: [0, T], y: [0, FMAX] });
          P.axes({ ticks: [0, 0.1, 0.2, 0.3, 0.4].map((x) => [x, `${F(x * 1000, 0)} ms`]) });
          [0, 100, 200, 300, 400].forEach((f) => g.text(`${f} Hz`, P.l - 8, P.Y(f), { size: 11, align: 'right' }));
          const k = ease(t / 1.2), fs = [20, 40, 80, 160, 320];
          fs.forEach((f, i) => {
            const dt = s.tile === 'wav' ? dtFull(f) : dtFull(60), df = (4 * Math.log(2) / PI) / dt;
            const n = Math.floor(T / dt + 1e-9);
            for (let m = 0; m < n; m++) {
              const x0 = P.X(m * dt), x1 = P.X((m + 1) * dt), y0 = P.Y(f + df / 2), y1 = P.Y(Math.max(0, f - df / 2));
              ctx.globalAlpha = 0.2 * k; ctx.fillStyle = i % 2 ? c.orange : c.blue; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
              ctx.globalAlpha = k; ctx.strokeStyle = i % 2 ? c.orange : c.blue; ctx.lineWidth = 1.1; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
            }
          });
          ctx.globalAlpha = 1;
          api.legend([['one mark: Δt wide, Δf tall (half height)', c.blue]]);
          api.verdict(s.tile === 'wav' ? 'Wavelet: tall and thin up high, short and wide down low' : 'Short-time FFT: one shape for every row', s.tile === 'wav' ? 'good' : 'bad');
        },
      },
      {
        part: 'What it means',
        title: 'Choosing ω₀',
        text: `<p>\\(\\omega_0\\) sets how many wiggles sit under the bell. More wiggles: sharper in frequency, longer in time. The area of a mark does not change.</p>
               <p>Below about 5 the wavelet no longer averages to zero. 6 is the usual choice.</p>`,
        controls: [{ type: 'range', key: 'w0', label: 'ω₀', min: 3, max: 14, step: 0.5, fmt: (v) => `ω₀ = ${v.toFixed(1)}` }],
        draw(g, s, t, api) {
          waveletBoard(g, 25, s.w0, t, api, { box: [0.06, 0.06, 0.9, 0.36], span: 0.5 });
          toneBoard(g, 25, s.w0, t, { legend() {}, verdict() {} }, { box: [0.08, 0.56, 0.88, 0.3] });
          api.verdict(`at 25 Hz: Δt = ${F(dtFull(25, s.w0) * 1000, 0)} ms, Δf = ${F(dfFull(25, s.w0), 1)} Hz,   mean of ψ = ${(Math.sqrt(TAU) * Math.exp(-s.w0 * s.w0 / 2)).toExponential(1)}`, s.w0 >= 5 ? 'good' : 'bad');
        },
      },
      {
        part: 'Worked example 1',
        title: 'The hum and the knock',
        text: `<p>The fan from the video: 1,500 rpm, a 25 Hz hum, and a knock once per turn that rings near 400 Hz. Size the marks by hand.</p>
               <p>The dashed outlines on the map are the half-height sizes from the working: one knock at 400 Hz, and the same knock as the 25 Hz row would see it.</p>`,
        draw(g, s, t, api) { fanBoard(g, t, api, { widths: true, reveal: false }); api.verdict('400 Hz: 5.6 ms flashes, 40 ms apart', 'good'); },
      },
      {
        part: 'Worked example 2',
        title: 'Equally bright, not equally big',
        text: `<p>Two steady bands on one map, equally bright. With the \\(1/\\sqrt a\\) convention the slow one is four times smaller than it looks.</p>
               <p>Switch the convention on the board: with \\(1/a\\), equal amplitudes are equally bright.</p>`,
        controls: [{ type: 'choice', key: 'nrm', options: [['sqrt', '1/√a (as derived)'], ['lin', '1/a']] }],
        draw(g, s, t, api) {
          const c = g.col, lo = 12, hi = 1000, rows = 90, cols = 2, A1 = ampFrom(EX.Wr, F1), A2 = ampFrom(EX.Wr, FR);
          const P = tfPlane(g, [0.14, 0.08, 0.54, 0.66], 0, 1, lo, hi);
          const val = (f) => { const v = toneW(A1, F1, f) + toneW(A2, FR, f); return s.nrm === 'sqrt' ? v : v / Math.sqrt(scale(f)); };
          const im = heatImage('two-' + s.nrm, cols, rows, (i, j) => val(P.fOf(j, rows)), 0.7);
          P.image(im, ease(t / 1.0)); P.frame(); P.fticks([25, 100, 400]);
          const B = g.plot({ box: [0.74, 0.08, 0.22, 0.66], x: [0, 3], y: [0, 6] });
          B.axes();
          [[1, A1, c.blue, '25 Hz'], [2, A2, c.orange, '400 Hz']].forEach(([x, A, col, lab]) => {
            g.ctx.fillStyle = col; g.ctx.fillRect(B.X(x) - 9, B.Y(A), 18, B.Y(0) - B.Y(A));
            g.text(lab, B.X(x), B.Y(0) + 13, { size: 11 }); g.text(`${F(A, 2)}`, B.X(x), B.Y(A) - 9, { size: 11, color: c.ink });
          });
          api.legend([['wavelet map, two steady tones', c.orange], ['true amplitudes, mm/s', c.muted]]);
          api.verdict(s.nrm === 'sqrt' ? 'Same brightness, 4× different amplitude' : 'Brightness now follows amplitude', s.nrm === 'sqrt' ? 'bad' : 'good');
        },
      },
      {
        part: 'Your turn',
        title: 'Try it with a calculator',
        tryLabel: 'Your answers',
        text: (s) => {
          if (!s.ex) newEx(s);
          const { rpm, A } = s.ex;
          return `<div class="problem"><p>A machine runs at ${rpm} rpm with a 1X vibration of ${F(A, 1)} mm/s. Its wavelet map uses a Morlet wavelet with \\(\\omega_0=6\\) and the \\(1/\\sqrt a\\) convention.</p>
                  <p>Find the scale of the 1X row, how bright its band is, and how long a knock’s flash lasts in that row.</p></div>`;
        },
        controls: [
          { type: 'answer', label: 'Scale of the 1X row, \\(a\\)', unit: 'ms', value: (s) => exNums(s).a * 1000, rel: 0.02 },
          { type: 'answer', label: 'Brightness of the band, \\(|W|\\)', unit: 'mm/s·√s', value: (s) => exNums(s).W, rel: 0.02 },
          { type: 'answer', label: 'Flash length, \\(\\Delta t\\)', unit: 'ms', value: (s) => exNums(s).dt * 1000, rel: 0.02 },
          { type: 'check' },
          { type: 'button', label: 'Show working', action: (s, api) => { s.showSol = true; api.rewrite(); } },
          { type: 'button', label: 'New numbers', action: (s, api) => { newEx(s); api.refresh(); api.rewrite(); } },
        ],
        draw(g, s, t, api) {
          if (!s.ex) newEx(s);
          const E = exNums(s), span = Math.max(0.12, 3.2 * E.a * 2.5);
          waveletBoard(g, E.f, W0, t, api, { span, width: !!s.showSol });
        },
      },
      {
        part: 'Summary',
        title: 'On one card',
        text: `<p>Four boxed results. Scale is frequency; a tone is a band whose brightness gives its amplitude; a knock is a cone; and every mark has the same area, 0.88.</p>
               <p>That is the end of the FFT series in the Lab.</p>`,
        draw(g, s, t, api) { fanBoard(g, t, api, { widths: true }); },
      },
    ],
  });
})();
