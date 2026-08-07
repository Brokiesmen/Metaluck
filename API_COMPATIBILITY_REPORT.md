# API Compatibility Report — Wallet (Frontend ↔ Backend)

**Date:** 2026-08-07  
**Frontend:** `https://metaluck-eight.vercel.app` (client `api.ts` + Wallet / Crypto / Exchange / TopUp / Withdraw modals)  
**Backend (prod):** `https://metaluck-api-production.up.railway.app`  
**Probe method:** unauthenticated HTTP (401 = route registered + auth required; 404 = route missing on live process; 200/400 = public or validation)

---

## Verdict

1. **Source tree (`main` + local fixes)** registers a full Wallet crypto/exchange surface.
2. **Live Railway** still runs a **partial** crypto route set: deposit rails mostly work; **withdraw + `POST /api/crypto/deposit` + `GET /api/crypto/balance|history` + `GET /api/exchange/status` return 404**.
3. Frontend already preferred `POST /api/crypto/deposit-address` (live). Client fallbacks added for missing withdraw status / exchange status.
4. **`GET /api/crypto/balance`** and **`GET /api/crypto/history`** were **not** used by Wallet UI (balances via `GET /api/wallet`, history via deposits/withdrawals/ledger). They are now registered on Backend as aliases.
5. **Action required:** redeploy Railway from current `main` after merging these fixes — otherwise withdraw remains broken in production.

---

## Critical endpoints (requested)

| URL | Method | Frontend uses? | Backend registered (source)? | Works after deploy (prod probe)? | HTTP status (unauth) |
|---|---|---|---|---|---|
| `/api/crypto/deposit-address` | POST | **Yes** (`startCryptoDeposit`) | Yes | **Yes** | **401** |
| `/api/crypto/withdraw` | POST | **Yes** (`createCryptoWithdraw`) | Yes | **No** (missing on live) | **404** |
| `/api/crypto/balance` | GET | **Now yes** (`getCryptoBalance`); Wallet UI still uses `/api/wallet` | **Yes (added)** | **No** until redeploy | **404** |
| `/api/crypto/history` | GET | **Now yes** (`getCryptoHistory`); UI uses deposits/withdrawals/ledger | **Yes (added)** | **No** until redeploy | **404** |

### Equivalents already used by Wallet UI

| Need | Actual FE call | Prod status |
|---|---|---|
| Balances (Stars + TON + USDT) | `GET /api/wallet` | **401** (OK) |
| Ledger history | `GET /api/wallet/ledger` | **401** (OK) |
| Deposit history | `GET /api/crypto/deposits` | **401** (OK) |
| Withdraw history | `GET /api/crypto/withdrawals` | **404** on live |

---

## Full Wallet-related matrix

Legend: **FE** = called from Wallet/crypto/exchange/topup/stars-withdraw flows · **BE** = registered in current source · **Prod** = live Railway probe · Status = unauthenticated response.

### Crypto wallet

| URL | Method | FE | BE | Prod works? | Status |
|---|---|---|---|---|---|
| `/api/crypto/status` | GET | Yes | Yes | Yes | **200** |
| `/api/crypto/deposit-address` | POST | Yes | Yes | Yes | **401** |
| `/api/crypto/deposit-address` | GET | Yes (optional) | Yes | Yes* | *auth |
| `/api/crypto/deposit` | POST | No (alias; FE uses deposit-address) | Yes | **No** | **404** |
| `/api/crypto/deposits` | GET | Yes | Yes | Yes | **401** |
| `/api/crypto/sync` | POST | Yes | Yes | Yes | **401** |
| `/api/crypto/balance` | GET | Added helper | **Yes (new)** | **No** | **404** |
| `/api/crypto/history` | GET | Added helper | **Yes (new)** | **No** | **404** |
| `/api/crypto/withdraw/status` | GET | Yes (+ FE fallback → disabled) | Yes | **No** | **404** |
| `/api/crypto/withdraw/quote` | POST | Yes | Yes | **No** | **404** |
| `/api/crypto/withdraw` | POST | Yes | Yes | **No** | **404** |
| `/api/crypto/withdrawals` | GET | Yes (+ FE empty fallback) | Yes | **No** | **404** |
| `/api/admin/crypto/listener/tick` | POST | Admin | Yes | n/a | — |
| `/api/admin/crypto/withdraw/tick` | POST | Admin | Yes | n/a | — |

### Multi-currency wallet ledger

| URL | Method | FE | BE | Prod works? | Status |
|---|---|---|---|---|---|
| `/api/wallet` | GET | Yes (`WalletScreen`) | Yes | Yes | **401** |
| `/api/wallet/ledger` | GET | Yes | Yes | Yes | **401** |
| `/api/wallet/currencies` | GET | Helper | Yes | Yes | **200** |
| `/api/wallet/:currency` | GET | Helper | Yes | Yes* | *auth |
| `/api/balance` | GET | Legacy Stars | Yes | Yes | **401** |

### Exchange + rates

