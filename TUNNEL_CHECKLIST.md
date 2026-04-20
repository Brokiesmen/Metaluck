# Tunnel checklist (Telegram Mini App + Stars)

Use this checklist every time you start a new `trycloudflare`/`ngrok` tunnel.

## 1) Before payments test

1. Start local apps:
   - `server` on `http://127.0.0.1:3001`
   - `client` on `http://127.0.0.1:5173`
2. Start tunnel to frontend (`5173`), because Vite proxy forwards `/api` to `3001`.
3. Copy the new public URL, for example:
   - `https://abc-xyz.trycloudflare.com`

## 2) What must be updated after tunnel URL changes

1. In `minigames/.env` set:
   - `TELEGRAM_WEBHOOK_URL=https://abc-xyz.trycloudflare.com/api/telegram/webhook`
2. In BotFather Mini App settings set the same host:
   - `https://abc-xyz.trycloudflare.com`
3. Register webhook again from `minigames/server`:
   - `npm run webhook:set`
4. Verify webhook:
   - `npm run webhook:info`
   - URL must match `TELEGRAM_WEBHOOK_URL`
   - `pending_update_count` should be low (ideally 0)

## 3) What to report before troubleshooting

Before asking for payment debug, always provide:

1. Current public tunnel URL.
2. Output of `npm run webhook:info`.
3. Whether `server` and `client` are both running.

Without current tunnel URL, payment troubleshooting is usually impossible because Telegram sends webhooks to the previous URL.
