# PAYMENT_ANALYSIS.md — Metaluck

Дата анализа: 6 августа 2026  
Режим: только исследование, код не изменялся.

---

## 1. Краткий вердикт

Metaluck — Telegram Mini App с **одной игровой валютой ★** (внутренние звёзды).  
Пополнение идёт через **Telegram Stars (XTR)** → 1:1 в ★.  
Вывод — заявка с ручной обработкой.  
Купоны — второй счётчик, но не полноценная валюта кошелька.  
Источник истины по деньгам — таблица `balances` + атомарные SQL-RPC; `histories` — лог/UI, не бухгалтерия.

---

## 2. Архитектура (контекст платежей)

| Слой | Технология | Роль в платежах |
|------|------------|-----------------|
| Клиент | React + Vite → Vercel | UI пополнения/вывода, `openInvoice`, опрос статуса |
| API | Fastify → Railway | Счета, webhook Telegram, списания/начисления |
| БД | Supabase Postgres | `balances`, `topup_orders`, `withdraw_orders`, `referrals` |
| Bot API | Telegram | `createInvoiceLink`, `pre_checkout_query`, `successful_payment` |

Поток: Mini App → API (`X-Telegram-Init-Data`) → Supabase.  
Инвойсы Stars и webhook обрабатывает **только API**, не Vercel.

---

## 3. Система пользователей (влияние на деньги)

- Пользователь = Telegram `user.id` после HMAC-проверки `initData` (`server/src/auth.ts`).
- Отдельной таблицы `users` нет: профиль (`user_profiles`), мета (`user_meta.is_premium`), рефералка (`referrals`).
- При каждом запросе `getUserId` может обновить профиль/мета и активировать `start_param` реферала.
- Рефералка влияет на деньги:
  - бонус за приглашение (при условиях Premium / «возраст» аккаунта);
  - **10% cashback** от успешного пополнения ★ пригласившему.

Ограничение: `auth_date` в initData сейчас не проверяется (теоретический replay старого initData).

---

## 4. Как сейчас работает баланс

### 4.1. Модель

| Поле | Таблица | Смысл |
|------|--------|--------|
| `balance` | `balances` | Игровые ★ (источник истины) |
| `coupons` | `balances` | Купоны премиум-колеса |

Оба поля `integer ≥ 0`. Одна строка на `user_id`.

### 4.2. Атомарность

Изменения идут через Postgres-функции (не через «прочитал → посчитал → записал»):

- `add_balance` — начисление / безопасный дельта-сдвиг  
- `try_deduct_balance` — списание только при достаточном остатке (иначе `NULL`)  
- `add_coupons` / `try_deduct_coupons` — то же для купонов  

Обёртки: `server/src/supabaseStore.ts` → `addBalance`, `tryDeductBalance`, `getCoupons`, `trySpendCoupon`, …

`setBalance` (абсолютная запись) остаётся только как опасный/админский путь.

### 4.3. Где ★ списываются

- платные кейсы  
- ставки: Coinflip, Blackjack (+ double), Mine Rush, Arena, Aviator  
- вывод средств  

### 4.4. Где ★ начисляются

- успешный Stars topup (webhook)  
- реферальный cashback и signup-бонус  
- выигрыши игр / кэшауты  
- призы в ★ (кейсы с house edge, daily, колесо)  
- откат при сбое создания заявки на вывод  

### 4.5. Купоны

- Начисляются с колеса (`addCouponsLedger` + запись в `histories` только как лог).  
- Тратятся на премиум-спин (`trySpendCoupon`).  
- Не конвертируются в ★ и не выводятся.

### 4.6. История (`histories`)

**Не журнал баланса.** Используется для:

- инвентаря подарков / UI кабинета  
- кулдауна бесплатного колеса  
- лога купонов и крупных выигрышей Aviator  

Звёздные призы из кейсов часто **не** пишутся в history — меняется только `balances.balance`.

---

## 5. Как устроены платежи

### 5.1. Пополнение Telegram Stars (XTR)

**Пакеты** (`server/src/routes/payments.ts`):

