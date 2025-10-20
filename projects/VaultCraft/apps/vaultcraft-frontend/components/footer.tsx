import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border/40 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5 text-primary-foreground"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2L2 7L12 12L22 7L12 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 17L12 22L22 17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 12L12 17L22 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-lg font-semibold">VaultCraft</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Professional vault platform for verified human traders with transparent on-chain execution.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground transition-smooth">
                  Discover
                </Link>
              </li>
              <li>
                <Link href="/portfolio" className="hover:text-foreground transition-smooth">
                  Portfolio
                </Link>
              </li>
              <li>
                <Link href="/create" className="hover:text-foreground transition-smooth">
                  Create Vault
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/docs" className="hover:text-foreground transition-smooth">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-foreground transition-smooth">
                  About
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-foreground transition-smooth">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/terms" className="hover:text-foreground transition-smooth">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-smooth">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/disclosures" className="hover:text-foreground transition-smooth">
                  Disclosures
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2025 VaultCraft. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="https://twitter.com" className="hover:text-foreground transition-smooth">
              Twitter
            </Link>
            <Link href="https://discord.com" className="hover:text-foreground transition-smooth">
              Discord
            </Link>
            <Link href="https://github.com" className="hover:text-foreground transition-smooth">
              GitHub
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
