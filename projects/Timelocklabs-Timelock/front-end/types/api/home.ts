
interface RawTx {
    chain_id: number;
    contract_address: string;
    queue_tx_hash: string;
    created_at: string;
    eta: string;
    expired_at: string;
    status: string;
    chain_name: string;
  }
  
  interface PendingTx {
    id: string;
    chain_id: number;
    contract_address: string;
    queue_tx_hash: string;
    created_at: string;
    eta: string;
    expired_at: string;
    status: string;
    chain_name: string;
    chainIcon: React.ReactNode;
  }
  
  export type { RawTx, PendingTx};