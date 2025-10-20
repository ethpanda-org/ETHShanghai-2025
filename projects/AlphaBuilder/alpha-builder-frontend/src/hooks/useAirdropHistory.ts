import { usePollingFetch } from "@/hooks/usePollingFetch";

export interface AirdropHistoryItem {
  token: string;
  name?: string;
  date?: string;
  time?: string;
  points?: number | string;
  amount?: number | string;
  type?: string;
  phase?: number;
  status?: string;
  system_timestamp?: number;
  completed?: boolean;
  contract_address?: string;
  chain_id?: string;
  spot_listed?: boolean;
  futures_listed?: boolean;
  market_cap?: number;
  fdv?: number;
}

export interface AirdropHistoryResponse {
  airdrops: AirdropHistoryItem[];
}

interface UseAirdropHistoryOptions {
  url?: string;
  intervalMs?: number | null;
  enabled?: boolean;
}

const DEFAULT_HISTORY_URL = import.meta.env.DEV
  ? "/api/historydata"
  : "https://alpha123.uk/api/historydata";

export function useAirdropHistory(options: UseAirdropHistoryOptions = {}) {
  const {
    url = DEFAULT_HISTORY_URL,
    intervalMs = null,
    enabled = true,
  } = options;

  return usePollingFetch<AirdropHistoryResponse>({
    url,
    intervalMs,
    enabled,
    parse: async (response) => {
      const json = (await response.json()) as Partial<AirdropHistoryResponse>;
      const source = Array.isArray(json.airdrops) ? json.airdrops : [];

      const sorted = [...source].sort((a, b) => {
        const timeA = a?.system_timestamp ?? 0;
        const timeB = b?.system_timestamp ?? 0;
        return timeB - timeA;
      });

      return { airdrops: sorted };
    },
  });
}
