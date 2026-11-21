const { redis, tg } = require('./_lib');
const plural = n => { const a = n % 10, b = n % 100; return b > 10 && b < 20 ? 'карточек' : a === 1 ? 'карточка' : a > 1 && a < 5 ? 'карточки' : 'карточек'; };

module.exports = async (req, res) => {
  if (process.env.CRON_SECRET && req.headers.authorization !== 'Bearer ' + process.env.CRON_SECRET) return res.status(401).end();
  const ids = (await redis('SMEMBERS', 'users')) || [];
  const nowH = Math.floor(Date.now() / 36e5), today = new Date().toISOString().slice(0, 10);
  let sent = 0;
  for (const id of ids) {
    const raw = await redis('GET', 'u:' + id);
    if (!raw) continue;
    const u = JSON.parse(raw);
    if (!u.on || Date.now() - u.t > 7 * 864e5) continue;           // выключено или не заходил 7 дней
    const due = Object.entries(u.h).filter(([k]) => +k <= nowH).reduce((s, [, v]) => s + v, 0) + (u.nw || 0);
    if (!due || (await redis('GET', 'n:' + id)) === today) continue;
    const r = await tg('sendMessage', {
      chat_id: id,
      text: `📚 Пора повторить слова: ${due} ${plural(due)}. Это займёт пару минут.`,
      reply_markup: { inline_keyboard: [[{ text: 'Учить', web_app: { url: process.env.APP_URL } }]] }
    });
    if (r.ok) { sent++; await redis('SET', 'n:' + id, today, 'EX', 172800); }
    else if (r.error_code === 403) await redis('SREM', 'users', String(id)); // пользователь заблокировал бота
  }
  res.json({ sent, users: ids.length });
};
