import { Haptics } from '../../core/Haptics';
import type { GameTransport } from '../transport/GameTransport';
import type {
  ActiveBet,
  BalanceSnapshot,
  HistoryEntry,
  RoundSnapshot,
  TransportConfig,
  TransportEvent,
} from '../transport/types';
import { RoundPhase } from '../transport/types';
import { Quality } from '../config/quality';
import type { AviatorSound } from '../audio/AviatorSound';
import type { AviatorStrings } from '../strings';
import { currencyIconHtml, currencyLabel } from './currency';
import './aviator-ui.css';

/**
 * DOM betting shell layered over the Phaser canvas.
 * Mobile cycle: the panel is visible during the betting window, slides away on
 * takeoff and is replaced by a full-width Cash Out button.
 */
export class BetPanel {
  private root: HTMLElement;
  private config: TransportConfig;
  private amount: number;
  private autoCashoutEnabled = false;
  private autoCashoutValue = 2;
  private currency: string;
  private balance: BalanceSnapshot;
  private round: RoundSnapshot | null = null;
  private bet: ActiveBet | null = null;
  private history: HistoryEntry[] = [];
  private unsub: (() => void) | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private mobileCycle = Quality.isMobile;

  constructor(
    host: HTMLElement,
    private transport: GameTransport,
    private sound: AviatorSound,
    private strings: AviatorStrings,
  ) {
    this.config = transport.getConfig();
    this.balance = transport.getBalance();
    this.currency = this.config.currencies[0] ?? this.config.balanceCurrency;
    this.amount = this.defaultAmount();

    this.root = document.createElement('div');
    this.root.className = 'av-ui';
    if (this.mobileCycle) this.root.classList.add('av-ui--mobile');
    host.appendChild(this.root);

    this.render();
    this.unsub = transport.subscribe((e) => this.onEvent(e));
  }

  destroy(): void {
    this.unsub?.();
    this.unsub = null;
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    this.root.remove();
  }

  /** Host may swap the selected wager currency from outside (shared preference). */
  setCurrency(code: string): void {
    if (this.currencyLocked() || code === this.currency) return;
    this.currency = code;
    this.patchCurrencyChips();
    this.patchPayout();
  }

  private onEvent(event: TransportEvent): void {
    switch (event.type) {
      case 'balance_update':
        this.balance = event.balance;
        this.patchBalance();
        break;
      case 'round_update':
        this.round = event.round;
        this.patchRound();
        this.patchActions();
        this.patchPayout();
        this.patchDockVisibility();
        break;
      case 'bet_accepted':
        this.bet = event.bet;
        this.balance = event.balance;
        this.sound.play('bet');
        this.showToast(this.strings.betPlaced, 'ok');
        this.patchBalance();
        this.patchActions();
        this.patchPayout();
        this.patchDockVisibility();
        break;
      case 'bet_rejected':
        this.showToast(event.reason, 'err');
        this.sound.play('click');
        Haptics.notify('warning');
        break;
      case 'cashout_result':
        this.bet = event.bet;
        this.balance = event.balance;
        if (event.bet.status === 'cashed_out') {
          this.sound.play('cashout');
          this.showToast(
            this.strings.cashedOutAt.replace(
              '{mult}',
              `${event.bet.cashoutMultiplier?.toFixed(2) ?? '—'}×`,
            ),
            'ok',
          );
        } else if (event.bet.status === 'lost') {
          const crash = this.round ? `${this.round.multiplier.toFixed(2)}×` : '—';
          this.showToast(this.strings.betLost.replace('{mult}', crash), 'err');
        }
        this.patchBalance();
        this.patchActions();
        this.patchPayout();
        this.patchDockVisibility();
        break;
      case 'history_update':
        this.history = event.history;
        this.patchHistory();
        break;
    }
  }

  private defaultAmount(): number {
    const presets = this.config.allowedBets;
    if (presets.length > 0) {
      return presets.includes(10) ? 10 : presets[Math.min(2, presets.length - 1)]!;
    }
    return Math.max(this.config.minBet, Math.min(this.config.maxBet, 10));
  }

  /** Snap to the nearest allowed stake — the server rejects anything else. */
  private clampAmount(n: number): number {
    if (!Number.isFinite(n)) return this.defaultAmount();
    const presets = this.config.allowedBets;
    if (presets.length > 0) {
      return presets.reduce((best, v) => (Math.abs(v - n) < Math.abs(best - n) ? v : best), presets[0]!);
    }
    return Math.max(this.config.minBet, Math.min(this.config.maxBet, Math.round(n)));
  }

