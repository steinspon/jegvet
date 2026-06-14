# JegVet

JegVet is a bilingual (English / Norwegian) reference and dosing toolkit for
veterinary practice. It is a dependency-free static web app: plain HTML, CSS and
vanilla JavaScript, with no build step. Every page works by opening it in a
browser or serving the folder over any static file server.

## Features

- **Tools & Calculators** — weight-based dose and dilution calculators for dogs,
  cats, rabbits, rodents, birds and more, plus euthanasia and mixing protocols.
- **Wiki / Reference** — protocols, references and practical notes rendered from
  Markdown content under `wiki/`.
- **Search** — full-text search across calculators and wiki entries.
- **Bilingual UI** — instant English/Norwegian switching.
- **Day / night theme** — automatic time-based theme with a manual override.
- **Installable PWA** — works on mobile via the web app manifest.

## Project structure

```
index.html              Home page
tools.html              Calculator browser (grouped by species)
*-calculator.html       Individual calculators (self-contained)
wiki.html / wiki/       Reference content and renderer
search.html             Site search
about.html              About page
settings.html           Language and theme settings
app-shell.js            Shared top bar, i18n and theme logic
styles.css              Global styles (light/dark themes)
assets/                 Images
scripts/                Dev tooling for rebuilding the wiki manifest (PowerShell)
```

## Running locally

The app is fully static, so any HTTP server works. For example, with Python:

```bash
python -m http.server 5500
```

Then open <http://localhost:5500/>.

A server is recommended over opening files directly so that the wiki content
(loaded via `fetch`) resolves correctly.

## Wiki content

Wiki entries live under `wiki/content/` as Markdown. After adding or renaming
entries, rebuild the navigation manifest:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/rebuild-wiki-manifest.ps1
```

## Conventions

- All source files are UTF-8 encoded; Norwegian text uses proper `æ`, `ø`, `å`.
- No third-party runtime dependencies — keep it vanilla.
