import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "ChainLex.ai",
  description: "AI-assisted workbench for onboarding real-world assets to blockchain networks.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased font-system-ui">
        <Providers>
          <div className="flex min-h-screen flex-col bg-muted/20">
            <SiteHeader />
            <main className="flex-1">
              <div className="mx-auto w-full max-w-[1440px] px-6 pb-12 pt-8 md:px-8">
                {children}
              </div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
