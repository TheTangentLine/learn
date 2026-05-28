let GITHUB_USERS = [];
let REPO_CATEGORIES = [];
let REPO_LABELS = {};
let REPO_REGISTRY = [];
let REGISTRY_BY_SLUG = new Map();
let PROMPT_TEMPLATE = '';
let PROMPT_PLACEHOLDERS = [];

const DATA_BASE = 'data';
const SITE_REPO = 'learn';
const USER_ERROR_MESSAGE = 'Internal server error';

function logServerError(context, err) {
  console.error(`[${context}]`, err);
}

function buildCatalog(categories, repos) {
  const labels = {};
  const categoryMap = new Map(
    categories.map((c) => [c.id, { ...c, repos: [] }])
  );
  const categoryIds = new Set(categories.map((c) => c.id));

  for (const { slug, label, category, username } of repos) {
    labels[slug] = label;
    const cat = categoryMap.get(category);
    if (cat) {
      cat.repos.push(slug);
    } else {
      console.warn(`repos.json: unknown category "${category}" for slug "${slug}"`);
    }
    if (!username) {
      console.warn(`repos.json: missing username for slug "${slug}"`);
    }
  }

  for (const cat of categoryMap.values()) {
    if (cat.repos.length === 0) {
      console.warn(`categories.json: category "${cat.id}" has no repos`);
    }
  }

  return {
    categories: [...categoryMap.values()],
    labels,
    registry: repos,
  };
}

async function loadSiteData() {
  const [configRes, categoriesRes, reposRes, templateRes, promptRes] = await Promise.all([
    fetch(`${DATA_BASE}/config.json`),
    fetch(`${DATA_BASE}/categories.json`),
    fetch(`${DATA_BASE}/repos.json`),
    fetch(`${DATA_BASE}/prompt-template.md`),
    fetch(`${DATA_BASE}/prompt.json`),
  ]);

  if (!configRes.ok) throw new Error(`Failed to load config.json (${configRes.status})`);
  if (!categoriesRes.ok) throw new Error(`Failed to load categories.json (${categoriesRes.status})`);
  if (!reposRes.ok) throw new Error(`Failed to load repos.json (${reposRes.status})`);
  if (!templateRes.ok) throw new Error(`Failed to load prompt-template.md (${templateRes.status})`);
  if (!promptRes.ok) throw new Error(`Failed to load prompt.json (${promptRes.status})`);

  const config = await configRes.json();
  const categories = await categoriesRes.json();
  const repos = await reposRes.json();
  const promptMeta = await promptRes.json();
  const catalog = buildCatalog(categories, repos);

  if (!Array.isArray(config) || config.length === 0) {
    throw new Error('config.json must be a non-empty array of GitHub usernames');
  }
  GITHUB_USERS = config;
  REPO_CATEGORIES = catalog.categories;
  REPO_LABELS = catalog.labels;
  REPO_REGISTRY = catalog.registry;
  REGISTRY_BY_SLUG = new Map(REPO_REGISTRY.map((r) => [r.slug, r]));
  PROMPT_TEMPLATE = await templateRes.text();
  PROMPT_PLACEHOLDERS = promptMeta.placeholders;
}