| package_id | XTR | ★ на баланс |
|------------|-----|-------------|
| `xtr_25` | 25 | 25 |
| `xtr_50` | 50 | 50 |
| `xtr_100` | 100 | 100 |
| `xtr_500` | 500 | 500 |
| `premium_wheel` | 25 | 0 (кредит вращения) |

Курс сейчас фиксированный **1 XTR → 1 ★** (кроме премиум-колеса).

**Сценарий topup:**

1. Клиент: `POST /api/topup/create-invoice`  
2. Сервер: создаёт `topup_orders` (`pending`), payload вида `mg:1:{userId}:{packageId}:{nonce}`  
3. Telegram `createInvoiceLink` с `currency: 'XTR'`  
4. Клиент: `Telegram.WebApp.openInvoice(link)` (`TopUpModal.tsx`)  
5. Webhook:  
   - `pre_checkout_query` — проверка плательщика, суммы, статуса заказа (с дедлайном ~9 с)  
   - `successful_payment` — `claimTopupPaid` (идемпотентный `pending → paid`) → `addBalance`  
6. Клиент поллит `GET /api/topup/status/:payload` до `paid` и обновляет UI баланса  

**Премиум-колесо за Stars:** тот же механизм заказа; после оплаты в meta заказа ставится кредит спина (без ★), затем клиент тратит кредит через `POST /api/wheel/premium/spin`.

### 5.2. Вывод

- `POST /api/withdraw/create` — минимум 100 ★, пресеты 100…5000  
- Сразу `tryDeductBalance`, затем строка в `withdraw_orders` (`pending`)  
- При ошибке insert — возврат ★  
- Уведомление админу в Telegram  
- **Автовыплаты в коде нет** — ручная отправка Stars/подарков оператором  

### 5.3. Что не является «платежом», но трогает баланс

Игры, daily, wheel, рефералка — внутренняя экономика на ★ после того, как деньги уже (или ещё не) вошли через Stars.

---

## 6. Существующие сервисы (связанные с деньгами)

| Сервис / модуль | Файл(ы) | Назначение |
|-----------------|---------|------------|
| Баланс / купоны / заказы | `server/src/supabaseStore.ts` | RPC, topup/withdraw CRUD |
| Пакеты и инвойсы | `server/src/routes/payments.ts` | XTR invoices, payload |
| Telegram webhook | `server/src/routes/telegram.ts` | pre-checkout + credit |
| Вывод | `server/src/routes/withdraw.ts` | заявки |
| Рефералка | `server/src/routes/referrals.ts` | бонус + cashback % |
| Кейсы | `server/src/routes/cases.ts` | списание/начисление ★ |
| Daily / Wheel | `routes/daily.ts`, `routes/wheel.ts` | награды, купоны, XTR-спин |
| Coinflip / BJ / MineRush | `coinflip.ts`, `blackjack.ts`, `minerush.ts` | ставки |
| Arena | `arena.ts` | общий банк в памяти |
| Aviator | `aviator.ts` + WS | ставки/кэшаут; WS **без** денег |
| Auth | `auth.ts` | initData |
| UI topup/withdraw | `TopUpModal.tsx`, `WithdrawModal.tsx` | Stars UX |
| API-клиент | `client/src/api.ts` | заголовки, topup/withdraw |
| Telegram SDK | `useTelegram.ts`, `telegram.d.ts` | WebApp, invoice, haptics |

**WebSocket:** только Aviator (`/api/aviator/ws`) — широковещание состояния. Деньги только через REST `bet` / `cashout`.

**Demo-режим:** клиентские двойники игр **не** меняют реальный баланс.

---

## 7. База данных (денежный контур)

| Таблица | Роль |
|--------|------|
| `balances` | ★ + coupons (SoT) |
| `topup_orders` | жизненный цикл Stars-оплаты |
| `withdraw_orders` | заявки на вывод |
| `referrals` | связь для cashback, `total_earned` |
| `histories` | UI/логи, не SoT баланса |
| `blackjack_games` / `minerush_games` | состояние партии (ставка уже списана) |

