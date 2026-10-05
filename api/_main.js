// Shared settings for the Vercel mirror. The mirror has no database of its own:
// content, CV and photo are read from the main Netlify site, with the static copies as fallback.
export const MAIN = 'https://rached-chakchouk.netlify.app';
export const TIMEOUT = 4000;
export function withTimeout(ms = TIMEOUT) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, done: () => clearTimeout(t) };
}
