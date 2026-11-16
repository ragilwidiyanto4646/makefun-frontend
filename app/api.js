const ROOT = 'https://make.fun/api';
const cache = new Map();
async function get(path) {
  const headers = {}, old = cache.get(path);
  if (old?.etag) headers['If-None-Match'] = old.etag;
  const response = await fetch(ROOT + path, { method: 'GET', headers, credentials: 'omit' });
  if (response.status === 304 && old) return old.body;
  if (!response.ok) throw new Error(`API request failed (${response.status}) for ${path}`);
  const body = await response.json(); cache.set(path, { etag: response.headers.get('ETag'), body }); return body;
}
export const getBounties = cursor => get('/competitions?status=open&activity=times' + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''));
export const getBounty = slug => get(`/competitions/${encodeURIComponent(slug)}`);
export const getLeaderboard = slug => get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);
export const getProfile = handle => get(`/profiles/${encodeURIComponent(handle)}`);
