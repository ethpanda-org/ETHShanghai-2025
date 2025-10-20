import { useStabilityFeed } from "@/hooks/useStabilityFeed";
import { StabilityTable } from "@/components/token-stability/StabilityTable";

export interface StabilityFeedProps {
  url?: string;
  intervalMs?: number;
  title?: string;
}

export function StabilityFeed({ url, intervalMs, title }: StabilityFeedProps) {
  const { data, error, loading, reload } = useStabilityFeed({ url, intervalMs });

  return (
    <section className="py-6">
      <div className="container">
        <StabilityTable
          items={data?.items ?? []}
          title={title}
          loading={loading}
          error={error}
          onRetry={error ? reload : undefined}
        />
      </div>
    </section>
  );
}
