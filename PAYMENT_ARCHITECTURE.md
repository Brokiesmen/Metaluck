# PAYMENT_ARCHITECTURE.md — Metaluck Payment Hub

Дата: 6 августа 2026  
Основание: [`PAYMENT_ANALYSIS.md`](./PAYMENT_ANALYSIS.md)  
Режим: проектирование, без кода.

---

## 1. Цели

Построить **Payment Hub** — единый платёжный контур Metaluck, который:

- сохраняет текущую модель Telegram Stars → игровые ★ без ломки игр;
- добавляет крипто-валюты (TON, USDT on TON) как полноценные балансы кошелька;
- позволяет позже подключить BTC, ETH, SOL, BNB, TRX без переписывания игр;
- держит **атомарность** и **идемпотентность** (как сейчас у `claimTopupPaid` / RPC баланса);
- не проводит деньги через WebSocket (Aviator остаётся event-only).

---

## 2. Ключевые продуктовые решения

| Решение | Выбор |
|---------|--------|
| Игровая валюта по умолчанию | **STARS** (внутренние ★) — все текущие игры списывают/начисляют только её |
| Telegram Stars (XTR) | Внешний платёжный рельс; после оплаты кредитует **STARS** (как сейчас 1:1) или опционально hold |
| TON / USDT_TON | Балансы кошелька + депозит/вывод on-chain |
| Coupons | Отдельная внутренняя валюта `COUPON` (миграция с `balances.coupons`) |
| Обмен | Только через **Exchange Service** по курсу из **Market Rates** (не «магия» в играх) |
| Источник истины | Таблицы кошелька + **ledger** (двойная запись), не `histories` |
| Масштабирование валют | Код валюты + адаптер сети; новая монета = конфиг + adapter, не новый монолит |

### Каталог валют (v1 и расширение)

| Код | Тип | Сеть | v1 | Игры | Вывод |
|-----|-----|------|----|------|-------|
| `STARS` | internal | — | да | да | manual / Stars |
| `XTR` | payment rail | Telegram | да (как вход) | нет напрямую | нет |
| `COUPON` | internal | — | да | только wheel | нет |
| `TON` | crypto | TON | да | нет (только через exchange → STARS) | да |
| `USDT_TON` | crypto | TON (Jetton) | да | нет (через exchange) | да |
| `BTC` | crypto | Bitcoin | позже | через exchange | позже |
| `ETH` | crypto | Ethereum | позже | через exchange | позже |
| `SOL` | crypto | Solana | позже | через exchange | позже |
| `BNB` | crypto | BNB Chain | позже | через exchange | позже |
| `TRX` | crypto | TRON | позже | через exchange | позже |

**Правило:** игры Metaluck v1 продолжают работать **только в STARS**. Крипта → Exchange → STARS → игра. Так не ломается house-edge и лидерборд.

---

## 3. Обзор Payment Hub

```
┌─────────────────────────────────────────────────────────────────┐
│                     Telegram Mini App (Vercel)                  │
│         Wallet UI · Deposit · Withdraw · Exchange · Rates       │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS + initData
┌───────────────────────────────▼─────────────────────────────────┐
│                    API Gateway (Fastify / Railway)              │
│         auth · rate-limit · /api/wallet/* · /api/payments/*     │
└─┬───────┬───────┬───────┬───────┬───────┬───────────────────────┘
  │       │       │       │       │       │
  ▼       ▼       ▼       ▼       ▼       ▼
Wallet  Exchange Deposit Withdraw Market  Transaction
Service Service  Service Service  Rates   Service
  │       │       │       │       │       │
  └───────┴───────┴───────┴───────┴───────┘
                      │
                      ▼
              Supabase Postgres
         wallets · ledger · orders · rates
```

На старте все сервисы — **логические модули внутри текущего `server/`** (как `routes/payments`, `routes/telegram`), с чёткими границами. Вынос в отдельные процессы — позже, без смены контрактов API.

---

## 4. Сервисы Hub

### 4.1. Wallet Service

**Ответственность:** хранение и атомарное изменение балансов по валютам.

