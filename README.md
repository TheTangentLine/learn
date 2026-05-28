# Learn New Stack

A static catalog and landing page for curated **Learn_*** repositories — hands-on projects for microservices, DevOps, systems programming, and more.

**Live site:** [TheTangentLine.github.io/learn](https://thetangentline.github.io/learn/) (GitHub Pages)

## Features

- Browse repos by learning track (full course, from scratch, application)
- Search and filter by contributor
- Built-in AI curriculum prompt builder
- Data-driven config — no code changes needed to add most repos

## Project structure

| Path | Purpose |
|------|---------|
| [`data/`](data/README.md) | Site content (repos, categories, GitHub users, prompt template) |
| [`scripts/validate-data.mjs`](scripts/validate-data.mjs) | Validates `data/*.json` before deploy |
| `index.html`, `index.css`, `index.js` | Front-end (no build step) |

## Quick start (local)

```bash
# Serve the site
python3 -m http.server 8765
# Open http://127.0.0.1:8765

# Validate data files
node scripts/validate-data.mjs

# Demo without GitHub API (placeholder data)
# Open http://127.0.0.1:8765/?placeholder
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). To list a new learning repo, follow [data/README.md](data/README.md).

## License

This project is licensed under the [MIT License](LICENSE).

Copyright (c) 2026 [TheTangentLine](https://github.com/TheTangentLine)
