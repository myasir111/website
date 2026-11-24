// Physics 5: plate modes. Derive why sand on a vibrating plate draws a pattern: why grains jump, why two
// waves make a fixed shape, the plate equation, why bending waves shorten as frequency rises, which
// frequencies fit, and what that means for where a sensor or a brace goes. Then work the film's plate
// and a steel duct panel by hand. Plate data (the film's centre-driven aluminium plate) is in data.js.
(function () {
  const { TAU, ease } = Lab;
  const r = String.raw;
  const F = (v, d = 4) => { const x = +(+v).toFixed(d); return (Object.is(x, -0) || Math.abs(x) < 1e-12 ? 0 : x).toString(); };
  const P8 = window.PLATE;

  // ---- truth: every number on the boards and in the examples is computed here
  const G0 = 9.81, ZETA = 0.005;
  const plateD = (E, h, nu) => E * h ** 3 / (12 * (1 - nu * nu));
  const lam = (D, rh, f) => TAU * (D / (rh * (TAU * f) ** 2)) ** 0.25;             // bending wavelength (14)
  const FILM = { E: 69e9, h: 1e-3, nu: 0.33, rho: 2700, L: 0.24 };
  FILM.D = plateD(FILM.E, FILM.h, FILM.nu); FILM.rh = FILM.rho * FILM.h;
  const PANEL = { E: 200e9, h: 3e-3, nu: 0.3, rho: 7850, a: 0.8, b: 0.6 };
  PANEL.D = plateD(PANEL.E, PANEL.h, PANEL.nu); PANEL.rh = PANEL.rho * PANEL.h;
  const fSS = (p, m, n) => (Math.PI / 2) * ((m / p.a) ** 2 + (n / p.b) ** 2) * Math.sqrt(p.D / p.rh);   // (29)
  const I967 = P8.modes.findIndex((m) => Math.abs(m.f - P8.f967) < 1);

  // decode a mode grid (61 x 61, int8, row = y)
  const decoded = [];                                                // decoded on first use (the notes builder never draws)
  const grids = new Proxy([], { get: (_, k) => { const i = +k; if (!decoded[i]) { const b = atob(P8.modes[i].g), a = new Float32Array(b.length); for (let j = 0; j < b.length; j++) a[j] = ((b.charCodeAt(j) << 24) >> 24) / 127; decoded[i] = a; } return decoded[i]; } });
  const GN = 61;
  const gridAt = (G, x, y) => {                                     // bilinear, x and y in [-1, 1]
    const fx = (x + 1) / 2 * (GN - 1), fy = (y + 1) / 2 * (GN - 1);
    const i = Math.min(GN - 2, Math.max(0, fx | 0)), j = Math.min(GN - 2, Math.max(0, fy | 0)), tx = fx - i, ty = fy - j;
    return (1 - tx) * (1 - ty) * G[j * GN + i] + tx * (1 - ty) * G[j * GN + i + 1] + (1 - tx) * ty * G[(j + 1) * GN + i] + tx * ty * G[(j + 1) * GN + i + 1];
  };
  // response of the centre-driven plate at a point on the x axis (u = 0 centre .. 1 edge), modal sum (22)
  const lineW = (md, u) => { const k = Math.min(49.999, Math.max(0, u * 50)), i = k | 0, t = k - i; return md.w[i] * (1 - t) + md.w[i + 1] * t; };
  function respAt(u, f) {
    const w = TAU * f; let re = 0, im = 0;
    for (const md of P8.sensor) {
      const wn = TAU * md.Om * P8.scale, num = md.G * lineW(md, u) * w * w, dr = wn * wn - w * w, di = 2 * ZETA * wn * w, den = dr * dr + di * di;
      re += num * dr / den; im -= num * di / den;
    }
    return Math.hypot(re, im);
  }
  const FS = []; for (let f = 100; f <= 2000; f += 4) FS.push(f);
  const refMemo = {};
  const spectrum = (u) => { const k = u.toFixed(3); return refMemo[k] || (refMemo[k] = FS.map((f) => respAt(u, f))); };

  // ---- drawing helpers
  const hex = (s) => { s = s.trim(); if (s[0] === '#' && s.length === 7) return [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)); const m = s.match(/\d+/g); return m ? m.slice(0, 3).map(Number) : [128, 128, 128]; };
  function square(g, box, aspect = 1) {                               // the largest rectangle of height/width = aspect inside a box
    const l = box[0] * g.w, t = box[1] * g.h, w = box[2] * g.w, h = box[3] * g.h, s = Math.min(w, h / aspect);
    return { x: l + (w - s) / 2, y: t + (h - s * aspect) / 2, s, a: aspect };
  }
  const RES = 140; let off = null;
  function field(g, sq, fn, o = {}) {                                 // fn(x, y) -> [r, g, b] for x, y in [-1, 1]
    if (!off) { off = document.createElement('canvas'); off.width = off.height = RES; }
    const ctx = off.getContext('2d'), img = ctx.createImageData(RES, RES);
    for (let j = 0; j < RES; j++) for (let i = 0; i < RES; i++) {
      const x = -1 + 2 * (i + 0.5) / RES, y = 1 - 2 * (j + 0.5) / RES, c = fn(x, y), k = 4 * (j * RES + i);
      img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const G = g.ctx; G.save(); G.imageSmoothingEnabled = true; G.globalAlpha = o.alpha ?? 1;
    G.drawImage(off, sq.x, sq.y, sq.s, sq.s * (sq.a || 1)); G.restore();
    G.strokeStyle = g.col.line; G.lineWidth = 1; G.strokeRect(sq.x, sq.y, sq.s, sq.s * (sq.a || 1));
  }
  const mixc = (a, b, k) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * k));
  function sandColours(g) { const bg = hex(g.col.bg), ln = hex(g.col.line), ink = hex(g.col.ink); return { plate: mixc(bg, ln, 0.55), sand: mixc(ink, [233, 220, 192], 0.35) }; }
  function heatColours(g) { return { zero: mixc(hex(g.col.bg), hex(g.col.line), 0.5), up: hex(g.col.orange), dn: hex(g.col.blue), node: hex(g.col.ink) }; }
  const sandFn = (C, W) => (x, y) => mixc(C.plate, C.sand, Math.exp(-((W(x, y) / 0.06) ** 2)));
  const heatFn = (C, W, k = 1, lines = true) => (x, y) => {
    const v = W(x, y) * k, c = mixc(C.zero, v > 0 ? C.up : C.dn, Math.min(1, Math.abs(v) * 1.4));
    return lines ? mixc(c, C.node, 0.85 * Math.exp(-((W(x, y) / 0.03) ** 2))) : c;
  };
  const sinPanel = (m, n) => (x, y) => Math.sin(m * Math.PI * (x + 1) / 2) * Math.sin(n * Math.PI * (y + 1) / 2);

  // ---- the examples
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const newEx = (s) => { s.ex = { a: pick([0.6, 0.7, 0.9, 1.0, 1.2]), b: pick([0.4, 0.5, 0.6]), h: pick([2, 3, 4, 5]) }; if (s.ex.b >= s.ex.a) s.ex.b = 0.4; s.showSol = false; };
  const exNums = (s) => {
    const p = { E: 200e9, nu: 0.3, rho: 7850, a: s.ex.a, b: s.ex.b, h: s.ex.h / 1000 }; p.D = plateD(p.E, p.h, p.nu); p.rh = p.rho * p.h;
    const f11 = fSS(p, 1, 1), f21 = fSS(p, 2, 1); return { p, f11, f21, lam: lam(p.D, p.rh, f11) };
  };

  // ---- the working
  const WORK = [];

  // 1. The puzzle
  WORK.push([
    ['>By the end of this lesson we will have answered:'],
    ['>Why does the sand jump at all, and why does it stop on lines?'],
    ['>Why do only some frequencies make a pattern, and why are higher ones busier?'],
    ['>Why does a sensor on a line miss a peak, and why does a brace there do nothing?'],
    ['>Then we solve two examples with every operation shown, and you try one yourself.'],
  ]);

  // 2. Tools
  WORK.push([
    ['>Add \\(\\sin(a-b)=\\sin a\\cos b-\\cos a\\sin b\\) and \\(\\sin(a+b)=\\sin a\\cos b+\\cos a\\sin b\\):'],
    [r`\sin(a-b)+\sin(a+b)=2\sin a\cos b`, '← check it on the board', 'A'],
    ['>Steady vibration at \\(\\omega\\): if \\(w=W\\cos\\omega t\\), differentiate twice:'],
    [r`\ddot w=-\omega^2W\cos\omega t=-\omega^2w`, '', 'B'],
    ['>Newton’s second law for a small patch of plate, \\(dx\\) by \\(dy\\): its mass times its acceleration is the net force on it.'],
    [r`\rho h\,dx\,dy\;\ddot w=\text{net force}`, '', 'C'],
    ['>The bending stiffness of a plate of thickness \\(h\\), Young’s modulus \\(E\\) and Poisson’s ratio \\(\\nu\\). We take it from plate theory (Kirchhoff; see Leissa 1969):'],
    [r`D=\frac{Eh^3}{12(1-\nu^2)}`, '', 'D'],
    ['>The biharmonic operator, the Laplacian applied twice:'],
    [r`\nabla^4=\frac{\partial^4}{\partial x^4}+2\frac{\partial^4}{\partial x^2\partial y^2}+\frac{\partial^4}{\partial y^4}`, '', 'E'],
    ['>A wave of wavelength \\(\\lambda\\) has wavenumber'],
    [r`k=\frac{2\pi}{\lambda}`, '', 'F'],
  ]);

  // 3. Why grains jump
  WORK.push([
    ['>A grain resting where the plate moves as \\(w=W\\cos\\omega t\\) is carried with it. By (B) the plate’s acceleration there is'],
    [r`\ddot w=-\omega^2W\cos\omega t`, '', 1],
    ['>Its largest downward value is \\(\\omega^2|W|\\). If that beats gravity, the plate falls away faster than the grain can: the grain leaves the surface and lands somewhere else.'],
    [r`\omega^2|W|>g\iff|W|>\frac{g}{\omega^2}`, '← the grain jumps', 2, 'box'],
    ['>At 967 Hz:'],
    [r`\frac{g}{\omega^2}=\frac{9.81}{(2\pi\times967)^2}=${F(G0 / (TAU * 967) ** 2 * 1e6, 3)}\times10^{-6}\ \text{m}`, '← about a quarter of a micrometre', 3],
    ['>Grains keep hopping until they land where the plate moves less than that. The stillest places of all, where they pile up, are the lines \\(W=0\\).'],
  ]);

  // 4. Standing waves
  WORK.push([
    ['>A bending wave running along \\(x\\), and its reflection from the edge running back:'],
    [r`\sin(kx-\omega t)\qquad\text{and}\qquad\sin(kx+\omega t)`, '', 4],
    ['>Add them, using (A) with \\(a=kx\\) and \\(b=\\omega t\\):'],
    [r`\sin(kx-\omega t)+\sin(kx+\omega t)=2\sin(kx)\cos(\omega t)`, '← a shape times a clock', 5, 'box'],
    ['>Nothing travels any more. The shape \\(2\\sin kx\\) stays put, and every point moves to the same clock \\(\\cos\\omega t\\). Where \\(\\sin kx=0\\), the point never moves:'],
    [r`kx=n\pi\iff x=\frac{n\pi}{k}=n\,\frac{\lambda}{2}`, '← nodes, half a wavelength apart (F)', 6, 'box'],
  ]);

  // 5. Plate equation
  WORK.push([
    ['>Plate theory gives the net bending force on the patch as \\(-D\\,\\nabla^4w\\,dx\\,dy\\). Put it into (C) and divide by \\(dx\\,dy\\):'],
    [r`\rho h\,\ddot w=-D\,\nabla^4w`, '', 7],
    [r`D\,\nabla^4w+\rho h\,\ddot w=0`, '← the plate equation', 8, 'box'],
    ['>Look for a shape times a clock, as (5) suggests: \\(w=W(x,y)\\cos\\omega t\\). By (B), \\(\\ddot w=-\\omega^2W\\cos\\omega t\\):'],
    [r`D\,\nabla^4W\cos\omega t-\rho h\,\omega^2W\cos\omega t=0`, '', 9],
    ['>Divide by \\(\\cos\\omega t\\):'],
    [r`D\,\nabla^4W=\rho h\,\omega^2W`, '← a shape that bends back into itself', 10, 'box'],
    ['>Only some shapes \\(W\\) do that, each with its own \\(\\omega\\). Those pairs are the plate’s modes.'],
  ]);

  // 6. Dispersion
  WORK.push([
    ['>Try a wave along \\(x\\), \\(W=\\sin kx\\). Each derivative brings out a \\(k\\); four of them bring back the same sine:'],
    [r`\frac{d^4}{dx^4}\sin kx=k^4\sin kx`, '', 11],
    ['>Into (10):'],
    [r`Dk^4\sin kx=\rho h\,\omega^2\sin kx\;\Rightarrow\;Dk^4=\rho h\,\omega^2`, '', 12],
    [r`\omega=k^2\sqrt{\frac{D}{\rho h}}`, '← bending waves', 13, 'box'],
    ['>A string has \\(\\omega=ck\\): double the frequency, half the wavelength. A plate’s \\(\\omega\\) grows with \\(k^2\\), so bending waves are dispersive. Solve (13) for \\(k\\) and use (F):'],
    [r`k=\left(\frac{\rho h\,\omega^2}{D}\right)^{1/4}\;\Rightarrow\;\lambda=2\pi\left(\frac{D}{\rho h\,\omega^2}\right)^{1/4}`, '', 14, 'box'],
    [r`\lambda\propto\frac{1}{\sqrt f}`, '← double the frequency: 0.71 times the wavelength', 15],
  ]);

  // 6b. Why only some waves fit: the echoes have to line up
  WORK.push([
    ['>A wave on the plate doesn’t bounce once. Every round trip of length \\(2L\\) leaves another copy on top of the last, shifted in phase by \\(2kL\\); with a little loss \\(r\\) per trip the copies add up to'],
    [r`S=\sum_{n=0}^{N-1} r^n e^{\,i\,n\,2kL}`, '', 'E1'],
    ['>They all line up only when the shift is a whole number of turns. Any other wavelength and they land out of step and cancel:'],
    [r`2kL=2\pi m\iff k_m=\frac{m\pi}{L}`, '← only these waves build up', 'E2', 'box'],
    ['>That is why a plate only rings at certain frequencies: (13) turns each fitting \\(k\\) into its own \\(\\omega\\). The next step does it exactly for a panel.'],
  ]);

  // 7. Fitting: a simply supported panel
  WORK.push([
    ['>Edges that are held but free to turn (simply supported) need \\(W=0\\) all round an \\(a\\) by \\(b\\) panel. A wave with a whole number of half-waves each way does that:'],
    [r`W_{mn}=\sin\frac{m\pi x}{a}\,\sin\frac{n\pi y}{b},\qquad m,n=1,2,3,\dots`, '', 16],
    ['>Apply (E). Each \\(x\\)-derivative pair brings \\(-(m\\pi/a)^2\\), each \\(y\\)-pair \\(-(n\\pi/b)^2\\), and the middle term gives the cross product:'],
    [r`\nabla^4W_{mn}=\left[\left(\frac{m\pi}{a}\right)^2+\left(\frac{n\pi}{b}\right)^2\right]^2W_{mn}`, '', 17],
    ['>Into (10), then take the square root:'],
    [r`\omega_{mn}=\pi^2\left[\left(\frac{m}{a}\right)^2+\left(\frac{n}{b}\right)^2\right]\sqrt{\frac{D}{\rho h}}`, '← only these frequencies', 18, 'box'],
    ['>This is (13) with \\(k^2=(m\\pi/a)^2+(n\\pi/b)^2\\): the wave has to fit, fitting fixes \\(k\\), and \\(k\\) fixes \\(\\omega\\). The nodal lines are where a sine is zero: \\(m-1\\) lines across \\(x\\), \\(n-1\\) across \\(y\\).'],
  ]);

  // 8. The free, centre-driven plate
  WORK.push([
    ['>A plate with free edges, bolted at its centre, has no neat formula: its edges must carry no bending moment and no shear, and no product of sines manages that. Its modes are found numerically (here by the Ritz method), as frequency parameters \\(\\Omega\\):'],
    [r`f=\frac{\Omega}{2\pi L^2}\sqrt{\frac{D}{\rho h}}`, '', 19, 'box'],
    ['>For a completely free square plate with \\(\\nu=0.3\\), the first three are \\(\\Omega=13.47\\), 19.60 and 24.27, the values in the literature; our solver gives the same. For the film’s plate, aluminium, 240 mm square and 1 mm thick:'],
    [r`D=\frac{69\times10^{9}\times(10^{-3})^3}{12(1-0.33^2)}=${F(FILM.D, 3)}\ \text{N m},\qquad\rho h=2700\times10^{-3}=2.7\ \text{kg/m}^2`, '', 20],
    [r`f=\Omega\times\frac{1}{2\pi\times0.24^2}\sqrt{\frac{${F(FILM.D, 3)}}{2.7}}=\Omega\times${F(P8.scale, 3)}\ \text{Hz}`, '', 21],
    ['>A shaker at the centre drives only the fully symmetric modes: the others move up on one side as much as down on the other, and the centre’s push cancels. Those are the figures sand draws on a shaker plate.'],
  ]);

  // 8b. Why a peak: one mode, pushed
  WORK.push([
    ['>Each mode behaves like a mass on a spring with a damper. Its motion \\(q\\), pushed at \\(\\omega\\):'],
    [r`\ddot q+2\zeta\omega_n\dot q+\omega_n^2 q=f\cos\omega t`, '', 'P1'],
    ['>Try \\(q=Q\\cos(\\omega t-\\varphi)\\): differentiate twice, collect the cosine and sine parts, and the size of the swing is'],
    [r`|Q|=\frac{f}{\sqrt{(\omega_n^2-\omega^2)^2+(2\zeta\omega_n\omega)^2}}`, '', 'P2', 'box'],
    ['>Push in time, \\(\\omega=\\omega_n\\), and the first bracket vanishes: only the damping holds it back.'],
    [r`|Q|_{\omega=\omega_n}=\frac{1}{2\zeta}\,\frac{f}{\omega_n^2}`, '← 1/2ζ times the push alone', 'P3', 'box'],
    [r`\zeta=0.005\;\Rightarrow\;\frac{1}{2\zeta}=100`, '← the film’s plate', ''],
    ['>A plate is many modes at once. Sum them, each weighted by its shape where you look, and you get (22) in the next step: one peak per mode.'],
  ]);

  // 9. Sensors and braces
  WORK.push([
    ['>Drive at \\(\\omega\\) and a point \\(x\\) moves as a sum over all the modes, each weighted by its own shape at \\(x\\) (with damping \\(\\zeta\\)):'],
    [r`a(x,\omega)\propto\sum_n\frac{\Gamma_n\,W_n(x)\,\omega^2}{\omega_n^2-\omega^2+2i\zeta\omega_n\omega}`, '', 22, 'box'],
    ['>Near \\(\\omega_n\\) one term is huge: a peak. But if the sensor sits where \\(W_n(x)=0\\), that term is zero whatever \\(\\omega\\) is:'],
    [r`W_n(x)=0\;\Rightarrow\;\text{no peak at }\omega_n`, '', 23, 'box'],
    ['>A brace pins one point: \\(w=0\\) there. A mode with \\(W_n=0\\) at that point already obeys that, so it is still a mode, at the same frequency. Any other mode no longer fits, and the frequencies near it move.'],
    [r`W_n(x_b)=0\Rightarrow\omega_n\ \text{unchanged};\qquad W_n(x_b)\neq0\Rightarrow\omega_n\ \text{moves}`, '', 24],
  ]);

  // 10. Example 1: the film's plate
  {
    const md = P8.modes[I967], l = lam(FILM.D, FILM.rh, md.f);
    WORK.push([
      ['>Worked example 1. The film’s plate, driven at its ring pattern. Its frequency parameter is \\(\\Omega=' + F(md.Om, 1) + '\\). By (21):'],
      [r`f=${F(md.Om, 1)}\times${F(P8.scale, 3)}=${F(md.f, 0)}\ \text{Hz}`, '', 25],
      ['>Where does sand jump? By (3), wherever the plate moves more than \\(0.27\\ \\mu\\text{m}\\). The bending wavelength, by (14):'],
      [r`\lambda=2\pi\left(\frac{${F(FILM.D, 3)}}{2.7\times(2\pi\times${F(md.f, 0)})^2}\right)^{1/4}=2\pi\times${F(l / TAU, 5)}=${F(l, 3)}\ \text{m}`, '', 26],
      ['>So nodal lines sit roughly \\(\\lambda/2\\approx' + F(l * 500, 0) + '\\) mm apart, as on the plate. By (23), a sensor on the ring (63 mm out along an axis) reads the 967 Hz peak about 24 dB lower than one 33 mm out, inside the ring.'],
    ]);
  }

  // 11. Example 2: a steel duct panel
  {
    const p = PANEL, s = Math.sqrt(p.D / p.rh), f11 = fSS(p, 1, 1), f21 = fSS(p, 2, 1), f12 = fSS(p, 1, 2);
    WORK.push([
      ['>Worked example 2. A steel duct panel, 0.8 m by 0.6 m and 3 mm thick, simply supported at its edges. \\(E=200\\) GPa, \\(\\nu=0.3\\), \\(\\rho=7850\\ \\text{kg/m}^3\\). By (D):'],
      [r`D=\frac{200\times10^9\times0.003^3}{12(1-0.3^2)}=${F(p.D, 1)}\ \text{N m},\qquad\rho h=7850\times0.003=${F(p.rh, 2)}\ \text{kg/m}^2`, '', 27],
      [r`\sqrt{D/\rho h}=\sqrt{${F(p.D, 1)}/${F(p.rh, 2)}}=${F(s, 3)}\ \text{m}^2/\text{s}`, '', 28],
      ['>From (18), divided by \\(2\\pi\\) for hertz:'],
      [r`f_{mn}=\frac{\pi}{2}\left[\left(\frac{m}{a}\right)^2+\left(\frac{n}{b}\right)^2\right]\sqrt{\frac{D}{\rho h}}`, '', 29, 'box'],
      [r`f_{11}=\frac{\pi}{2}\left[\frac{1}{0.64}+\frac{1}{0.36}\right]\times${F(s, 3)}=\frac{\pi}{2}\times${F(1 / 0.64 + 1 / 0.36, 3)}\times${F(s, 3)}=${F(f11, 1)}\ \text{Hz}`, '', 30],
      [r`f_{21}=\frac{\pi}{2}\left[\frac{4}{0.64}+\frac{1}{0.36}\right]\times${F(s, 3)}=\frac{\pi}{2}\times${F(4 / 0.64 + 1 / 0.36, 3)}\times${F(s, 3)}=${F(f21, 1)}\ \text{Hz}`, '', 31],
      ['>The (2,1) mode has a nodal line down the middle, \\(x=a/2\\); the (1,2) mode at ' + F(f12, 1) + ' Hz has one across it, \\(y=b/2\\). A single brace at the panel’s centre sits on both. By (24) it leaves 65 Hz and 91 Hz alone and only stops the 31 Hz mode. To stop 65 Hz, brace where (2,1) moves most: \\(x=a/4\\) or \\(3a/4\\).'],
    ]);
  }

  // 12. Your turn
  WORK.push((s) => {
    if (!s.ex) newEx(s);
    const { a, b, h } = s.ex, E = exNums(s), sq = Math.sqrt(E.p.D / E.p.rh);
    const given = [
      ['>Your turn. A simply supported steel panel (\\(E=200\\) GPa, \\(\\nu=0.3\\), \\(\\rho=7850\\ \\text{kg/m}^3\\)):'],
      [r`a=${a}\ \text{m},\qquad b=${b}\ \text{m},\qquad h=${h}\ \text{mm}`, '', 32],
    ];
    if (!s.showSol) return given;
    return [
      ...given,
      ['>By (D):'],
      [r`D=\frac{200\times10^9\times${F(h / 1000, 4)}^3}{12\times0.91}=${F(E.p.D, 2)}\ \text{N m},\qquad\sqrt{\frac{D}{\rho h}}=\sqrt{\frac{${F(E.p.D, 2)}}{${F(E.p.rh, 3)}}}=${F(sq, 4)}`, '', 33],
      ['>By (29):'],
      [r`f_{11}=\frac{\pi}{2}\left[\frac{1}{${F(a * a, 4)}}+\frac{1}{${F(b * b, 4)}}\right]${F(sq, 4)}=${F(E.f11, 2)}\ \text{Hz},\qquad f_{21}=\frac{\pi}{2}\left[\frac{4}{${F(a * a, 4)}}+\frac{1}{${F(b * b, 4)}}\right]${F(sq, 4)}=${F(E.f21, 2)}\ \text{Hz}`, '', 34],
      ['>By (14), at \\(f_{11}\\):'],
      [r`\lambda=2\pi\left(\frac{${F(E.p.D, 2)}}{${F(E.p.rh, 3)}\times(2\pi\times${F(E.f11, 2)})^2}\right)^{1/4}=${F(E.lam, 3)}\ \text{m}`, '', 35],
    ];
  });

  // 13. Summary
  WORK.push([
    ['>Everything in this lesson on one card:'],
    [r`\text{sand jumps where }\omega^2|W|>g;\ \text{it stays where }W=0`, '← (2)', '', 'box'],
    [r`2\sin kx\cos\omega t:\ \text{a shape times a clock}`, '← (5)', '', 'box'],
    [r`D\nabla^4W=\rho h\,\omega^2W,\qquad\omega=k^2\sqrt{D/\rho h}`, '← (10), (13)', '', 'box'],
    [r`\lambda=2\pi\left(\frac{D}{\rho h\,\omega^2}\right)^{1/4},\qquad f_{mn}=\frac{\pi}{2}\left[\frac{m^2}{a^2}+\frac{n^2}{b^2}\right]\sqrt{\frac{D}{\rho h}}`, '← (14), (29)', '', 'box'],
    [r`W_n(x)=0:\ \text{no peak there, and a brace there changes nothing}`, '← (23), (24)', '', 'box'],
    ['>Every peak in a spectrum is a shape somewhere. Where you measure, and where you stiffen, decides what you see and what you fix.'],
  ]);

  Lab.lesson({
    work: WORK,
    heads: true,
    next: '../',
    state: { amp: 1.0, kw: 2.5, fq: 967, mm: 2, nn: 1, brace: 'centre', mi: 3, u: 0.275, kap: 2.37, pr: 0.45, zt: 0.05 },
    steps: [
      {
        part: 'The puzzle',
        title: 'Why does the sand draw a ring?',
        text: `<p>Sand on a metal plate, shaken at 967 Hz, gathers into a ring and four curved lines. Nobody drew them. Change the frequency a little and the pattern falls apart; change it a lot and a busier one appears.</p><p>Why lines? Why only at some frequencies? And why would a sensor standing on one of those lines see almost nothing?</p>
               <p class="hint">The working builds up below the board. Click any heading there to fold it away.</p>`,
        draw(g, s, t, api) {
          const C = sandColours(g), G = grids[I967], sq = square(g, [0.05, 0.05, 0.9, 0.86]);
          field(g, sq, sandFn(C, (x, y) => gridAt(G, x, y) / Math.min(1, 0.2 + t)), {});
          api.legend([]); api.verdict(`the film’s plate, ${F(P8.modes[I967].f, 0)} Hz: sand on the lines W = 0`, 'good');
        },
      },
      {
        part: 'What we already know',
        title: 'The tools',
        text: `<p>Six facts, lettered (A) to (F). (A) does the work in this lesson: two sines add to a sine times a cosine. (D), the bending stiffness, is the one we take from plate theory.</p>
               <p>On the board, \\(\\sin(a-b)+\\sin(a+b)\\) and \\(2\\sin a\\cos b\\) are drawn on top of each other. Drag \\(b\\): they never part.</p>`,
        controls: [{ type: 'range', key: 'kw', label: 'b (in turns)', min: 0, max: 5, step: 0.05, fmt: (v) => `b = ${v.toFixed(2)} × 2π` }],
        draw(g, s, t, api) {
          const c = g.col, P = g.plot({ box: [0.06, 0.1, 0.9, 0.62], x: [0, 1], y: [-2.2, 2.2] }); P.axes();
          const b = TAU * s.kw * 0.1, k = ease(t / 1.2);
          const lhs = (x) => Math.sin(TAU * 2 * x - b) + Math.sin(TAU * 2 * x + b), rhs = (x) => 2 * Math.sin(TAU * 2 * x) * Math.cos(b);
          P.curve(lhs, { color: c.ink, width: 3.2, to: k }); P.curve(rhs, { color: c.orange, width: 1.4, to: k });
          let worst = 0; for (let i = 0; i <= 2000; i++) worst = Math.max(worst, Math.abs(lhs(i / 2000) - rhs(i / 2000)));
          api.legend([['sin(a − b) + sin(a + b)', c.ink], ['2 sin a cos b', c.orange]]);
          api.verdict(`largest difference anywhere: ${worst.toExponential(1)}`, 'good');
        },
      },
      {
        part: 'Derivation',
        title: 'Why the grains jump',
        text: `<p>A grain leaves the plate when the plate’s downward acceleration beats gravity: where \\(|W|>g/\\omega^2\\), only a quarter of a micrometre at 967 Hz (3).</p>
               <p>The board is a line across the plate through its centre. Drag how hard the plate is driven: orange is where grains jump, the dots where they come to rest.</p>`,
        controls: [{ type: 'range', key: 'amp', label: 'Largest motion on the plate', min: 0.1, max: 2, step: 0.01, fmt: (v) => `${v.toFixed(2)} µm` }],
        draw(g, s, t, api) {
          const c = g.col, th = G0 / (TAU * P8.f967) ** 2 * 1e6, sl = P8.slice967;
          const Wx = (x) => { const k = (x + 1) / 2 * (sl.length - 1), i = Math.min(sl.length - 2, k | 0), u = k - i; return sl[i] * (1 - u) + sl[i + 1] * u; };
          const P = g.plot({ box: [0.08, 0.08, 0.86, 0.66], x: [-1, 1], y: [0, 2.1] });
          P.axes();
          [[-1, '−120 mm', 'left'], [0, 'centre', 'center'], [1, '+120 mm', 'right']].forEach(([x, l, al]) => g.text(l, P.X(x), P.Y(0) + 14, { size: 11, align: al }));
          const k = ease(t / 0.8), A = (x) => k * s.amp * Math.abs(Wx(x));
          P.between(A, (x) => Math.min(A(x), th), { color: c.orange, alpha: 0.35 });
          P.curve(A, { color: c.ink, width: 2.6 });
          P.curve(() => th, { color: c.accent, width: 1.6, dash: [6, 4] });
          g.text('g/ω²', P.X(1) + 4, P.Y(th) - 12, { align: 'right', color: c.accent, size: 11 });
          let jump = 0; const N = 400;
          for (let i = 0; i <= N; i++) { const x = -1 + 2 * i / N; if (s.amp * Math.abs(Wx(x)) > th) jump++; else if (i % 3 === 0) P.dot(x, 0.08, { r: 2.4, color: c.muted }); }
          api.legend([['plate motion |W| along the line', c.ink], ['g/ω² = 0.27 µm', c.accent], ['grains jump', c.orange]]);
          api.verdict(`grains jump on ${F(100 * jump / (N + 1), 0)}% of the line`, 'good');
        },
      },
      {
        part: 'Derivation',
        title: 'Two waves, one fixed shape',
        text: `<p>A wave running one way and its reflection running back add to \\(2\\sin kx\\cos\\omega t\\) (5): a shape that stays put, times a clock. Where \\(\\sin kx=0\\) nothing ever moves (6).</p>
               <p>Drag the number of waves across: the nodes are always half a wavelength apart.</p>`,
        controls: [{ type: 'range', key: 'kw', label: 'Waves across', min: 1, max: 5, step: 0.5, fmt: (v) => `${v} λ` }],
        draw(g, s, t, api) {
          const c = g.col, k = TAU * s.kw, ph = t * TAU * 0.35;
          const lanes = [[0.05, (x) => Math.sin(k * x - ph), c.blue], [0.33, (x) => Math.sin(k * x + ph), c.orange], [0.61, (x) => Math.sin(k * x) * Math.cos(ph), c.ink]];
          lanes.forEach(([y, fn, col], i) => {
            const P = g.plot({ box: [0.06, y, 0.9, 0.24], x: [0, 1], y: [-1.15, 1.15] });
            P.curve(fn, { color: col, width: i === 2 ? 3 : 2.2, glow: i === 2 });
            if (i === 2) for (let n = 0; n <= 2 * s.kw; n++) P.dot(n / (2 * s.kw), 0, { r: 4.5, color: c.accent });
          });
          api.legend([['sin(kx − ωt)', c.blue], ['sin(kx + ωt)', c.orange], ['their sum: 2 sin kx cos ωt', c.ink], ['nodes', c.accent]]);
          api.verdict(`nodes every λ/2 = 1/${F(2 * s.kw, 1)} of the plate`, 'good');
        },
      },
      {
        part: 'Derivation',
        title: 'The plate equation',
        text: `<p>Newton’s law for a patch of plate gives (8). Look for a shape times a clock and the clock drops out, leaving (10): a shape \\(W\\) that bends back into itself.</p>
               <p>The board is the film’s 967 Hz shape, slowed down: up in orange, down in blue. The shape never changes; only the clock \\(\\cos\\omega t\\) does.</p>`,
        draw(g, s, t, api) {
          const C = heatColours(g), G = grids[I967], sq = square(g, [0.05, 0.05, 0.9, 0.86]), cl = Math.cos(t * TAU * 0.45) * ease(t / 0.6);
          field(g, sq, heatFn(C, (x, y) => gridAt(G, x, y), cl, true));
          api.legend([['moving up', g.col.orange], ['moving down', g.col.blue], ['W = 0, never moves', g.col.ink]]);
          api.verdict(`clock cos ωt = ${F(cl, 2)}`, 'good');
        },
      },
      {
        part: 'Derivation',
        title: 'Bending waves shorten as f rises',
        text: `<p>Put a wave into the plate equation: \\(\\omega=k^2\\sqrt{D/\\rho h}\\) (13), so the wavelength falls only as \\(1/\\sqrt f\\) (15). A string’s falls as \\(1/f\\).</p>
               <p>Drag the frequency for the film’s plate.</p>`,
        controls: [{ type: 'range', key: 'fq', label: 'Frequency', min: 100, max: 4000, step: 1, fmt: (v) => `${v} Hz` }],
        draw(g, s, t, api) {
          const c = g.col, Lf = (f) => lam(FILM.D, FILM.rh, f) * 1000, l0 = Lf(967);
          const P = g.plot({ box: [0.1, 0.08, 0.84, 0.64], x: [100, 4000], y: [0, 320] });
          P.axes({ ticks: [[1000, '1,000'], [2000, '2,000'], [3000, '3,000'], [4000, '4,000 Hz']] });
          [100, 200, 300].forEach((v) => g.text(`${v} mm`, P.l - 6, P.Y(v), { align: 'right', size: 11 }));
          const k = ease(t / 0.8);
          P.curve((f) => Lf(f), { color: c.ink, width: 2.8, to: 100 + 3900 * k });
          P.curve((f) => l0 * 967 / f, { color: c.muted, width: 1.6, dash: [6, 4], to: 100 + 3900 * k });
          P.dot(s.fq, Lf(s.fq), { r: 6, color: c.orange });
          api.legend([['plate: λ ∝ 1/√f', c.ink], ['a string through the same point: λ ∝ 1/f', c.muted]]);
          api.verdict(`λ = ${F(Lf(s.fq), 0)} mm at ${s.fq} Hz (nodes about ${F(Lf(s.fq) / 2, 0)} mm apart)`, 'good');
        },
      },
      {
        part: 'Derivation',
        title: 'Why only some waves fit',
        text: `<p>A wave bouncing between two edges leaves a copy every round trip. Orange: each copy. White: their total. Slide the wavelength: the total only grows when a whole number of half-waves fits, (E2).</p>`,
        controls: [{ type: 'range', key: 'kap', label: 'Half-waves across', min: 0.5, max: 4.5, step: 0.01, fmt: (v) => `${v.toFixed(2)}` }],
        draw(g, s, t, api) {
          const c = g.col, ctx = g.ctx, R = 0.82, N = 8, SM = (1 - R ** N) / (1 - R), k = s.kap;
          const pile = (kk) => { let re = 0, im = 0; for (let n = 0; n < N; n++) { re += R ** n * Math.cos(TAU * kk * n); im += R ** n * Math.sin(TAU * kk * n); } return Math.hypot(re, im) / SM; };
          const x0 = g.w * 0.06, x1 = g.w * 0.94, ys = g.h * 0.27, amp = g.h * 0.1, X = (u) => x0 + (x1 - x0) * u;
          ctx.strokeStyle = c.muted; ctx.lineWidth = 4; [x0, x1].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, ys - amp * 1.7); ctx.lineTo(x, ys + amp * 1.7); ctx.stroke(); });
          ctx.lineWidth = 1.4; ctx.strokeStyle = c.orange; ctx.globalAlpha = 0.5;
          for (let n = 0; n < N; n++) { ctx.beginPath(); for (let i = 0; i <= 160; i++) { const u = i / 160, y = ys - amp * R ** n * Math.sin(Math.PI * k * u + TAU * k * n); i ? ctx.lineTo(X(u), y) : ctx.moveTo(X(u), y); } ctx.stroke(); }
          ctx.globalAlpha = 1; ctx.strokeStyle = c.ink; ctx.lineWidth = 3; ctx.beginPath();
          for (let i = 0; i <= 200; i++) { const u = i / 200; let sm = 0; for (let n = 0; n < N; n++) sm += R ** n * Math.sin(Math.PI * k * u + TAU * k * n); const y = ys - amp * 1.6 * sm / SM; i ? ctx.lineTo(X(u), y) : ctx.moveTo(X(u), y); }
          ctx.stroke();
          const P = g.plot({ box: [0.06, 0.56, 0.88, 0.34], x: [0.5, 4.5], y: [0, 1.05] });
          P.axes({ ticks: [[1, 'm=1'], [2, 'm=2'], [3, 'm=3'], [4, 'm=4']] });
          P.curve(pile, { color: c.orange, width: 2, to: 0.5 + 4 * ease(t / 0.8) });
          P.dot(k, pile(k), { r: 6, color: c.ink });
          api.legend([['each round trip', c.orange], ['their total', c.ink]]);
          const m = Math.round(k), fits = Math.abs(k - m) < 0.03;
          api.verdict(fits ? `fits (m = ${m}): every echo adds, ${F(100 * pile(k), 0)}% of the most` : `out of step: ${F(100 * pile(k), 0)}% of the most`, fits ? 'good' : 'bad');
        },
      },
      {
        part: 'Derivation',
        title: 'Waves that fit: a panel',
        text: `<p>A simply supported panel needs \\(W=0\\) all round, and \\(\\sin(m\\pi x/a)\\sin(n\\pi y/b)\\) does it (16). Fitting fixes \\(k\\), and \\(k\\) fixes the frequency (18).</p>
               <p>Pick \\(m\\) and \\(n\\) for the steel duct panel of Worked example 2 (0.8 by 0.6 m, 3 mm).</p>`,
        controls: [
          { type: 'range', key: 'mm', label: 'm (half-waves along a)', min: 1, max: 4, step: 1, fmt: (v) => `m = ${v}` },
          { type: 'range', key: 'nn', label: 'n (half-waves along b)', min: 1, max: 4, step: 1, fmt: (v) => `n = ${v}` },
        ],
        draw(g, s, t, api) {
          const C = heatColours(g), sq = square(g, [0.04, 0.05, 0.92, 0.88], 0.75), k = s.mm - 1 + s.nn - 1;
          field(g, sq, heatFn(C, sinPanel(s.mm, s.nn), Math.cos(t * TAU * 0.45), true));
          api.legend([['moving up', g.col.orange], ['moving down', g.col.blue], ['nodal lines', g.col.ink]]);
          api.verdict(`f(${s.mm},${s.nn}) = ${F(fSS(PANEL, s.mm, s.nn), 1)} Hz, ${k} nodal line${k === 1 ? '' : 's'} inside the edges`, 'good');
        },
      },
      {
        part: 'Derivation',
        title: 'The free plate: the sand patterns',
        text: `<p>Free edges have no neat formula; the modes come from a numerical solution (19). These are the film’s plate’s centre-driven modes, the patterns sand draws on a shaker plate.</p>
               <p>Step through them: higher frequency, shorter waves, busier lines.</p>`,
        controls: [{ type: 'range', key: 'mi', label: 'Mode', min: 0, max: P8.modes.length - 1, step: 1, fmt: (v) => `${F(P8.modes[v].f, 0)} Hz` }],
        draw(g, s, t, api) {
          const C = sandColours(g), md = P8.modes[s.mi], G = grids[s.mi], sq = square(g, [0.05, 0.05, 0.9, 0.86]);
          field(g, sq, sandFn(C, (x, y) => gridAt(G, x, y) / Math.min(1, 0.25 + t)));
          api.legend([]); api.verdict(`Ω = ${F(md.Om, 1)},  f = ${F(md.f, 0)} Hz,  λ = ${F(lam(FILM.D, FILM.rh, md.f) * 1000, 0)} mm`, 'good');
        },
      },
      {
        part: 'Derivation',
        title: 'Why a peak',
        text: `<p>One mode is a mass on a spring with a damper. Push it slowly and it follows; too fast and it can’t keep up; in time and every push adds, until damping takes out what each push puts in, (P3).</p>
               <p>Drag the push rate, then the damping: the peak is \\(1/2\\zeta\\) tall.</p>`,
        controls: [
          { type: 'range', key: 'pr', label: 'Push rate', min: 0.1, max: 2, step: 0.01, fmt: (v) => `${v.toFixed(2)} × ωn` },
          { type: 'range', key: 'zt', label: 'Damping ζ', min: 0.01, max: 0.3, step: 0.005, fmt: (v) => `${v.toFixed(3)}` },
        ],
        draw(g, s, t, api) {
          const c = g.col, Z = s.zt, X = (r) => 1 / Math.sqrt((1 - r * r) ** 2 + (2 * Z * r) ** 2), top = Math.min(1 / (2 * Z) * 1.15, 52);
          const P = g.plot({ box: [0.1, 0.08, 0.84, 0.66], x: [0, 2], y: [0, top] });
          P.axes({ ticks: [[1, 'ωn'], [2, '2 ωn']] });
          P.curve(X, { color: c.orange, width: 2.6, to: 2 * ease(t / 0.8) });
          P.curve(() => 1 / (2 * Z), { color: c.muted, width: 1.2, dash: [5, 4] });
          g.text(`1/2ζ = ${F(1 / (2 * Z), 1)}`, P.X(2) - 4, P.Y(1 / (2 * Z)) - 10, { align: 'right', color: c.muted, size: 11 });
          P.dot(s.pr, Math.min(X(s.pr), top), { r: 6, color: c.ink });
          api.legend([['swing |Q|, in units of the push alone', c.orange]]);
          api.verdict(`${F(X(s.pr), 1)} × the push alone` + (s.pr < 0.7 ? ': it just follows' : s.pr > 1.3 ? ': too fast to keep up' : ': in time, every push adds'), 'good');
        },
      },
      {
        part: 'What it means',
        title: 'Where the sensor sits',
        text: `<p>A sensor reads every mode weighted by that mode’s shape where it sits (22). On a nodal line, that mode’s peak is gone (23).</p>
               <p>Slide the sensor out from the centre along an axis of the film’s plate and watch the 967 Hz peak.</p>`,
        controls: [{ type: 'range', key: 'u', label: 'Sensor, from centre', min: 0.05, max: 0.95, step: 0.005, fmt: (v) => `${F(v * 120, 0)} mm` }],
        draw(g, s, t, api) {
          const c = g.col, C = sandColours(g), narrow = g.w < 560, sq = square(g, narrow ? [0.02, 0.02, 0.96, 0.36] : [0.02, 0.1, 0.3, 0.7]);
          field(g, sq, sandFn(C, (x, y) => gridAt(grids[I967], x, y)));
          const cx = sq.x + sq.s / 2 + s.u * sq.s / 2, cy = sq.y + sq.s / 2;
          g.ctx.fillStyle = c.orange; g.ctx.beginPath(); g.ctx.arc(cx, cy, 6, 0, TAU); g.ctx.fill();
          const ref = Math.max(...spectrum(0.275)), sp = spectrum(Math.round(s.u * 200) / 200);
          const P = g.plot({ box: narrow ? [0.18, 0.44, 0.78, 0.44] : [0.42, 0.06, 0.54, 0.66], x: [100, 2000], y: [-50, 10] }), ctx = g.ctx;
          ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(P.l, P.t + P.h); ctx.lineTo(P.l + P.w, P.t + P.h); ctx.moveTo(P.l, P.t); ctx.lineTo(P.l, P.t + P.h); ctx.stroke();
          (narrow ? [[500, '500'], [1000, '1,000'], [2000, '2,000 Hz']] : [[500, '500'], [1000, '1,000'], [1500, '1,500'], [2000, '2,000 Hz']]).forEach(([f, l]) => g.text(l, P.X(f), P.t + P.h + 13, { size: 11, align: f === 2000 ? 'right' : 'center' }));
          [0, -20, -40].forEach((d) => g.text(`${d} dB`, P.l - 6, P.Y(d), { align: 'right', size: 11 }));
          const dbs = sp.map((v) => Math.min(10, Math.max(-50, 20 * Math.log10(v / ref + 1e-12))));
          const k = ease(t / 0.8); ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
          FS.forEach((f, i) => { if (f > 100 + 1900 * k) return; const x = P.X(f), y = P.Y(dbs[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
          P.vline(P8.f967, { color: c.accent });
          const at = 20 * Math.log10(respAt(s.u, P8.f967) / respAt(0.275, P8.f967));
          api.legend([['response at the sensor', c.ink], ['967 Hz', c.accent]]);
          api.verdict(`at 967 Hz: ${F(at, 1)} dB compared with 33 mm out`, at < -15 ? 'bad' : 'good');
        },
      },
      {
        part: 'Worked example 1',
        title: 'The film’s plate',
        text: `<p>Aluminium, 240 mm square, 1 mm thick, the ring pattern at \\(\\Omega=${F(P8.modes[I967].Om, 1)}\\). Its frequency, where the sand jumps, and how far apart the lines are.</p>`,
        draw(g, s, t, api) {
          const c = g.col, C = sandColours(g), sq = square(g, [0.05, 0.05, 0.9, 0.78]);
          field(g, sq, sandFn(C, (x, y) => gridAt(grids[I967], x, y)));
          const l = lam(FILM.D, FILM.rh, P8.f967), w = l / 0.24 * sq.s * ease(t / 0.8), y = sq.y + sq.s + 18, x0 = sq.x + sq.s / 2 - w / 2;
          g.ctx.strokeStyle = c.orange; g.ctx.lineWidth = 4; g.ctx.beginPath(); g.ctx.moveTo(x0, y); g.ctx.lineTo(x0 + w, y); g.ctx.stroke();
          g.text(`λ = ${F(l * 1000, 0)} mm`, sq.x + sq.s / 2, y + 16, { color: c.orange, size: 12 });
          api.legend([]); api.verdict(`f = ${F(P8.f967, 0)} Hz,  g/ω² = 0.27 µm,  λ = ${F(l * 1000, 0)} mm`, 'good');
        },
      },
      {
        part: 'Worked example 2',
        title: 'Where to brace a duct panel',
        text: `<p>A steel panel, 0.8 by 0.6 m, 3 mm thick. Its first modes, and why a single brace at the centre leaves the 65 Hz mode untouched.</p>`,
        controls: [{ type: 'choice', key: 'brace', options: [['centre', 'Brace at the centre'], ['quarter', 'Brace at a/4']] }],
        draw(g, s, t, api) {
          const c = g.col, C = heatColours(g), sq = square(g, [0.04, 0.05, 0.92, 0.88], 0.75);
          field(g, sq, heatFn(C, sinPanel(2, 1), Math.cos(t * TAU * 0.45), true));
          const bx = s.brace === 'centre' ? 0.5 : 0.25, by = 0.5;
          g.ctx.fillStyle = c.accent; g.ctx.beginPath(); g.ctx.arc(sq.x + bx * sq.s, sq.y + by * sq.s * 0.75, 8, 0, TAU); g.ctx.fill();
          const Wb = Math.sin(2 * Math.PI * bx) * Math.sin(Math.PI * by);
          api.legend([['the (2,1) mode, 65 Hz', c.ink], ['brace', c.accent]]);
          api.verdict(Math.abs(Wb) < 1e-9 ? 'on the nodal line: by (24), 65 Hz is unchanged' : `W = ${F(Wb, 2)} at the brace: by (24), 65 Hz moves`, Math.abs(Wb) < 1e-9 ? 'bad' : 'good');
        },
      },
      {
        part: 'Your turn',
        title: 'Try it with a calculator',
        tryLabel: 'Your answers',
        text: (s) => {
          if (!s.ex) newEx(s);
          const { a, b, h } = s.ex;
          return `<div class="problem"><p>A simply supported steel panel, ${a} m by ${b} m, ${h} mm thick (\\(E=200\\) GPa, \\(\\nu=0.3\\), \\(\\rho=7850\\ \\text{kg/m}^3\\)).</p>
                  <p>Find \\(D\\), the first two frequencies \\(f_{11}\\) and \\(f_{21}\\) (two half-waves along the ${a} m side), and the bending wavelength at \\(f_{11}\\).</p></div>`;
        },
        controls: [
          { type: 'answer', label: '\\(D\\)', unit: 'N m', value: (s) => exNums(s).p.D, rel: 0.01 },
          { type: 'answer', label: '\\(f_{11}\\)', unit: 'Hz', value: (s) => exNums(s).f11, rel: 0.01 },
          { type: 'answer', label: '\\(f_{21}\\)', unit: 'Hz', value: (s) => exNums(s).f21, rel: 0.01 },
          { type: 'answer', label: '\\(\\lambda\\) at \\(f_{11}\\)', unit: 'm', value: (s) => exNums(s).lam, rel: 0.02 },
          { type: 'check' },
          { type: 'button', label: 'Show working', action: (s, api) => { s.showSol = true; api.rewrite(); } },
          { type: 'button', label: 'New numbers', action: (s, api) => { newEx(s); api.refresh(); api.rewrite(); } },
        ],
        draw(g, s, t, api) {
          if (!s.ex) newEx(s);
          const C = heatColours(g), sq = square(g, [0.04, 0.05, 0.92, 0.88], s.ex.b / s.ex.a);
          field(g, sq, heatFn(C, sinPanel(1, 1), Math.cos(t * TAU * 0.45), true));
          api.legend([[`the (1,1) mode of a ${s.ex.a} × ${s.ex.b} m panel`, g.col.ink]]);
        },
      },
      {
        part: 'Summary',
        title: 'On one card',
        text: `<p>Sand runs from motion and stops where \\(W=0\\). A wave meeting its reflection makes a fixed shape times a clock; the plate equation keeps only shapes that bend back into themselves, each at its own frequency, with bending waves shortening as \\(1/\\sqrt f\\).</p>
               <p>Every peak in a spectrum is a shape somewhere. A sensor on a nodal line misses it; a brace on one leaves it alone.</p>`,
        controls: [{ type: 'range', key: 'mi', label: 'Mode', min: 0, max: P8.modes.length - 1, step: 1, fmt: (v) => `${F(P8.modes[v].f, 0)} Hz` }],
        draw(g, s, t, api) {
          const C = sandColours(g), sq = square(g, [0.05, 0.05, 0.9, 0.86]);
          field(g, sq, sandFn(C, (x, y) => gridAt(grids[s.mi], x, y)));
          api.legend([]); api.verdict(`${F(P8.modes[s.mi].f, 0)} Hz`, 'good');
        },
      },
    ],
  });
})();
