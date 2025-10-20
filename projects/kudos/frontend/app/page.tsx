import { Navbar } from "@/components/layout/navbar"
import { SidebarLeft } from "@/components/layout/sidebar-left"
import { SidebarRight } from "@/components/layout/sidebar-right"
import { FilterTabs } from "@/components/feed/filter-tabs"
import { FeedContainer } from "@/components/feed/feed-container"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <FilterTabs />
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_320px] gap-6">
          {/* Left Sidebar */}
          <aside className="hidden lg:block">
            <SidebarLeft />
          </aside>

          {/* Main Feed */}
          <main>
            <FeedContainer />
          </main>

          {/* Right Sidebar */}
          <aside className="hidden xl:block">
            <SidebarRight />
          </aside>
        </div>
      </div>
    </div>
  )
}