**Делает:**
- `getBalances(userId)` — снимок всех валют пользователя;
- `credit(userId, currency, amount, meta)` — начисление;
- `tryDebit(userId, currency, amount, meta)` — списание или отказ;
- `ensureWallet(userId, currency)` — ленивое создание строки;
- миграция совместимости: `balances.balance` ↔ `STARS`, `balances.coupons` ↔ `COUPON`.

**Не делает:** курсы, on-chain, UI, вызовы Telegram Bot API.

**Гарантии:** только через SQL-RPC / транзакции; запрет отрицательного баланса; каждая мутация пишет в Transaction Service (ledger).

---

### 4.2. Exchange Service

**Ответственность:** обмен одной валюты кошелька на другую.

**Делает:**
- котировка: `quote(from, to, amount)` → `rate`, `fee`, `expiresAt`, `quoteId`;
- исполнение: `execute(quoteId)` — атомарно debit `from` + credit `to` в одной DB-транзакции;
- лимиты: мин/макс, дневной оборот, whitelist пар.

**Пары v1 (пример):**
- `TON → STARS`, `USDT_TON → STARS`
- `STARS → TON`, `STARS → USDT_TON` (если продукт разрешает обратный обмен)
- `COUPON` — **не** участвует в exchange (как сейчас)

**Не делает:** депозиты/выводы on-chain; хранение курсов (читает Market Rates).

**Идемпотентность:** `quoteId` одноразовый; повтор `execute` возвращает тот же результат.

---

### 4.3. Deposit Service

**Ответственность:** входящие платежи извне → кредит кошелька.

**Рельсы v1:**

| Рельс | Вход | Кредит |
|-------|------|--------|
| Telegram Stars | invoice + webhook (уже есть) | `STARS` (или спин `premium_wheel`) |
| TON | уникальный memo / deposit address | `TON` |
| USDT TON | jetton transfer на deposit address | `USDT_TON` |

**Делает:**
- создать deposit intent / адрес / invoice;
- принять webhook / listener подтверждений сети;
- идемпотентно зачислить через Wallet + Transaction;
- для Stars — обернуть текущий `topup_orders` + `claimTopupPaid` как адаптер `StarsDepositAdapter`.

**Не делает:** обмен в STARS автоматически (опционально: post-deposit auto-convert — отдельная политика продукта).

---

### 4.4. Withdraw Service

**Ответственность:** исходящие выплаты.

**Рельсы v1:**
- **STARS** — как сейчас: debit + `withdraw_orders` + ручная обработка админом (можно позже Telegram Stars payout API, если появится);
- **TON / USDT_TON** — debit hold → on-chain send → confirm → complete / fail+refund.

**Статусы заказа:** `pending → reviewing → processing → sent → completed` | `rejected` | `failed` (с возвратом).

**Делает:**
- лимиты, KYC-флаги (заготовка), hot-wallet политика;
- hold средств при создании заявки (не «списать насовсем» до sent — или списать в `locked`, см. таблицы).

**Не делает:** курсы; игры.

---

### 4.5. Market Rates Service

**Ответственность:** курсы и ценообразование для Exchange (и отображения в UI).

**Делает:**
- хранить / обновлять пары `base/quote`;
- источники: ручной admin, оракул (CoinGecko / биржевой API), фиксированный курс `XTR:STARS = 1`;
- TTL котировок, спред (bid/ask), markup платформы;
- `getRate(from, to)` для Exchange Service.

**Не делает:** движение денег.

**Расширение:** для BTC/ETH/… добавляются пары в конфиг без смены API.

---

### 4.6. Transaction Service

**Ответственность:** единый неизменяемый журнал (ledger) всех денежных событий.

**Делает:**
- append-only записи: deposit, withdraw, exchange, game_bet, game_win, referral, adjustment;
- связь с внешними id (`telegram_payment_charge_id`, `tx_hash`, `quote_id`);
- API истории для кабинета (вместо опоры на `histories` как на бухгалтерию);
- аудит / сверка: сумма ledger по валюте = `wallets.amount`.

**Не делает:** бизнес-решений «можно ли вывести» — только запись факта, инициированного другими сервисами.

---

## 5. Взаимодействие сервисов

### 5.1. Пополнение Stars (совместимость с текущим потоком)

