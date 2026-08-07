# CRYPTO_DEBUG_REPORT — Crypto Deposit «Not Found»

**Дата:** 2026-08-07  
**Симптом:** UI Crypto Deposit (TON / USDT) показывает ошибку `Not Found`.  
**Прод API:** `https://metaluck-api-production.up.railway.app`  
**Прод клиент:** `https://metaluck-eight.vercel.app` (`VITE_API_BASE_URL` → Railway)

---

## 1. Backend API для депозитного адреса

| Эндпоинт | Назначение | Прод (проба curl) |
|---|---|---|
| `GET /api/crypto/status` | флаг enabled / сети | **200** `{"enabled":true,...}` |
| `POST /api/crypto/deposit` | старт депозита (то, что зовёт UI) | **404** `{"message":"Not Found"}` |
| `POST /api/crypto/deposit-address` | alias того же сервиса | **401** Unauthorized (маршрут **есть**) |
| `GET /api/crypto/deposit-address` | получить/создать адрес | **401** (маршрут **есть**) |
| `GET /api/crypto/deposits` | история | **401** (маршрут **есть**) |
| `POST /api/crypto/sync` | сканер | **401** (маршрут **есть**) |
| `GET /api/crypto/withdraw/status` | выводы | **404** Not Found |
| `POST /api/crypto/withdraw` | выводы | **404** Not Found |

**Вывод:** сервис депозитных адресов на API жив, но **канонический путь `POST /api/crypto/deposit` на прод-инстансе не обслуживается**. Alias `deposit-address` обслуживается.

---

## 2. Регистрация маршрутов (код репозитория)

Файл: `server/src/routes/cryptoWallet.ts`  
Регистрация: `server/src/index.ts` → `registerCryptoWalletRoutes(app, { getUserId })`.

В репозитории (`main`) зарегистрированы и `POST /api/crypto/deposit`, и alias `POST /api/crypto/deposit-address`.

На **задеплоенном** Railway отвечает только подмножество (status, deposit-address, deposits, sync). Пути `deposit` (без `-address`) и весь withdraw-блок дают Fastify default 404.

---

## 3. Crypto Deposit Service

Реализован: `server/src/payments/cryptoWallet/service.ts` → `startCryptoDeposit()`.

- Проверка `TON_DEPOSIT_MASTER_SEED` (`isCryptoWalletEnabled`)
- `ensureUserWallets(userId)`
- `deriveUserTonAddress(userId)`
- `upsertDepositAddress(...)` → таблица `crypto_deposit_addresses`

Прод `GET /api/crypto/status` → `enabled: true` ⇒ seed на Railway задан, сервис не «выключен» конфигом.

---

## 4. Blockchain Service

Реализован: `server/src/payments/blockchain/BlockchainService.ts` (+ `config`, `addressUtils`).  
Деривация адреса идёт через `blockchainService.generateAddress({ kind: 'user', userId, masterSeed })`.

---

## 5. Создание депозитного адреса пользователя

Логика есть (`upsertDepositAddress` → Supabase `crypto_deposit_addresses`).  
Таблицы в Supabase: `crypto_deposit_addresses`, `crypto_chain_transactions`, `crypto_withdrawals` — **есть**.

Создание с UI не доходит до сервиса: запрос обрывается на **404 маршрута** до auth/бизнес-логики.

---

## 6. Переменные окружения (по косвенным признакам)

| Признак | Статус |
|---|---|
| `TON_DEPOSIT_MASTER_SEED` | скорее задан (`status.enabled === true`) |
| Wallet / Supabase | работают (другие 401/200 с API) |
| `VITE_API_BASE_URL` на Vercel | задан → `metaluck-api-production.up.railway.app` |
| TON API / RPC | не проверялись end-to-end (запрос не доходит до сканера) |

Нехватка env **не** объясняет текст `"Not Found"` (при отсутствии seed был бы **503** с другим message).

---

## 7. Провайдер TON

Код провайдера есть (TonAPI / RPC в `payments/blockchain`). К ошибке UI сейчас не подключён: падение на роутинге.

---

## 8. Wallet приложения

Есть: `server/src/payments/wallet/*`, маршруты `/api/wallet`.  
`GET /api/wallet` на проде → **401** (маршрут есть).  
`startCryptoDeposit` вызывает `ensureUserWallets` — до этого вызова UI не доходит.

---

## 9. Backend 404

Да. Ответ прода:

```http
HTTP/1.1 404 Not Found
Content-Type: application/json; charset=utf-8

{"message":"Not Found"}
```

Это **дефолтный Fastify `notFoundHandler`**, не бизнес-ошибка `NOT_FOUND` из deposit/hub (там другие тексты вроде `Депозит не найден.` / `NOT_FOUND`).

---

## 10. Network-запросы Frontend

Клиент: `client/src/api.ts`

```ts
startCryptoDeposit: (currency) =>
  request('/api/crypto/deposit', { method: 'POST', body: JSON.stringify({ currency }) })
```

Модалка: `CryptoDepositModal` → `api.startCryptoDeposit(code)` при автостарте с карточки TON/USDT.

`request()` при `!res.ok` делает:

```ts
throw new Error(data.message ?? `Ошибка ${res.status}`)
```

⇒ пользователь видит ровно **`Not Found`**.

Запросы на origin Vercel (`/api/...` без `VITE_API_BASE_URL`) тоже 404, но в текущем бандле база Railway прошита — проблема именно на Railway path mismatch.

---

## Точная причина

1. UI вызывает **`POST /api/crypto/deposit`**.
2. На production Railway этот маршрут **не найден** → Fastify отвечает `{"message":"Not Found"}`.
3. Рабочий эквивалент на том же API: **`POST /api/crypto/deposit-address`** (регистрируется и отвечает 401 без сессии).
4. Расхождение: клиент переведён на новый path, а **живой API-процесс обслуживает старый набор crypto-роутов** (или сборка без `POST /api/crypto/deposit` / withdraw), хотя в git `main` оба path уже есть.

Дополнительно: withdraw-эндпоинты на проде тоже 404 — тот же класс проблемы (прод API не на полном текущем `cryptoWallet.ts`).

---

## Почему появляется «Not Found»

Не «адрес не найден в БД» и не «TON недоступен».  
Это **HTTP 404 Route not found** на path, который фронт считает основным.

---

## Что отсутствует / сломано в связке

| Слой | Статус |
|---|---|
| Архитектура crypto wallet / blockchain / tables | на месте |
| `POST /api/crypto/deposit` на **прод-рантайме** | отсутствует (404) |
| Согласованность client path ↔ deployed routes | сломана |
| Redeploy Railway до полного `cryptoWallet.ts` | требуется для withdraw + канонического `/deposit` |

---

## Файлы, которые нужно изменить

1. **`client/src/api.ts`** — `startCryptoDeposit` должен бить в существующий alias  
   `POST /api/crypto/deposit-address` (или fallback: deposit → deposit-address).
2. **`server/src/routes/cryptoWallet.ts`** — убедиться, что `POST /api/crypto/deposit` остаётся зарегистрированным (уже в git); после фикса клиента — **обязательный redeploy Railway**, иначе withdraw так и останется 404.
3. Опционально: health/diag endpoint со списком crypto routes (не обязательно для фикса).

Не нужна новая архитектура: чиним path + выкат API.

---

## План исправления (после отчёта)

1. Перевести `startCryptoDeposit` на `POST /api/crypto/deposit-address`.
2. Задеплоить клиент.
3. Перезапустить/redeploy Railway с текущим `main`, чтобы появились `/api/crypto/deposit` и withdraw-роуты.