// ── DOM refs ──────────────────────────────────────────────
const viewWelcome      = document.getElementById('view-welcome');
const viewRepos        = document.getElementById('view-repos');
const tabHome          = document.getElementById('tab-home');
const tabRepos         = document.getElementById('tab-repos');
const btnContinue      = document.getElementById('btn-continue');
const btnViewAll       = document.getElementById('btn-view-all');
const btnAboutRepos    = document.getElementById('btn-about-repos');
const btnRetry         = document.getElementById('btn-retry');
const repoCountEl      = document.getElementById('repo-count');
const categoryChipsEl  = document.getElementById('category-chips');
const aboutRepoListEl  = document.getElementById('about-repo-list');
const reposLoading     = document.getElementById('repos-loading');
const reposError       = document.getElementById('repos-error');
const reposErrorMsg    = document.getElementById('repos-error-message');
const reposSections    = document.getElementById('repos-sections');
const tabFilterCont    = document.getElementById('repos-tab-filters');
const reposToolbar     = document.getElementById('repos-toolbar');
const reposSearch      = document.getElementById('repos-search');
const reposAuthorFilter = document.getElementById('repos-author-filter');
const reposEmpty       = document.getElementById('repos-empty');
const statTotal        = document.getElementById('stat-total');
const promptTemplateEl = document.getElementById('prompt-template-display');
const promptBuilderForm = document.getElementById('prompt-builder-form');
const promptFormError  = document.getElementById('prompt-form-error');
const promptOutputEl   = document.getElementById('prompt-output');
const btnCopyPrompt    = document.getElementById('btn-copy-prompt');
const inputTopics      = document.getElementById('input-topics');
const inputWeeks       = document.getElementById('input-weeks');
const inputDays        = document.getElementById('input-days');
const inputSkills      = document.getElementById('input-skills');

let generatedPromptText = '';

// Nav links
document.getElementById('nav-logo').addEventListener('click', (e) => {
  e.preventDefault();
  showView('welcome');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
document.getElementById('nav-home').addEventListener('click', (e) => {
  e.preventDefault();
  showView('welcome');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
document.getElementById('nav-repos').addEventListener('click', (e) => { e.preventDefault(); showView('repos'); });
document.getElementById('nav-about').addEventListener('click', (e) => {
  e.preventDefault();
  showView('welcome');
  setTimeout(() => document.querySelector('.about-section')?.scrollIntoView({ behavior: 'smooth' }), 50);
});
document.getElementById('nav-prompt').addEventListener('click', (e) => {
  e.preventDefault();
  showView('welcome');
  setTimeout(() => document.getElementById('prompt-section')?.scrollIntoView({ behavior: 'smooth' }), 50);
});

// ── View switching ────────────────────────────────────────

function showView(view) {
  const isWelcome = view === 'welcome';

  viewWelcome.classList.toggle('view-active', isWelcome);
  viewWelcome.hidden = !isWelcome;

  viewRepos.classList.toggle('view-active', !isWelcome);
  viewRepos.hidden = isWelcome;

  tabHome.classList.toggle('tab-active', isWelcome);
  tabRepos.classList.toggle('tab-active', !isWelcome);

  if (!isWelcome) window.scrollTo(0, 0);
  sessionStorage.setItem('activeView', view);
}

// ── Helpers ───────────────────────────────────────────────

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function getDisplayName(name) {
  return REPO_LABELS[name] || name.replace(/^Learn_/, '').replace(/_/g, ' ');
}

function getCategoryForRepo(repoName) {
  return REPO_CATEGORIES.find((c) => c.repos.includes(repoName));
}

function getRegistryBySlug(slug) {
  return REGISTRY_BY_SLUG.get(slug);
}

function getRepoOwner(repo) {
  return repo.owner || getRegistryBySlug(repo.name)?.username || '';
}

function getContributorLogin(c) {
  return typeof c === 'string' ? c : c.login;
}

function normalizeContributor(c) {
  if (typeof c === 'string') return { login: c, avatar_url: null };
  return c;
}

function getRepoContributors(repo) {
  if (repo.contributors?.length) {
    return repo.contributors.map(normalizeContributor);
  }
  const owner = getRepoOwner(repo);
  return owner ? [{ login: owner, avatar_url: null }] : [];
}

const GITHUB_HEADERS = { Accept: 'application/vnd.github+json' };
const GITHUB_CACHE_TTL_MS = 30 * 60 * 1000;
const CONTRIBUTOR_FETCH_CONCURRENCY = 2;
const CACHE_PREFIX = 'learn:gh:';

function getGithubCache(key, { allowStale = false } = {}) {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { data, expires } = JSON.parse(raw);
    if (Date.now() > expires) {
      if (!allowStale) {
        sessionStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }
    }
    return data;
  } catch {
    return null;
  }
}

function setGithubCache(key, data) {
  try {
    sessionStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ data, expires: Date.now() + GITHUB_CACHE_TTL_MS })
    );
  } catch {
    /* storage full — skip cache */
  }
}