```
Client → Deposit(Stars) → create invoice
Telegram webhook → Deposit.confirm → Wallet.credit(STARS)
                               → Transaction.append(deposit)
                               → (optional) Referral cashback via Wallet.credit
```

### 5.2. Депозит TON / USDT_TON

```
Client → Deposit.create(TON) → address + memo
Chain watcher → Deposit.confirm(tx)
             → Wallet.credit(TON|USDT_TON)
             → Transaction.append(deposit)
Client (optional) → Exchange.quote/execute → STARS для игры
```

### 5.3. Обмен в игровую валюту

```
Client → MarketRates (preview)
      → Exchange.quote(TON→STARS)
      → Exchange.execute
           → Wallet.tryDebit(TON)
           → Wallet.credit(STARS)
           → Transaction.append(exchange_out + exchange_in)  [одна tx]
```

### 5.4. Ставка в игре (без изменения контракта игр)

```
Game route → Wallet.tryDebit(STARS)   [= нынешний tryDeductBalance]
          → Transaction.append(game_bet)
… win …
Game route → Wallet.credit(STARS)
          → Transaction.append(game_win)
```

Игры **не** знают про TON/USDT.

### 5.5. Вывод

```
Client → Withdraw.create(currency, amount, destination)
      → Wallet.lock/debit
      → Transaction.append(withdraw_pending)
Admin/Worker → on-chain or manual Stars
            → Withdraw.complete / fail+refund
            → Transaction.append(withdraw_completed|refund)
```

### 5.6. Запрещённые связи

- Deposit/Withdraw **не** вызывают друг друга напрямую.
- Games **не** вызывают Exchange / Market Rates.
- WebSocket **не** мутирует Wallet.
- Client **не** пишет в БД балансы.

---

## 6. Новые таблицы (Supabase)

### 6.1. Справочники

**`currencies`**
- `code` PK (`STARS`, `TON`, `USDT_TON`, …)
- `kind` (`internal` | `crypto` | `fiat_rail`)
- `decimals` (STARS: 0; TON: 9; USDT: 6)
- `network` (nullable: `ton`, `bitcoin`, …)
- `is_active`, `can_deposit`, `can_withdraw`, `can_exchange`, `can_wager`
- `display_symbol`, `sort_order`

**`currency_networks`** (для будущего multi-network USDT и т.п.)
- `id`, `currency_code`, `network`, `contract_address` (nullable), `confirmations_required`, `is_active`

### 6.2. Кошелёк

**`wallets`**
- PK `(user_id, currency_code)`
- `available` numeric/bigint (в минимальных единицах: nano, cents, целые ★)
- `locked` numeric/bigint (hold под вывод / exchange)
- `updated_at`
- CHECK `available >= 0`, `locked >= 0`

**Миграция:**  
`balances.balance` → `wallets(STARS).available`  
`balances.coupons` → `wallets(COUPON).available`  
Старую таблицу держать как view/алиас на переходный период.

### 6.3. Ledger

**`ledger_entries`**
- `id` bigserial
- `user_id`
- `currency_code`
- `direction` (`credit` | `debit`)
- `amount` (> 0)
- `balance_after_available` / `balance_after_locked` (опционально для аудита)
- `entry_type` (`deposit`, `withdraw`, `exchange`, `game_bet`, `game_win`, `referral`, `coupon`, `adjustment`, `fee`)
- `idempotency_key` UNIQUE
- `ref_table` / `ref_id` (полиморфная ссылка на order)
- `meta` jsonb
- `created_at`

Индексы: `(user_id, created_at DESC)`, `(currency_code, created_at)`, `(idempotency_key)`.

### 6.4. Депозиты

**`deposit_orders`** (обобщение `topup_orders`)
- `id` / `payload` (для Stars совместимости)
- `user_id`
- `rail` (`telegram_stars` | `ton` | `jetton_usdt` | …)
- `currency_code` (что кредитуем: `STARS` / `TON` / `USDT_TON`)
- `expected_amount` / `received_amount`
- `status` (`pending` | `confirming` | `paid` | `failed` | `expired`)
- `external_id` UNIQUE (charge_id / tx_hash)
- `deposit_address`, `memo` (для crypto)
- `created_at`, `updated_at`

