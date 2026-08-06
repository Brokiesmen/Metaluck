# PROJECT_ANALYSIS — Metaluck (Telegram Mini App)

Документ описывает архитектуру проекта «как есть» на момент анализа: структуру, подсистемы,
устройство мини-игр, порядок добавления новой игры и перечень файлов, которые придётся
затронуть для реализации **Aviator**. Кода нет — только описание.

---

## 1. Общая картина

**Metaluck** — Telegram Mini App: кейсы с призами (Telegram-подарки и звёзды), набор
мини-игр на внутреннюю валюту (★ «звёзды»), ежедневные награды, колесо фортуны,
рефералка, XP/уровни, лидерборд, пополнение через Telegram Stars (XTR) и заявки на вывод.

Монорепозиторий из двух пакетов + корневой оркестратор:

| Пакет | Стек | Назначение |
|---|---|---|
| `client/` | React 18 + TypeScript + Vite 5, framer-motion, canvas-confetti | SPA-фронтенд Mini App |
| `server/` | Node ≥22, Fastify 4 + TypeScript (ESM), Supabase JS | REST API, игровая логика, Telegram-вебхук |
| корень | concurrently, pm2 (`ecosystem.config.cjs`) | dev-запуск обоих пакетов, туннель |

Ключевые архитектурные принципы, которые видны в коде:

1. **Сервер авторитетен во всём, что касается денег и случайности.** Клиент никогда не
   вычисляет исход — он только отображает то, что вернул API. Рандом на сервере —
   `crypto.randomInt` (игры) или `Math.random` (веса призов, `random.ts`).
2. **Единый house edge.** `server/src/houseEdge.ts` — константа `HOUSE_EDGE = 0.25`
   (RTP 75%), применяется ко всем выплатам через `applyHouseEdge()`.
3. **Никакого WebSocket / SSE.** Реалтайм эмулируется HTTP-поллингом + компенсацией
   расхождения часов клиента и сервера (см. §9 и §14).
4. **Вся персистентность — Supabase (Postgres) через service_role ключ.** Локальной БД нет,
   сервер падает на старте без переменных окружения (`requireSupabase()`).
5. **Клиент всегда получает актуальный баланс** в ответе почти каждого игрового эндпоинта
   (`newBalance` / `balance`), а не запрашивает его отдельно.

---

## 2. Структура проекта

```
minigames/
├── package.json               # dev: concurrently server+client; build; start
├── ecosystem.config.cjs       # pm2: сервер + cloudflare-туннель + watcher URL
├── .env / .env.example        # ЕДИНЫЙ .env в корне — его читает сервер
├── TUNNEL_CHECKLIST.md        # регламент смены URL туннеля (важно для Stars)
├── nginx.api-spa.example.conf # пример проксирования /api при одном домене
├── scripts/                   # print-lan-urls.mjs, open-firewall.ps1
│
├── server/
│   ├── package.json           # tsx watch (dev), tsc (build)
│   └── src/
│       ├── index.ts           # 1340 строк: bootstrap Fastify, CORS, auth-хелпер,
│       │                      # кейсы, дейлики, колесо, рефералы, топап, вывод,
│       │                      # Telegram-вебхук, админ-рассылка, статика
│       ├── auth.ts            # валидация Telegram initData (HMAC-SHA256)
│       ├── supabaseStore.ts   # 926 строк: ВЕСЬ доступ к БД + XP/задания
│       ├── types.ts           # Prize / WeightedPrize / Case / Rarity
│       ├── data.ts            # каталог кейсов и призов с весами
│       ├── random.ts          # взвешенный выбор приза
│       ├── houseEdge.ts       # RTP-константы и хелперы
│       ├── xp.ts              # кривая уровней, каталог заданий, XP-таблица
│       ├── progressAwards.ts  # «тихая» выдача XP/заданий (не роняет игру)
│       ├── wheel.ts           # сегменты бесплатного и премиум-колеса
│       ├── coinflip.ts        # игра: без состояния
│       ├── blackjack.ts       # игра: состояние в blackjack_games (+ blackjackEngine.ts)
│       ├── minerush.ts        # игра: состояние в minerush_games (+ mineRushEngine.ts)
│       ├── arena.ts           # игра: общий раунд В ПАМЯТИ процесса
│       └── pvp.ts             # PvP-матчи в БД (+ pvpEngine.ts) — API есть, UI скрыт
│   └── scripts/               # set-telegram-webhook, broadcast, импорт данных, QA
│
└── client/
    ├── vite.config.ts         # proxy /api → 127.0.0.1:3001, legacy-плагин (старые WebView)
    ├── vercel.json            # SPA-rewrites, деплой фронта на Vercel
    ├── index.html             # грузит telegram-web-app.js СИНХРОННО до React
    └── src/
        ├── main.tsx           # тема + viewport ДО первого рендера, SettingsProvider
        ├── App.tsx            # корневой роутер табов/экранов, загрузка баланса/кейсов
        ├── api.ts             # 444 строки: единый HTTP-клиент + подмена на demo
        ├── types.ts           # DTO всех API-ответов
        ├── data.ts            # маппинг призов на картинки подарков
        ├── telegram.d.ts      # тайпинги Telegram WebApp SDK
        ├── index.css          # 4697 строк: ВСЕ стили приложения, одним файлом
        ├── hooks/useTelegram.ts
        ├── lib/               # telegramViewport, stripPerf, mineRushOdds
        ├── settings/          # язык + тема: контекст, storage, applyTheme
        ├── i18n/              # dictionaries.ts (5 языков), tf.ts (подстановки)
        ├── demo/              # локальные заглушки всех игр для демо-режима
        └── components/        # экраны, игры, модалки, иконки
```

