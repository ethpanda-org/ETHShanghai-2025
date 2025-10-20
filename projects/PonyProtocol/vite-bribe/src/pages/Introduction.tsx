export default function Introduction() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-transparent" />
        <div className="container mx-auto px-6 py-24 max-w-7xl relative">
          <div className="text-center space-y-8 mb-20">
            <h1 className="text-7xl md:text-8xl font-serif font-light tracking-tight">
              <span className="block text-slate-900 dark:text-slate-100">Ponymarket</span>
            </h1>
            <p className="text-2xl md:text-3xl font-serif text-slate-600 dark:text-slate-400 font-light tracking-wide max-w-3xl mx-auto leading-relaxed">
              An Incentive Layer for Prediction Markets
            </p>
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-slate-300 to-transparent mx-auto" />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-6 max-w-6xl pb-24">
        <div className="space-y-32">
          {/* Section 1 */}
          <section className="space-y-8">
            <div className="space-y-4">
              <div className="inline-block">
                <span className="text-6xl opacity-20">01</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-serif font-light text-slate-900 dark:text-slate-100 leading-tight">
                The Essence of Polymarket
              </h2>
              <div className="h-px w-16 bg-slate-300 dark:bg-slate-700" />
            </div>
            <div className="prose prose-xl max-w-none font-serif text-slate-700 dark:text-slate-300 leading-relaxed space-y-6">
              <p className="text-lg md:text-xl leading-loose">
                Polymarket aims to price the probability of future events. For example, if an event has an 80% chance
                of occurring, it yields a payoff of <em>N</em>, while the remaining 20% chance yields a payoff of <em>M</em>.
                The expected market return is therefore <span className="font-mono text-base bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded">0.8N + 0.2M</span>.
              </p>
              <p className="text-lg md:text-xl leading-loose">
                In this process, the "probability" is often implicit. The multi-market mechanism attempts to make
                probabilities explicit through trading activities.
              </p>
              <p className="text-lg md:text-xl leading-loose">
                However, during market operation, a series of problems arise — the most obvious being the{" "}
                <strong className="font-semibold text-slate-900 dark:text-slate-100">interference effect in multi-polar markets</strong>.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-8">
            <div className="space-y-4">
              <div className="inline-block">
                <span className="text-6xl opacity-20">02</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-serif font-light text-slate-900 dark:text-slate-100 leading-tight">
                The U.S. Election Exposed<br />the Weakness
              </h2>
              <div className="h-px w-16 bg-slate-300 dark:bg-slate-700" />
            </div>
            <div className="prose prose-xl max-w-none font-serif text-slate-700 dark:text-slate-300 leading-relaxed space-y-6">
              <p className="text-lg md:text-xl leading-loose">
                During the U.S. election, the media heavily cited Polymarket data to suggest that Trump had a higher
                chance of winning.
              </p>
              <p className="text-lg md:text-xl leading-loose">
                In this process, Polymarket data directly influenced voters' perceptions. When the act of pricing
                probability coexists with interference on that probability, the market is no longer pricing pure
                "probability." Instead, it is pricing{" "}
                <strong className="font-semibold text-slate-900 dark:text-slate-100">"probability + influence"</strong>.
              </p>
              <div className="my-12 pl-8 border-l-2 border-primary/40 bg-gradient-to-r from-primary/5 to-transparent py-6 pr-6">
                <p className="text-xl md:text-2xl font-serif italic text-slate-800 dark:text-slate-200 leading-relaxed">
                  "As a result, Polymarket's data becomes polluted — the signal now reflects both probability and
                  influence, making it lose its predictive integrity."
                </p>
              </div>
              <p className="text-lg md:text-xl leading-loose">
                Therefore, it becomes necessary to separate the pricing of influence from the pricing of probability.
              </p>
              <p className="text-2xl md:text-3xl font-serif font-light text-primary leading-relaxed mt-8">
                This is exactly what Ponymarket aims to do.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-8">
            <div className="space-y-4">
              <div className="inline-block">
                <span className="text-6xl opacity-20">03</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-serif font-light text-slate-900 dark:text-slate-100 leading-tight">
                How Ponymarket Solves<br />the Problem
              </h2>
              <div className="h-px w-16 bg-slate-300 dark:bg-slate-700" />
            </div>
            <div className="prose prose-xl max-w-none font-serif text-slate-700 dark:text-slate-300 leading-relaxed space-y-6">
              <p className="text-lg md:text-xl leading-loose">
                Ponymarket attempts to explicitly price the influence factor embedded within Polymarket's dynamics.
              </p>
              <p className="text-lg md:text-xl leading-loose">
                It introduces two key mechanisms to Polymarket's native token system:{" "}
                <strong className="font-semibold text-slate-900 dark:text-slate-100">locking (staking)</strong> and{" "}
                <strong className="font-semibold text-slate-900 dark:text-slate-100">bribery pools (bribes)</strong>.
              </p>
              <p className="text-lg md:text-xl leading-loose">
                Users can lock their outcome tokens to form <strong className="font-semibold text-slate-900 dark:text-slate-100">"Iron Voting Vaults"</strong>,
                representing unwavering belief in a specific outcome. Moreover, anyone can create bribe pools to incentivize
                Iron Vault participants.
              </p>

              <div className="grid md:grid-cols-2 gap-8 my-16 not-prose">
                <div className="group relative bg-white dark:bg-slate-900 p-10 border border-slate-200 dark:border-slate-800 hover:border-primary/30 transition-all duration-300">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <h3 className="text-2xl font-serif font-light text-slate-900 dark:text-slate-100 mb-4">
                    Transparent Reward Pricing
                  </h3>
                  <p className="font-serif text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                    Bribes are clearly quantified and visible
                  </p>
                </div>
                <div className="group relative bg-white dark:bg-slate-900 p-10 border border-slate-200 dark:border-slate-800 hover:border-primary/30 transition-all duration-300">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <h3 className="text-2xl font-serif font-light text-slate-900 dark:text-slate-100 mb-4">
                    Open Participation
                  </h3>
                  <p className="font-serif text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                    Anyone can create a bribe, ensuring fairness of influence
                  </p>
                </div>
              </div>

              <p className="text-xl md:text-2xl font-serif font-light text-slate-800 dark:text-slate-200 leading-loose mt-8">
                Through these mechanisms, Ponymarket enables the pricing of influence in prediction markets, thereby
                promoting greater fairness and transparency.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-8">
            <div className="space-y-4">
              <div className="inline-block">
                <span className="text-6xl opacity-20">04</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-serif font-light text-slate-900 dark:text-slate-100 leading-tight">
                What Is Ponymarket?
              </h2>
              <div className="h-px w-16 bg-slate-300 dark:bg-slate-700" />
            </div>
            <div className="prose prose-xl max-w-none font-serif text-slate-700 dark:text-slate-300 leading-relaxed space-y-6">
              <p className="text-xl md:text-2xl font-serif font-light leading-loose">
                Ponymarket is an <strong className="font-semibold text-slate-900 dark:text-slate-100">incentive layer for prediction markets</strong>,
                built upon three core functions:
              </p>

              <div className="space-y-12 my-16 not-prose">
                <div className="relative pl-16 pb-12 border-l-2 border-slate-200 dark:border-slate-800">
                  <div className="absolute -left-4 top-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                    1
                  </div>
                  <h3 className="text-3xl font-serif font-light text-slate-900 dark:text-slate-100 mb-4">
                    Equity (Shares)
                  </h3>
                  <p className="font-serif text-slate-700 dark:text-slate-300 text-lg leading-relaxed">
                    Users can lock their outcome tokens to express strong conviction — becoming{" "}
                    <strong className="font-semibold">Iron Vaults</strong>.
                  </p>
                </div>

                <div className="relative pl-16 pb-12 border-l-2 border-slate-200 dark:border-slate-800">
                  <div className="absolute -left-4 top-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    2
                  </div>
                  <h3 className="text-3xl font-serif font-light text-slate-900 dark:text-slate-100 mb-4">
                    Bribes
                  </h3>
                  <p className="font-serif text-slate-700 dark:text-slate-300 text-lg leading-relaxed">
                    Anyone can create a bribe pool and add any ERC20 tokens as rewards.
                  </p>
                </div>

                <div className="relative pl-16">
                  <div className="absolute -left-4 top-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold">
                    3
                  </div>
                  <h3 className="text-3xl font-serif font-light text-slate-900 dark:text-slate-100 mb-4">
                    Delegation
                  </h3>
                  <p className="font-serif text-slate-700 dark:text-slate-300 text-lg leading-relaxed">
                    Users can delegate the locking operation to Ponymarket and receive <strong className="font-semibold">pCTF tokens</strong>{" "}
                    automatically, allowing them to claim rewards or trade pCTF for liquidity.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-8">
            <div className="space-y-4">
              <div className="inline-block">
                <span className="text-6xl opacity-20">05</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-serif font-light text-slate-900 dark:text-slate-100 leading-tight">
                Use Cases
              </h2>
              <div className="h-px w-16 bg-slate-300 dark:bg-slate-700" />
            </div>
            <div className="prose prose-xl max-w-none font-serif text-slate-700 dark:text-slate-300 leading-relaxed">
              <div className="space-y-10 not-prose">
                <div className="flex gap-8 items-start group">
                  <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                    🎯
                  </div>
                  <div className="flex-1 pt-2">
                    <h3 className="text-2xl font-serif font-light text-slate-900 dark:text-slate-100 mb-3">
                      Bribe / Influence Pricing
                    </h3>
                    <p className="font-serif text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                      The core use case — enabling fair valuation of influence.
                    </p>
                  </div>
                </div>

                <div className="flex gap-8 items-start group">
                  <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/10 to-purple-500/5 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                    🎁
                  </div>
                  <div className="flex-1 pt-2">
                    <h3 className="text-2xl font-serif font-light text-slate-900 dark:text-slate-100 mb-3">
                      Airdrops
                    </h3>
                    <p className="font-serif text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                      Projects can design airdrops through Ponymarket to reward more committed holders.
                    </p>
                  </div>
                </div>

                <div className="flex gap-8 items-start group">
                  <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-green-500/10 to-green-500/5 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                    🎪
                  </div>
                  <div className="flex-1 pt-2">
                    <h3 className="text-2xl font-serif font-light text-slate-900 dark:text-slate-100 mb-3">
                      Incentive Programs
                    </h3>
                    <p className="font-serif text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                      Encourage users to actively express their beliefs and opinions — an ideal tool for community
                      bootstrapping and engagement.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section className="py-24">
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-100 dark:to-slate-200 rounded-sm">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-purple-500/20 to-transparent" />
              <div className="relative px-12 py-20 text-center space-y-8">
                <h2 className="text-4xl md:text-5xl font-serif font-light text-white dark:text-slate-900 leading-tight">
                  Ready to Experience<br />Ponymarket?
                </h2>
                <p className="text-xl font-serif text-white/80 dark:text-slate-700 max-w-2xl mx-auto leading-relaxed">
                  Join the future of prediction markets with transparent influence pricing
                </p>
                <div className="flex gap-6 justify-center pt-8">
                  <a
                    href="/markets"
                    className="group relative px-10 py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-serif text-lg overflow-hidden transition-all hover:shadow-2xl"
                  >
                    <span className="relative z-10">Explore Markets</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity" />
                  </a>
                  <a
                    href="/delegation"
                    className="px-10 py-4 border-2 border-white/30 dark:border-slate-700 text-white dark:text-slate-900 font-serif text-lg hover:bg-white/10 dark:hover:bg-slate-900/10 transition-colors"
                  >
                    Start Delegating
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
