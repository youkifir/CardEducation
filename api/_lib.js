const crypto = require('crypto');
const BASE = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

exports.redis = (...cmd) =>
  fetch(BASE, { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN }, body: JSON.stringify(cmd) })
    .then(r => r.json())
    .then(j => { if (j.error) throw new Error(j.error); return j.result; });

exports.tg = (method, body) =>
  fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(r => r.json());

// Проверка подписи initData от Telegram Mini App
exports.verify = initData => {
  const p = new URLSearchParams(initData);
  const hash = p.get('hash'); p.delete('hash');
  if (!hash) return null;
  const str = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => k + '=' + v).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN || '').digest();
  if (crypto.createHmac('sha256', secret).update(str).digest('hex') !== hash) return null;
  if (Date.now() / 1000 - Number(p.get('auth_date')) > 3 * 86400) return null;
  try { return JSON.parse(p.get('user')); } catch (e) { return null; }
};
