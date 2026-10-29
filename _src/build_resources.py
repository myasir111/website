"""Generate resources.html from a structured list (edit SECTIONS, re-run)."""
import html, pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from resources_data import SECTIONS, REFS

def li(key, t, u, meta, why):
    title = f'<a href="{html.escape(u)}"><strong>{html.escape(t)}</strong></a>' if u else f'<strong>{html.escape(t)}</strong>'
    return f'      <li id="ref-{key}">{title} <span class="meta">{html.escape(meta)}</span>\n        <span class="what">{html.escape(why)}</span></li>'

out = []
for sid, name, intro, items in SECTIONS:
    out.append(f'    <section id="{sid}">\n    <h2>{html.escape(name)}</h2>')
    if intro: out.append(f'    <p class="muted">{html.escape(intro)}</p>')
    out.append('    <ul class="ref-list">\n' + '\n'.join(li(*it) for it in items) + '\n    </ul>\n    </section>')
body = '\n\n'.join(out)
jump = ' · '.join(f'<a href="#{sid}">{html.escape(name.split(":")[0])}</a>' for sid, name, _, _ in SECTIONS)
count = sum(len(s[3]) for s in SECTIONS)

page = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Resources · Nodal</title>
  <meta name="description" content="{count} books, standards, papers and free tools on piping vibration (FIV/AIV), machinery diagnostics, signal processing, structural dynamics, rotordynamics and fatigue, curated by a working vibration engineer.">
  <meta property="og:title" content="Vibration resources · Nodal">
  <meta property="og:description" content="Books, standards, papers and free tools for vibration engineers.">
  <meta property="og:image" content="https://nodallab.dev/assets/og.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=JetBrains+Mono:wght@400;600&family=Source+Serif+4:wght@600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="./">nodal<span>.</span></a>
    <nav class="nav">
      <a href="explainers/">Explainers</a>
      <a href="lab/">Lab</a>
      <a href="tools/">Tools</a>
      <a href="resources.html" class="active">Resources</a>
      <a href="about.html">About</a>
    </nav>
  </div>
</header>

<main class="wrap">
  <section class="hero" style="padding-bottom:0">
    <p class="eyebrow">Resources</p>
    <h1>What I read and recommend</h1>
    <p class="lede">{count} books, standards, papers and free tools, most of them gathered while building and verifying the calculations in <a href="tools/#skipper">Skipper</a> and the <a href="tools/">tools</a> on this site.</p>
    <p class="jump">{jump}</p>
  </section>

  <div class="prose">
{body}

    <p class="muted" style="margin-top:32px">No affiliate links. Standards are paywalled; your company or institution may have access. DNV recommended practices and NASA reports are free.</p>
  </div>
</main>

<footer class="site-footer">
  <div class="wrap">
    <span>© 2026 Muhammad Yasir</span>
    <a href="https://www.linkedin.com/in/muhammad-yasir-ali-khan/">LinkedIn</a>
  </div>
</footer>
</body>
</html>
'''
pathlib.Path(sys.argv[1]).write_text(page)
print("wrote", count, "entries")