Примечание: рядом с `.tsx`/`.ts` лежат одноимённые `.js`-файлы (`App.js`, `api.js`,
`Cabinet.js` …) — артефакты старой сборки. Vite резолвит `.tsx` раньше `.js`
(`resolve.extensions`), поэтому они мертвы, но при добавлении файлов их плодить не нужно.

---

## 3. Запуск, окружение, деплой

* `npm run dev` в корне — поднимает Fastify (`3001`) и Vite (`5173`) параллельно.
  `/api/*` из Vite проксируется на бэкенд (`VITE_DEV_API_PROXY`).
* Сервер читает **корневой** `.env` (`dotenv.config` с путём `../../.env` относительно `dist`).
* Ключевые переменные: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (обязательны),
  `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_MINI_APP_PATH`,
  `TELEGRAM_WEBHOOK_SECRET_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`, `ADMIN_API_SECRET`,
  `CORS_ORIGIN`, `PORT`, `SERVE_CLIENT`, `PRE_CHECKOUT_DEADLINE_MS`.
* Фронт: `VITE_API_BASE_URL` на этапе сборки, либо аварийный рантайм-override
  `window.__MINIGAMES_API_BASE__` из `index.html` (без пересборки).
* Прод-варианты: (а) фронт на Vercel + API отдельно; (б) один процесс Fastify раздаёт
  и статику (`SERVE_CLIENT=1`, `client/dist`), и API; (в) nginx по примеру конфига.
* Для локальной отладки платежей — cloudflare-туннель; регламент в `TUNNEL_CHECKLIST.md`
  (при смене URL обязательно перерегистрировать вебхук и обновить BotFather).

---

## 4. Система пользователей

Отдельной таблицы `users` нет. Пользователь — это **Telegram user id (число)**, который
служит первичным ключом сразу в нескольких таблицах:

* `balances` — баланс в звёздах;
* `user_profiles` — имя и `photo_url` (для лидерборда и арены);
* `user_meta` — `first_seen_at`, `is_premium` (используется для антифрод-правила рефералки);
* `user_progress` — уровень, XP, суточные задания;
* `referrals` — код, кто пригласил, список приглашённых, заработок;
* `bot_chats` — chat_id тех, кто нажал `/start` (аудитория рассылки);
* `pvp_stats` — рейтинг и статистика PvP.

Записи создаются лениво: `ensureBalance`, `ensureReferral`, `ensureProgressRow`,
`upsertUserMeta` вызываются при первом обращении и делают upsert с дефолтами
(баланс = 0, уровень 1).

**Dev-пользователь.** Если приложение открыто вне Telegram, `userId = 0` — валидный
пользователь с профилем «Dev User». Для него закрыты денежные операции (пополнение и
вывод отвечают ошибкой при `userId <= 0`) и не начисляются XP (`progressAwards` игнорирует
`userId <= 0`).

---

## 5. Авторизация

Классических сессий/JWT/cookie нет.

1. Клиент при каждом запросе шлёт заголовок **`X-Telegram-Init-Data`** — сырую строку
   `tg.initData` (`api.ts` → `request()`; значение проставляется через `setInitData()`
   в `App.tsx` **синхронно при рендере**, чтобы первый же запрос дочернего компонента
   ушёл с правильным пользователем).
2. Сервер в `getUserId(req)` (`server/src/index.ts`) вызывает `validateInitData()`
   (`server/src/auth.ts`): парсит `URLSearchParams`, строит data-check-string,
   считает HMAC-SHA256 с секретом `HMAC('WebAppData', BOT_TOKEN)` и сравнивает с `hash`.
   Невалидная подпись → `401 Unauthorized`.
3. Режимы деградации: нет заголовка → dev (`userId = 0`); нет `TELEGRAM_BOT_TOKEN` →
   подпись не проверяется, но `user.id` из initData используется (удобно локально,
   **опасно в проде** — токен обязателен).
4. Побочные эффекты `getUserId`: апдейт профиля (имя/аватар), `user_meta`, создание
   реферальной записи и активация `start_param` как реферального кода. То есть
   `getUserId` — это не просто аутентификация, а «точка входа пользователя».
5. Срок жизни initData не проверяется (`auth_date` игнорируется) — потенциальный вектор
   повторного использования старой строки.

Отдельный механизм авторизации у админских ручек: заголовок `x-admin-secret`
сравнивается с `ADMIN_API_SECRET` через `crypto.timingSafeEqual`. Telegram-вебхук
проверяется по `x-telegram-bot-api-secret-token`.

---

## 6. Система балансов

Единая валюта — **★ звёзды** (целые числа), таблица `balances (user_id, balance)`.

API стора (`server/src/supabaseStore.ts`):

| Функция | Смысл |
|---|---|
| `ensureBalance` / `getBalance` | чтение с ленивым созданием строки (дефолт 0) |
| `setBalance` | upsert абсолютного значения |
| `addBalance` | read-modify-write (+delta) |
| `tryDeductBalance` | списание с проверкой достаточности, возвращает `null` если не хватило |