| URL | Method | FE | BE | Prod works? | Status |
|---|---|---|---|---|---|
| `/api/exchange/pairs` | GET | Yes (fallback path) | Yes | Yes | **200** |
| `/api/exchange/status` | GET | Yes (+ compose fallback) | Yes | **No** | **404** |
| `/api/exchange/quote` | POST | Yes | Yes | Yes | **401** |
| `/api/exchange/execute` | POST | Yes | Yes | Yes* | *auth |
| `/api/exchange/history` | GET | Helper | Yes | Yes | **401** |
| `/api/transactions` | GET | Helper | Yes | Yes | **401** |
| `/api/rates` | GET | Helper | Yes | Yes | **200** |
| `/api/rates/usd` | GET | Helper | Yes | Yes* | — |
| `/api/rates/:from/:to` | GET | Helper | Yes | Yes* | — |

### Stars top-up / deposit / Stars withdraw

| URL | Method | FE | BE | Prod works? | Status |
|---|---|---|---|---|---|
| `/api/topup/packages` | GET | Yes (`TopUpModal`) | Yes | Yes | **200** |
| `/api/topup/create-invoice` | POST | Yes | Yes | Yes* | *auth |
| `/api/topup/status/:payload` | GET | Yes | Yes | Yes* | *auth |
| `/api/deposit/methods` | GET | Yes | Yes | Yes | **200** |
| `/api/deposit/packages` | GET | Yes | Yes | Yes | **200** |
| `/api/deposit/stars/invoice` | POST | Yes | Yes | Yes (validates) | **400** unauth/body |
| `/api/deposit/crypto/intent` | POST | Legacy intent API | Yes | Yes (validates) | **400** |
| `/api/withdraw/info` | GET | Yes (`WithdrawModal` Stars) | Yes | Yes | **401** |
| `/api/withdraw/create` | POST | Yes | Yes | Yes | **401** |

---

## Mismatches found & fixes applied

| Issue | Severity | Fix |
|---|---|---|
| FE expected deposit via `/api/crypto/deposit` earlier → 404 on Railway | High | FE already uses **`POST /api/crypto/deposit-address`**. BE keeps both aliases. |
| `GET /api/crypto/balance` / `history` missing everywhere | Medium (spec) | Added BE routes + `api.getCryptoBalance` / `getCryptoHistory`. Wallet UI continues to use `/api/wallet` + ledger/deposits. |
| `POST /api/crypto/withdraw*` 404 on production | **Critical** | Routes exist in source; **Railway redeploy required**. Softened FE: withdraw status → `enabled: false` on failure; withdrawals list → `[]`. |
| `GET /api/exchange/status` 404 on production | High | Route in source; FE **composes** status from `/api/wallet` + `/api/crypto/status` + `/api/exchange/pairs` when status 404s. |
| Fragile Fastify body schema (`amount: {}`) on withdraw | Medium | Removed rigid schema; validate `confirm === true` in handler. |
| Empty currency on `POST /api/crypto/deposit` | Low | Defaults to `TON` when invalid/missing. |

---

## Production gap vs git `main`

Live process behaves like an **older deposit-only** crypto build:

| Present on live | Missing on live (but in git) |
|---|---|
| `GET /api/crypto/status` | `POST /api/crypto/deposit` |
| `POST/GET /api/crypto/deposit-address` | `GET /api/crypto/withdraw/status` |
| `GET /api/crypto/deposits` | `POST /api/crypto/withdraw/quote` |
| `POST /api/crypto/sync` | `POST /api/crypto/withdraw` |
| Exchange pairs / quote / execute | `GET /api/crypto/withdrawals` |
| Full `/api/wallet*` | `GET /api/crypto/balance` |
| | `GET /api/crypto/history` |
| | `GET /api/exchange/status` |

**Redeploy Railway from the commit that includes `server/src/routes/cryptoWallet.ts` + `exchange.ts` updates.** After deploy, re-probe: withdraw/status and exchange/status should return **200/401**, not **404**.

---

## Recommended post-deploy checklist

1. Redeploy API on Railway (clear build cache if routes still 404).
2. Unauthenticated probe:
   - `POST /api/crypto/withdraw` → **401** (not 404)
   - `GET /api/crypto/withdraw/status` → **200**
   - `GET /api/crypto/balance` → **401**
   - `GET /api/crypto/history` → **401**
   - `GET /api/exchange/status` → **401**
   - `POST /api/crypto/deposit` → **401**
3. Authenticated smoke: deposit address → sync; withdraw quote → create (testnet/small amount); exchange status balances match wallet.
4. Confirm env: `TON_DEPOSIT_MASTER_SEED`, withdraw hot-wallet keys, hub flags for deposit/withdraw enabled.

---

## Files changed in this pass

- `server/src/routes/cryptoWallet.ts` — `GET /api/crypto/balance`, `GET /api/crypto/history`; safer deposit/withdraw handlers
- `client/src/api.ts` — balance/history helpers; exchange status fallback; withdraw status/list resilience
- `API_COMPATIBILITY_REPORT.md` — this report
