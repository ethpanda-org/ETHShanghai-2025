import { Card } from "@/components/ui/card"
import { Lock, Eye, TrendingUp, Shield } from "lucide-react"

export function StatsSection() {
  const features = [
    {
      icon: Eye,
      title: "Transparent Execution",
      description: "Public vaults display real-time holdings and trades for complete transparency",
    },
    {
      icon: Lock,
      title: "Private Strategies",
      description: "Exclusive vaults protect strategy execution while maintaining verifiable NAV",
    },
    {
      icon: TrendingUp,
      title: "Performance Fees",
      description: "High-water mark ensures managers only earn on new profits, aligning incentives",
    },
    {
      icon: Shield,
      title: "Manager Skin in Game",
      description: "Required manager self-investment ensures alignment with investor interests",
    },
  ]

  return (
    <section className="py-20 border-t border-border/40">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 gradient-card border-border/40 hover:border-primary/40 transition-smooth">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
