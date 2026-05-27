const GITHUB_USER = 'TheTangentLine';

const REPO_CATEGORIES = [
  {
    id: 'full-course',
    title: 'Full Course',
    subtitle: 'End-to-end guided learning paths',
    accent: '#4f46e5',
    bg: '#eeeeff',
    repos: ['Learn_microservice_communication', 'Learn_basic_devops'],
  },
  {
    id: 'from-scratch',
    title: 'From Scratch',
    subtitle: 'Build core systems from the ground up',
    accent: '#ea580c',
    bg: '#fff7ed',
    repos: ['Learn_LB', 'Learn_IPC', 'Learn_interpreter'],
  },
  {
    id: 'application',
    title: 'Application',
    subtitle: 'Focused apps for specific concepts',
    accent: '#16a34a',
    bg: '#dcfce7',
    repos: [
      'Learn_SSL-TLS',
      'Learn_gRPC',
      'Learn_CICD',
      'Learn_logging_system',
      'Learn_OIDC',
    ],
  },
];

const REPO_LABELS = {
  'Learn_microservice_communication': 'Microservice Communication',
  'Learn_basic_devops': 'Basic DevOps',
  'Learn_LB': 'Load Balancer',
  'Learn_IPC': 'Inter-Process Communication',
  'Learn_interpreter': 'Interpreter',
  'Learn_SSL-TLS': 'SSL / TLS',
  'Learn_gRPC': 'gRPC',
  'Learn_CICD': 'CI/CD with GitHub Actions',
  'Learn_logging_system': 'Logging System',
  'Learn_OIDC': 'OIDC Flow',
};

const REPO_ALLOWLIST = REPO_CATEGORIES.flatMap((c) => c.repos);

const PROMPT_TEMPLATE = `Act as a senior technical mentor and industry expert in **[topics]**. I require a highly intensive, **[x]**-week curriculum to master this subject, dedicating **[y]** days per week.

**My Baseline:**
Do not treat me like a beginner. Calibrate the pacing, depth, and rigor strictly to my existing foundation: **[skill1, skill2, skill3...]**. Skip trivial introductions and basic definitions.

**Format & Delivery Constraints:**
I am compiling your daily lectures into a Git repository. Every lesson you generate must be a comprehensive, standalone Markdown file containing:

* Clear heading hierarchies (\`#\`, \`##\`)
* Properly formatted code blocks (with language specified)
* Mathematical notations formatted in LaTeX (where applicable)
* Mermaid diagrams (\`flowchart\`, \`sequenceDiagram\`, etc.) used frequently to illustrate flows, architectures, and process logic

**Weekly Challenge:**
The final day of each week (Day **[y]**) must include a complex, real-world "Weekly Challenge." This challenge should synthesize the week's lectures into a practical project, system design task, or advanced problem-solving scenario.

**Execution Flow:**

1. First, output the complete, high-level syllabus broken down by weeks, daily modules, and the Weekly Challenges.
2. Stop generating immediately after the syllabus. Do not write any lectures yet.
3. Explicitly ask me: "Syllabus generated. Are you ready to begin Day 1?"`;

const PROMPT_PLACEHOLDERS = [
  '[topics]',
  '[x]',
  '[y]',
  '[skill1, skill2, skill3...]',
];

// ── DOM refs ──────────────────────────────────────────────
const viewWelcome      = document.getElementById('view-welcome');
const viewRepos        = document.getElementById('view-repos');
const tabHome          = document.getElementById('tab-home');
const tabRepos         = document.getElementById('tab-repos');
const btnContinue      = document.getElementById('btn-continue');
const btnViewAll       = document.getElementById('btn-view-all');
const btnAboutRepos    = document.getElementById('btn-about-repos');
const githubRef        = document.getElementById('github-ref');
const btnRetry         = document.getElementById('btn-retry');
const repoCountEl      = document.getElementById('repo-count');
const categoryChipsEl  = document.getElementById('category-chips');
const aboutRepoListEl  = document.getElementById('about-repo-list');
const reposLoading     = document.getElementById('repos-loading');
const reposError       = document.getElementById('repos-error');
const reposErrorMsg    = document.getElementById('repos-error-message');
const reposSections    = document.getElementById('repos-sections');
const tabFilterCont    = document.getElementById('repos-tab-filters');
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
    return `
      <div class="about-repo-preview">
        <div class="arp-info">
          <div class="arp-name">${getDisplayName(repo.name)}</div>
          <div class="arp-meta">${repo.language || 'Multi-language'} · Updated ${formatDate(repo.updated_at)}</div>
        </div>
        ${cat ? `<span class="arp-badge" style="background:${cat.accent}22; color:${cat.accent}; border:1px solid ${cat.accent}55">${cat.title}</span>` : ''}
      </div>
    `;
  }).join('');
}

