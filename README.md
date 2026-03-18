## Lips Cherkasy landing

Статичний лендинг (`index.html`) + serverless API для заявок в Telegram (Netlify Function: `netlify/functions/lead.js`).

### Як запустити локально

Це звичайний HTML. Відкрий `index.html` у браузері.

Щоб протестувати відправку лідів локально, найпростіше — задеплоїти на Vercel (див. нижче), бо `/api/lead` це serverless-функція.

### Деплой на Vercel (рекомендовано)

- Імпортуй репозиторій у Vercel як звичайний проект.
- Додай environment variables:
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_CHAT_ID`
- Після деплою заявки з форми та квізу будуть приходити в Telegram.

### Деплой на Netlify (як у тебе зараз)

- Deploys → Site settings → **Build & deploy**
  - **Build command**: (порожньо)
  - **Publish directory**: `.`
- Додай environment variables:
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_CHAT_ID`

Форма відправляє на `/api/lead`, а Netlify через `netlify.toml` прокидує це на `/.netlify/functions/lead`.

### Налаштування GA4

У `index.html` заміни `G-XXXXXXXXXX` на свій Measurement ID.

