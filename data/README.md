# Site data

Configuration for the Learn New Stack landing page. Edit files here instead of `index.js` when adding repos or tracks.

## GitHub users (`config.json`)

List one or more GitHub usernames as a JSON array:

```json
["TheTangentLine", "AnotherOrg"]
```

The header **GitHub** button opens a menu listing every username in `config.json`. The footer links to this README for contribution steps. Repo metadata is fetched only from usernames referenced in `repos.json`.

## Add a learning repo

1. Open [`repos.json`](repos.json) and append one object:

```json
{
  "slug": "Learn_my_topic",
  "label": "My Topic",
  "category": "application",
  "username": "TheTangentLine"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `slug` | yes | Exact GitHub repository name |
| `label` | yes | Title shown on the site |
| `category` | yes | Must match an `id` in [`categories.json`](categories.json) |
| `username` | yes | GitHub owner; must appear in [`config.json`](config.json) |

2. Validate and commit:

```bash
node scripts/validate-data.mjs
```

The repo must exist under the `username` account on GitHub. That username must also be listed in `config.json`.

**Naming convention:** learning repos use the `Learn_` prefix (e.g. `Learn_gRPC`).

## Add a category (learning track)

1. Add an object to [`categories.json`](categories.json):

```json
{
  "id": "my-track",
  "title": "My Track",
  "subtitle": "Short description for the track",
  "accent": "#4f46e5",
  "bg": "#eeeeff"
}
```

2. Assign repos to the new `id` in [`repos.json`](repos.json).
3. Run `node scripts/validate-data.mjs`.

Filter tabs and welcome cards update automatically; no HTML or JS edits needed.

## Change the curriculum prompt

- Template body: [`prompt-template.md`](prompt-template.md)
- Placeholder tokens (for highlighting in the UI): [`prompt.json`](prompt.json)

## Placeholder data (offline / demo)

[`repos-placeholder.json`](repos-placeholder.json) holds sample repo cards (descriptions, stars, contributors) aligned with [`repos.json`](repos.json). Use it when:

- The GitHub API is rate-limited or unavailable (the site falls back automatically)
- You want demo data without API calls: open the site with `?placeholder` in the URL  
  Example: `http://127.0.0.1:8765/?placeholder` then go to Repositories

Edit placeholder entries to match new slugs in `repos.json`.

## Troubleshooting

| Problem | Check |
|---------|--------|
| Repo missing on site | `slug` and `username` match GitHub exactly; run validate script |
| Wrong category / badge | `category` field matches a `categories.json` `id` |
| Validation fails | Read script output — unknown category, duplicate slug, or missing field |
| Nothing loads | Browser console / network tab — `data/*.json` must be reachable (same folder as `index.html` on Pages) |

## Files

| File | Purpose |
|------|---------|
| `config.json` | JSON array of GitHub usernames (header/footer profile menu) |
| `categories.json` | Track metadata (colors, titles) |
| `repos.json` | **Single registry** of all listed repos |
| `prompt-template.md` | AI curriculum prompt template |
| `prompt.json` | Placeholder tokens for the prompt builder |