// ── Repo cards (repos view) ───────────────────────────────

function renderRepoCard(repo, category, delay) {
  const name = getDisplayName(repo.name);
  return `
    <article class="repo-card" style="--cat-accent:${category.accent}; --cat-bg:${category.bg}; animation-delay:${delay * 0.06}s">
      <div class="repo-card-top"></div>
      <div class="repo-card-body">
        <a class="repo-name" href="${repo.html_url}" target="_blank" rel="noopener noreferrer">${name}</a>
        <span class="repo-slug">${repo.name}</span>
        <p class="repo-description">${repo.description || 'No description provided.'}</p>
        <div class="repo-meta">
          ${repo.language ? `<span class="lang-tag">${repo.language}</span>` : ''}
          <span class="repo-meta-dot"></span>
          <span>★ ${repo.stargazers_count}</span>
          <span class="repo-meta-dot"></span>
          <span>${formatDate(repo.updated_at)}</span>
        </div>
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
  if (state === 'error' && message) reposErrorMsg.textContent = message;
}

let cachedRepos = null;

async function fetchRepos() {
  const res = await fetch(
    `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100`,
    { headers: { Accept: 'application/vnd.github+json' } }
  );
  if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
  const all = await res.json();
  const allow = new Set(REPO_ALLOWLIST);
  return all.filter((r) => allow.has(r.name));
}

async function loadRepos() {
  showReposState('loading');
  try {
    cachedRepos = await fetchRepos();
    const total = cachedRepos.length;
    repoCountEl.textContent = `${total} repos across ${REPO_CATEGORIES.length} learning tracks`;
    if (statTotal) statTotal.textContent = total;
    renderCategorizedRepos(cachedRepos, 'all');
    renderAboutRepoList(cachedRepos);
    showReposState('ready');
  } catch (err) {
    repoCountEl.textContent = 'Could not load repo count';
    showReposState('error', err.message || 'Failed to load repositories.');
  }
}

// ── Tab filters ───────────────────────────────────────────

tabFilterCont?.addEventListener('click', (e) => {
  const btn = e.target.closest('.repos-tab');
  if (!btn) return;
  tabFilterCont.querySelectorAll('.repos-tab').forEach((t) => t.classList.remove('active'));
  btn.classList.add('active');
  if (cachedRepos) renderCategorizedRepos(cachedRepos, btn.dataset.filter);
});

// ── Event listeners ───────────────────────────────────────

tabHome.addEventListener('click', () => showView('welcome'));
tabRepos.addEventListener('click', () => showView('repos'));
[btnContinue, btnViewAll, btnAboutRepos].forEach((btn) => {
  btn?.addEventListener('click', () => showView('repos'));
});
githubRef?.addEventListener('click', () => {
  window.open(`https://github.com/${GITHUB_USER}`, '_blank', 'noopener,noreferrer');
});
btnRetry?.addEventListener('click', loadRepos);
promptBuilderForm?.addEventListener('submit', handlePromptSubmit);
btnCopyPrompt?.addEventListener('click', handleCopyPrompt);

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

  document.getElementById('footer-github')?.addEventListener('click', () => {
    window.open(`https://github.com/${GITHUB_USER}`, '_blank', 'noopener,noreferrer');
  });
}

function initPage() {
  renderCategoryChips();
  renderPromptTemplate();
  wireFooterNav();

  const savedView = sessionStorage.getItem('activeView');
  showView(savedView === 'repos' ? 'repos' : 'welcome');
  loadRepos();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}