// Write the "From the textbooks" block (from textbooks_data.js) into each Lab lesson, after Practice.
// Run from the site root:  node _src/build_textbooks.js      (needs: npm i katex@0.16.11)
const fs = require('fs');
const path = require('path');
const katex = require('katex');
const DATA = require('./textbooks_data.js');
const K = (t, d) => katex.renderToString(t, { displayMode: d, throwOnError: false, output: 'htmlAndMathml' });
const math = (s) => s.replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => K(t, true)).replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => K(t, false));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
for (const [slug, d] of Object.entries(DATA)) {
  const page = path.join(__dirname, '..', 'lab', slug, 'index.html');
  let html = fs.readFileSync(page, 'utf8');
  const adds = d.adds.map(([h, t]) => `        <p class="tb-note"><b>${esc(h)}.</b> ${math(t)}</p>`).join('\n');
  const read = d.read.map((r) => `          <li>${esc(r)}</li>`).join('\n');
  const block = `<!-- textbooks:start (built by _src/build_textbooks.js, do not edit by hand) -->
  <div class="wrap">
    <section class="textbooks" id="further-reading">
      <h2 class="tb-h">Further reading</h2>
      <ul class="tb-books">
${read}
      </ul>
      <div class="tb-notes">
${adds}
      </div>
    </section>
  </div>
  <!-- textbooks:end -->`;
  if (html.includes('<!-- textbooks:start')) html = html.replace(/<!-- textbooks:start[\s\S]*?<!-- textbooks:end -->/, block);
  else html = html.replace('<!-- practice:end -->', '<!-- practice:end -->\n  ' + block);
  fs.writeFileSync(page, html);
  console.log(slug, d.adds.length, 'additions,', d.read.length, 'books,', (block.match(/katex-error/g) || []).length, 'maths errors');
}