async function githubApiFetch(url, { throwOnRateLimit = true } = {}) {
  const res = await fetch(url, { headers: GITHUB_HEADERS });
  if (res.status === 403 || res.status === 429) {
    if (throwOnRateLimit) {
      logServerError('GitHub API rate limit', { status: res.status, url });
      throw new Error(USER_ERROR_MESSAGE);
    }
    return null;
  }
  if (!res.ok) {
    if (throwOnRateLimit) {
      logServerError('GitHub API error', { status: res.status, url });
      throw new Error(USER_ERROR_MESSAGE);
    }
    return null;
  }
  return res;
}

async function mapWithConcurrency(items, fn, limit) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, worker));
  return results;
}

function seedReposWithOwnerContributors(repos) {
  return repos.map((repo) => {
    const owner = getRepoOwner(repo);
    return {
      ...repo,
      contributors: owner ? [{ login: owner, avatar_url: null }] : [],
    };
  });
}

function renderContributorLinks(contributors, linkClass) {
  return contributors
    .map(
      (c) => {
        const login = getContributorLogin(c);
        return `<a class="${linkClass}" href="https://github.com/${login}" target="_blank" rel="noopener noreferrer">@${login}</a>`;
      }
    )
    .join('');
}

function renderContributorsBlock(contributors) {
  if (!contributors.length) return '';
  const maxVisible = 3;
  const shown = contributors.slice(0, maxVisible);
  const extra = contributors.length - maxVisible;

  const chips = shown
    .map((c) => {
      const login = getContributorLogin(c);
      const avatar = c.avatar_url
        ? `<img class="repo-contributor-avatar" src="${c.avatar_url}" alt="" width="18" height="18" loading="lazy" />`
        : `<span class="repo-contributor-initial" aria-hidden="true">${login.charAt(0).toUpperCase()}</span>`;
      return `<a class="repo-contributor-chip" href="https://github.com/${login}" target="_blank" rel="noopener noreferrer" title="@${login}">${avatar}<span class="repo-contributor-name">@${login}</span></a>`;
    })
    .join('');

  const more =
    extra > 0
      ? `<span class="repo-contributor-more" title="${extra} more contributor${extra === 1 ? '' : 's'}">+${extra}</span>`
      : '';

  return `<div class="repo-contributors">${chips}${more}</div>`;
}

// ── Prompt template ───────────────────────────────────────

function highlightPlaceholders(text) {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  for (const placeholder of PROMPT_PLACEHOLDERS) {
    const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(
      new RegExp(escaped, 'g'),
      `<mark class="prompt-placeholder">${placeholder}</mark>`
    );
  }

  return html;
}

function renderPromptTemplate() {
  if (!promptTemplateEl) return;
  promptTemplateEl.innerHTML = highlightPlaceholders(PROMPT_TEMPLATE);
  if (!promptTemplateEl.textContent.trim()) {
    promptTemplateEl.textContent = PROMPT_TEMPLATE;
  }
}

function buildPrompt({ topics, weeks, days, skills }) {
  return PROMPT_TEMPLATE
    .replaceAll('[topics]', topics)
    .replaceAll('[x]', String(weeks))
    .replaceAll('[y]', String(days))
    .replaceAll('[skill1, skill2, skill3...]', skills);
}

function renderPromptOutput(text) {
  generatedPromptText = text;
  promptOutputEl.textContent = text;
  promptOutputEl.hidden = false;
  btnCopyPrompt.disabled = false;
}

function showPromptFormError(message) {
  promptFormError.textContent = message;
  promptFormError.hidden = !message;
}

