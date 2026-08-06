# Metaluck

Telegram Mini App для открытия кейсов, мини-игр и наград на внутренних звёздах (★).

Клиент: **React + Vite** (Vercel)  
API: **Fastify + TypeScript** (Railway)  
Данные: **Supabase (Postgres)**

---

## Возможности

- **Кейсы** — бесплатный кейс раз в 7 дней и платные кейсы за ★
- **Ежедневные награды** — календарь 1→7 дней, колесо фортуны и премиум-колесо (купоны / Telegram Stars)
- **Мини-игры** — Coinflip, Blackjack, Mine Rush, Arena
- **Кабинет** — баланс, история, рефералка, XP/уровень, пополнение и вывод
- **Мультиязычность** — RU / UK / EN / ES / DE + светлая/тёмная тема
- **Демо-режим** — визуальный розыгрыш без списания баланса

---

## Структура

```
minigames/
├── client/          # фронтенд (Vite React)
│   ├── src/
│   └── public/gifts # картинки подарков
├── server/          # бэкенд (Fastify)
│   ├── src/
│   └── scripts/     # webhook, broadcast, импорт данных
├── scripts/         # локальные helper-скрипты
├── .env.example     # пример переменных окружения
└── package.json     # корневые npm-скрипты
```

---

## Быстрый старт

### 1. Требования

- Node.js **22+**
- Аккаунт Telegram Bot + Mini App
- Проект Supabase

### 2. Установка

```bash
npm install
npm install --prefix client
npm install --prefix server
```

### 3. Окружение

Скопируйте `.env.example` → `.env` в корне (сервер подхватывает его) и заполните:

| Переменная | Назначение |
|---|---|
| `SUPABASE_URL` | URL проекта Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role ключ (только сервер) |
| `TELEGRAM_BOT_TOKEN` | токен бота |
| `TELEGRAM_BOT_USERNAME` | username бота без `@` |
| `TELEGRAM_WEBHOOK_SECRET_TOKEN` | секрет webhook |
| `ADMIN_API_SECRET` | секрет для admin broadcast |
| `VITE_API_BASE_URL` | URL API для клиента (на Vercel) |

### 4. Локальный запуск

```bash
# клиент + сервер вместе
npm run dev

# по отдельности
npm run dev:client
npm run dev:server
```

По умолчанию:

- клиент: `http://localhost:5173`
- API: `http://127.0.0.1:3001`

---

## Сборка и деплой

```bash
npm run build
```

Типичная схема:

- **client** → Vercel (`client/`)
- **server** → Railway (`server/`)
- после деплоя API задайте `VITE_API_BASE_URL` на Vercel и пересоберите клиент
- webhook Telegram: `POST https://<api-host>/api/telegram/webhook`

Пример nginx для одного домена (SPA + API): `nginx.api-spa.example.conf`

---

## Полезные скрипты (server)

```bash
cd server
npm run webhook:set      # установить Telegram webhook
npm run webhook:info     # статус webhook
npm run broadcast -- --text "Текст"   # рассылка по /start
```

---

## Лицензия

Приватный проект. Все права сохранены.
