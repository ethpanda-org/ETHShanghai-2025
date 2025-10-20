import { Header } from "@/components/header"
import { StatusBar } from "@/components/status-bar"
import { VaultDiscovery } from "@/components/vault-discovery"
import { Footer } from "@/components/footer"

export default function BrowsePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <StatusBar />
      <main className="flex-1">
        <VaultDiscovery />
      </main>
      <Footer />
    </div>
  )
}

