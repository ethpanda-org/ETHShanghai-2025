"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Home, FileText, Code2, BarChart3 } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/compliance", label: "Compliance", icon: FileText },
  { href: "/contracts", label: "Contracts", icon: Code2 },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <aside className="hidden w-[260px] shrink-0 border-r bg-background/95 p-6 lg:block">
      <div className="flex h-full flex-col justify-between space-y-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">ChainLex.ai</h1>
            <p className="text-sm text-muted-foreground">AI-native RWA issuance workbench</p>
          </div>
          <nav className="space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className="block">
                  <span
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="space-y-3">
          {mounted && (
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <span>Toggle {theme === "dark" ? "Light" : "Dark"} Mode</span>
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Connected to OpenRouter for AI drafting and Viem/Wagmi for web3 automation.
          </p>
        </div>
      </div>
    </aside>
  );
}
