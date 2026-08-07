/**
 * EVM login helpers: injected wallet (MetaMask) or WalletConnect v2 modal.
 */

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  disconnect?: () => Promise<void>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider & {
      providers?: EthereumProvider[];
      isMetaMask?: boolean;
    };
  }
}

function pickInjected(): EthereumProvider | null {
  const eth = window.ethereum;
  if (!eth) return null;
  if (Array.isArray(eth.providers) && eth.providers.length) {
    return eth.providers.find((p) => (p as { isMetaMask?: boolean }).isMetaMask) ?? eth.providers[0];
  }
  return eth;
}

async function connectInjected(): Promise<{ address: string; provider: EthereumProvider }> {
  const provider = pickInjected();
  if (!provider) throw new Error('NO_INJECTED');
  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
  const address = String(accounts?.[0] ?? '');
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error('bad address');
  return { address, provider };
}

async function connectWalletConnect(
  projectId: string,
): Promise<{ address: string; provider: EthereumProvider; cleanup: () => Promise<void> }> {
  const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
  const wc = await EthereumProvider.init({
    projectId,
    showQrModal: true,
    optionalChains: [1, 56, 137, 42161, 10, 8453],
    rpcMap: {
      1: 'https://cloudflare-eth.com',
      56: 'https://bsc-dataseed.binance.org',
      137: 'https://polygon-rpc.com',
      42161: 'https://arb1.arbitrum.io/rpc',
      10: 'https://mainnet.optimism.io',
      8453: 'https://mainnet.base.org',
    },
    metadata: {
      name: 'Metaluck',
      description: 'Metaluck wallet sign-in',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://metaluck-eight.vercel.app',
      icons: [
        typeof window !== 'undefined'
          ? `${window.location.origin}/metaluck-mark.png`
          : 'https://metaluck-eight.vercel.app/metaluck-mark.png',
      ],
    },
  });
  await wc.enable();
  const accounts = wc.accounts ?? [];
  const address = String(accounts[0] ?? '');
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    await wc.disconnect().catch(() => {});
    throw new Error('bad address');
  }
  return {
    address,
    provider: wc as unknown as EthereumProvider,
    cleanup: async () => {
      await wc.disconnect().catch(() => {});
    },
  };
}

export async function connectEvmWallet(opts: {
  projectId?: string | null;
}): Promise<{
  address: string;
  signMessage: (message: string) => Promise<string>;
  cleanup: () => Promise<void>;
}> {
  let address: string;
  let provider: EthereumProvider;
  let cleanup: () => Promise<void> = async () => {};

  const injected = pickInjected();
  if (injected) {
    const r = await connectInjected();
    address = r.address;
    provider = r.provider;
  } else if (opts.projectId) {
    const r = await connectWalletConnect(opts.projectId);
    address = r.address;
    provider = r.provider;
    cleanup = r.cleanup;
  } else {
    throw new Error('NO_WALLET');
  }

  return {
    address,
    cleanup,
    signMessage: async (message: string) => {
      const sig = await provider.request({
        method: 'personal_sign',
        params: [message, address],
      });
      return String(sig);
    },
  };
}