Миграции в репозитории не ведутся — схема в Supabase.

---

## 8. API (платежи и баланс)

| Метод | Путь | Смысл |
|-------|------|--------|
| GET | `/api/balance` | текущие ★ |
| GET | `/api/topup/packages` | пакеты |
| POST | `/api/topup/create-invoice` | создать счёт Stars |
| GET | `/api/topup/status/:payload` | статус оплаты |
| GET | `/api/withdraw/info` | лимиты + баланс |
| POST | `/api/withdraw/create` | списать и создать заявку |
| POST | `/api/wheel/premium/create-invoice` | 25 XTR за спин |
| GET | `/api/wheel/premium/status/:payload` | готовность спина |
| POST | `/api/wheel/premium/spin` | coupon или xtr-credit |
| POST | `/api/telegram/webhook` | платежный webhook |

---

## 9. Telegram Mini App SDK (платежный срез)

- Скрипт: `telegram-web-app.js`  
- `initData` → заголовок API  
- `WebApp.openInvoice` — единственный UX-вход Stars на клиенте  
- `ready` / `expand` / цвета / haptic / viewport — оболочка, не бухгалтерия  

Платежи **не** идут через сторонний эквайринг: только Bot API + Stars.

---

## 10. Как внедрить мультивалютный кошелёк

### 10.1. Что есть сейчас

Фактически уже два «кошелька»:

1. ★ — универсальная валюта продукта  
2. coupons — узкий spendable счётчик  

Но API, лидерборд, вывод, игры и UI заточены под **одно число ★**.

### 10.2. Целевая модель (рекомендуемая)

Не плодить колонки `balance_ton`, `balance_usdt` без нужды. Лучше:

- таблица `wallets (user_id, currency, amount)` с CHECK `amount >= 0`  
- или `ledger` + материализованный баланс  
- атомарные RPC: `add_wallet(user, currency, delta)`, `try_deduct_wallet(...)`  
- валюты как enum/код: `STARS`, `XTR_HOLD`, `COUPON`, позже `TON` / др.

Купоны логично мигрировать в `currency = COUPON`.

### 10.3. Правила без ломки архитектуры

1. **Оставить ★ игровой валютой по умолчанию** — все текущие игры продолжают списывать/начислять `STARS`.  
2. **Новые валюты не смешивать в house-edge** без явного FX-слоя.  
3. **Topup** маппить: `XTR paid → credit STARS` (как сейчас) или `credit XTR_HOLD` + отдельный обмен — продуктовое решение.  
4. **Withdraw** привязать к конкретной валюте и статусной машине (сейчас только STARS + manual).  
5. **Не тащить мультивалютность в WebSocket** — деньги только REST + БД.  
6. **Идемпотентность webhook** сохранить через `claimTopupPaid`-паттерн на заказ.  
7. Ввести **единый внутренний ledger** (опционально, но желательно для аудита), не полагаясь на `histories`.

### 10.4. Этапы внедрения (без кода)

**Этап A — фундамент**  
Схема кошельков + RPC + чтение `GET /api/wallet` рядом с `/api/balance` (алиас на STARS).

**Этап B — совместимость**  
`getBalance` / `addBalance` / `tryDeductBalance` внутри перевести на `STARS`, публичные контракты игр не менять.

**Этап C — вторая валюта**  
Один новый поток (например hold XTR или TON) + UI выбора валюты только там, где нужно.

**Этап D — конвертация / вывод**  
Явные операции exchange/withdraw per currency + админские статусы.

Так платформа растёт модульно: игры не обязаны знать про все валюты сразу.

---

## 11. Какие файлы придётся изменить

### Обязательно (ядро кошелька)

