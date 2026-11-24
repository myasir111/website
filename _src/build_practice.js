// Write the "Practice" block (from practice_data.js) into each Lab lesson, after the notes.
// Run from the site root:  node _src/build_practice.js      (needs: npm i katex@0.16.11)
const fs = require('fs');
const path = require('path');
const katex = require('katex');
const DATA = require('./practice_data.js');

const K = (t, d) => katex.renderToString(t, { displayMode: d, throwOnError: false, output: 'htmlAndMathml' });
const math = (s) => s.replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => K(t, true)).replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => K(t, false));

for (const [slug, probs] of Object.entries(DATA)) {
  const page = path.join(__dirname, '..', 'lab', slug, 'index.html');
  let html = fs.readFileSync(page, 'utf8');
  const items = probs.map(([kind, q, a], i) => `      <li class="prob">
        <p class="prob-kind">${kind}</p>
        <p class="prob-q">${math(q)}</p>
        <details class="prob-a"><summary>Show the answer</summary><div>${math(a)}</div></details>
      </li>`).join('\n');
  const block = `<!-- practice:start (built by _src/build_practice.js, do not edit by hand) -->
  <div class="wrap">
    <section class="practice" id="practice">
      <h2>Practice</h2>
      <p class="muted">Three problems: a warm-up, a stretch and one from site. Try each before you open the answer.</p>
      <ol class="probs">
${items}
      </ol>
    </section>
  </div>
  <!-- practice:end -->`;
  if (html.includes('<!-- practice:start')) html = html.replace(/<!-- practice:start[\s\S]*?<!-- practice:end -->/, block);
  else html = html.replace('<!-- notes:end -->', '<!-- notes:end -->\n  ' + block);
  fs.writeFileSync(page, html);
  console.log(slug, probs.length, 'problems,', (block.match(/katex-error/g) || []).length, 'maths errors');
}
