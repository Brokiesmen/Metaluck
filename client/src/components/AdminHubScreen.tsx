import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { WalletBalance, WalletCurrency } from '../types';
import { useSettings } from '../settings/SettingsContext';

type Section =
  | 'settings'
  | 'rates'
  | 'pairs'
  | 'deposits'
  | 'withdrawals'
  | 'exchanges'
  | 'transactions'
  | 'users'
  | 'manual'
  | 'profit'
  | 'admins';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'settings', label: 'Лимиты' },
  { id: 'rates', label: 'Курсы' },
  { id: 'pairs', label: 'Спред / комиссии' },
  { id: 'deposits', label: 'Депозиты' },
  { id: 'withdrawals', label: 'Выводы' },
  { id: 'exchanges', label: 'Обмены' },
  { id: 'transactions', label: 'Транзакции' },
  { id: 'users', label: 'Поиск' },
  { id: 'manual', label: 'Начисление' },
  { id: 'profit', label: 'Прибыль' },
  { id: 'admins', label: 'Админы' },
];

interface Props {
  onBack: () => void;
}

function fmtBal(b: WalletBalance): string {
  if (b.decimals <= 0) return String(b.available);
  return (b.available / 10 ** b.decimals).toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function AdminHubScreen({ onBack }: Props) {
  const { t } = useSettings();
  const [section, setSection] = useState<Section>('settings');
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [rates, setRates] = useState<Record<string, unknown> | null>(null);
  const [pairs, setPairs] = useState<
    {
      from: string;
      to: string;
      spreadBps: number;
      feeBps: number;
      minFromAmount: number;
      maxFromAmount: number;
      isActive: boolean;
    }[]
  >([]);
  const [deposits, setDeposits] = useState<Record<string, unknown>[]>([]);
  const [withdrawals, setWithdrawals] = useState<Record<string, unknown>[]>([]);
  const [exchanges, setExchanges] = useState<Record<string, unknown>[]>([]);
  const [ledger, setLedger] = useState<Record<string, unknown>[]>([]);
  const [users, setUsers] = useState<
    {
      userId: number;
      name: string | null;
      username: string | null;
      balances: WalletBalance[];
    }[]
  >([]);
  const [searchQ, setSearchQ] = useState('');
  const [profit, setProfit] = useState<{
    orderCount: number;
    feeTotals: Record<string, number>;
    byPair: Record<string, { count: number; feeByCurrency: Record<string, number> }>;
  } | null>(null);
  const [admins, setAdmins] = useState<{ userId: number; note: string }[]>([]);

  const [manualUserId, setManualUserId] = useState('');
  const [manualCurrency, setManualCurrency] = useState<WalletCurrency>('STARS');
  const [manualAmount, setManualAmount] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [newAdminId, setNewAdminId] = useState('');
  const [manualRateBase, setManualRateBase] = useState('TON');
  const [manualRateQuote, setManualRateQuote] = useState('USDT_TON');
  const [manualRateMid, setManualRateMid] = useState('');
  const [starsUsd, setStarsUsd] = useState('');
  const [starsManual, setStarsManual] = useState(false);

  const flash = (msg: string) => {
    setOkMsg(msg);
    setError(null);
    setTimeout(() => setOkMsg(null), 2500);
  };

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }, [t.common.error]);

  const loadSection = useCallback(
    async (s: Section) => {
      await run(async () => {
        if (s === 'settings') {
          const r = await api.adminGetSettings();
          setSettings(r.settings);
          setStarsUsd(String(r.settings.stars_usd ?? ''));
          setStarsManual(Boolean(r.settings.stars_usd_manual));
        } else if (s === 'rates') {
          setRates(await api.adminGetRates());
        } else if (s === 'pairs') {
          const r = await api.adminListPairs();
          setPairs(r.pairs);
        } else if (s === 'deposits') {
          const r = await api.adminListDeposits({ limit: 40 });
          setDeposits(r.items);
        } else if (s === 'withdrawals') {
          const r = await api.adminListWithdrawals({ limit: 40 });
          setWithdrawals(r.items);
        } else if (s === 'exchanges') {
          const r = await api.adminListExchanges({ limit: 40 });
          setExchanges(r.items);
        } else if (s === 'transactions') {
          const r = await api.adminListTransactions({ limit: 40 });
          setLedger(r.items);
        } else if (s === 'profit') {
          setProfit(await api.adminExchangeProfit());
        } else if (s === 'admins') {
          const r = await api.adminListAdmins();
          setAdmins(r.admins);
        }
      });
    },
    [run],
  );

  useEffect(() => {
    void loadSection(section);
  }, [section, loadSection]);

  const saveSettings = () =>
    run(async () => {
      const presets =
        typeof settings.withdraw_presets === 'string'
          ? JSON.parse(String(settings.withdraw_presets))
          : settings.withdraw_presets;
      const patch = {
        withdraw_min_stars: Number(settings.withdraw_min_stars),
        withdraw_presets: presets,
        deposit_min_stars: Number(settings.deposit_min_stars),
        deposit_min_ton_nanotons: Number(settings.deposit_min_ton_nanotons),
        deposit_min_usdt_micros: Number(settings.deposit_min_usdt_micros),
        exchange_quote_ttl_ms: Number(settings.exchange_quote_ttl_ms),
        rates_refresh_ms: Number(settings.rates_refresh_ms),
        stars_usd: Number(starsUsd),
        stars_usd_manual: starsManual,
      };
      const r = await api.adminPutSettings(patch);
      setSettings(r.settings);
      await api.adminSetStarsUsd(Number(starsUsd), starsManual);
      flash('Сохранено');
    });

  return (
    <div className="admin-hub">
      <button type="button" className="case-game-back" onClick={onBack}>
        ‹ {t.header.cabinet}
      </button>

      <div className="tg-section-title">{t.admin.title}</div>
      <p className="admin-hub-hint">{t.admin.hint}</p>

      <div className="admin-hub-nav">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`admin-hub-nav-btn${section === s.id ? ' admin-hub-nav-btn--on' : ''}`}
            onClick={() => setSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}
      {okMsg && <div className="admin-hub-ok">{okMsg}</div>}
      {busy && <div className="tg-section">{t.common.loading}</div>}

      {section === 'settings' && (
        <div className="tg-section admin-hub-form">
          {(
            [
              ['withdraw_min_stars', 'Мин. вывод ★'],
              ['deposit_min_stars', 'Мин. депозит ★'],
              ['deposit_min_ton_nanotons', 'Мин. депозит TON (nanoton)'],
              ['deposit_min_usdt_micros', 'Мин. депозит USDT (micros)'],
              ['exchange_quote_ttl_ms', 'TTL котировки (мс)'],
              ['rates_refresh_ms', 'Интервал курсов (мс)'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="admin-field">
              <span>{label}</span>
              <input
                className="withdraw-input"
                value={String(settings[key] ?? '')}
                onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
              />
            </label>
          ))}
          <label className="admin-field">
            <span>Пресеты вывода (JSON)</span>
            <input
              className="withdraw-input"
              value={
                typeof settings.withdraw_presets === 'string'
                  ? settings.withdraw_presets
                  : JSON.stringify(settings.withdraw_presets ?? [])
              }
              onChange={(e) => {
                try {
                  setSettings((s) => ({ ...s, withdraw_presets: JSON.parse(e.target.value) }));
                } catch {
                  setSettings((s) => ({ ...s, withdraw_presets: e.target.value }));
                }
              }}
            />
          </label>
          <label className="admin-field">
            <span>Stars / USD</span>
            <input className="withdraw-input" value={starsUsd} onChange={(e) => setStarsUsd(e.target.value)} />
          </label>
          <label className="admin-check">
            <input type="checkbox" checked={starsManual} onChange={(e) => setStarsManual(e.target.checked)} />
            Ручной Stars/USD (без oracle)
          </label>
          <button type="button" className="tg-btn" disabled={busy} onClick={saveSettings}>
            {t.admin.save}
          </button>
        </div>
      )}

      {section === 'rates' && (
        <div className="tg-section">
          <div className="admin-row-actions">
            <button
              type="button"
              className="topup-inline-btn"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api.adminRefreshRates();
                  setRates(await api.adminGetRates());
                  flash('Курсы обновлены');
                })
              }
            >
              {t.admin.refreshRates}
            </button>
          </div>
          {rates && (
            <pre className="admin-pre">{JSON.stringify(rates, null, 2)}</pre>
          )}
          <div className="admin-hub-form" style={{ marginTop: 12 }}>
            <div className="tg-section-title">Ручной mid</div>
            <label className="admin-field">
              <span>Base</span>
              <select className="wallet-ex-select" value={manualRateBase} onChange={(e) => setManualRateBase(e.target.value)}>
                {['STARS', 'TON', 'USDT_TON'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Quote</span>
              <select className="wallet-ex-select" value={manualRateQuote} onChange={(e) => setManualRateQuote(e.target.value)}>
                {['STARS', 'TON', 'USDT_TON'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Mid</span>
              <input className="withdraw-input" value={manualRateMid} onChange={(e) => setManualRateMid(e.target.value)} />
            </label>
            <button
              type="button"
              className="tg-btn"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api.adminSetManualRate(manualRateBase, manualRateQuote, Number(manualRateMid));
                  setRates(await api.adminGetRates());
                  flash('Курс записан');
                })
              }
            >
              Задать mid
            </button>
            <button
              type="button"
              className="tg-btn"
              disabled={busy}
              style={{ marginTop: 8 }}
              onClick={() =>
                run(async () => {
                  await api.adminSetStarsUsd(Number(starsUsd), starsManual);
                  flash('Stars/USD обновлён');
                })
              }
            >
              Применить Stars/USD
            </button>
          </div>
        </div>
      )}

      {section === 'pairs' && (
        <div className="tg-section">
          {pairs.map((p) => (
            <div key={`${p.from}-${p.to}`} className="admin-pair">
              <div className="admin-pair-title">
                {p.from} → {p.to} {!p.isActive && <span className="admin-off">off</span>}
              </div>
              <div className="admin-pair-grid">
                <label>
                  Spread bps
                  <input
                    className="withdraw-input"
                    defaultValue={p.spreadBps}
                    id={`sp-${p.from}-${p.to}`}
                  />
                </label>
                <label>
                  Fee bps
                  <input
                    className="withdraw-input"
                    defaultValue={p.feeBps}
                    id={`fee-${p.from}-${p.to}`}
                  />
                </label>
                <label>
                  Min
                  <input
                    className="withdraw-input"
                    defaultValue={p.minFromAmount}
                    id={`min-${p.from}-${p.to}`}
                  />
                </label>
                <label>
                  Max
                  <input
                    className="withdraw-input"
                    defaultValue={p.maxFromAmount}
                    id={`max-${p.from}-${p.to}`}
                  />
                </label>
              </div>
              <div className="admin-row-actions">
                <button
                  type="button"
                  className="topup-inline-btn"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const spreadBps = Number(
                        (document.getElementById(`sp-${p.from}-${p.to}`) as HTMLInputElement)?.value,
                      );
                      const feeBps = Number(
                        (document.getElementById(`fee-${p.from}-${p.to}`) as HTMLInputElement)?.value,
                      );
                      const minFromAmount = Number(
                        (document.getElementById(`min-${p.from}-${p.to}`) as HTMLInputElement)?.value,
                      );
                      const maxFromAmount = Number(
                        (document.getElementById(`max-${p.from}-${p.to}`) as HTMLInputElement)?.value,
                      );
                      await api.adminUpdatePair(p.from, p.to, {
                        spreadBps,
                        feeBps,
                        minFromAmount,
                        maxFromAmount,
                        isActive: true,
                      });
                      const r = await api.adminListPairs();
                      setPairs(r.pairs);
                      flash('Пара сохранена');
                    })
                  }
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  className="withdraw-inline-btn"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await api.adminUpdatePair(p.from, p.to, { isActive: !p.isActive });
                      const r = await api.adminListPairs();
                      setPairs(r.pairs);
                    })
                  }
                >
                  {p.isActive ? 'Отключить' : 'Включить'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {section === 'deposits' && (
        <div className="tg-section">
          {deposits.length === 0 ? (
            <div className="wallet-empty">Нет депозитов</div>
          ) : (
            deposits.map((d) => (
              <div key={String(d.id)} className="admin-list-row">
                <div>
                  #{String(d.id)} · uid {String(d.userId)} · {String(d.currency)} · {String(d.status)}
                </div>
                <div className="admin-list-meta">
                  {String(d.expectedAmount)} · {String(d.createdAt)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {section === 'withdrawals' && (
        <div className="tg-section">
          {withdrawals.map((w) => (
            <div key={String(w.id)} className="admin-list-row">
              <div>
                #{String(w.id)} · uid {String(w.userId)} · {String(w.amount)} ★ · {String(w.status)}
                {w.username ? ` · @${String(w.username)}` : ''}
              </div>
              {String(w.status) === 'pending' && (
                <div className="admin-row-actions">
                  <button
                    type="button"
                    className="topup-inline-btn"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await api.adminSetWithdrawStatus(Number(w.id), 'paid');
                        const r = await api.adminListWithdrawals({ limit: 40 });
                        setWithdrawals(r.items);
                        flash('Выплачено');
                      })
                    }
                  >
                    Выплачено
                  </button>
                  <button
                    type="button"
                    className="withdraw-inline-btn"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await api.adminSetWithdrawStatus(Number(w.id), 'rejected');
                        const r = await api.adminListWithdrawals({ limit: 40 });
                        setWithdrawals(r.items);
                        flash('Отклонено + возврат');
                      })
                    }
                  >
                    Отклонить
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {section === 'exchanges' && (
        <div className="tg-section">
          {exchanges.map((e) => (
            <div key={String(e.id)} className="admin-list-row">
              <div>
                #{String(e.id)} · uid {String(e.userId)} · {String(e.from)}→{String(e.to)}
              </div>
              <div className="admin-list-meta">
                {String(e.fromAmount)} → {String(e.toAmount)} · fee {String(e.feeAmount)} {String(e.feeCurrency)}
              </div>
            </div>
          ))}
        </div>
      )}

      {section === 'transactions' && (
        <div className="tg-section">
          {ledger.map((e) => (
            <div key={String(e.id)} className="admin-list-row">
              <div>
                #{String(e.id)} · uid {String(e.userId)} · {String(e.entryType)} · {String(e.direction)}{' '}
                {String(e.amount)} {String(e.currency)}
              </div>
              <div className="admin-list-meta">{String(e.createdAt)}</div>
            </div>
          ))}
        </div>
      )}

      {section === 'users' && (
        <div className="tg-section admin-hub-form">
          <label className="admin-field">
            <span>user_id / @username / имя</span>
            <input className="withdraw-input" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
          </label>
          <button
            type="button"
            className="tg-btn"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const r = await api.adminSearchUser(searchQ);
                setUsers(r.users);
              })
            }
          >
            Найти
          </button>
          {users.map((u) => (
            <div key={u.userId} className="admin-user-card">
              <div className="admin-pair-title">
                {u.userId} {u.name ?? ''} {u.username ? `@${u.username}` : ''}
              </div>
              <div className="admin-list-meta">
                {u.balances.map((b) => (
                  <span key={b.currency} style={{ marginRight: 10 }}>
                    {b.currency}: {fmtBal(b)}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="wallet-history-btn"
                onClick={() => {
                  setManualUserId(String(u.userId));
                  setSection('manual');
                }}
              >
                Начислить / списать
              </button>
            </div>
          ))}
        </div>
      )}

      {section === 'manual' && (
        <div className="tg-section admin-hub-form">
          <label className="admin-field">
            <span>User ID</span>
            <input className="withdraw-input" value={manualUserId} onChange={(e) => setManualUserId(e.target.value)} />
          </label>
          <label className="admin-field">
            <span>Валюта</span>
            <select
              className="wallet-ex-select"
              value={manualCurrency}
              onChange={(e) => setManualCurrency(e.target.value as WalletCurrency)}
            >
              {(['STARS', 'TON', 'USDT_TON'] as WalletCurrency[]).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Сумма (минорные единицы)</span>
            <input className="withdraw-input" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} />
          </label>
          <label className="admin-field">
            <span>Причина</span>
            <input className="withdraw-input" value={manualReason} onChange={(e) => setManualReason(e.target.value)} />
          </label>
          <div className="admin-row-actions">
            <button
              type="button"
              className="topup-inline-btn"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api.adminWalletCredit(
                    Number(manualUserId),
                    manualCurrency,
                    Number(manualAmount),
                    manualReason,
                  );
                  flash('Начислено');
                })
              }
            >
              Начислить
            </button>
            <button
              type="button"
              className="withdraw-inline-btn"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api.adminWalletDebit(
                    Number(manualUserId),
                    manualCurrency,
                    Number(manualAmount),
                    manualReason,
                  );
                  flash('Списано');
                })
              }
            >
              Списать
            </button>
          </div>
        </div>
      )}

      {section === 'profit' && profit && (
        <div className="tg-section">
          <div className="admin-pair-title">Ордеров: {profit.orderCount}</div>
          <div className="tg-section-title">Комиссии по валютам</div>
          {Object.entries(profit.feeTotals).map(([cur, amt]) => (
            <div key={cur} className="admin-list-row">
              {cur}: {amt}
            </div>
          ))}
          <div className="tg-section-title">По парам</div>
          {Object.entries(profit.byPair).map(([pair, info]) => (
            <div key={pair} className="admin-list-row">
              <div>
                {pair} · {info.count} шт.
              </div>
              <div className="admin-list-meta">
                {Object.entries(info.feeByCurrency)
                  .map(([c, a]) => `${c}: ${a}`)
                  .join(' · ')}
              </div>
            </div>
          ))}
        </div>
      )}

      {section === 'admins' && (
        <div className="tg-section admin-hub-form">
          <label className="admin-field">
            <span>Добавить Telegram user_id</span>
            <input className="withdraw-input" value={newAdminId} onChange={(e) => setNewAdminId(e.target.value)} />
          </label>
          <button
            type="button"
            className="tg-btn"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const r = await api.adminAddAdmin(Number(newAdminId));
                setAdmins(r.admins);
                setNewAdminId('');
                flash('Админ добавлен');
              })
            }
          >
            Добавить
          </button>
          {admins.map((a) => (
            <div key={a.userId} className="admin-list-row">
              <div>
                {a.userId} {a.note}
              </div>
              <button
                type="button"
                className="wallet-history-btn"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await api.adminRemoveAdmin(a.userId);
                    const r = await api.adminListAdmins();
                    setAdmins(r.admins);
                  })
                }
              >
                Удалить
              </button>
            </div>
          ))}
          <p className="admin-hub-hint">
            Также: TELEGRAM_ADMIN_IDS / TELEGRAM_ADMIN_CHAT_ID в env, или заголовок x-admin-secret.
          </p>
        </div>
      )}
    </div>
  );
}