`topup_orders` можно оставить как legacy-view или мигрировать строки в `deposit_orders` с `rail=telegram_stars`.

### 6.5. Выводы

**`withdraw_orders`** (расширение текущей)
- добавить: `currency_code`, `destination` (address / telegram), `network`, `tx_hash`, `locked_amount`, `fail_reason`
- статусы как в §4.4

### 6.6. Обмен

**`exchange_quotes`**
- `id` uuid
- `user_id`
- `from_currency`, `to_currency`
- `from_amount`, `to_amount`, `rate`, `fee_amount`, `fee_currency`
- `expires_at`, `status` (`open` | `executed` | `expired` | `cancelled`)

**`exchange_orders`**
- связь с `quote_id`, финальные суммы, `ledger` refs

### 6.7. Курсы

**`market_rates`**
- `base_currency`, `quote_currency`
- `bid`, `ask` (или mid + spread_bps)
- `source` (`manual` | `coingecko` | `fixed`)
- `valid_from`, `valid_until` / `fetched_at`

**`rate_overrides`** (админский markup)

### 6.8. Адреса депозитов (crypto)

**`deposit_addresses`**
- `user_id`, `network`, `address`, `memo_tag` (если нужен), `currency_code` nullable
- UNIQUE `(network, address, memo_tag)`

### 6.9. RPC (логически)

- `wallet_credit` / `wallet_try_debit` / `wallet_lock` / `wallet_unlock_or_capture`
- все с записью ledger в той же транзакции  
Совместимость: `add_balance` / `try_deduct_balance` → тонкие обёртки над `STARS`.

---

## 7. Новые API (публичные контракты)

Префикс: `/api/wallet` и `/api/payments` (или всё под `/api/hub/*` — на выбор; ниже — читаемые REST-пути).

### Wallet
| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/api/wallet` | все балансы пользователя |
| GET | `/api/wallet/:currency` | один баланс |
| GET | `/api/wallet/ledger` | история ledger (пагинация) |

Совместимость: `GET /api/balance` → `{ balance: stars.available }`.

### Rates
| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/api/rates` | активные пары |
| GET | `/api/rates/:from/:to` | текущий курс + спред |

### Exchange
| Метод | Путь | Назначение |
|-------|------|------------|
| POST | `/api/exchange/quote` | `{ from, to, amount }` → quote |
| POST | `/api/exchange/execute` | `{ quoteId }` → новые балансы |

### Deposit
| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/api/deposit/methods` | доступные рельсы |
| POST | `/api/deposit/stars/invoice` | = нынешний create-invoice |
| GET | `/api/deposit/stars/status/:payload` | = topup status |
| POST | `/api/deposit/crypto/intent` | создать адрес/memo для TON/USDT |
| GET | `/api/deposit/:id` | статус депозита |

Webhook: существующий `/api/telegram/webhook` остаётся входом Stars-адаптера Deposit Service.

### Withdraw
| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/api/withdraw/methods` | валюты + лимиты |
| GET | `/api/withdraw/info` | расширить текущий |
| POST | `/api/withdraw/create` | `{ currency, amount, destination }` |
| GET | `/api/withdraw/orders` | список заявок |

### Admin (защищённые `x-admin-secret`)
| Метод | Путь | Назначение |
|-------|------|------------|
| POST | `/api/admin/rates` | ручной курс |
| POST | `/api/admin/withdraw/:id/approve` | approve / reject / mark sent |
| POST | `/api/admin/wallet/adjust` | ручная корректировка + ledger |

---

## 8. Структура модулей в репозитории (логическая)

Без написания кода — целевая раскладка:

```
server/src/payments/
  wallet/          # Wallet Service
  exchange/        # Exchange Service
  deposit/         # Deposit Service + adapters (stars, ton, usdtTon)
  withdraw/        # Withdraw Service
  rates/           # Market Rates Service
  transactions/    # Transaction / ledger Service
  catalog.ts       # currencies config (легко добавить BTC…)
routes/…           # HTTP-адаптеры к сервисам
```

Клиент (позже):
```
client/src/components/wallet/
  WalletPanel · DepositSheet · WithdrawSheet · ExchangeSheet
```