Важные свойства:

* **Атомарности на уровне БД нет.** Все операции — «прочитал → посчитал → записал» из
  Node. Гонки возможны (два одновременных запроса могут перезаписать друг друга).
  Наиболее «правильные» места используют `tryDeductBalance` (арена, вывод), остальные —
  `getBalance` + `setBalance` внутри обработчика.
* Ставка списывается сразу при старте игры, выплата зачисляется в момент завершения.
  Ставка при выигрыше **возвращается в составе выплаты** (payout считается от «gross»,
  включающего стейк: например coinflip — `applyHouseEdge(bet * 2)` = 1.5× ставки).
* Клиент никогда не пересчитывает баланс сам: каждый игровой ответ содержит `newBalance`
  или `balance`, и `App.tsx` прокидывает `onBalanceUpdate` во все игровые компоненты.

---

## 7. Система транзакций

Отдельного «журнала транзакций» нет — роль распределена по нескольким сущностям.

### 7.1 Пополнение (Telegram Stars, XTR)

Таблица `topup_orders` (`payload` — уникальный ключ заказа).

Поток: клиент запрашивает `POST /api/topup/create-invoice { packageId }` → сервер строит
payload вида `mg:1:<userId>:<packageId>:<nonce>`, вставляет заказ в статусе `pending`,
дёргает Telegram `createInvoiceLink` и возвращает ссылку → клиент открывает её через
`tg.openInvoice` → Telegram шлёт на `POST /api/telegram/webhook`:

1. `pre_checkout_query` — сервер валидирует (валюта XTR, payload разбирается, userId
   совпадает, заказ `pending`, сумма и пакет совпадают) и отвечает
   `answerPreCheckoutQuery`. Есть гонка с дедлайном `PRE_CHECKOUT_DEADLINE_MS` (≈9 с) —
   если проверка не успела, счёт отклоняется (Telegram даёт всего 10 с).
2. `successful_payment` — `claimTopupPaid()` атомарно переводит заказ `pending → paid`
   (условие `.eq('status','pending')` защищает от двойного зачисления при ретраях
   вебхука), затем `addBalance` на сумму пакета и **реферальный кэшбэк 10%** пригласившему.

Пакеты захардкожены в `index.ts` (`TOPUP_PACKAGES`: 25/50/100/500 XTR = столько же ★).
Особый пакет `premium_wheel` (25 XTR) не зачисляет баланс, а помечает заказ meta-полем
`premium_spin_credit` — оно и есть «право на один премиум-спин»; после использования
переводится в `premium_spin_used`. Клиент опрашивает `/api/topup/status/:payload`
(и `/api/wheel/premium/status/:payload`) до появления `paid`.

### 7.2 Вывод

`POST /api/withdraw/create` — минимум 100★, атомарное `tryDeductBalance`, затем строка
в `withdraw_orders` со статусом `pending` (при ошибке вставки баланс возвращается).
Уведомление админу в Telegram (`TELEGRAM_ADMIN_CHAT_ID`). Обработка заявок — ручная,
вне приложения. `GET /api/withdraw/info` отдаёт баланс, минимум, пресеты и последние
5 заявок.

### 7.3 История призов и «купоны»

Таблица `histories (user_id, case_id, case_name, prize jsonb, ts)` — это одновременно:

* журнал выпавших **не-звёздных** призов (подарки/премиум);
* «таймер» бесплатного колеса (последняя запись с `case_id = 9007`);
* **леджер купонов**: строки с `case_id = 9010` и `prize.coupons = ±N`; баланс купонов
  считается суммированием всех строк (`getCoupons`). Списание — вставка строки с `-1`.

То есть купоны реализованы как append-only-леджер поверх истории, без отдельной таблицы.
Звёздные выигрыши в историю **не пишутся** (только меняют баланс).

---

## 8. XP, уровни и суточные задания

* `server/src/xp.ts` — кривая `xpToNextLevel(level) = round(300 * 1.42^(level-1))`,
  таблица наград `XP` (за кейс, спин колеса, победу в игре и т.д.), каталог заданий
  `TASK_CATALOG` (13 штук: login / case / daily / play_* / win_*).
* Каждые 24 ч пользователю **детерминированно** (seeded PRNG `mulberry32` от
  `userId` + номера периода) выбирается 4 задания разных групп, с попыткой не повторять
  предыдущий набор. Состояние живёт в `user_progress.claimed_tasks` (JSONB
  `{ periodStartedAt, active[], ids[] }`), ротация происходит лениво при чтении.
* Выдача XP из игр идёт через `progressAwards.ts` (`onGamePlayXp` / `onGameWinXp`) —
  обёртки, которые **никогда не бросают исключение** в игровой поток и молча логируют
  ошибки. Задание засчитывается, только если оно активно в текущем периоде.
* `GET /api/progress` заодно начисляет XP за «ежедневный вход» (если это задание активно).
* Кабинет отображает уровень, прогресс-бар и список заданий; подписи заданий берутся из
  словаря (`t.cabinet.taskPlayCoinflip` и т.п.) — то есть **на каждое новое задание нужен
  ключ локализации во всех 5 языках**.

