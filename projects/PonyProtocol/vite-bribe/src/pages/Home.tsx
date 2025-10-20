import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  BarChart3,
  Flame,
  GaugeCircle,
  Layers,
  ShieldCheck,
  Wallet2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type CoreFeature = {
  title: string;
  description: string;
  icon: LucideIcon;
  cta: string;
  to: string;
  variant: 'default' | 'outline' | 'secondary';
};

type WorkflowStep = {
  title: string;
  description: string;
  accent: string;
  linkLabel?: string;
  linkTo?: string;
};

type Pillar = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const CORE_FEATURES: CoreFeature[] = [
  {
    title: 'Binary markets',
    description:
      'Trade YES/NO outcome tokens with automated market making.',
    icon: Layers,
    cta: 'Browse markets',
    to: '/markets',
    variant: 'default',
  },
  {
    title: 'Liquidity provision',
    description: 'Mint 1:1 token pairs from collateral, merge to redeem.',
    icon: ShieldCheck,
    cta: 'View markets',
    to: '/markets',
    variant: 'outline',
  },
  {
    title: 'Oracle settlement',
    description: 'Automated payouts with transparent redemption.',
    icon: Flame,
    cta: 'Explore',
    to: '/markets',
    variant: 'secondary',
  },
];

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    title: 'Fund wallet',
    description:
      'Claim mock USDC from the faucet.',
    accent: 'from-sky-500 to-indigo-500',
    linkLabel: 'Visit faucet',
    linkTo: '/faucet',
  },
  {
    title: 'Browse markets',
    description:
      'Explore existing markets or create new prediction questions.',
    accent: 'from-violet-500 to-fuchsia-500',
    linkLabel: 'Go to markets',
    linkTo: '/markets',
  },
  {
    title: 'Trade positions',
    description:
      'Buy YES or NO tokens through the AMM.',
    accent: 'from-green-500 to-emerald-500',
  },
  {
    title: 'Redeem winnings',
    description:
      'Claim payouts after oracle resolution.',
    accent: 'from-orange-500 to-rose-500',
  },
];

const PILLARS: Pillar[] = [
  {
    title: 'CTF Standard',
    description: 'Composable outcome tokens for binary markets.',
    icon: BarChart3,
  },
  {
    title: 'Non-custodial',
    description: 'Full wallet control from trade to redemption.',
    icon: Wallet2,
  },
  {
    title: 'Automated AMM',
    description: 'Instant liquidity without order books.',
    icon: GaugeCircle,
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-20 px-4 pb-20 pt-16 md:px-6 lg:px-8">
        <section className="relative overflow-hidden">
          <div className="relative grid gap-12 md:grid-cols-[3fr_2fr] md:items-center md:gap-16">
            <div className="space-y-10">
              <div className="space-y-6">
                <h1 className="font-serif text-5xl font-normal leading-tight tracking-tight text-foreground md:text-7xl whitespace-nowrap">
                  PonyMarket
                </h1>
                <p className="font-serif max-w-2xl text-xl leading-relaxed text-muted-foreground md:text-2xl">
                  Trade binary outcomes with transparent settlement.
                </p>
              </div>

              <div className="flex justify-center md:justify-start">
                <Link to="/markets">
                  <Button
                    size="lg"
                    className="font-serif rounded-sm px-10 py-6 text-lg font-normal tracking-wide transition-all hover:scale-105"
                  >
                    Explore markets
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>

            </div>

            <div className="space-y-4">
              <div className="font-serif flex items-center gap-2 text-xl font-normal text-foreground">
                <ShieldCheck className="h-5 w-5 text-foreground/60" />
                How it works
              </div>
              <div className="space-y-3 text-base leading-relaxed text-muted-foreground font-serif">
                <p>• Trade YES/NO tokens via AMM</p>
                <p>• Provide liquidity with 1:1 pairs</p>
                <p>• Redeem after oracle settlement</p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-12">
          <div className="flex flex-col gap-4 text-center">
            <span className="font-serif mx-auto text-xs uppercase tracking-widest text-muted-foreground">
              Core features
            </span>
            <h2 className="font-serif text-4xl font-normal md:text-5xl">Built for prediction markets</h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {CORE_FEATURES.map((feature) => {
              const Icon = feature.icon;

              return (
                <div key={feature.title} className="flex flex-col space-y-4">
                  <div className="inline-flex h-14 w-14 items-center justify-center text-foreground/70">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-serif text-2xl font-normal">{feature.title}</h3>
                  <p className="font-serif text-base leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-12">
          <div className="flex flex-col gap-4 text-center">
            <span className="font-serif mx-auto text-xs uppercase tracking-widest text-muted-foreground">
              Getting started
            </span>
            <h2 className="font-serif text-4xl font-normal md:text-5xl">Start trading in four steps</h2>
          </div>

          <div className="relative grid gap-10 md:grid-cols-2">
            {WORKFLOW_STEPS.map((step, index) => (
              <div key={step.title} className="relative pl-20">
                <div
                  className="absolute left-8 top-0 flex h-12 w-12 items-center justify-center text-lg font-normal text-foreground/70"
                >
                  {index + 1}
                </div>

                <div className="space-y-4">
                  <h3 className="font-serif text-2xl font-normal">{step.title}</h3>
                  <p className="font-serif text-base leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-12">
          <div className="flex flex-col gap-4 text-center">
            <span className="font-serif mx-auto text-xs uppercase tracking-widest text-muted-foreground">
              Technical foundation
            </span>
            <h2 className="font-serif text-4xl font-normal md:text-5xl">Blockchain primitives</h2>
          </div>

          <div className="space-y-10">
            <div className="grid gap-10 md:grid-cols-3">
              {PILLARS.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={pillar.title}
                    className="space-y-4 text-center"
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center text-foreground/70">
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="font-serif text-xl font-normal text-foreground">{pillar.title}</h3>
                    <p className="font-serif text-base leading-relaxed text-muted-foreground">{pillar.description}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap justify-center gap-4 border-t border-border/60 pt-8 text-xs uppercase tracking-widest text-muted-foreground font-serif">
              <span>Hardhat + Viem</span>
              <span className="text-muted-foreground/40">·</span>
              <span>NestJS + Redis</span>
              <span className="text-muted-foreground/40">·</span>
              <span>React + Wagmi</span>
              <span className="text-muted-foreground/40">·</span>
              <span>ETHShanghai 2025</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
