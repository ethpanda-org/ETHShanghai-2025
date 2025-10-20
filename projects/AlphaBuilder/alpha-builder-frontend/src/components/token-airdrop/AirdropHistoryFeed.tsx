import { useAirdropHistory } from "@/hooks/useAirdropHistory";
import { AirdropHistoryTable } from "@/components/token-airdrop/AirdropHistoryTable";

interface AirdropHistoryFeedProps {
  url?: string;
  intervalMs?: number | null;
  enabled?: boolean;
  title?: string;
}

export function AirdropHistoryFeed({
  url,
  intervalMs,
  enabled,
  title,
}: AirdropHistoryFeedProps) {
  const { data, error, loading, reload } = useAirdropHistory({
    url,
    intervalMs,
    enabled,
  });

  return (
    <section className="py-6">
      <div className="container">
        <AirdropHistoryTable
          items={data?.airdrops ?? []}
          loading={loading}
          error={error}
          onRetry={reload}
          title={title}
        />
      </div>
    </section>
  );
}