function handlePromptSubmit(e) {
  e.preventDefault();

  const topics = inputTopics.value.trim();
  const weeks = inputWeeks.value.trim();
  const days = inputDays.value.trim();
  const skills = inputSkills.value.trim();

  if (!topics || !skills) {
    showPromptFormError('Please enter both a topic and your baseline skills.');
    return;
  }

  if (!weeks || Number(weeks) < 1 || !days || Number(days) < 1 || Number(days) > 7) {
    showPromptFormError('Weeks must be at least 1 and days per week must be between 1 and 7.');
    return;
  }

  showPromptFormError('');
  renderPromptOutput(buildPrompt({ topics, weeks, days, skills }));
  promptOutputEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function handleCopyPrompt() {
  if (!generatedPromptText) return;

  try {
    await navigator.clipboard.writeText(generatedPromptText);
    const original = btnCopyPrompt.textContent;
    btnCopyPrompt.textContent = 'Copied!';
    btnCopyPrompt.classList.add('copy-feedback');
    setTimeout(() => {
      btnCopyPrompt.textContent = original;
      btnCopyPrompt.classList.remove('copy-feedback');
    }, 2000);
  } catch {
    showPromptFormError('Could not copy to clipboard. Please select and copy manually.');
  }
}

// ── Repo filter tabs ──────────────────────────────────────

function renderRepoFilterTabs() {
  if (!tabFilterCont) return;
  const allTab = `
    <button class="repos-tab active" data-filter="all" role="tab" type="button">All</button>
  `;
  const categoryTabs = REPO_CATEGORIES.map(
    (cat) => `
      <button class="repos-tab" data-filter="${cat.id}" role="tab" type="button">${cat.title}</button>
    `
  ).join('');
  tabFilterCont.innerHTML = allTab + categoryTabs;
}

// ── Category chips (welcome) ──────────────────────────────

function renderCategoryChips() {
  categoryChipsEl.innerHTML = REPO_CATEGORIES.map((cat) => `
    <div class="cat-preview-card" style="--cat-accent:${cat.accent}; --cat-bg:${cat.bg}">
      <div class="cat-preview-name">${cat.title}</div>
      <div class="cat-preview-desc">${cat.subtitle}</div>
      <span class="cat-preview-count">${cat.repos.length} repo${cat.repos.length === 1 ? '' : 's'}</span>
    </div>
  `).join('');
}

// ── About repo preview list ───────────────────────────────

function renderAboutRepoList(repos) {
  if (!aboutRepoListEl) return;
  const preview = repos.slice(0, 4);
  aboutRepoListEl.innerHTML = preview.map((repo) => {
    const cat = getCategoryForRepo(repo.name);
    const contributors = getRepoContributors(repo);
    const contribMeta = contributors.length
      ? ` · <span class="arp-contributors">${renderContributorLinks(contributors, 'arp-contributor')}</span>`
      : '';
    return `
      <div class="about-repo-preview">
        <div class="arp-info">
          <div class="arp-name">${getDisplayName(repo.name)}</div>
          <div class="arp-meta">${repo.language || 'Multi-language'} · Updated ${formatDate(repo.updated_at)}${contribMeta}</div>
        </div>
        ${cat ? `<span class="arp-badge" style="background:${cat.accent}22; color:${cat.accent}; border:1px solid ${cat.accent}55">${cat.title}</span>` : ''}
      </div>
    `;
  }).join('');
}

// ── Repo cards (repos view) ───────────────────────────────

function renderRepoCard(repo, category, delay) {
  const name = getDisplayName(repo.name);
  const contributorsBlock = renderContributorsBlock(getRepoContributors(repo));
  return `
    <article class="repo-card" style="--cat-accent:${category.accent}; --cat-bg:${category.bg}; animation-delay:${delay * 0.06}s">
      <div class="repo-card-top"></div>
      <div class="repo-card-body">
        <a class="repo-name" href="${repo.html_url}" target="_blank" rel="noopener noreferrer">${name}</a>
        <p class="repo-description">${repo.description || 'No description provided.'}</p>
        <div class="repo-meta">
          ${repo.language ? `<span class="lang-tag">${repo.language}</span>` : ''}
          <span class="repo-meta-dot"></span>
          <span>★ ${repo.stargazers_count}</span>
          <span class="repo-meta-dot"></span>
          <span>${formatDate(repo.updated_at)}</span>
        </div>
        ${contributorsBlock ? `<div class="repo-card-footer">${contributorsBlock}</div>` : ''}
      </div>
    </article>
  `;
}

function renderCategorizedRepos(repos, filter = 'all') {
  const repoMap = new Map(repos.map((r) => [r.name, r]));
  let idx = 0;
  const categories = filter === 'all'
    ? REPO_CATEGORIES
    : REPO_CATEGORIES.filter((c) => c.id === filter);

  reposSections.innerHTML = categories.map((cat) => {
    const catRepos = cat.repos
      .map((n) => repoMap.get(n))
      .filter(Boolean)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    if (!catRepos.length) return '';

    const cards = catRepos.map((r) => renderRepoCard(r, cat, idx++)).join('');

    return `
      <section class="category-section category-${cat.id}" style="--cat-accent:${cat.accent}; --cat-bg:${cat.bg}">
        <header class="category-header">
          <div class="category-line"></div>
          <div class="category-label">
            <h3 class="category-title">${cat.title}</h3>
            <p class="category-subtitle">${cat.subtitle}</p>
          </div>
          <span class="category-tag">${catRepos.length} repo${catRepos.length === 1 ? '' : 's'}</span>
        </header>
        <div class="category-grid">${cards}</div>
      </section>
    `;
  }).join('');
}

// ── State management ──────────────────────────────────────

function showReposState(state, message) {
  reposLoading.hidden = state !== 'loading';
  reposError.hidden   = state !== 'error';
  reposSections.hidden = state !== 'ready';
  if (reposEmpty) reposEmpty.hidden = state !== 'ready';
  if (reposToolbar) reposToolbar.hidden = state === 'loading' || state === 'error';
  const toolbarReady = state === 'ready';
  if (reposSearch) reposSearch.disabled = !toolbarReady;
  if (reposAuthorFilter) reposAuthorFilter.disabled = !toolbarReady;
  if (state === 'error' && message) reposErrorMsg.textContent = message;
}

let cachedRepos = null;
let activeCategoryFilter = 'all';
let activeSearchQuery = '';
let activeAuthorFilter = 'all';
let searchDebounceTimer = null;

async function fetchReposForUser(username) {
  const cacheKey = `repos:${username}`;
  const cached = getGithubCache(cacheKey);
  if (cached) return cached;

  try {
    const res = await githubApiFetch(
      `https://api.github.com/users/${username}/repos?per_page=100`
    );
    const data = await res.json();
    setGithubCache(cacheKey, data);
    return data;
  } catch (err) {
    const stale = getGithubCache(cacheKey, { allowStale: true });
    if (stale) return stale;
    logServerError(`fetchReposForUser(${username})`, err);
    throw new Error(USER_ERROR_MESSAGE);
  }
}

async function fetchContributorsForRepo(owner, repoName) {
  const cacheKey = `contributors:${owner}/${repoName}`;
  const cached = getGithubCache(cacheKey);
  if (cached) return cached;

  try {
    const res = await githubApiFetch(
      `https://api.github.com/repos/${owner}/${repoName}/contributors?per_page=100`,
      { throwOnRateLimit: false }
    );
    if (!res) {
      return getGithubCache(cacheKey, { allowStale: true });
    }
    const data = await res.json();
    const contributors = data.map((c) => ({
      login: c.login,
      avatar_url: c.avatar_url,
    }));
    setGithubCache(cacheKey, contributors);
    return contributors;
  } catch {
    return getGithubCache(cacheKey, { allowStale: true });
  }
}

async function enrichReposWithContributors(repos) {
  return mapWithConcurrency(
    repos,
    async (repo) => {
      const owner = getRepoOwner(repo);
      const fetched = owner ? await fetchContributorsForRepo(owner, repo.name) : null;
      const contributors = fetched?.length
        ? fetched
        : (owner ? [{ login: owner, avatar_url: null }] : []);
      return { ...repo, contributors };
    },
    CONTRIBUTOR_FETCH_CONCURRENCY
  );
}

function shouldUsePlaceholder() {
  return new URLSearchParams(window.location.search).has('placeholder');
}

async function loadPlaceholderRepos() {
  const res = await fetch(`${DATA_BASE}/repos-placeholder.json`);
  if (!res.ok) throw new Error('Failed to load placeholder repos');
  const data = await res.json();
  const allowed = new Set(REPO_REGISTRY.map((r) => r.slug));
  return data
    .filter((repo) => allowed.has(repo.name))
    .map((repo) => ({
      ...repo,
      contributors: (repo.contributors || []).map(normalizeContributor),
    }));
}

function finishReposLoad(repos, { skipContributorFetch = false } = {}) {
  cachedRepos = skipContributorFetch ? repos : seedReposWithOwnerContributors(repos);
  const total = cachedRepos.length;
  if (statTotal) statTotal.textContent = total;
  activeCategoryFilter = 'all';
  activeSearchQuery = '';
  activeAuthorFilter = 'all';
  if (reposSearch) reposSearch.value = '';
  renderAuthorFilterOptions();
  renderAboutRepoList(cachedRepos);
  showReposState('ready');
  if (reposToolbar) reposToolbar.hidden = false;
  applyRepoFilters();
  if (!skipContributorFetch) {
    loadContributorDetails(repos);
  }
}

async function fetchRepos() {
  const wanted = new Map(
    REPO_REGISTRY.map((r) => [`${r.username}:${r.slug}`, r])
  );
  const usersNeeded = [...new Set(REPO_REGISTRY.map((r) => r.username))];
  const seen = new Set();
  const merged = [];

  const results = await Promise.all(usersNeeded.map(fetchReposForUser));
  for (let i = 0; i < usersNeeded.length; i++) {
    const username = usersNeeded[i];
    for (const repo of results[i]) {
      const key = `${username}:${repo.name}`;
      if (!wanted.has(key) || seen.has(key)) continue;
      seen.add(key);
      merged.push({ ...repo, owner: username });
    }
  }

  return merged;
}

function repoMatchesSearch(repo, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  const label = getDisplayName(repo.name).toLowerCase();
  const slug = repo.name.toLowerCase();
  const desc = (repo.description || '').toLowerCase();
  const lang = (repo.language || '').toLowerCase();
  const contributors = getRepoContributors(repo)
    .map(getContributorLogin)
    .join(' ')
    .toLowerCase();
  return (
    label.includes(q) ||
    slug.includes(q) ||
    desc.includes(q) ||
    lang.includes(q) ||
    contributors.includes(q)
  );
}

function repoMatchesCategory(repo, categoryFilter) {
  if (categoryFilter === 'all') return true;
  const cat = REPO_CATEGORIES.find((c) => c.id === categoryFilter);
  return cat ? cat.repos.includes(repo.name) : false;
}

function getFilteredRepos() {
  if (!cachedRepos) return [];
  return cachedRepos.filter((repo) => {
    if (!repoMatchesCategory(repo, activeCategoryFilter)) return false;
    if (
      activeAuthorFilter !== 'all' &&
      !getRepoContributors(repo).some((c) => getContributorLogin(c) === activeAuthorFilter)
    ) {
      return false;
    }
    if (!repoMatchesSearch(repo, activeSearchQuery)) return false;
    return true;
  });
}

function updateRepoCount(filteredCount, totalCount) {
  if (!repoCountEl) return;
  const tracks = REPO_CATEGORIES.length;
  if (filteredCount < totalCount) {
    repoCountEl.textContent = `${filteredCount} of ${totalCount} repos across ${tracks} learning tracks`;
  } else {
    repoCountEl.textContent = `${totalCount} repos across ${tracks} learning tracks`;
  }
}

function applyRepoFilters() {
  if (!cachedRepos) return;
  const total = cachedRepos.length;
  const filtered = getFilteredRepos();
  renderCategorizedRepos(filtered, activeCategoryFilter);
  updateRepoCount(filtered.length, total);

  const hasResults = filtered.length > 0;
  if (reposSections) reposSections.hidden = !hasResults;
  if (reposEmpty) reposEmpty.hidden = hasResults;
}

function renderAuthorFilterOptions() {
  if (!reposAuthorFilter) return;
  const contributors = cachedRepos
    ? [...new Set(cachedRepos.flatMap((r) => getRepoContributors(r).map(getContributorLogin)))].sort()
    : [...new Set(REPO_REGISTRY.map((r) => r.username))].sort();
  reposAuthorFilter.innerHTML =
    '<option value="all">All contributors</option>' +
    contributors.map((u) => `<option value="${u}">@${u}</option>`).join('');
  reposAuthorFilter.value = activeAuthorFilter;
}

function wireReposFilters() {
  reposSearch?.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      activeSearchQuery = reposSearch.value.trim();
      applyRepoFilters();
    }, 200);
  });

  reposAuthorFilter?.addEventListener('change', () => {
    activeAuthorFilter = reposAuthorFilter.value;
    applyRepoFilters();
  });

  tabFilterCont?.addEventListener('click', (e) => {
    const btn = e.target.closest('.repos-tab');
    if (!btn) return;
    tabFilterCont.querySelectorAll('.repos-tab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    activeCategoryFilter = btn.dataset.filter;
    applyRepoFilters();
  });
}

