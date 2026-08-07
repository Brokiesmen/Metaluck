import { useCallback, useEffect, useRef, useState } from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { api, type LinkedWalletView } from '../api';

/**
 * Привязка внешнего кошелька к текущему аккаунту (НЕ вход).
 * TON — через TON Connect ton_proof. EVM — за WalletConnect projectId (скоро).
 */
export function WalletLinkPanel() {
  const [tonConnectUI] = useTonConnectUI();
  const [wallets, setWallets] = useState<LinkedWalletView[]>([]);
  const [evmEnabled, setEvmEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const linkingRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const r = await api.walletLinkList();
      setWallets(r.wallets);
      setEvmEnabled(r.evmEnabled);
    } catch {
      /* not logged in / no table yet */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Кошелёк подключился с ton_proof → отправляем на бэкенд для привязки.
  useEffect(() => {
    return tonConnectUI.onStatusChange(async (w) => {
      if (!w || !linkingRef.current) return;
      const proofItem = w.connectItems?.tonProof;
      if (!proofItem || !('proof' in proofItem)) return;
      linkingRef.current = false;
      setBusy(true);
      setErr(null);
      try {
        await api.walletLinkTon({
          address: w.account.address,
          network: w.account.chain,
          publicKey: w.account.publicKey,
          proof: proofItem.proof,
        });
        await refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Не удалось привязать TON-кошелёк');
      } finally {
        setBusy(false);
        // Нам нужна была только подпись — отключаемся.
        void tonConnectUI.disconnect().catch(() => {});
      }
    });
  }, [tonConnectUI, refresh]);

  const connectTon = async () => {
    setErr(null);
    try {
      tonConnectUI.setConnectRequestParameters({ state: 'loading' });
      const { nonce } = await api.walletLinkChallenge('ton');
      tonConnectUI.setConnectRequestParameters({ state: 'ready', value: { tonProof: nonce } });
      linkingRef.current = true;
      if (tonConnectUI.connected) await tonConnectUI.disconnect();
      await tonConnectUI.openModal();
    } catch (e) {
      linkingRef.current = false;
      tonConnectUI.setConnectRequestParameters(null);
      setErr(e instanceof Error ? e.message : 'Не удалось начать подключение');
    }
  };

  const unlink = async (id: number) => {
    setErr(null);
    setBusy(true);
    try {
      await api.walletUnlink(id);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не удалось отвязать');
    } finally {
      setBusy(false);
    }
  };

  const shorten = (a: string) => (a.length > 16 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
  const tonLinked = wallets.find((w) => w.chain === 'ton');
  const evmLinked = wallets.find((w) => w.chain === 'evm');

  return (
    <div className="wallet-link">
      <h3 className="wallet-link-title">Привязанные кошельки</h3>

      {/* TON */}
      <div className="wallet-link-row">
        <div className="wallet-link-info">
          <div className="wallet-link-chain">TON Connect</div>
          {tonLinked ? (
            <div className="wallet-link-addr" title={tonLinked.address}>
              {shorten(tonLinked.address)}
            </div>
          ) : (
            <div className="wallet-link-addr wallet-link-addr--muted">не привязан</div>
          )}
        </div>
        {tonLinked ? (
          <button className="wallet-link-btn wallet-link-btn--ghost" disabled={busy} onClick={() => void unlink(tonLinked.id)}>
            Отвязать
          </button>
        ) : (
          <button className="wallet-link-btn" disabled={busy} onClick={() => void connectTon()}>
            Подключить
          </button>
        )}
      </div>

      {/* EVM */}
      <div className="wallet-link-row">
        <div className="wallet-link-info">
          <div className="wallet-link-chain">EVM (WalletConnect)</div>
          {evmLinked ? (
            <div className="wallet-link-addr" title={evmLinked.address}>
              {shorten(evmLinked.address)}
            </div>
          ) : (
            <div className="wallet-link-addr wallet-link-addr--muted">
              {evmEnabled ? 'не привязан' : 'скоро'}
            </div>
          )}
        </div>
        {evmLinked ? (
          <button className="wallet-link-btn wallet-link-btn--ghost" disabled={busy} onClick={() => void unlink(evmLinked.id)}>
            Отвязать
          </button>
        ) : (
          <button className="wallet-link-btn" disabled title={evmEnabled ? '' : 'Требуется WalletConnect projectId'}>
            {evmEnabled ? 'Подключить' : 'Недоступно'}
          </button>
        )}
      </div>

      {busy && <div className="wallet-link-status">Обработка…</div>}
      {err && <div className="wallet-link-error" role="alert">{err}</div>}
    </div>
  );
}
