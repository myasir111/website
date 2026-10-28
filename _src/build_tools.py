"""Wrap tool page bodies in the site's shared head/nav/footer."""
import pathlib, sys, html
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from resources_data import REFS
from tool_methods import METHODS
SRC = pathlib.Path(sys.argv[1]); OUT = pathlib.Path(sys.argv[2])
FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com">\n  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=JetBrains+Mono:wght@400;600&family=Source+Serif+4:wght@600&display=swap" rel="stylesheet">'
def page(title, desc, body, root, scripts=""):
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title} · Nodal</title>
  <meta name="description" content="{desc}">
  <meta property="og:title" content="{title} · Nodal">
  <meta property="og:description" content="{desc}">
  <meta property="og:image" content="https://nodallab.dev/assets/og.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="{root}assets/favicon.svg" type="image/svg+xml">
  {FONTS}
  <link rel="stylesheet" href="{root}css/style.css">
</head>
<body>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="{root}">nodal<span>.</span></a>
    <nav class="nav">
      <a href="{root}explainers/">Explainers</a>
      <a href="{root}tools/" class="active">Tools</a>
      <a href="{root}resources.html">Resources</a>
      <a href="{root}about.html">About</a>
    </nav>
  </div>
</header>

<main class="wrap">
{body}
</main>

<footer class="site-footer">
  <div class="wrap">
    <span>© 2026 Muhammad Yasir · Calculators are for preliminary engineering estimates; verify against your own methods and applicable standards.</span>
    <a href="https://www.linkedin.com/in/muhammad-yasir-ali-khan/">LinkedIn</a>
  </div>
</footer>
{scripts}
</body>
</html>
'''
def method_block(slug, root):
    m = METHODS.get(slug)
    if not m: return ""
    e = html.escape
    lis = lambda xs: "".join(f"<li>{e(x)}</li>" for x in xs)
    refs = []
    for k in m["refs"]:
        c, u, kind, _ = REFS[k]
        ext = f' <a class="ext" href="{e(u)}" aria-label="Open source">↗</a>' if u else ""
        refs.append(f'<li><a href="{root}resources.html#ref-{k}">{e(c)}</a> <span class="meta">{e(kind)}</span>{ext}</li>')
    return f'''
  <section class="method" id="method">
    <h2>Method &amp; sources</h2>
    <div class="method-grid">
      <div><h3>What it calculates</h3><ul>{lis(m["method"])}</ul></div>
      <div><h3>Assumptions &amp; limits</h3><ul>{lis(m["limits"])}</ul></div>
    </div>
    <p class="verified"><b>Verified:</b> {e(m["verified"])}</p>
    <h3>Sources</h3>
    <ol class="src-list">{"".join(refs)}</ol>
    <p class="note"><a href="{root}resources.html">All {len(REFS)} references on the Resources page →</a></p>
  </section>'''

for f in sorted(SRC.glob("*.html")):
    txt = f.read_text()
    meta, body = txt.split("\n---\n", 1)
    m = dict(l.split(": ", 1) for l in meta.strip().splitlines())
    slug = f.stem
    if slug == "index":
        dest, root = OUT / "index.html", "../"
        scripts = ""
    else:
        dest, root = OUT / slug / "index.html", "../../"
        scripts = f'<script src="../tools.js"></script>\n<script>\n{(SRC / (slug + ".js")).read_text()}</script>'
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(page(m["title"], m["desc"], body + method_block(slug, root), root, scripts))
    print("wrote", dest)
