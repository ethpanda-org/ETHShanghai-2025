import { DashboardOverview } from "@/components/dashboard/overview";

export const metadata = {
  title: "ChainLex.ai — Monitoring Dashboard",
  description: "Track deployments, telemetry, and compliance throughput in one workspace.",
};

export default function DashboardPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-3xl font-semibold">Monitoring & analytics</h2>
        <p className="text-muted-foreground">
          Stay on top of on-chain events, off-chain data feeds, and compliance deliverables using the integrated Neon
          datastore.
        </p>
      </header>
      <DashboardOverview />
    </section>
  );
}
