/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AMM_CONTRACT_ADDRESS?: string;
  readonly VITE_VAULT_CONTRACT_ADDRESS?: string;
  readonly VITE_VIEWING_KEY?: string;
  readonly VITE_PUBLIC_RPC_URL?: string;
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
  readonly VITE_STATE_SERVICE_URL?: string;
  readonly VITE_CHAIN?: string;
  readonly VITE_DISABLE_WALLETCONNECT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
