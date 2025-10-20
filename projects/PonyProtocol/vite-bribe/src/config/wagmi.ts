import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { hardhatLocal } from './chains';

export const config = getDefaultConfig({
  appName: 'Polymarket Bribe Protocol',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Get from https://cloud.walletconnect.com
  chains: [hardhatLocal],
  ssr: false,
});