Отдельно существует **PvP-прогресс** (`pvp_stats`: свой level/xp/rating) — независимая от
аккаунтного XP система.

---

## 9. Мини-игры: как они устроены

### 9.1 Общий контракт

Каждая игра — отдельный модуль на сервере, экспортирующий функцию-регистратор
`registerXxxRoutes(app, deps)`, где `deps` — это `{ getUserId, getBalance, setBalance }`
(арене хватает `getUserId` + `getBalance`, она списывает через `tryDeductBalance`).
Все регистраторы вызываются в конце `server/src/index.ts` (строки ~1050–1054).
Такой DI нужен, чтобы игровые модули не зависели от способа аутентификации.

На клиенте каждая игра — самостоятельный компонент с единым интерфейсом пропсов:
`{ onBack: () => void; onBalanceUpdate: (b: number) => void }`.

### 9.2 Сводка по существующим играм

| Игра | Где состояние | Эндпоинты | Ставки | Выплата |
|---|---|---|---|---|
| **Кейсы** | нет (одноходовая) | `GET /api/cases`, `POST /api/case/open` | цена кейса (0/100/1000) | взвешенный приз + доп. «house edge»-переброс крупных призов, звёзды режутся `applyHouseEdgeStars` |
| **Coinflip** | нет | `POST /api/coinflip/play` | 5/10/25/50/100 | `applyHouseEdge(bet×2)` = 1.5× |
| **Blackjack** | БД `blackjack_games` (1 строка на юзера, весь стейт в JSONB: колода, руки, фаза) | `state`, `deal`, `hit`, `stand`, `double` | 5–100 | 1.5× / блэкджек `applyHouseEdge(2.5×)`; push возвращает ставку |
| **MineRush** | БД `minerush_games` (мины/открытые/флаги как массивы ключей `"x,y"`) | `state`, `start`, `reveal`, `flag`, `cashout` | 5/10/25/50 | множитель от ставки и сложности × RTP; ранний кэшаут — квадратичная кривая от прогресса |
| **Arena** (джекпот) | **в памяти процесса** (`let currentRound`) | `GET /api/arena/state`, `POST /api/arena/bet` | 1–100, до 500 за раунд | победитель забирает `applyHouseEdge(pot)` |
| **PvP** | БД `pvp_matches`, `pvp_queue` | `stats`, `find`, `queue`, `match/:id`, `match/:id/choose` | без ставок (только XP/рейтинг) | — |

Blackjack защищает себя от битого JSON (`parseStoredState` валидирует каждую карту),
MineRush гарантирует, что первый клик не подрывается (мины перегенерируются),
Arena добирает ботов, чтобы колесо не выглядело пустым.

### 9.3 Паттерн «раунд для всех» — Arena (важнейший образец для Aviator)

Арена — единственная игра с общим для всех пользователей раундом, и её приёмы почти
целиком применимы к Aviator:

* **Ленивый tick.** Отдельного таймера/крона нет: `tick(now)` вызывается на каждом
  входящем запросе и двигает фазы `betting → spinning → finished → (сброс раунда)`.
  Поллинг клиентов (~1 раз/сек) сам по себе является «часами» игры.
* **Раунд в памяти, деньги — в БД.** Состояние раунда эфемерно (перезапуск процесса его
  теряет), но списания и зачисления всегда идут через баланс-стор, поэтому баланс
  остаётся консистентным. Флаг `settled` защищает от двойной выплаты.
* **Исход не раскрывается заранее.** Победитель выбирается в момент закрытия ставок,
  но `winnerAngleDeg` отдаётся клиенту только начиная с фазы `spinning`.
* **Компенсация часов.** Ответ содержит `now` (серверное время); клиент хранит
  `clockOffset = serverNow − Date.now()` и считает все таймеры/анимации от серверного
  времени. Это то, что позволяет анимации быть плавной при поллинге раз в 900 мс.
* **Анимация мимо React.** Вращение шарика — одна CSS-transform-анимация, назначаемая
  напрямую через `ref` (без ререндеров на кадр). Тот же приём — в `StripOpener`.
* Ограничение масштабирования: раунд в памяти работает, **только пока сервер — один
  инстанс** (это явно указано в комментарии модуля).

### 9.4 Демо-режим

Полноценный «оффлайн-двойник» всех игр: `client/src/demo/*`. Флаг хранится в
`localStorage` (`metaluck_demo_mode`), доступен вне React (`isDemoMode()`), и **`api.ts`
сам подменяет** сетевой вызов на локальную функцию (`demoCoinflipPlay`, `demoArenaState`…).
Демо-ответы всегда возвращают **неизменённый реальный баланс** (снимок
`setDemoBalanceSnapshot`), поэтому играть можно без риска. Переключение режима сбрасывает
все демо-сессии (`resetAllDemoSessions`).

---

## 10. API

Все ручки под префиксом `/api`, JSON, аутентификация — заголовок `X-Telegram-Init-Data`.
Ошибки приводятся к `{ message, code? }` централизованным error handler'ом.

**Базовое**
`GET /api/health` · `GET /api/balance` · `GET /api/progress` · `GET /api/prizes` ·
`GET /api/cases` · `GET /api/history?page&limit` · `GET /api/leaders?page&limit`