async function loadContributorDetails(repos) {
  try {
    const enriched = await enrichReposWithContributors(repos);
    cachedRepos = enriched;
    renderAuthorFilterOptions();
    renderAboutRepoList(cachedRepos);
    applyRepoFilters();
  } catch {
    /* keep owner-only fallback from initial load */
  }
}

async function loadRepos() {
  showReposState('loading');
  try {
    if (shouldUsePlaceholder()) {
      const placeholders = await loadPlaceholderRepos();
      finishReposLoad(placeholders, { skipContributorFetch: true });
      return;
    }

    const repos = await fetchRepos();
    finishReposLoad(repos);
  } catch (err) {
    logServerError('loadRepos', err);
    try {
      const placeholders = await loadPlaceholderRepos();
      if (placeholders.length) {
        finishReposLoad(placeholders, { skipContributorFetch: true });
        return;
      }
    } catch (placeholderErr) {
      logServerError('loadPlaceholderRepos', placeholderErr);
    }
    repoCountEl.textContent = 'Could not load repo count';
    showReposState('error', USER_ERROR_MESSAGE);
  }
}

// ── Event listeners ───────────────────────────────────────

tabHome.addEventListener('click', () => showView('welcome'));
tabRepos.addEventListener('click', () => showView('repos'));
[btnContinue, btnViewAll, btnAboutRepos].forEach((btn) => {
  btn?.addEventListener('click', () => showView('repos'));
});
btnRetry?.addEventListener('click', loadRepos);
promptBuilderForm?.addEventListener('submit', handlePromptSubmit);
btnCopyPrompt?.addEventListener('click', handleCopyPrompt);

