# Site data

Configuration for the Learn New Stack landing page. Edit files here instead of `index.js` when adding repos or tracks.

## GitHub users (`config.json`)

List one or more GitHub usernames as a JSON array:

```json
["TheTangentLine", "AnotherOrg"]
```

Repos are fetched from every user; duplicates (same repo name) are kept once. Header and footer **GitHub** buttons open a menu listing every username in `config.json`.

## Add a learning repo

1. Open [`repos.json`](repos.json) and append one object:

```json
{
  "slug": "Learn_my_topic",
  "label": "My Topic",
  "category": "application"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `slug` | yes | Exact GitHub repository name |
| `label` | yes | Title shown on the site |
| `category` | yes | Must match an `id` in [`categories.json`](categories.json) |

2. Validate and commit:

```bash
node scripts/validate-data.mjs
```

The repo must exist under one of the GitHub users listed in [`config.json`](config.json) (a JSON array of usernames). The site fetches public repo metadata from the GitHub API for each user and merges results.

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

## Troubleshooting

| Problem | Check |
|---------|--------|
| Repo missing on site | `slug` in `repos.json` matches GitHub exactly; run validate script |
| Wrong category / badge | `category` field matches a `categories.json` `id` |
| Validation fails | Read script output — unknown category, duplicate slug, or missing field |
| Nothing loads | Browser console / network tab — `data/*.json` must be reachable (same folder as `index.html` on Pages) |

## Files

| File | Purpose |
|------|---------|
| `config.json` | JSON array of GitHub usernames (API fetch for all; header/footer menu lists each profile) |
| `categories.json` | Track metadata (colors, titles) |
| `repos.json` | **Single registry** of all listed repos |
| `prompt-template.md` | AI curriculum prompt template |
| `prompt.json` | Placeholder tokens for the prompt builder |
