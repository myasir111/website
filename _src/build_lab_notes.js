// Build the plain-HTML notes for every Lab lesson.
//
// Each lesson is an interactive page whose words and maths are written by JavaScript, one step
// at a time. This script runs each lesson.js once, collects every step's text and every line of
// working, renders the maths with KaTeX (HTML + MathML, so it reads without JavaScript), and
// writes it into the lesson's index.html between <!-- notes:start --> and <!-- notes:end -->.
// Readers can open the notes under the board; search engines see the whole lesson.
//
// Run from the site root:  node _src/build_lab_notes.js      (needs: npm i katex@0.16.11)
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const katex = require('katex');

const ROOT = path.resolve(__dirname, '..');
const LAB = path.join(ROOT, 'lab');
const labSrc = fs.readFileSync(path.join(LAB, 'lab.js'), 'utf8');

const K = (tex, display) => katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'htmlAndMathml' });
const inlineMath = (html) => html
  .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => K(t, true))
  .replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => K(t, false));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function loadLesson(dir) {
  const stub = () => ({});
  const ctx = vm.createContext({
    Math, console, JSON, Object, Array, String, Number, Set, Map, Float64Array, Error,
    performance: { now: () => 0 }, requestAnimationFrame() {}, addEventListener() {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }), document: { querySelector: stub },
    location: { hash: '' }, history: { replaceState() {} },
  });
  ctx.window = ctx;
  const src = labSrc + '\nLab.lesson = (cfg) => { globalThis.__cfg = cfg; };\n'
    + fs.readFileSync(path.join(dir, 'lesson.js'), 'utf8');
  vm.runInContext(src, ctx, { filename: path.join(dir, 'lesson.js') });
  return ctx.__cfg;
}

function renderLesson(cfg) {
  const s = JSON.parse(JSON.stringify(cfg.state || {}));
  const out = [];
  cfg.steps.forEach((st, i) => {
    const isExercise = /calculator/i.test(st.title) && (st.controls || []).some((c) => c.type === 'answer');
    out.push(`<section class="nstep" id="notes-step-${i + 1}">`);
    out.push(`<h3><span class="nnum">${i + 1}</span>${st.part ? `<span class="npart">${esc(st.part)}</span> ` : ''}${esc(st.title)}</h3>`);
    if (isExercise) {
      out.push('<div class="ntext"><p>Your turn. In the interactive lesson above, this step gives you a new signal each time, checks your answers and writes out the full working, line by line.</p></div>');
    } else {
      const text = typeof st.text === 'function' ? st.text(s) : st.text || '';
      out.push(`<div class="ntext">${inlineMath(text.replace(/<p class="hint">[\s\S]*?<\/p>/g, ''))}</div>`);
    }
    const W = cfg.work && cfg.work[i];
    const lines = isExercise ? [] : (typeof W === 'function' ? W(s) : W) || [];
    if (lines.length) {
      out.push('<div class="nwork">');
      lines.forEach(([src, note, tag, opt]) => {
        if (src.startsWith('>')) {
          out.push(`<p class="nsay">${inlineMath(src.slice(1).trim())}</p>`);
        } else {
          out.push(`<div class="neq${opt === 'box' ? ' boxed' : ''}"><div class="nmath">${K(src, true)}</div>`
            + `${tag !== undefined && tag !== '' ? `<span class="ntag">(${esc(tag)})</span>` : '<span class="ntag"></span>'}`
            + `${note ? `<span class="nnote">${esc(note)}</span>` : ''}</div>`);
        }
      });
      out.push('</div>');
    }
    out.push('</section>');
  });
  return out.join('\n');
}

const dirs = fs.readdirSync(LAB).filter((d) => fs.existsSync(path.join(LAB, d, 'lesson.js')));
for (const d of dirs) {
  const dir = path.join(LAB, d);
  const cfg = loadLesson(dir);
  const notes = renderLesson(cfg);
  const block = `<!-- notes:start (built by _src/build_lab_notes.js, do not edit by hand) -->
  <div class="wrap">
    <details class="notes" id="notes">
      <summary>Read the whole lesson as notes <span class="muted">· every step, derivation and worked example, on one page</span></summary>
${notes}
    </details>
  </div>
  <!-- notes:end -->`;
  const pagePath = path.join(dir, 'index.html');
  let page = fs.readFileSync(pagePath, 'utf8');
  if (page.includes('<!-- notes:start')) {
    page = page.replace(/<!-- notes:start[\s\S]*?<!-- notes:end -->/, block);
  } else {
    const anchor = '  <div class="wrap">\n    <div class="lesson-nav">';
    if (!page.includes(anchor)) throw new Error(`${d}: no place for the notes`);
    page = page.replace(anchor, block + '\n' + anchor);
  }
  fs.writeFileSync(pagePath, page);
  console.log(d, '→', cfg.steps.length, 'steps,', (notes.match(/class="neq/g) || []).length, 'equations,',
    (notes.match(/katex-error/g) || []).length, 'maths errors');
}
