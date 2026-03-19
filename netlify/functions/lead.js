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

async function sendTelegram({ botToken, chatId, text }) {
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
    const err = new Error('Telegram send failed');
    err.details = tgText;
    throw err;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST' },
      body: 'Method Not Allowed'
    };
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const googleAppsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  const telegramConfigured = Boolean(botToken && chatId);
  const telegramWarning = telegramConfigured ? null : 'Telegram is not configured';

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (_) {}

  const phone = String(payload.phone || '').trim();
  if (!phone) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ ok: false, error: 'Phone is required' })
    };
  }

  const meta = {
    ip: event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || '',
    ua: event.headers?.['user-agent'] || ''
  };

  const text = formatLeadText(payload, meta);

  try {
    if (telegramConfigured) {
      await sendTelegram({ botToken, chatId, text });
    }

    // Best-effort write to Google Sheets via Apps Script endpoint.
    // Never fail the whole lead flow if Sheets write fails.
    if (googleAppsScriptUrl) {
      await fetch(googleAppsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: payload.source || '',
          name: payload.name || '',
          phone: payload.phone || '',
          time: payload.time || '',
          answers: Array.isArray(payload.answers) ? payload.answers : [],
          receivedAt: new Date().toISOString(),
          meta
        })
      }).catch(() => {});
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ ok: true, warning: telegramWarning })
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ ok: false, error: err.message || 'Send failed', details: err.details || '' })
    };
  }
};

