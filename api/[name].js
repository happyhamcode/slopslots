import { get, put } from '@vercel/blob';
import { route, discordUser } from '../lib/api.js';

const store = {
  async get(key) {
    const r = await get(key, { access: 'private', useCache: false });
    return r ? new Response(r.stream).text() : null;
  },
  async put(key, text) {
    await put(key, text, { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json' });
  },
};

export default async function handler(req, res) {
  const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
  try {
    const out = await route(
      { method: req.method, name: req.query.name, token, body: req.body },
      { store, discord: discordUser, adminId: process.env.ADMIN_DISCORD_ID },
    );
    res.setHeader('Cache-Control', out.cache);
    res.status(out.status).json(out.json);
  } catch {
    res.status(500).json({ error: 'server error' });
  }
}
