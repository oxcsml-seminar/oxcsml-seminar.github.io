# OxCSML Seminar Series website

Static site for the OxCSML seminar series.

## Adding or updating a talk

Each talk is one file in [`data/talks/`](data/talks/), named `YYYY-MM-DD-speaker-name.yml`. To add a new talk:

1. Make a new file in `data/talks/`, starting from the template [`data/talks/_template.yml`](data/talks/_template.yml)
2. Fill in the details. Only `date` is required; blank fields show as "TBC" / "to be announced" on the site.
3. Commit to `main`. The site rebuilds automatically.

To update a talk later, edit its file; to cancel one, delete it. If a file has a mistake (bad date or time, misspelled field, invalid YAML), the build fails with a message pointing at the file and the live site is left unchanged; check the **Actions** tab.

**Everything in `data/` and `site/` is public.** 

Slides: put speaker-approved PDFs in `site/assets/slides/` and set `slides: assets/slides/name.pdf`.

## Local preview

If you'd like to make further changes to the site, you can preview your changes locally as follows:

```sh
pip install pyyaml
python3 build.py                  # data/ -> site/assets/js/data.js
python3 -m http.server -d site    # http://localhost:8000
```

## Layout

- `data/`: talks (one YAML file each) and Oxford term dates.
- `site/`: the published website; `assets/js/script.js` renders everything from the generated `data.js`.
- `build.py`: validates `data/` and writes `site/assets/js/data.js`.
- `.github/workflows/pages.yml`: runs `build.py` on every push to `main` and deploys `site/`.

# Organisers

The current organisers for the OxCSML seminar series are:

- [Eugenio Clerico](https://eugenioclerico.me/)
- [Arya Akhavan](https://aryaakhavan.github.io/)
- [Benjamin Dupuis](https://benjidupuis.github.io/)
- [Gavin Kerrigan](https://gavinkerrigan.github.io/)

Please feel free to contact us if you have any questions or comments about the seminars.
