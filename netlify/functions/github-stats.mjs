import { githubStatsResponse } from '../../api/_github.js';

// GET /api/github-stats (adresse de secours, Netlify) : même calcul que la fonction Vercel.
export default async () => githubStatsResponse();

export const config = { path: '/api/github-stats' };
