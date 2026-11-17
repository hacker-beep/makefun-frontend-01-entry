const cache = new Map(), pending = new Map();
try { for (const [path, entry] of JSON.parse(sessionStorage.getItem('makefun-api-cache') || '[]')) cache.set(path, { ...entry, at: 0 }); } catch {}
function saveCache() { try { sessionStorage.setItem('makefun-api-cache', JSON.stringify([...cache])); } catch {} }
export const telemetry = { requests: 0, memory: 0, unchanged: 0, updatedAt: 0 };
export async function get(path, force = false) {
  const old = cache.get(path);
  if (!force && old && Date.now() - old.at < 60000) { telemetry.memory++; return old.data; }
  if (pending.has(path)) return pending.get(path);
  const request = (async () => {
    // Compare exposed ETags after revalidation: the CDN's 304 response omits CORS headers.
    const headers = {};
    telemetry.requests++;
    const res = await fetch('https://make.fun/api' + path, { headers, cache: 'no-store' });
    if (res.status === 304 && old) { telemetry.unchanged++; telemetry.updatedAt = Date.now(); old.at = Date.now(); return old.data; }
    if (!res.ok) throw new Error(res.status === 404 ? 'This page could not be found.' : `Live data is temporarily unavailable (${res.status}).`);
    const data = await res.json();
    if (old?.etag && old.etag === res.headers.get('etag')) telemetry.unchanged++;
    telemetry.updatedAt = Date.now();
    cache.set(path, { data, etag: res.headers.get('etag'), at: Date.now() });
    saveCache();
    return data;
  })();
  pending.set(path, request);
  try { return await request; } finally { pending.delete(path); }
}
export const bountyData = slug => get(`/competitions/${encodeURIComponent(slug)}?submissions=summary`);
export const leaderboardData = (slug, phase = 'dev') => get(`/competitions/${encodeURIComponent(slug)}/leaderboard?rows=all&ties=runs&phase=${phase}`);
export const profileData = handle => get(`/profiles/${encodeURIComponent(handle)}`);
