import { notFound } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { BusinessCardDisplay } from "@/components/business-card/business-card-display"
import { ProfileTabs } from "@/components/profile/profile-tabs"
import { mockUsers } from "@/lib/mock-data"

export default function ProfilePage({
  params,
  searchParams,
}: {
  params: { username: string }
  searchParams: { tab?: string }
}) {
  const user = mockUsers.find((u) => u.username === params.username)

  if (!user) {
    notFound()
  }

  const isOwner = true // Mock - in real app, check if current user is owner
  const tab = searchParams.tab || "posts"

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="space-y-6">
          <BusinessCardDisplay userId={user.id} isOwner={isOwner} />
          <ProfileTabs userId={user.id} isOwner={isOwner} activeTab={tab} />
        </div>
      </div>
    </div>
  )
}
