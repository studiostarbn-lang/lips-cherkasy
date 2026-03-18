function escapeHtml(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function formatLeadText(payload, meta) {
  const lines = [];
  lines.push('Нова заявка ✅');
  lines.push('');
  lines.push(`Джерело: ${escapeHtml(payload.source || 'unknown')}`);
  if (payload.name) lines.push(`Імʼя: ${escapeHtml(payload.name)}`);
  if (payload.phone) lines.push(`Телефон: ${escapeHtml(payload.phone)}`);
  if (payload.time) lines.push(`Час: ${escapeHtml(payload.time)}`);
  if (Array.isArray(payload.answers) && payload.answers.length) {
    lines.push('');
    lines.push('Відповіді квізу:');
    payload.answers.slice(0, 20).forEach((a, i) => lines.push(`${i + 1}) ${escapeHtml(a)}`));
  }
  lines.push('');
  lines.push(`IP: ${escapeHtml(meta.ip || '-')}`);
  lines.push(`UA: ${escapeHtml(meta.ua || '-')}`);
  return lines.join('\n');
}

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) return xff.split(',')[0].trim();
  return req.socket?.remoteAddress || '';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end('Method Not Allowed');
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'Server is not configured' }));
    return;
  }

  let payload = req.body;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch (_) { payload = {}; }
  }
  if (!payload || typeof payload !== 'object') payload = {};

  const phone = String(payload.phone || '').trim();
  if (!phone) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'Phone is required' }));
    return;
  }

  const meta = {
    ip: getClientIp(req),
    ua: req.headers['user-agent'] || ''
  };

  const text = formatLeadText(payload, meta);
  const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const tgRes = await fetch(tgUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });

  if (!tgRes.ok) {
    const tgText = await tgRes.text().catch(() => '');
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'Telegram send failed', details: tgText }));
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ ok: true }));
};