**Ежедневные и колесо**
`GET /api/daily/status` · `POST /api/daily/claim` · `GET /api/wheel/status` ·
`POST /api/wheel/spin` · `POST /api/wheel/premium/spin` ·
`POST /api/wheel/premium/create-invoice` · `GET /api/wheel/premium/status/:payload`

**Деньги**
`GET /api/topup/packages` · `POST /api/topup/create-invoice` ·
`GET /api/topup/status/:payload` · `GET /api/withdraw/info` · `POST /api/withdraw/create`

**Рефералы**
`GET /api/referral/status` · `POST /api/referral/activate`

**Игры**
`POST /api/case/open` ·
`GET /api/blackjack/state`, `POST /api/blackjack/{deal,hit,stand,double}` ·
`POST /api/coinflip/play` ·
`GET /api/minerush/state`, `POST /api/minerush/{start,reveal,flag,cashout}` ·
`GET /api/arena/state`, `POST /api/arena/bet` ·
`GET /api/pvp/stats`, `POST /api/pvp/find`, `DELETE /api/pvp/queue`,
`GET /api/pvp/match/:id`, `POST /api/pvp/match/:id/choose`

**Служебное**
`GET|POST /api/telegram/webhook` (платежи, `/start`, `my_chat_member`) ·
`POST /api/admin/broadcast` (заголовок `x-admin-secret`)

**Клиентский HTTP-слой** (`client/src/api.ts`) — один объект `api` с методами. Внутри
`request<T>()`: подстановка базового URL, заголовки, и очень подробная диагностика
(отличает сетевую ошибку, 502/503/504 от прокси, HTML вместо JSON, невалидный JSON) —
эти сообщения на русском попадают прямо в UI.

---

## 11. WebSocket

**В проекте нет ни WebSocket, ни Socket.IO, ни SSE** — поиск по `client/src` и
`server/src` не даёт ни одного вхождения. Всё «живое» построено на HTTP-поллинге:

| Место | Интервал | Что делает |
|---|---|---|
| `ArenaGame.tsx` | 900 мс (рекурсивный `setTimeout`, не `setInterval`) | тянет состояние раунда, синхронизирует часы, запускает анимацию |
| `PvpGame.tsx` | 2000 мс | очередь матчмейкинга и состояние матча |
| `Cabinet.tsx` | 1 с | тик до сброса суточных заданий |
| `DailyTab`, `FortuneWheel`, `CaseGrid`, `StripOpener` | 1 с | обратные отсчёты кулдаунов |
| `TopUpModal` | опрос `/api/topup/status/:payload` | ожидание оплаты Stars |

Паттерн поллинга в арене стоит копировать: рекурсивный таймер (нет наложения запросов),
`aliveRef` для отмены после размонтирования, ошибка показывается только до первой удачной
синхронизации, тик отсчёта отделён от тика данных.

---

## 12. База данных

Supabase/Postgres, доступ через `@supabase/supabase-js` с **service_role**-ключом
(RLS фактически не применяется — сервер полный владелец). Весь доступ инкапсулирован
в `server/src/supabaseStore.ts`; исключения — `minerush.ts`, `blackjack.ts` и `pvp.ts`,
которые получают клиент через `getSupabase()` и работают со своими таблицами напрямую.

**Миграций в репозитории нет** — схема создаётся вручную в дашборде Supabase.
Это ключевой момент: новая игра со своей таблицей потребует ручного `CREATE TABLE`.

Используемые таблицы:

| Таблица | Ключ | Содержимое |
|---|---|---|
| `balances` | `user_id` | баланс ★ |
| `user_profiles` | `user_id` | имя, `photo_url` |
| `user_meta` | `user_id` | `first_seen_at`, `is_premium` |
| `user_progress` | `user_id` | `level`, `xp`, `total_xp`, `last_daily_login_at`, `claimed_tasks` (JSONB) |
| `histories` | автоинкремент | журнал призов + таймер колеса + леджер купонов |
| `daily_states` | `user_id` | `claimed_day`, `last_claim_at`, `last_free_case_at` |
| `referrals` | `user_id` | `code`, `referred_by`, `referred_users` (JSONB), `total_earned` |
| `topup_orders` | `payload` | заказы Stars; `error_message` переиспользуется под meta премиум-спина |
| `withdraw_orders` | `id` | заявки на вывод |
| `blackjack_games` | `user_id` | `state_json` — вся партия |
| `minerush_games` | `game_id` | поля партии + `mines_json`/`revealed_json`/`flags_json` |
| `pvp_matches`, `pvp_queue`, `pvp_stats` | — | PvP |
| `bot_chats` | `chat_id` | аудитория рассылки, флаг `blocked` |

Хелпер `parseJsonField` терпимо читает и JSONB-объекты, и старые строковые JSON
(наследие SQLite-версии).

---

## 13. UI, компоненты и навигация

### Навигация

Роутера нет — состояние в `App.tsx`:

* `tab: 'games' | 'leaders' | 'daily' | 'cabinet'` — нижний `TabBar`;
* `gameView: 'lobby' | 'cases' | 'blackjack' | 'coinflip' | 'minerush' | 'arena'` —
  экран внутри вкладки «Игры».

