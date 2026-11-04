// Statistiques GitHub publiques du portfolio (page /github/), calculées côté serveur : la page ne peut appeler que
// son propre domaine (CSP connect-src 'self'). Partagé par la fonction Vercel (api/github-stats.js, adresse
// principale) et la fonction Netlify (netlify/functions/github-stats.mjs, adresse de secours).
//
// Sans jeton : API REST publique (profil, dépôts, langages, événements des 90 derniers jours).
// Avec GITHUB_TOKEN (variable d'environnement, jeton en lecture seule) : calendrier des contributions sur 12 mois
// et nombre exact de commits, pull requests et issues (GraphQL contributionsCollection), en plus.

export const GITHUB_USER = 'rachedchakchouk';
const API = 'https://api.github.com';
const DAY = 86400000;

function headers(token) {
  const h = { accept: 'application/vnd.github+json', 'user-agent': 'rached-chakchouk-portfolio', 'x-github-api-version': '2022-11-28' };
  if (token) h.authorization = 'Bearer ' + token;
  return h;
}

async function getJson(url, token, timeoutMs = 6000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers: headers(token), signal: c.signal });
    if (!r.ok) throw new Error('GitHub ' + r.status + ' sur ' + url.replace(API, ''));
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

const GRAPH = `query($login:String!){user(login:$login){contributionsCollection{totalCommitContributions totalPullRequestContributions totalIssueContributions totalPullRequestReviewContributions restrictedContributionsCount totalRepositoriesWithContributedCommits contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`;

async function graphql(token) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 8000);
  try {
    const r = await fetch(API + '/graphql', { method: 'POST', headers: { ...headers(token), 'content-type': 'application/json' }, body: JSON.stringify({ query: GRAPH, variables: { login: GITHUB_USER } }), signal: c.signal });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.data?.user?.contributionsCollection ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Assemble les indicateurs à partir des réponses GitHub (fonction pure, testée dans scripts/github-stats.test.mjs). */
export function buildStats({ user, repos, events, languages, contributions, now = new Date() }) {
  const own = repos.filter((r) => !r.fork && !r.archived);
  const since90 = now.getTime() - 90 * DAY;
  const pushes = events.filter((e) => e.type === 'PushEvent' && new Date(e.created_at).getTime() >= since90);
  // commits par push : « size » (anciennes charges utiles), sinon liste « commits », sinon au moins 1
  const commitsOf = (e) => (typeof e.payload?.size === 'number' ? e.payload.size : Array.isArray(e.payload?.commits) ? e.payload.commits.length : 1);
  const days = new Map();
  for (let i = 89; i >= 0; i--) days.set(new Date(now.getTime() - i * DAY).toISOString().slice(0, 10), { pushes: 0, commits: 0 });
  let commits90 = 0;
  const repoPushes = new Map();
  for (const e of pushes) {
    const k = e.created_at.slice(0, 10);
    const d = days.get(k);
    const n = commitsOf(e);
    commits90 += n;
    if (d) { d.pushes++; d.commits += n; }
    const name = (e.repo?.name || '').split('/').pop();
    repoPushes.set(name, (repoPushes.get(name) || 0) + 1);
  }
  const otherEvents = events.filter((e) => new Date(e.created_at).getTime() >= since90);
  const prs = otherEvents.filter((e) => e.type === 'PullRequestEvent' && e.payload?.action === 'opened').length;
  const created = otherEvents.filter((e) => e.type === 'CreateEvent' && e.payload?.ref_type === 'repository').length;

  const langTotals = {};
  for (const l of languages) for (const [k, v] of Object.entries(l || {})) langTotals[k] = (langTotals[k] || 0) + v;
  const langSum = Object.values(langTotals).reduce((s, v) => s + v, 0) || 1;
  const langs = Object.entries(langTotals).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, bytes]) => ({ name, share: Math.round((bytes / langSum) * 1000) / 10 }));

  const activeDays = [...days.values()].filter((d) => d.pushes > 0).length;
  let calendar = null;
  let year = null;
  if (contributions) {
    calendar = contributions.contributionCalendar.weeks.map((w) => w.contributionDays.map((d) => [d.date, d.contributionCount]));
    year = {
      contributions: contributions.contributionCalendar.totalContributions,
      commits: contributions.totalCommitContributions + (contributions.restrictedContributionsCount || 0),
      pullRequests: contributions.totalPullRequestContributions,
      issues: contributions.totalIssueContributions,
      reviews: contributions.totalPullRequestReviewContributions,
      repos: contributions.totalRepositoriesWithContributedCommits,
      privateContributions: contributions.restrictedContributionsCount || 0,
    };
  }

  return {
    user: GITHUB_USER,
    generatedAt: now.toISOString(),
    kpis: {
      publicRepos: user.public_repos ?? own.length,
      ownRepos: own.length,
      stars: own.reduce((s, r) => s + (r.stargazers_count || 0), 0),
      forks: own.reduce((s, r) => s + (r.forks_count || 0), 0),
      followers: user.followers ?? 0,
      pushes90: pushes.length,
      commits90,
      activeDays90: activeDays,
      pullRequests90: prs,
      reposCreated90: created,
      reposPushed30: own.filter((r) => now.getTime() - new Date(r.pushed_at).getTime() < 30 * DAY).length,
      memberSince: user.created_at ? user.created_at.slice(0, 10) : null,
    },
    year,
    calendar,
    timeline: [...days.entries()].map(([day, d]) => ({ day, ...d })),
    languages: langs,
    repos: own
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
      .slice(0, 12)
      .map((r) => ({ name: r.name, url: r.html_url, description: r.description || '', language: r.language, stars: r.stargazers_count || 0, pushedAt: r.pushed_at, pushes90: repoPushes.get(r.name) || 0 })),
  };
}

export async function fetchGithubStats(token = process.env.GITHUB_TOKEN) {
  const [user, repos, ...pages] = await Promise.all([
    getJson(`${API}/users/${GITHUB_USER}`, token),
    getJson(`${API}/users/${GITHUB_USER}/repos?per_page=100&sort=pushed&type=owner`, token),
    ...[1, 2, 3].map((p) => getJson(`${API}/users/${GITHUB_USER}/events/public?per_page=100&page=${p}`, token).catch(() => [])),
  ]);
  const events = pages.flat();
  const recent = repos.filter((r) => !r.fork && !r.archived).sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at)).slice(0, 15);
  const languages = await Promise.all(recent.map((r) => getJson(r.languages_url, token).catch(() => ({}))));
  const contributions = token ? await graphql(token) : null;
  return buildStats({ user, repos, events, languages, contributions });
}

/** Réponse HTTP commune aux deux hébergeurs : 1 h en cache partagé, ancienne version servie pendant la mise à jour. */
export async function githubStatsResponse() {
  try {
    const stats = await fetchGithubStats();
    return new Response(JSON.stringify(stats), {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400', 'x-content-type-options': 'nosniff' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Statistiques GitHub momentanément indisponibles.' }), {
      status: 503,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60, s-maxage=300' },
    });
  }
}
