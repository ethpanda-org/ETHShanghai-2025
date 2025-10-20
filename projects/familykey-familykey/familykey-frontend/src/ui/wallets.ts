export type DetectedWallet = {
  id: string;
  name: string;
  provider: any;
};

function labelProvider(p: any): string {
  if (!p || typeof p !== 'object') return 'Injected Wallet';
  try {
    if (p.isMetaMask) return 'MetaMask';
    if (p.isCoinbaseWallet) return 'Coinbase Wallet';
    if (p.isBraveWallet) return 'Brave Wallet';
    if ((p.isOkxWallet || p.isOKXWallet)) return 'OKX Wallet';
    if (p.isRabby || p.__rabby) return 'Rabby Wallet';
    if (p.isBitgetWallet) return 'Bitget Wallet';
    if (p.isTokenPocket) return 'TokenPocket';
    if (p.isTrust || p.isTrustWallet) return 'Trust Wallet';
    if (p.isSafePal) return 'SafePal Wallet';
    if (p.isFrame) return 'Frame';
  } catch {}
  return 'Injected Wallet';
}

export function detectInjectedWallets(): DetectedWallet[] {
  const list: DetectedWallet[] = [];
  if (typeof window === 'undefined') return list;
  const eth: any = (window as any).ethereum;
  const candidates: any[] = [];
  if (eth && Array.isArray(eth.providers) && eth.providers.length > 0) {
    for (const p of eth.providers) {
      if (p) candidates.push(p);
    }
  } else if (eth) {
    candidates.push(eth);
  }
  const seen = new Set<any>();
  candidates.forEach((p, idx) => {
    if (!p || seen.has(p)) return;
    seen.add(p);
    const name = labelProvider(p);
    const id = `${name.toLowerCase().replace(/\s+/g, '-')}-${idx}`;
    list.push({ id, name, provider: p });
  });
  return list;
}