Переключение вкладки сбрасывает `gameView` в `lobby`. Заголовок в шапке выбирается
цепочкой тернарных операторов от `tab`/`gameView`. Возврат из игры — проп `onBack`.
Некоторые игры требуют модификатора на контейнере (`page-content--blackjack` и др.),
чтобы убрать вертикальный скролл.

### Экраны и компоненты

* `GamesScreen` — лобби: тумблер демо-режима + сетка «плиток» игр (`game-tile--*`) и
  две заглушки «скоро». Открытие игры — колбэк-проп на каждую игру.
* Игры: `CaseGame` (+ `CaseGrid`, `StripOpener`, `PrizesGrid`, `ResultModal`),
  `BlackjackGame`, `CoinflipGame` (+ `coinCrest`), `MineRushGame`, `ArenaGame`, `PvpGame`.
* `Cabinet` — профиль, уровень/XP/задания, баланс, пополнение/вывод, рефералка,
  история призов, правила.
* `DailyTab` — календарь 7 дней + `FortuneWheel` (бесплатное и премиум-колесо).
* `Leaders` — постраничный лидерборд.
* Модалки: `ModalShell` (общий bottom-sheet через `createPortal` в `document.body` —
  обход багов iOS с `position: fixed` внутри скролла), `TopUpModal`, `WithdrawModal`,
  `SettingsModal`, `RulesModal`, `ResultModal`.
* Мелочи: `StarIcon`, `branding/*`, `tab-icons/*`.

### Стили

Один файл `client/src/index.css` (~4700 строк), организованный секциями-комментариями.
Дизайн-токены следуют конвенции Telegram (`--tg-theme-*` с фолбэками), плюс собственные
переменные тем (`html[data-theme="light|dark"]`), редкости, безопасные зоны
(`--app-safe-*`), масштаб UI (`--ui-scale`, `--app-max-w`, `--app-font`).
Каждая игра имеет собственный короткий префикс классов: `cf-` (coinflip), `bj-`,
`mr-` (minerush), `ar-` (arena), `av-` — свободен.

### Локализация и настройки

* `client/src/i18n/dictionaries.ts` — типизированный `Dict` и **5 полных словарей**
  (`ru`, `uk`, `en`, `es`, `de`). Добавление ключа в тип обязывает заполнить все пять.
* `tf(template, vars)` — подстановка `{key}`.
* `SettingsContext` отдаёт `t`, `locale` (BCP-47 для `toLocaleString`), тему и сеттеры;
  сохранение в `localStorage`, начальный язык угадывается из `language_code` Telegram.
* `applyTheme` ставит `data-theme` на `<html>` и сообщает цвета Telegram-клиенту.

---

## 14. Интеграция с Telegram Mini App

1. **SDK** грузится синхронным `<script>` в `client/index.html` до React — иначе на
   старых WebView `window.Telegram` не успевает появиться.
2. `useTelegram()` — тонкая обёртка: `tg`, `user` (с dev-фолбэком), `initData`, `isDev`.
3. `App` вызывает `tg.ready()` и `tg.expand()` при монтировании.
4. **Viewport и безопасные зоны** — `lib/telegramViewport.ts`: считывает
   `safeAreaInset` / `contentSafeAreaInset` (и CSS-переменные Telegram), берёт максимум,
   пишет в `--app-safe-*`; отдельно вычисляет ширину «оболочки» и `--ui-scale` для
   Telegram Desktop / ПК; определяет платформу (`data-platform="ios|android|web"` —
   на iOS лобби игр перестраивается в список). Подписан на `viewportChanged`,
   `safeAreaChanged`, `contentSafeAreaChanged`, `resize` и события `visualViewport`,
   плюс два отложенных вызова (Telegram сообщает инсеты с задержкой).
5. **Тема** применяется до первого рендера в `main.tsx`, чтобы не было вспышки.
6. **Платежи** — `tg.openInvoice(link, cb)` и серверный вебхук (см. §7.1).
7. **Deep link / рефералка** — `start_param` из initData автоматически активирует
   реферальный код на сервере; ссылка вида `https://t.me/<bot>/<path>?startapp=refNNN`.
8. **Бот** отвечает на `/start` приветствием с кнопкой запуска Mini App и записывает
   чат в `bot_chats`; `my_chat_member` помечает блокировки; есть админ-рассылка.

---

## 15. Как добавить новую игру (чек-лист по текущим конвенциям)

**Сервер**

1. `server/src/<game>Engine.ts` — чистая математика/правила (без Fastify и БД).
   Так сделано у blackjack и minerush; движок можно тестировать и переиспользовать
   на клиенте для превью коэффициентов.
2. `server/src/<game>.ts` — `register<Game>Routes(app, deps)`; внутри: валидация ставки
   по белому списку, проверка баланса, списание, генерация исхода через `crypto`,
   применение `applyHouseEdge`, зачисление, вызовы `onGamePlayXp` / `onGameWinXp`,
   единый `jsonError`-хелпер.
3. Решить, где живёт состояние: нигде (одноходовая) → как coinflip; в БД → как
   minerush/blackjack (**нужно вручную создать таблицу в Supabase**); в памяти
   процесса → как arena (только для общих раундов и одного инстанса).
4. `server/src/index.ts` — импорт и вызов регистратора рядом с остальными.
5. `server/src/xp.ts` — награда в `XP`, задания `play_<game>` / `win_<game>` в
   `TASK_CATALOG` и `TASK_IDS`, расширение типа `GameKind`.

