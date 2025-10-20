import { Header } from "@/components/header"
import { VaultDetail } from "@/components/vault-detail"
import { Footer } from "@/components/footer"
import { StatusBar } from "@/components/status-bar"

export default function VaultPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <StatusBar />
      <main className="flex-1">
        <VaultDetail vaultId={params.id} />
      </main>
      <Footer />
    </div>
  )
}
