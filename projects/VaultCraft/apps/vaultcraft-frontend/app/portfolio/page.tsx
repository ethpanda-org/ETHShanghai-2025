import { Header } from "@/components/header"
import { PortfolioView } from "@/components/portfolio-view"
import { Footer } from "@/components/footer"

export default function PortfolioPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <PortfolioView />
      </main>
      <Footer />
    </div>
  )
}
