// Shared helpers for the Nodal calculators.
const T = {
  $: (id) => document.getElementById(id),
  num: (id) => parseFloat(document.getElementById(id).value),
  css: (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
  // Engineering-friendly formatting: 3–4 significant figures, no exponent for normal ranges.
  fmt(v, sig = 4) {
    if (!isFinite(v)) return '—';
    const a = Math.abs(v);
    if (a !== 0 && (a < 1e-3 || a >= 1e6)) return v.toExponential(sig - 1);
    return Number(v.toPrecision(sig)).toLocaleString('en-US', { maximumFractionDigits: 6 });
  },
  canvas(c) {
    const dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  },
  // Re-run fn whenever any input/select in the page changes, on resize and theme change.
  live(fn) {
    document.querySelectorAll('input, select').forEach((el) => el.addEventListener('input', fn));
    window.addEventListener('resize', fn);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fn);
    fn();
  },
};
