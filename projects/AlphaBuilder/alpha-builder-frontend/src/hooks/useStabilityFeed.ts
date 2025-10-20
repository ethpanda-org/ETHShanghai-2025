import { usePollingFetch } from "@/hooks/usePollingFetch";

export interface StabilityItem {
  n: string; // name/symbol
  p: number | string; // price
  spr: number | string; // spread in bps
  md: number | string; // days metric
  st: string; // status e.g. 'green', 'yellow', 'red'
}

export interface StabilityFeedData {
  items: StabilityItem[];
}

interface UseStabilityFeedOptions {
  url?: string;
  intervalMs?: number;
}

export function useStabilityFeed(options: UseStabilityFeedOptions = {}) {
  const { url = '/api/stability/stability_feed_v2.json', intervalMs = 7000 } = options;

  return usePollingFetch<StabilityFeedData>({
    url,
    intervalMs,
    parse: async (response) => {
      const json = (await response.json()) as StabilityFeedData;
      const order = { green: 0, yellow: 1, red: 2 };
      const sortedItems = [...(json.items ?? [])].sort((a, b) => {
        const colorA = a.st?.split(":")[0] || "";
        const colorB = b.st?.split(":")[0] || "";
        return (
          (order[colorA as keyof typeof order] ?? 99) -
          (order[colorB as keyof typeof order] ?? 99)
        );
      });
      return { ...json, items: sortedItems };
    },
  });
}
