// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
//
// Answers are cached in memory and revalidated with ETag / If-None-Match:
// the API's tags are bound to the minute, so a second visit to a view inside
// the same minute answers 304 and costs almost no bytes.

const API = 'https://make.fun/api';

/** url path -> { etag, body } of the last 200 answer. */
const cache = new Map();

async function get(path) {
  const hit = cache.get(path);
  const headers = hit && hit.etag ? { 'If-None-Match': hit.etag } : {};
  const res = await fetch(API + path, { headers });
  if (res.status === 304 && hit) return hit.body;
  if (!res.ok) throw new Error(`make.fun API answered ${res.status} for ${path}`);
  const body = await res.json();
  const etag = res.headers.get('ETag');
  if (etag) cache.set(path, { etag, body });
  return body;
}

/** The open bounties, one page: { items: [...], next_cursor }. */
export const getBounties = (cursor) =>
  get('/competitions?status=open&activity=times' + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''));

/** One bounty, by its slug. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard: { columns: [...], entries: [...] }. */
export const getLeaderboard = (slug) => get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** An account's public profile, by its handle. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);
