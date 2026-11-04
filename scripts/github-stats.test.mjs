// Test de l'assemblage des statistiques GitHub (node scripts/github-stats.test.mjs).
import assert from 'node:assert/strict';
import { buildStats } from '../api/_github.js';

const now = new Date('2026-11-04T20:00:00Z');
const ago = (d) => new Date(now.getTime() - d * 86400000).toISOString();
const s = buildStats({
  now,
  user: { public_repos: 3, followers: 7, created_at: '2019-02-01T00:00:00Z' },
  repos: [
    { name: 'atelier', fork: false, archived: false, stargazers_count: 2, forks_count: 1, pushed_at: ago(1), html_url: 'u1', language: 'TypeScript', description: 'x' },
    { name: 'gitdock', fork: false, archived: false, stargazers_count: 1, forks_count: 0, pushed_at: ago(40), html_url: 'u2', language: 'Java' },
    { name: 'fourche', fork: true, archived: false, stargazers_count: 50, pushed_at: ago(0), html_url: 'u3' },
  ],
  events: [
    { type: 'PushEvent', created_at: ago(1), repo: { name: 'r/atelier' }, payload: { size: 3 } },
    { type: 'PushEvent', created_at: ago(1), repo: { name: 'r/atelier' }, payload: { commits: [{}, {}] } },
    { type: 'PushEvent', created_at: ago(5), repo: { name: 'r/gitdock' }, payload: {} },
    { type: 'PushEvent', created_at: ago(120), repo: { name: 'r/gitdock' }, payload: { size: 9 } },
    { type: 'PullRequestEvent', created_at: ago(2), payload: { action: 'opened' } },
    { type: 'CreateEvent', created_at: ago(3), payload: { ref_type: 'repository' } },
  ],
  languages: [{ TypeScript: 750, SCSS: 250 }, { Java: 1000 }],
  contributions: null,
});
assert.equal(s.kpis.ownRepos, 2);
assert.equal(s.kpis.stars, 3);
assert.equal(s.kpis.pushes90, 3);
assert.equal(s.kpis.commits90, 6);
assert.equal(s.kpis.activeDays90, 2);
assert.equal(s.kpis.pullRequests90, 1);
assert.equal(s.kpis.reposCreated90, 1);
assert.equal(s.kpis.reposPushed30, 1);
assert.equal(s.timeline.length, 90);
assert.deepEqual(s.languages[0], { name: 'Java', share: 50 });
assert.equal(s.repos[0].name, 'atelier');
assert.equal(s.repos[0].pushes90, 2);
assert.equal(s.year, null);
const withYear = buildStats({ now, user: {}, repos: [], events: [], languages: [], contributions: {
  totalCommitContributions: 400, totalPullRequestContributions: 12, totalIssueContributions: 3, totalPullRequestReviewContributions: 1,
  restrictedContributionsCount: 100, totalRepositoriesWithContributedCommits: 9,
  contributionCalendar: { totalContributions: 520, weeks: [{ contributionDays: [{ date: '2026-11-03', contributionCount: 4 }] }] } } });
assert.equal(withYear.year.commits, 500);
assert.deepEqual(withYear.calendar, [[['2026-11-03', 4]]]);
console.log('github-stats : 17 vérifications OK');
