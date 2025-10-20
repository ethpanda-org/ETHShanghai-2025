import { StabilityFeed } from "@/components/token-stability/StabilityFeed";
import { AirdropFeed } from "@/components/token-airdrop/AirdropFeed";
import { AirdropHistoryFeed } from "@/components/token-airdrop/AirdropHistoryFeed";

const HomePage = () => {
  return (
    <main className="py-12">
      {/* <div className="mx-auto max-w-4xl text-center">
        <span className="text-sm font-medium uppercase tracking-[0.3em] text-primary">
          AlphaBuilder Insights
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          实时洞察币种稳定性，助你快速做出决策
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
          通过统一的稳定性评分、价差基点和持仓周期指标，追踪主要币对的风险波动。
          所有数据自动刷新，你只需专注于策略执行。
        </p>
      </div> */}

      <div className="space-y-12">
        <StabilityFeed />
        <AirdropFeed />
        <AirdropHistoryFeed />
      </div>
    </main>
  );
};

export default HomePage;
