# Payment Hub — Final Report

Дата: 2026-08-06  
Проект: Metaluck (`minigames`)  
Стек: Fastify + Supabase (Postgres) + Redis (rates cache) + React Mini App

---

## 1. Краткий итог аудита

Проведён полный аудит Wallet, Exchange, Deposits, Withdrawals, Transactions, Rates и игровой интеграции.

**Исправлены критические/высокие дефекты:**
- FX drift между lock и payout для ставок в TON/USDT (заморозка `frozenMid` на резервации)
- Race в `ReserveAdditional` (CAS по `amount` + rollback lock)
- Неатомарный win-settle (capture → pending → credit → settled, с retry)
- Withdraw FSM: только `pending → paid|rejected`, CAS, refund после смены статуса
- Crypto deposit mins из Payment Hub settings (не только env)
- Referral cashback idempotency по `depositPublicId`
- `stars_usd_manual` strict parse (`"false"` больше не становится `true`)
- Manual market rates не затираются oracle refresh
- ReleaseFunds на ошибках settle (coinflip, cases); blackjack clear/double
- Arena settle flag только после успешного settle всех игроков
- Aviator crash settle — per-bet try/catch
- Batch upsert курсов; batch wallet lookup в admin search
- `exchange_execute_quote` добавлен в репозиторий миграций
- `canWager: true` для TON/USDT (продуктовое поведение bet currency)

Сервер после правок: `tsc --noEmit` — OK.

---

## 2. Новая архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                     Telegram Mini App                        │
│  Wallet tab · BetCurrencyPicker · AdminHub (кабинет)         │
└───────────────────────────┬─────────────────────────────────┘
                            │ initData / x-admin-secret