**Клиент**

6. `client/src/types.ts` — DTO запросов/ответов + новые id заданий в `ProgressTaskId`.
7. `client/src/api.ts` — методы с ветвлением на демо-реализацию.
8. `client/src/demo/<game>.ts` + реэкспорт и `reset<Game>` в `demo/index.ts`.
9. `client/src/components/<Game>Game.tsx` — пропсы `{ onBack, onBalanceUpdate }`.
10. `client/src/App.tsx` — расширить `GameView`, добавить `open<Game>Game`, ветку
    рендера, заголовок шапки, при необходимости модификатор `page-content--*`.
11. `client/src/components/GamesScreen.tsx` — плитка и новый проп-колбэк.
12. `client/src/i18n/dictionaries.ts` — блок игры в типе `Dict`, ключи `header.*`,
    `games.*Title/*Sub`, `cabinet.taskPlay*/taskWin*`, `rules.*Title/*Body`
    **и перевод во всех 5 языках**.
13. `client/src/index.css` — секция стилей с новым префиксом классов.
14. `client/src/components/RulesModal.tsx` — новый блок в списке правил.
15. При желании `client/src/lib/<game>Odds.ts` — зеркало серверной математики для
    отображения множителей до начала игры (как `mineRushOdds.ts`).

---

## 16. Что уже существует и переиспользуется

| Сервис / модуль | Что даёт |
|---|---|
| `auth.ts` + `getUserId` (index.ts) | аутентификация, авто-профиль, рефералка — новая игра просто принимает `getUserId` в deps |
| `supabaseStore.ts` | баланс (`getBalance`/`setBalance`/`addBalance`/`tryDeductBalance`), история, профили, XP-стор, `getSupabase()` для своей таблицы, `parseJsonField` |
| `houseEdge.ts` | единая экономика: `HOUSE_EDGE`, `PLAYER_RTP`, `applyHouseEdge`, `applyHouseEdgeStars` |
| `progressAwards.ts` + `xp.ts` | XP и суточные задания, безопасные к ошибкам |
| `random.ts` / `crypto.randomInt` | серверный рандом |
| Fastify-обвязка | CORS, security-заголовки, кэш-политика, JSON-схемы тел запросов, единый error handler |
| `api.ts` (`request`) | базовый URL, initData-заголовок, диагностика ошибок сети/прокси/HTML |
| `demo/mode.ts` | флаг демо, снимок баланса, подписка, `delay`, `randInt` |
| `SettingsContext` + `dictionaries` + `tf` | язык, тема, локаль форматирования чисел |
| `ModalShell` | нижние шторки, безопасные на iOS |
| `StarIcon`, `Confetti`-паттерн (дублируется в `CoinflipGame`/`ArenaGame`), `game-tile-*`, `*-chip`, `*-back` | готовые визуальные примитивы |
| `telegramViewport.ts` | безопасные зоны, масштаб, платформа |
| Паттерн поллинга + `clockOffset` из `ArenaGame` | «реалтайм» без WebSocket |
| Прямое управление DOM через `ref` (`ArenaGame`, `StripOpener`, `stripPerf.ts`) | плавные анимации без ререндеров |

---

## 17. Что потребуется для добавления **Aviator**

### 17.1 Что за игра и чем она отличается от существующих

Aviator (crash) — раунд с непрерывно растущим множителем, который в случайный момент
«крашится»; игрок должен успеть забрать выигрыш. Отличия от всего, что уже есть:

* **непрерывная величина** (множитель), а не дискретный исход;
* **действие внутри раунда, чувствительное ко времени** (cash-out);
* обычно **общий раунд для всех игроков** (как арена), но возможен и single-player.

Из этого следуют два принципиальных решения, которые надо принять до кода.

**Решение A — модель раунда.**

* *Вариант A1 — общий раунд (рекомендуется для «настоящего» Aviator):* полностью
  повторяет паттерн `arena.ts` — раунд в памяти, фазы `betting → flying → crashed`,
  ленивый `tick()` на каждом запросе, поллинг клиента. Ограничение: **один инстанс
  сервера** (как уже отмечено в арене). Плюсы — социальность, список ставок других
  игроков, «кто когда забрал».
* *Вариант A2 — персональный раунд:* каждый игрок летит в своём раунде, состояние в
  таблице `aviator_games` по образцу `minerush_games`. Проще, масштабируется, переживает
  рестарт, но теряется социальный эффект.

**Решение B — источник времени и множителя.**
Поллинг раз в ~1 с не годится для плавного роста числа. Правильный подход — тот же, что
в арене: сервер отдаёт `roundStartedAt`, `now` и детерминированную формулу роста
множителя; **клиент считает текущий множитель локально** от серверного времени
(`clockOffset`), а сервер остаётся единственным авторитетом по точке краша и по факту
кэшаута (сравнивает время запроса с временем краша). Формулу роста надо продублировать
в `client/src/lib/aviatorOdds.ts` — ровно так уже сделано для MineRush.

### 17.2 Экономика и честность

* Точка краша генерируется на сервере (`crypto`), ожидаемая выплата масштабируется
  `applyHouseEdge` / `PLAYER_RTP = 0.75` — использовать существующий `houseEdge.ts`,
  не вводить второй источник правды об RTP.
