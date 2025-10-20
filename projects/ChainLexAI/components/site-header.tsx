"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HelpCircle, Moon, Sun } from "lucide-react";

const NAV_ITEMS = [
  { href: "/compliance", label: "Compliance" },
  { href: "/contracts", label: "Contract" },
  { href: "/dashboard", label: "Dashboard" },
];

function BrandMark() {
  return (
    <svg className="h-8 w-8 text-primary" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M39.475 21.626C40.358 21.436 40.686 21.559 40.758 21.593C40.788 21.655 40.855 21.857 40.808 22.334C40.741 23.025 40.45 24.005 39.857 25.23C38.68 27.663 36.509 30.663 33.586 33.586C30.663 36.509 27.663 38.68 25.23 39.857C24.005 40.45 23.026 40.741 22.334 40.808C21.857 40.855 21.655 40.787 21.593 40.758C21.559 40.686 21.436 40.358 21.626 39.475C21.856 38.405 22.469 36.966 23.504 35.282C24.758 33.242 26.55 30.974 28.762 28.762C30.974 26.55 33.242 24.757 35.282 23.504C36.966 22.469 38.405 21.856 39.475 21.626Z"
        fill="currentColor"
      />
      <path
        d="M4.412 29.24L18.76 43.588C19.881 44.71 21.403 44.918 22.722 44.789C24.058 44.659 25.515 44.163 26.972 43.458C29.905 42.039 33.262 39.567 36.414 36.414C39.567 33.262 42.039 29.905 43.458 26.972C44.163 25.515 44.659 24.058 44.789 22.722C44.918 21.403 44.71 19.881 43.588 18.76L29.24 4.412C27.853 3.024 25.876 3.026 24.286 3.368C22.608 3.729 20.733 4.584 18.84 5.748C16.498 7.187 13.988 9.184 11.586 11.586C9.184 13.988 7.187 16.498 5.748 18.84C4.584 20.733 3.729 22.608 3.368 24.286C3.026 25.877 3.024 27.853 4.412 29.24Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const toggleTheme = () => {
    if (!mounted) return;
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-6 md:px-8">
        <div className="flex items-center gap-3">
          <BrandMark />
          <Link href="/" className="text-base font-semibold text-foreground md:text-lg">
            ChainLex.ai
          </Link>
        </div>
        <nav className="hidden md:block">
          <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href === "/compliance" && pathname === "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full">
            <HelpCircle className="h-5 w-5" />
          </Button>
          {mounted && (
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          )}
          <div className="h-10 w-10 rounded-full bg-[url('https://i.pravatar.cc/100?img=24')] bg-cover bg-center" />
        </div>
      </div>
      <div className="block px-6 pb-3 md:hidden">
        <div className="flex gap-2 overflow-x-auto rounded-xl bg-muted/60 p-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href === "/compliance" && pathname === "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
