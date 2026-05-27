import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');

function loadJson(name) {
  const path = join(dataDir, name);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(`Failed to read ${path}: ${err.message}`);
    process.exit(1);
  }
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function warn(message) {
  console.warn(`WARN: ${message}`);
}

const githubUsers = loadJson('config.json');
const categories = loadJson('categories.json');
const repos = loadJson('repos.json');
const promptMeta = loadJson('prompt.json');

let hasError = false;

function error(message) {
  console.error(`ERROR: ${message}`);
  hasError = true;
}

if (!Array.isArray(githubUsers) || githubUsers.length === 0) {
  error('config.json: must be a non-empty array of GitHub usernames');
}

const seenUsers = new Set();
githubUsers.forEach((user, i) => {
  if (!user || typeof user !== 'string') {
    error(`config.json[${i}]: must be a non-empty string`);
  } else if (seenUsers.has(user)) {
    error(`config.json[${i}]: duplicate username "${user}"`);
  } else {
    seenUsers.add(user);
  }
});

if (!Array.isArray(categories) || categories.length === 0) {
  error('categories.json: must be a non-empty array');
}

if (!Array.isArray(repos) || repos.length === 0) {
  error('repos.json: must be a non-empty array');
}

if (!Array.isArray(promptMeta.placeholders) || promptMeta.placeholders.length === 0) {
  error('prompt.json: "placeholders" must be a non-empty array');
}

const categoryIds = new Set();
const categoryFields = ['id', 'title', 'subtitle', 'accent', 'bg'];

categories.forEach((cat, i) => {
  const prefix = `categories.json[${i}]`;
  for (const field of categoryFields) {
    if (!cat[field] || typeof cat[field] !== 'string') {
      error(`${prefix}: missing or invalid "${field}"`);
    }
  }
  if (categoryIds.has(cat.id)) {
    error(`${prefix}: duplicate category id "${cat.id}"`);
  }
  categoryIds.add(cat.id);
});

const slugs = new Set();
const reposPerCategory = new Map([...categoryIds].map((id) => [id, 0]));

repos.forEach((repo, i) => {
  const prefix = `repos.json[${i}]`;
  const { slug, label, category, username } = repo;

  if (!slug || typeof slug !== 'string') {
    error(`${prefix}: "slug" must be a non-empty string`);
  }
  if (!label || typeof label !== 'string') {
    error(`${prefix}: "label" must be a non-empty string`);
  }
  if (!category || typeof category !== 'string') {
    error(`${prefix}: "category" must be a non-empty string`);
  }
  if (!username || typeof username !== 'string') {
    error(`${prefix}: "username" must be a non-empty string`);
  }

  if (slug && slugs.has(slug)) {
    error(`${prefix}: duplicate slug "${slug}"`);
  }
  if (slug) slugs.add(slug);

  if (category && !categoryIds.has(category)) {
    error(`${prefix}: unknown category "${category}"`);
  } else if (category) {
    reposPerCategory.set(category, (reposPerCategory.get(category) ?? 0) + 1);
  }

  if (username && !seenUsers.has(username)) {
    error(`${prefix}: username "${username}" is not listed in config.json`);
  }
});

for (const id of categoryIds) {
  if ((reposPerCategory.get(id) ?? 0) === 0) {
    warn(`categories.json: category "${id}" has no repos in repos.json`);
  }
}

try {
  readFileSync(join(dataDir, 'prompt-template.md'), 'utf8');
} catch {
  error('prompt-template.md: file missing or unreadable');
}

if (hasError) {
  process.exit(1);
}

console.log(
  `OK: ${repos.length} repos, ${categories.length} categories, githubUsers=[${githubUsers.join(', ')}]`
);