let githubPickerTrigger = null;

function renderGithubPickerList() {
  const list = document.getElementById('github-picker-list');
  if (!list) return;
  list.innerHTML = GITHUB_USERS.map(
    (user) => `
      <li role="none">
        <a
          class="github-picker-link"
          role="menuitem"
          href="https://github.com/${user}"
          target="_blank"
          rel="noopener noreferrer"
        >@${user}</a>
      </li>
    `
  ).join('');
}

function positionGithubPicker(trigger, picker) {
  const rect = trigger.getBoundingClientRect();
  const gap = 8;
  const width = picker.offsetWidth;
  const height = picker.offsetHeight;

  let left = rect.right - width;
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

  let top = rect.bottom + gap;
  if (top + height > window.innerHeight - 8) {
    top = rect.top - height - gap;
  }
  top = Math.max(8, top);

  picker.style.top = `${top}px`;
  picker.style.left = `${left}px`;
}

function closeGithubPicker() {
  const picker = document.getElementById('github-picker');
  const backdrop = document.getElementById('github-picker-backdrop');
  if (picker) picker.hidden = true;
  if (backdrop) backdrop.hidden = true;
  if (githubPickerTrigger) {
    githubPickerTrigger.setAttribute('aria-expanded', 'false');
    githubPickerTrigger = null;
  }
}

