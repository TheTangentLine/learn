# Contributing

Thanks for helping grow **Learn New Stack**.

## Add or update a learning repository

1. Edit [`data/repos.json`](data/repos.json) (one entry per repo: `slug`, `label`, `category`, `username`).
2. If needed, add a track in [`data/categories.json`](data/categories.json) and ensure the username is listed in [`data/config.json`](data/config.json).
3. Validate locally (CI runs the same check on every push and pull request via [`.github/workflows/validate-data.yml`](.github/workflows/validate-data.yml)):

   ```bash
   node scripts/validate-data.mjs
   ```

4. Open a pull request with a short description of the repo and why it fits the catalog.

Full maintainer notes: [`data/README.md`](data/README.md).

## Site code

- Static files: `index.html`, `index.css`, `index.js`
- Deployed via GitHub Pages (see [`.github/workflows/static.yml`](.github/workflows/static.yml))
- Keep changes focused; run the validate script before submitting (GitHub Actions will also run it on every push and PR)

## Questions

Open a [GitHub issue](https://github.com/TheTangentLine/learn/issues) for bugs or suggestions.
