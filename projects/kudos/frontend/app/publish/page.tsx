import { Navbar } from "@/components/layout/navbar"
import { PublishEditor } from "@/components/publish/publish-editor"

export default function PublishPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <PublishEditor />
      </div>
    </div>
  )
}
