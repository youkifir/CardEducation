const { redis, verify } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const user = verify(b.initData || '');
    if (!user) return res.status(401).json({ ok: false });
    const h = {};
    Object.entries(b.h || {}).slice(0, 5000).forEach(([k, v]) => { h[+k] = +v || 0; });
    await redis('SET', 'u:' + user.id, JSON.stringify({ on: b.on !== false, h, nw: Math.min(+b.nw || 0, 50), t: Date.now() }));
    await redis('SADD', 'users', String(user.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
};
