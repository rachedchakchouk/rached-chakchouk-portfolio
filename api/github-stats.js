import { githubStatsResponse } from './_github.js';

// GET /api/github-stats (adresse principale, Vercel) : statistiques GitHub publiques pour la page /github/.
export async function GET() {
  return githubStatsResponse();
}