| Файл | Зачем |
|------|--------|
| Supabase schema / RPC | новая модель балансов |
| `server/src/supabaseStore.ts` | обёртки multi-currency |
| `server/src/routes/payments.ts` | пакеты → валюта кредита |
| `server/src/routes/telegram.ts` | webhook → credit currency |
| `server/src/routes/withdraw.ts` | валюта вывода |
| `client/src/api.ts` | типы и методы кошелька |
| `client/src/App.tsx` | состояние баланса / кошелька |
| `client/src/types.ts` | DTO валют |
| `client/src/components/TopUpModal.tsx` | отображение курса / валюты |
| `client/src/components/WithdrawModal.tsx` | выбор валюты вывода |
| `client/src/components/Cabinet.tsx` | отображение кошелька |
| `client/src/i18n/dictionaries.ts` | подписи валют |

### Вероятно (если игры начнут принимать не-★)

| Файл | Зачем |
|------|--------|
| `routes/cases.ts`, `daily.ts`, `wheel.ts` | призы в нужной валюте |
| `coinflip.ts`, `blackjack.ts`, `minerush.ts`, `arena.ts`, `aviator.ts` | ставка в валюте стола |
| `houseEdge.ts` | если появится FX |
| `routes/referrals.ts` | cashback в какой валюте |
| `routes/cases.ts` leaders / `getLeadersPage` | рейтинг по какой валюте |
| Demo `client/src/demo/*` | зеркало поведения |

### Обычно не трогать для денег

- WebSocket-протокол Aviator (только события)  
- CSS / брендинг (кроме отображения сумм)  
- PvP (сейчас без ставок ★)

---

## 12. Интеграция без нарушения архитектуры

Принципы, которые уже заложены и их нужно сохранить:

1. **Сервер — единственный авторитет** по деньгам (клиент только показывает `balance` с ответа).  
2. **Атомарные операции в БД** — не возвращаться к read-modify-write.  
3. **Идемпотентные платежи** — `claimTopupPaid` / уникальный `telegram_payment_charge_id`.  
4. **Мутации баланса не через WebSocket**.  
5. **Маршруты по зонам** (`routes/payments`, `telegram`, `withdraw`) — новые валютные эндпоинты добавлять рядом, не раздувая `index.ts`.  
6. **Demo mode** остаётся без реального списания.  
7. **Один инстанс + in-memory Arena/Aviator** — при росте платформы realtime-игры выносить отдельно; кошелёк при этом остаётся в Supabase и масштабируется независимо.

Антипаттерны (ломают архитектуру):

- хранить баланс только на клиенте / в localStorage  
- кредитовать ★ из Mini App без webhook  
- считать баланс суммированием `histories`  
- проводить cashout Aviator по сообщению сокета без REST  
- смешивать XTR «как есть» в ставках игр без явного слоя обмена  

---

## 13. Риски и последствия мультивалютности

| Риск | Последствие |
|------|-------------|
| Двойной FX (игра + пополнение) | непрозрачный RTP / жалобы |
| Частичная миграция | рассинхрон UI («баланс» vs «кошелёк») |
| Вывод в новой валюте без KYC/ручных лимитов | операционный и комплаенс-риск |
| Лидерборд на смешанных валютах | бессмысленный рейтинг |
| Несколько инстансов API без общего wallet SoT | уже закрыто Supabase; не дублировать баланс в RAM |

---

## 14. Рекомендуемый порядок работ (план, без реализации)

1. Зафиксировать продуктовую матрицу валют: что покупается, во что играется, что выводится.  
2. Спроектировать `wallets` + RPC + ledger (аудит).  
3. Сделать back-compat слой: старый `/api/balance` = `STARS`.  
4. Перевести topup/withdraw на явный `creditCurrency` / `debitCurrency`.  
5. Только потом — UI мультивалютного кошелька и новые платёжные рельсы.  
6. Игры подключать к не-★ точечно, feature-flag.

---

## 15. Итог

- Баланс сегодня — **атомарные ★ (+ coupons)** в Supabase.  
- Платежи — **Telegram Stars → заказ → webhook → ★** (или кредит спина).  
- Вывод — **списание ★ + ручная заявка**.  
- Мультивалютный кошелёк **возможен** как эволюция текущей модели (по аналогии с coupons), но требует новой схемы, RPC и аккуратного слоя совместимости; текущие игры можно долго оставить на ★, не ломая архитектуру Mini App / Fastify / Supabase.