function openGithubPicker(trigger) {
  if (!GITHUB_USERS.length) return;

  const picker = document.getElementById('github-picker');
  const backdrop = document.getElementById('github-picker-backdrop');
  if (!picker || !backdrop) return;

  if (!picker.hidden && githubPickerTrigger === trigger) {
    closeGithubPicker();
    return;
  }

  renderGithubPickerList();
  githubPickerTrigger = trigger;
  trigger.setAttribute('aria-expanded', 'true');
  backdrop.hidden = false;
  picker.hidden = false;
  positionGithubPicker(trigger, picker);
}

function wireFooterContributeLink() {
  const link = document.getElementById('footer-contribute');
  const owner = GITHUB_USERS[0];
  if (!link || !owner) return;
  link.href = `https://github.com/${owner}/${SITE_REPO}/blob/main/data/README.md`;
}

function wireGithubPickers() {
  const backdrop = document.getElementById('github-picker-backdrop');
  const picker = document.getElementById('github-picker');

  document.querySelectorAll('.github-picker-trigger').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openGithubPicker(btn);
    });
  });

  backdrop?.addEventListener('click', closeGithubPicker);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && picker && !picker.hidden) closeGithubPicker();
  });

  window.addEventListener('resize', () => {
    if (githubPickerTrigger && picker && !picker.hidden) {
      positionGithubPicker(githubPickerTrigger, picker);
    }
  });
}

