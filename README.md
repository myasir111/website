# website

Personal site of Muhammad Yasir Ali Khan: vibration, dynamics and noise engineering. Explainers, simulations, tools and portfolio.

Plain static HTML/CSS/JS, served by GitHub Pages from the `main` branch. No build step.

## Layout

- `index.html`: home
- `about.html`: about / CV
- `projects.html`: projects
- `explainers/<slug>/`: one folder per explainer (page, simulation script, downloads)
- `css/style.css`: shared styles (light and dark themes)

## Adding an explainer

1. Copy `explainers/fft-intuition/` to a new folder.
2. Edit the page, sim and downloads.
3. Add a card to `explainers/index.html` (and the home page).
