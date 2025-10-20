import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight, Code2, FileText, LineChart } from "lucide-react";

const FEATURES = [
  {
    title: "AI-composed disclosures",
    description: "Upload documents and collaborate with an assistant to draft compliant disclosures.",
    href: "/compliance",
    icon: FileText,
  },
  {
    title: "Parameterized smart contracts",
    description: "Generate, inspect, and deploy audited templates using viem + wagmi integrations.",
    href: "/contracts",
    icon: Code2,
  },
  {
    title: "Operational intelligence",
    description: "Monitor issuances, risk signals, and lifecycle events in one dashboard.",
    href: "/dashboard",
    icon: LineChart,
  },
];

export default function HomePage() {
  return (
    <section className="space-y-10">
      <header className="space-y-6">
        <p className="text-sm uppercase tracking-wider text-primary">ChainLex.ai</p>
        <h2 className="text-4xl font-semibold tracking-tight">Ship real-world assets onchain confidently</h2>
        <p className="max-w-3xl text-lg text-muted-foreground">
          ChainLex.ai orchestrates compliance automation, contract generation, and post-deployment monitoring
          through an AI-first workspace. The platform codifies the PRD specification into production-ready
          workflows using Next.js, shadcn/ui, viem, wagmi, and Neon.
        </p>
        <div className="flex flex-wrap gap-4">
          <Button asChild>
            <Link href="/compliance">
              Launch workbench
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {FEATURES.map((feature) => (
          <Card key={feature.title} className="border-muted-foreground/10">
            <CardHeader className="space-y-4">
              <feature.icon className="h-8 w-8 text-primary" />
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="ghost" className="p-0 text-sm">
                <Link href={feature.href} className="flex items-center gap-2 text-primary">
                  Go to {feature.title}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
