import { createHash } from 'node:crypto';
import { cleanConfig, cleanSettings, EMPTY_CONFIG } from '../slots.js';

// Returns the Discord user for an OAuth token, or null.
export async function discordUser(token, fetchFn = fetch) {
  if (!token) return null;
  try {
    const r = await fetchFn('https://discord.com/api/v10/users/@me', { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    const u = await r.json();
    return /^\d{5,25}$/.test(u?.id) ? { id: u.id, name: String(u.global_name || u.username || 'player').slice(0, 40) } : null;
  } catch { return null; }
}

const readJson = async (store, key, fallback) => {
  const raw = await store.get(key);
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
};

// deps: { store: {get(key), put(key, text)}, discord(token) -> user|null, adminId }
export async function route({ method, name, token, body }, { store, discord, adminId }) {
  const ok = (json, cache = 'no-store') => ({ status: 200, json, cache });
  const err = (status, error) => ({ status, json: { error }, cache: 'no-store' });

  if (name === 'config' && method === 'GET') {
    return ok(await readJson(store, 'config.json', EMPTY_CONFIG), 'public, s-maxage=30, stale-while-revalidate=300');
  }
  const user = await discord(token);
  if (!user) return err(401, 'login required');
  const isAdmin = !!adminId && user.id === adminId;

  if (name === 'me' && method === 'GET') return ok({ name: user.name, admin: isAdmin });
  if (name === 'config' && method === 'PUT') {
    if (!isAdmin) return err(403, 'admins only');
    let cfg;
    try { cfg = cleanConfig(body); } catch (e) { return err(400, e.message); }
    await store.put('config.json', JSON.stringify(cfg));
    return ok(cfg);
  }
  // Keyed by a hash of the Discord id: no names, avatars or ids stored.
  const key = `settings/${createHash('sha256').update(user.id).digest('hex')}.json`;
  if (name === 'settings' && method === 'GET') return ok(await readJson(store, key, null));
  if (name === 'settings' && method === 'PUT') {
    let s;
    try { s = cleanSettings(body); } catch (e) { return err(400, e.message); }
    await store.put(key, JSON.stringify(s));
    return ok(s);
  }
  return err(404, 'not found');
}