  private stepAmount(dir: number): number {
    const presets = this.config.allowedBets;
    if (presets.length > 0) {
      const sorted = [...presets].sort((a, b) => a - b);
      const i = sorted.indexOf(this.clampAmount(this.amount));
      return sorted[Math.max(0, Math.min(sorted.length - 1, i + dir))]!;
    }
    const step = this.amount >= 100 ? 50 : this.amount >= 25 ? 25 : 5;
    return this.clampAmount(this.amount + dir * step);
  }

  private isBettingWindow(): boolean {
    const phase = this.round?.phase;
    return (
      phase === RoundPhase.IDLE ||
      phase === RoundPhase.COUNTDOWN ||
      phase === RoundPhase.NEXT_ROUND ||
      phase === undefined
    );
  }

  private canBet(): boolean {
    return this.isBettingWindow();
  }

  private canCashout(): boolean {
    return (
      this.round?.phase === RoundPhase.FLIGHT &&
      !!this.bet &&
      !this.bet.cashedOut &&
      (this.bet.status === 'active' || this.bet.status === 'pending')
    );
  }

  private currencyLocked(): boolean {
    return (
      !!this.bet &&
      (this.bet.status === 'pending' || this.bet.status === 'active') &&
      !this.bet.cashedOut
    );
  }

  private render(): void {
    const s = this.strings;
    const currencyRow =
      this.config.currencies.length > 1
        ? `
          <div class="av-currency">
            <span class="av-currency-label">${escapeHtml(s.betCurrency)}</span>
            <div class="av-currency-row" data-currency-row>
              ${this.config.currencies
                .map(
                  (c) => `
                <button type="button" class="av-currency-chip" data-currency="${escapeHtml(c)}">
                  ${currencyIconHtml(c, 14)}
                  <span>${escapeHtml(currencyLabel(c))}</span>
                </button>`,
                )
                .join('')}
            </div>
          </div>`
        : '';

    const presets =
      this.config.allowedBets.length > 0
        ? `<div class="av-presets" data-presets>
            ${this.config.allowedBets
              .map((p) => `<button type="button" data-preset="${p}">${p}</button>`)
              .join('')}
          </div>`
        : '';

    this.root.innerHTML = `
      <header class="av-topbar">
        <div class="av-topbar-right">
          <div class="av-history" data-history></div>
          <button class="av-icon-btn" data-sound type="button" title="${escapeHtml(s.sound)}" aria-label="${escapeHtml(s.sound)}">♪</button>
          <div class="av-balance-chip">
            <span class="av-balance-label">${escapeHtml(s.balance)}</span>
            <span class="av-balance-value" data-balance></span>
          </div>
        </div>
      </header>

      <div class="av-toast" data-toast hidden></div>

      <div class="av-wait-banner" data-wait-banner hidden>
        <span data-wait-label>${escapeHtml(s.nextRound)}</span>
        <strong data-wait-sec>—</strong>
      </div>

      <aside class="av-dock" data-bet-dock>
        <div class="av-card">
          <div class="av-card-head">
            <h2>${escapeHtml(s.placeBet)}</h2>
            <span class="av-phase-pill" data-phase>${escapeHtml(s.wait)}</span>
          </div>

          <div class="av-wait-meter">
            <div class="av-wait-meter-fill" data-wait-fill></div>
            <span class="av-wait-meter-text" data-wait-text></span>
          </div>

          ${currencyRow}

          <label class="av-field">
            <span>${escapeHtml(s.amount)}</span>
            <div class="av-amount-row">
              <button type="button" data-adj="-1" class="av-adj" aria-label="-">−</button>
              <input data-amount type="number" inputmode="numeric" min="${this.config.minBet}" max="${this.config.maxBet}" value="${this.amount}" />
              <button type="button" data-adj="1" class="av-adj" aria-label="+">+</button>
            </div>
          </label>

          ${presets}

          <label class="av-auto-row">
            <input data-auto-toggle type="checkbox" />
            <span>${escapeHtml(s.autoCashout)}</span>
            <input data-auto-value type="number" inputmode="decimal" min="1.01" step="0.1" value="${this.autoCashoutValue}" disabled />
            <span class="av-x">×</span>
          </label>

          <div class="av-payout-row">
            <div>
              <span class="av-muted">${escapeHtml(s.potential)}</span>
              <strong data-potential>—</strong>
            </div>
            <div>
              <span class="av-muted">${escapeHtml(s.live)}</span>
              <strong data-live-mult>1.00×</strong>
            </div>
          </div>

          <div class="av-actions">
            <button type="button" class="av-btn av-btn--bet" data-bet>${escapeHtml(s.bet)}</button>
            <button type="button" class="av-btn av-btn--cashout" data-cashout disabled>${escapeHtml(s.cashOut)}</button>
          </div>
        </div>
      </aside>

      <div class="av-flight-cashout" data-flight-cashout hidden>
        <button type="button" class="av-btn av-btn--cashout av-flight-cashout-btn" data-cashout-float disabled>${escapeHtml(s.cashOut)}</button>
      </div>
    `;

    this.bind();
    this.patchBalance();
    this.patchCurrencyChips();
    this.patchRound();
    this.patchActions();
    this.patchPayout();
    this.patchHistory();
    this.patchSoundBtn();
    this.patchDockVisibility();
  }

