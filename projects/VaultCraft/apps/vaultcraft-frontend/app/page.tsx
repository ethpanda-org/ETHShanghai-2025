import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { VaultDiscovery } from "@/components/vault-discovery"
import { Footer } from "@/components/footer"
import { StatusBar } from "@/components/status-bar"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <StatusBar />
      <main className="flex-1">
        <HeroSection />
        <VaultDiscovery />
      </main>
      <Footer />
    </div>
  )
}