* Множитель краша **нельзя отдавать клиенту до момента краша** — арена уже реализует
  это правило (угол победителя скрыт до фазы `spinning`).
* Если нужен provably fair (хэш сида до раунда, раскрытие после) — это новое для
  проекта: сейчас доказуемой честности нет нигде, есть только серверный рандом.
  Понадобится хранение сидов (таблица) и раздел в правилах.
* Кэшаут: `tryDeductBalance` при ставке, `addBalance` при заборе. Учесть, что стор
  не атомарен — критично защититься от двойного кэшаута флагом в состоянии ставки
  (аналог `settled` в арене), а не только проверкой баланса.

### 17.3 Конкретный перечень файлов

**Новые файлы**

| Файл | Назначение |
|---|---|
| `server/src/aviatorEngine.ts` | генерация точки краша, кривая множителя `mult(elapsedMs)`, обратная функция «время → множитель», применение house edge, лимиты ставок |
| `server/src/aviator.ts` | `registerAviatorRoutes(app, deps)`; состояние раунда (в памяти по образцу `arena.ts` или в БД по образцу `minerush.ts`), ленивый `tick()`, эндпоинты `state` / `bet` / `cashout` (+ опционально авто-кэшаут) |
| `client/src/components/AviatorGame.tsx` | экран игры: график/самолёт, счётчик множителя (анимация вне React), панель ставки, кнопка «Забрать», список ставок раунда, история последних крашей |
| `client/src/lib/aviatorOdds.ts` | зеркало формулы множителя и расчёта выплаты для превью |
| `client/src/demo/aviator.ts` | локальная демо-версия раунда (как `demo/arena.ts`) |

**Изменяемые файлы**

| Файл | Что меняется |
|---|---|
| `server/src/index.ts` | импорт и вызов `registerAviatorRoutes(app, { getUserId, getBalance, setBalance })` рядом с остальными регистраторами (~строка 1054) |
| `server/src/xp.ts` | `XP.AVIATOR_CASHOUT`, задания `play_aviator` / `win_aviator` в `TASK_CATALOG` и `TASK_IDS`, `GameKind` += `'aviator'` |
| `client/src/types.ts` | `AviatorPhase`, `AviatorRoundView`, `AviatorBetView`, `AviatorStateResponse`, `AviatorCashoutResult`; в `ProgressTaskId` добавить `play_aviator` / `win_aviator` |
| `client/src/api.ts` | `aviatorState`, `aviatorBet`, `aviatorCashout` (+ ветки `isDemoMode()`), импорт демо-функций |
| `client/src/demo/index.ts` | реэкспорт демо-функций и `resetDemoAviator()` в `resetAllDemoSessions()` |
| `client/src/App.tsx` | `GameView` += `'aviator'`; `openAviatorGame`; ветка рендера `<AviatorGame …/>`; заголовок `t.header.aviator`; при необходимости класс `page-content--aviator` |
| `client/src/components/GamesScreen.tsx` | проп `onOpenAviator`, плитка `game-tile--aviator` (можно занять место одной из заглушек «скоро») |
| `client/src/i18n/dictionaries.ts` | в тип `Dict`: `header.aviator`, `games.avTitle/avSub`, блок `av: {...}`, `cabinet.taskPlayAviator/taskWinAviator`, `rules.aviatorTitle/aviatorBody`; **заполнить в `ru`, `uk`, `en`, `es`, `de`** |
| `client/src/components/RulesModal.tsx` | новый блок правил в массиве секций |
| `client/src/components/Cabinet.tsx` | маппинг новых id заданий в подписи (`taskLabel`) |
| `client/src/index.css` | секция стилей с префиксом `av-` (график, счётчик, кнопки, история) |

**Вне репозитория**

* Если выбран вариант с персистентным состоянием — вручную создать в Supabase таблицы
  `aviator_rounds` / `aviator_bets` (миграций в проекте нет).

### 17.4 Риски и на что обратить внимание

1. **Один инстанс.** Раунд в памяти (как арена) ломается при горизонтальном
   масштабировании и теряется при рестарте — если это неприемлемо, нужен вариант A2
   или хранение раунда в БД.
2. **Гонки на балансе.** `getBalance`+`setBalance` не атомарны; при частых кэшаутах в
   одном раунде риск выше, чем в существующих играх. Минимум — `tryDeductBalance` на
   ставке и идемпотентный кэшаут по флагу.
3. **Частота поллинга.** Уменьшать интервал ниже ~500 мс не нужно: множитель считается
   клиентом от серверного времени, а поллинг нужен только для смены фазы и списка ставок.
   Иначе нагрузка на Supabase вырастет линейно от числа игроков.
4. **Точка краша не должна утекать** ни в `state`, ни в косвенных полях (например,
   в длительности фазы) до самого краша.
5. **Отсутствие WebSocket** — сознательное свойство проекта; вводить его ради Aviator
   означает новую инфраструктурную зависимость (sticky sessions, прокси, туннель).
   Проверенный паттерн арены закрывает задачу без этого.
6. **Плавность анимации.** Счётчик множителя обязан обновляться через
   `requestAnimationFrame` и прямую запись в DOM (`ref`), а не через `setState` на кадр —
   иначе на старых Android WebView, под которые собирается legacy-бандл, будет заметный
   лаг.