function wireFooterNav() {
  document.querySelectorAll('.site-footer [data-nav]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.dataset.nav;
      if (target === 'repos') {
        showView('repos');
      } else {
        showView('welcome');
        if (target === 'home') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (target === 'about') {
          setTimeout(() => document.querySelector('.about-section')?.scrollIntoView({ behavior: 'smooth' }), 50);
        } else if (target === 'prompt') {
          setTimeout(() => document.getElementById('prompt-section')?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
      }
    });
  });

}

function showSiteDataError(err) {
  logServerError('loadSiteData', err);
  if (repoCountEl) repoCountEl.textContent = 'Could not load repo count';
  if (reposErrorMsg) reposErrorMsg.textContent = USER_ERROR_MESSAGE;
  showReposState('error', USER_ERROR_MESSAGE);
  if (promptTemplateEl) {
    promptTemplateEl.textContent = USER_ERROR_MESSAGE;
  }
}

async function initPage() {
  try {
    await loadSiteData();
  } catch (err) {
    showSiteDataError(err);
    wireFooterNav();
    const savedView = sessionStorage.getItem('activeView');
    showView(savedView === 'repos' ? 'repos' : 'welcome');
    return;
  }

  renderRepoFilterTabs();
  renderCategoryChips();
  renderPromptTemplate();
  renderAuthorFilterOptions();
  wireReposFilters();
  wireGithubPickers();
  wireFooterContributeLink();
  wireFooterNav();

  const savedView = sessionStorage.getItem('activeView');
  showView(savedView === 'repos' ? 'repos' : 'welcome');
  loadRepos();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { initPage(); });
} else {
  initPage();
}