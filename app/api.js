const cache = new Map(), pending = new Map();
export async function get(path, force = false) {
  const old = cache.get(path);
  if (!force && old && Date.now() - old.at < 60000) return old.data;
  if (pending.has(path)) return pending.get(path);
  const request = (async () => {
    const headers = old?.etag ? { 'If-None-Match': old.etag } : {};
    const res = await fetch('https://make.fun/api' + path, { headers });
    if (res.status === 304 && old) { old.at = Date.now(); return old.data; }
    if (!res.ok) throw new Error(res.status === 404 ? 'This page could not be found.' : `Live data is temporarily unavailable (${res.status}).`);
    const data = await res.json();
    cache.set(path, { data, etag: res.headers.get('etag'), at: Date.now() });
    return data;
  })();
  pending.set(path, request);
  try { return await request; } finally { pending.delete(path); }
}
export const bountyData = slug => get(`/competitions/${encodeURIComponent(slug)}?submissions=summary`);
export const leaderboardData = (slug, phase = 'dev') => get(`/competitions/${encodeURIComponent(slug)}/leaderboard?rows=first&ties=runs&phase=${phase}`);
export const profileData = handle => get(`/profiles/${encodeURIComponent(handle)}`);