  private bind(): void {
    this.root.querySelector<HTMLButtonElement>('[data-sound]')?.addEventListener('click', () => {
      this.sound.unlock();
      this.sound.setEnabled(!this.sound.isEnabled());
      this.sound.play('click');
      this.patchSoundBtn();
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-currency]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.currencyLocked()) return;
        const code = btn.dataset.currency ?? this.currency;
        this.sound.unlock();
        this.sound.play('click');
        Haptics.selection();
        this.currency = code;
        this.transport.setCurrency?.(code);
        this.patchCurrencyChips();
        this.patchPayout();
      });
    });

    const amountInput = this.root.querySelector<HTMLInputElement>('[data-amount]');
    const syncAmount = () => {
      if (amountInput) amountInput.value = String(this.amount);
      this.patchPayout();
      this.patchPresets();
    };

    amountInput?.addEventListener('change', () => {
      this.amount = this.clampAmount(Number(amountInput.value));
      syncAmount();
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-adj]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.sound.unlock();
        this.sound.play('click');
        Haptics.selection();
        this.amount = this.stepAmount(Number(btn.dataset.adj));
        syncAmount();
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.sound.unlock();
        this.sound.play('click');
        Haptics.selection();
        this.amount = this.clampAmount(Number(btn.dataset.preset));
        syncAmount();
      });
    });

    const autoToggle = this.root.querySelector<HTMLInputElement>('[data-auto-toggle]');
    const autoValue = this.root.querySelector<HTMLInputElement>('[data-auto-value]');
    autoToggle?.addEventListener('change', () => {
      this.autoCashoutEnabled = !!autoToggle.checked;
      if (autoValue) autoValue.disabled = !this.autoCashoutEnabled;
      this.sound.play('click');
    });
    autoValue?.addEventListener('change', () => {
      this.autoCashoutValue = Math.max(1.01, Number(autoValue.value) || 2);
      autoValue.value = String(this.autoCashoutValue);
    });

    const placeBet = () => {
      this.sound.unlock();
      Haptics.impact('medium');
      void this.transport.placeBet({
        amount: this.amount,
        autoCashout: this.autoCashoutEnabled ? this.autoCashoutValue : null,
        currency: this.currency,
      });
    };

    const doCashout = () => {
      this.sound.unlock();
      const id = this.bet?.betId;
      if (!id) return;
      Haptics.impact('heavy');
      void this.transport.cashout({ betId: id });
    };

    this.root.querySelector<HTMLButtonElement>('[data-bet]')?.addEventListener('click', placeBet);
    this.root.querySelector<HTMLButtonElement>('[data-cashout]')?.addEventListener('click', doCashout);
    this.root
      .querySelector<HTMLButtonElement>('[data-cashout-float]')
      ?.addEventListener('click', doCashout);

    this.patchPresets();
  }

  private patchBalance(): void {
    const el = this.root.querySelector('[data-balance]');
    if (!el) return;
    el.innerHTML = `${currencyIconHtml(this.balance.currency, 13)}<span>${formatMoney(this.balance.balance)}</span>`;
  }

  private patchCurrencyChips(): void {
    const locked = this.currencyLocked();
    this.root.querySelectorAll<HTMLButtonElement>('[data-currency]').forEach((btn) => {
      btn.classList.toggle('is-on', btn.dataset.currency === this.currency);
      btn.disabled = locked;
    });
  }

  private patchPresets(): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((btn) => {
      btn.classList.toggle('is-on', Number(btn.dataset.preset) === this.amount);
    });
  }

  private patchRound(): void {
    const phaseEl = this.root.querySelector('[data-phase]');
    const live = this.root.querySelector('[data-live-mult]');
    const waitText = this.root.querySelector('[data-wait-text]');
    const waitFill = this.root.querySelector<HTMLElement>('[data-wait-fill]');
    const waitBanner = this.root.querySelector<HTMLElement>('[data-wait-banner]');
    const waitSec = this.root.querySelector('[data-wait-sec]');
    const waitLabel = this.root.querySelector('[data-wait-label]');

    if (!this.round) return;
    const total = Math.max(1, this.config.countdownSeconds);

    if (this.round.phase === RoundPhase.COUNTDOWN) {
      const sec = Math.max(0, Math.ceil(this.round.countdown));
      const pct = Math.max(0, Math.min(100, (this.round.countdown / total) * 100));
      if (phaseEl) phaseEl.textContent = `${sec}s`;
      if (waitText) waitText.textContent = `${this.strings.bettingOpen} · ${sec}s`;
      if (waitFill) waitFill.style.width = `${pct}%`;
      if (waitBanner) {
        waitBanner.hidden = false;
        if (waitSec) waitSec.textContent = `${sec}`;
        if (waitLabel) waitLabel.textContent = this.strings.startingIn;
      }
    } else if (this.isBettingWindow()) {
      if (phaseEl) phaseEl.textContent = this.strings.wait;
      if (waitText) waitText.textContent = this.strings.nextRound;
      if (waitFill) waitFill.style.width = '100%';
      if (waitBanner) waitBanner.hidden = true;
    } else {
      if (phaseEl) phaseEl.textContent = this.round.phase;
      if (waitBanner) waitBanner.hidden = true;
    }

    if (live) live.textContent = `${this.round.multiplier.toFixed(2)}×`;
  }

  private patchDockVisibility(): void {
    const dock = this.root.querySelector<HTMLElement>('[data-bet-dock]');
    const floatWrap = this.root.querySelector<HTMLElement>('[data-flight-cashout]');
    if (!dock) return;

    if (!this.mobileCycle) {
      dock.classList.remove('is-hidden');
      if (floatWrap) floatWrap.hidden = true;
      return;
    }

    dock.classList.toggle('is-hidden', !this.isBettingWindow());

    if (floatWrap) {
      const showFloat = this.canCashout();
      floatWrap.hidden = !showFloat;
      floatWrap.classList.toggle('is-visible', showFloat);
    }
  }

  private patchPayout(): void {
    const pot = this.root.querySelector('[data-potential]');
    if (!pot) return;
    const mult = this.round?.phase === RoundPhase.FLIGHT ? this.round.multiplier : 1;
    pot.innerHTML = `${currencyIconHtml(this.currency, 12)}<span>${formatMoney(this.amount * mult)}</span>`;
  }

  private patchActions(): void {
    const betBtn = this.root.querySelector<HTMLButtonElement>('[data-bet]');
    const cashBtn = this.root.querySelector<HTMLButtonElement>('[data-cashout]');
    const floatBtn = this.root.querySelector<HTMLButtonElement>('[data-cashout-float]');

    if (betBtn) {
      const busy = this.currencyLocked();
      betBtn.disabled = !this.canBet() || busy;
      betBtn.textContent = busy ? this.strings.betLocked : this.strings.bet;
    }

    const cashLabel =
      this.canCashout() && this.round
        ? `${this.strings.cashOut} ${formatMoney(this.bet!.amount * this.round.multiplier)}`
        : this.strings.cashOut;

    if (cashBtn) {
      cashBtn.disabled = !this.canCashout();
      cashBtn.textContent = cashLabel;
    }
    if (floatBtn) {
      floatBtn.disabled = !this.canCashout();
      floatBtn.textContent = cashLabel;
    }
    this.patchCurrencyChips();
  }

  private patchHistory(): void {
    const el = this.root.querySelector('[data-history]');
    if (!el) return;
    el.innerHTML = this.history
      .slice(0, 10)
      .map((h) => {
        const cls = h.crashAt >= 10 ? 'is-hot' : h.crashAt >= 2 ? 'is-warm' : 'is-cold';
        return `<span class="av-hist ${cls}">${h.crashAt.toFixed(2)}×</span>`;
      })
      .join('');
  }

  private patchSoundBtn(): void {
    const btn = this.root.querySelector<HTMLButtonElement>('[data-sound]');
    btn?.classList.toggle('is-off', !this.sound.isEnabled());
  }

  private showToast(msg: string, kind: 'ok' | 'err'): void {
    const el = this.root.querySelector<HTMLElement>('[data-toast]');
    if (!el) return;
    el.hidden = false;
    el.textContent = msg;
    el.className = `av-toast is-${kind}`;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      el.hidden = true;
      this.toastTimer = null;
    }, 2200);
  }
}

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