Добавление BTC/ETH/SOL/BNB/TRX:
1. строка в `currencies` + `currency_networks`;
2. adapter в `deposit/` и `withdraw/`;
3. пары в `market_rates`;
4. флаги `can_*` — без изменения игровых модулей.

---

## 9. Последовательность разработки

### Фаза 0 — Контракт и миграция данных (1)
- Утвердить каталог валют и единицы хранения (integer smallest unit).
- Спроектировать миграцию `balances` → `wallets` + dual-read.
- Описать idempotency keys для deposit/exchange/withdraw.

### Фаза 1 — Wallet + Transaction (фундамент)
- Таблицы `currencies`, `wallets`, `ledger_entries`.
- RPC credit/debit/lock.
- Проксировать существующие `addBalance` / `tryDeductBalance` на `STARS`.
- `GET /api/wallet` + сохранить `GET /api/balance`.
- Игры **не менять** поведенчески.

### Фаза 2 — Market Rates + Exchange
- Таблицы курсов; фиксированный `XTR→STARS` и ручной/API курс TON/USDT→STARS.
- Quote/execute API.
- UI обмена в кабинете (минимальный).

### Фаза 3 — Deposit Hub
- Обернуть Stars topup как Deposit adapter (без ломки webhook).
- Crypto deposit intents для TON и USDT_TON (watcher / provider).
- Миграция/алиас `topup_orders` → `deposit_orders`.

### Фаза 4 — Withdraw Hub
- Расширить `withdraw_orders` валютами.
- STARS: текущий manual flow.
- TON/USDT: hold → send → confirm (можно сначала semi-manual admin «mark sent»).

### Фаза 5 — Полировка и расширение
- Админка курсов и выводов.
- Реферальный cashback явно в `STARS` через Wallet + ledger.
- Coupons → `COUPON` в wallets.
- Подготовка адаптеров BTC/ETH/SOL/BNB/TRX (feature-flag off).

### Фаза 6 — (Опционально) вынос сервисов
- Если нагрузка растёт: Deposit watcher и Withdraw worker — отдельные процессы; Wallet остаётся в Postgres как SoT.

---

## 10. Совместимость с текущим Metaluck

| Сейчас | В Hub |
|--------|--------|
| `balances.balance` | `wallets(STARS).available` |
| `balances.coupons` | `wallets(COUPON).available` |
| `topup_orders` | `deposit_orders` / Stars adapter |
| `withdraw_orders` | расширенная та же сущность |
| `histories` | остаётся UI призов; деньги → `ledger_entries` |
| `POST /api/topup/*` | тонкие алиасы на Deposit |
| Игры / Aviator WS | без изменений контракта денег |

---

## 11. Риски и ограничения

1. **Один инстанс Arena/Aviator** не связан с кошельком — кошелёк в БД масштабируется отдельно.  
2. **On-chain подтверждения** — задержки и reorg; нужны статусы `confirming`.  
3. **Курсовой риск** — короткий TTL quote + спред.  
4. **Комплаенс** — выводы crypto требуют политик лимитов/блокировок (заложить в Withdraw).  
5. **Нельзя** давать играм прямые ставки в TON без пересмотра RTP/лидерборда.  
6. Hot-wallet безопасность — вне скоупа v1 UI; обязательна к фазе auto-withdraw.

---

## 12. Критерии готовности архитектуры

- [ ] Любая мутация баланса проходит Wallet + Ledger.  
- [ ] Stars topup по-прежнему идемпотентен.  
- [ ] Игры работают только с STARS.  
- [ ] Новая монета добавляется конфигом + adapter без правок Coinflip/Aviator/Cases.  
- [ ] WebSocket не кредитует и не списывает.  
- [ ] `GET /api/balance` сохраняет обратную совместимость на переходный период.

---

## 13. Итог

Payment Hub разделяет ответственность на шесть сервисов вокруг единого кошелька и ledger.  
Telegram Stars, TON и USDT_TON входят как рельсы Deposit/Withdraw; игры остаются на STARS через Exchange.  
Такая схема сохраняет текущую архитектуру Metaluck и даёт безопасный путь к BTC/ETH/SOL/BNB/TRX без переписывания игровой экономики.
