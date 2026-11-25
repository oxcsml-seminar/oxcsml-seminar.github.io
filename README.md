# OxCSML Seminar Series website

Static site for the OxCSML seminar (Department of Statistics, University of Oxford), deployed to GitHub Pages by a GitHub Action.

## Adding or updating a talk

Each talk is one file in [`data/talks/`](data/talks/), named `YYYY-MM-DD-speaker-name.yml`.

1. Copy [`data/talks/_template.yml`](data/talks/_template.yml) to a new file in `data/talks/` (the GitHub web editor is fine).
2. Fill in what is known. Only `date` is required; blank fields show as "TBC" / "to be announced" on the site.
3. Commit to `main`. The site rebuilds automatically within a couple of minutes.

To update a talk later, edit its file; to cancel one, delete it. If a file has a mistake (bad date or time, misspelled field, invalid YAML), the build fails with a message pointing at the file and the live site is left unchanged; check the **Actions** tab.

**Everything in `data/` and `site/` is public.** 

Slides: put speaker-approved PDFs in `site/assets/slides/` and set `slides: assets/slides/name.pdf`.

## Local preview

```sh
pip install pyyaml
python3 build.py                  # data/ -> site/assets/js/data.js
python3 -m http.server -d site    # http://localhost:8000
```

`site/assets/js/data.js` is generated; don't edit or commit it.

## Layout

- `data/`: talks (one YAML file each) and Oxford term dates.
- `site/`: the published website; `assets/js/script.js` renders everything from the generated `data.js`.
- `build.py`: validates `data/` and writes `site/assets/js/data.js`.
- `.github/workflows/pages.yml`: runs `build.py` on every push to `main` and deploys `site/`.

## One-time GitHub setup

In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.