┌───────────────────────────▼─────────────────────────────────┐
│                     Fastify API                              │
│  /api/wallet · /api/deposit · /api/exchange · /api/withdraw  │
│  /api/admin/payments/* · game routes (coinflip, bj, …)       │
└───┬──────────┬──────────┬──────────┬──────────┬─────────────┘
    │          │          │          │          │
┌───▼───┐ ┌────▼────┐ ┌───▼────┐ ┌───▼────┐ ┌──▼──────────┐
│Wallet │ │Deposit  │ │Exchange│ │ Rates  │ │ Payment Hub │
│Service│ │Service  │ │Service │ │Service │ │ Admin/Settings│
└───┬───┘ └────┬────┘ └───┬────┘ └───┬────┘ └──┬──────────┘
    │          │          │          │         │
    └──────────┴────┬─────┴──────────┴─────────┘
                    ▼
         Supabase Postgres (+ Redis for rates)
```

### Принципы
1. **Единый источник денег** — только Wallet RPCs (`wallet_credit` / `wallet_try_debit` / lock / unlock / capture). Игры и обменник не пишут в `balances` напрямую для новых потоков.
2. **Игровая фасад-API** — `ReserveFunds` → `CreditBalance` | `CompleteTransaction` | `ReleaseFunds`. Ставка в «игровых ★»; валюта оплаты (`payCurrency`) и mid курса замораживаются на резервации.
3. **Exchange** — quote в БД → `exchange_execute_quote` (FOR UPDATE + idempotent debit/credit).
4. **Rates** — oracle (CoinGecko + Stars) → Redis/memory → `market_rates`. Параметры спреда/комиссий/лимитов — в `exchange_pairs` и `payment_hub_settings`.
5. **Admin без деплоя** — настройки, пары, курсы, выводы, ручные операции через UI/API и таблицы Hub.

---

## 3. Сервисы

| Сервис | Назначение |
|--------|------------|
| **Wallet Service** | Мультивалютные балансы (STARS, TON, USDT_TON), ledger, lock/capture |
| **Game Wallet Facade** | Резервы ставок, settle win/lose/push, CreditWinnings |
| **Deposit Service** | Stars invoice + TON/USDT on TON, claim → wallet credit |
| **Exchange Service** | Quotes, execute, pair catalog |
| **Market Rates Service** | USD book, cross-pairs, auto-refresh, manual overrides |
| **Transaction Service** | Журнал ledger + exchange orders для пользователя |
| **Payment Hub Admin** | Settings, admins, audit, ops UI API |

---

## 4. Созданные файлы

### Server — payments
- `server/src/payments/wallet/*` — catalog, types, service, game facade, index
- `server/src/payments/deposit/*` — config, store, service, tonApi, starsInvoice, types
- `server/src/payments/exchange/*` — service, index
- `server/src/payments/rates/*` — oracle, cache, store, service, config, types
- `server/src/payments/transactions/*` — service, index
- `server/src/payments/hub/*` — settings, auth, service, index (**Admin**)

### Server — routes / migrations
- `server/src/routes/wallet.ts`
- `server/src/routes/deposit.ts`
- `server/src/routes/exchange.ts`
- `server/src/routes/adminPayments.ts`
- `server/migrations/20260806174646_wallet_service_v1.sql`
- `server/migrations/20260806180000_deposit_service_v1.sql`
- `server/migrations/20260806183000_exchange_service_v1.sql`
- `server/migrations/20260806190000_wallet_game_reservations.sql`
- `server/migrations/20260806203000_game_wallet_integration.sql`
- `server/migrations/20260806210000_payment_hub_admin_v1.sql`
- `server/migrations/20260806220000_exchange_execute_quote_rpc.sql`

### Client
- `client/src/components/WalletScreen.tsx`
- `client/src/components/ExchangeModal.tsx`
- `client/src/components/BetCurrencyPicker.tsx`
- `client/src/components/AdminHubScreen.tsx`
- `client/src/components/tab-icons/TabWalletIcon.tsx`
- `client/src/hooks/useWagerCurrency.ts`

### Docs
- `PAYMENT_FINAL_REPORT.md` (этот файл)

---

## 5. Изменённые файлы (ключевые)

### Server
- `server/src/index.ts` — регистрация wallet/deposit/exchange/admin routes, rates refresh из Hub
- `server/src/routes/withdraw.ts` — лимиты из Hub settings
- `server/src/routes/cases.ts` — currency + ReleaseFunds on error
- `server/src/coinflip.ts`, `blackjack.ts`, `minerush.ts`, `arena.ts`, `aviator.ts` — Wallet facade + currency
- `server/src/payments/wallet/game.ts` — **audit fixes** (frozen mid, CAS, win settle)
- `server/src/payments/wallet/catalog.ts` — canWager для crypto
- `server/src/payments/hub/service.ts` — withdraw FSM, search batch, idempotent admin credit
- `server/src/payments/deposit/service.ts` — hub mins, referral key
- `server/src/payments/rates/store.ts` — batch upsert, preserve manual
- `server/src/payments/rates/oracle.ts` — hub Stars/USD
- `.env.example` — TELEGRAM_ADMIN_IDS, Payment Hub notes

### Client
- `client/src/App.tsx`, `TabBar.tsx`, `Cabinet.tsx` — Wallet tab + Admin entry
- `client/src/api.ts` — wallet/exchange/admin clients + currency on bets
- Game components — `BetCurrencyPicker` + currency в API
- `client/src/i18n/dictionaries.ts`, `client/src/index.css`

---

## 6. Как пользоваться Admin (без смены кода)

1. Добавить Telegram user id:
   - env: `TELEGRAM_ADMIN_IDS=123456789`  
   - или таблица `payment_hub_admins` / вкладка «Админы»
2. Открыть **Кабинет → Админка Payment Hub**
3. Менять: лимиты, Stars/USD, спред/fee/min/max пар, курсы, выводы, депозиты, обмены, ledger, ручные credit/debit, статистику комиссий

API также принимает `x-admin-secret: $ADMIN_API_SECRET`.

---

## 7. Игровая интеграция (контракт)

```
ReserveFunds(userId, stakeStars, { game, payCurrency })
  → locks wallet amount at frozenMid
  → returns reservationId

Win:  CreditBalance(reservationId, payoutStars)
Lose: CompleteTransaction(reservationId)
Push: ReleaseFunds(reservationId)
```

Валюта ставки выбирается в UI (`BetCurrencyPicker`), уходит в body `currency`, сервер валидирует через `isPayCurrency`.

---

## 8. Рекомендации по дальнейшему развитию

### P0 / ближайшие
1. **Persist arena & aviator rounds** (+ job для orphaned reservations после рестарта).
2. **MineRush: persist `pay_currency`** и отдавать `GetPlayableBalance(userId, payCurrency)` во всех state-ручках.
3. **Единая валюта на раунд арены** (запрет микса STARS/TON в одном pot).
4. **Idempotent withdraw create** (RPC: lock+insert) против double-deduct при retry клиента.

### P1
5. Пагинация TON deposit scanner (cursor / webhook TonAPI).
6. SQL aggregation для exchange profit (`GROUP BY`) вместо full scan.
7. Реальный union-pagination для `/api/transactions` kind=`all`.
8. Wheel/referral: claim-row before credit + стабильные idempotency keys по периоду.

### P2
9. Observability: метрики lock orphans, settle failures, rate refresh errors.
10. Reconciliation job: `wallet_game_reservations` status=`reserved` старше N минут → alert/release policy.
11. Документировать dual-write legacy `balances` ↔ wallet STARS и план полного cutover.
12. E2E тесты: reserve→win/lose/push; exchange quote→execute; withdraw reject→no reopen.

---

## 9. Известные ограничения (осознанные)

- Arena/Aviator state в памяти процесса — после рестарта нужны orphan-cleanup.
- Выводы сейчас в STARS (ручной пайплайн + Telegram alert).
- Free rewards (`CreditWinnings`) всегда в STARS.
- Rates refresh interval из Hub применяется при старте процесса (смена `rates_refresh_ms` без рестарта — soft; полный эффект после redeploy/restart).

---

## 10. Чеклист проверки после деплоя

- [ ] Миграции применены (включая `payment_hub_admin_v1`, `exchange_execute_quote_rpc`)
- [ ] `TELEGRAM_ADMIN_IDS` / `ADMIN_API_SECRET` заданы
- [ ] `REDIS_URL` (prod) для rates
- [ ] `TON_DEPOSIT_ADDRESS` если нужны crypto deposits
- [ ] Smoke: Wallet balances · Exchange quote/execute · Deposit methods · Withdraw · Admin pairs · Bet with STARS/TON
- [ ] Coinflip settle + ReleaseFunds path на forced error (staging)

---

*Архитектура существующего проекта сохранена: Fastify routes + Supabase RPC/tables + React Mini App. Payment Hub добавлен как слой сервисов и админ-API поверх текущего стека, без смены auth-модели Telegram initData.*
