import { useAirdropFeed } from "@/hooks/useAirdropFeed";
import { AirdropCards } from "@/components/token-airdrop/AirdropCards";

export interface AirdropFeedProps {
  url?: string;
  intervalMs?: number | null;
  title?: string;
  enabled?: boolean;
}

export function AirdropFeed({
  url,
  intervalMs,
  title,
  enabled,
}: AirdropFeedProps) {
  const { data, error, loading, reload } = useAirdropFeed({
    url,
    intervalMs,
    enabled,
  });

  return (
    <section className="py-6">
      <div className="container">
        <AirdropCards
          items={data?.airdrops ?? []}
          title={title}
          loading={loading}
          error={error}
          onRetry={reload}
        />
      </div>
    </section>
  );
}
