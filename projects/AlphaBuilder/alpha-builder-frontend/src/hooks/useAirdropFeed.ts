import { usePollingFetch } from "@/hooks/usePollingFetch";

export interface AirdropItem {
  token: string; // token symbol, e.g. "MERL"
  date: string; // local date string reported by the feed
  time?: string; // local time string (can be empty)
  points?: number | string; // reward points or score tied to the event
  type?: string; // type of distribution ("grab", etc.)
  phase?: number; // campaign phase number
  language?: string; // language code of the source entry
  status?: string; // status flag (announced, ongoing, etc.)
  amount?: string; // advertised token amount
  name?: string; // project or token full name
  created_timestamp?: number; // source creation timestamp (seconds)
  updated_timestamp?: number; // last update timestamp (seconds)
  system_timestamp?: number; // ingestion timestamp inside the system
  completed?: boolean; // whether the event is marked completed
  has_homonym?: boolean; // true if another project shares the name
  futures_listed?: boolean; // futures listing availability flag
  spot_listed?: boolean; // spot listing availability flag
  contract_address?: string; // on-chain contract address if provided
  chain_id?: string; // chain identifier string (e.g. "56")
  utc?: string; // UTC time representation when supplied
  market_cap?: number | string; // latest market cap snapshot if provided
  fdv?: number | string; // fully diluted valuation snapshot if provided
}

export interface AirdropFeedData {
  airdrops: AirdropItem[];
}

interface UseAirdropFeedOptions {
  url?: string;
  intervalMs?: number | null;
  enabled?: boolean;
}

const DEFAULT_AIRDROP_URL = import.meta.env.DEV
  ? "/api/data?fresh=1"
  : "https://alpha123.uk/api/data?fresh=1";

export function useAirdropFeed(options: UseAirdropFeedOptions = {}) {
  const {
    url = DEFAULT_AIRDROP_URL,
    intervalMs = null,
    enabled = true,
  } = options;

  return usePollingFetch<AirdropFeedData>({
    url,
    intervalMs,
    enabled,
    parse: async (response) => {
      const json = (await response.json()) as Partial<AirdropFeedData>;
      const source = Array.isArray(json.airdrops) ? json.airdrops : [];

      const airdrops = [...source].sort((a, b) => {
        const dateA = a?.date ? new Date(a.date).getTime() : 0;
        const dateB = b?.date ? new Date(b.date).getTime() : 0;

        if (dateA !== dateB) return dateA - dateB;

        const timeA =
          a?.updated_timestamp ?? a?.system_timestamp ?? a?.created_timestamp ?? 0;
        const timeB =
          b?.updated_timestamp ?? b?.system_timestamp ?? b?.created_timestamp ?? 0;

        return timeA - timeB;
      });

      return { airdrops };
    },
  });
}
