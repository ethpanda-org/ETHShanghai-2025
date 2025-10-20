import { Navbar } from "@/components/layout/navbar"
import { PostCard } from "@/components/post/post-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { mockPosts } from "@/lib/mock-data"

export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const query = searchParams.q || ""

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">搜索结果</h1>
          <p className="text-muted-foreground">关键词: {query}</p>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="posts">内容</TabsTrigger>
            <TabsTrigger value="users">用户</TabsTrigger>
            <TabsTrigger value="tags">标签</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="masonry-grid">
              {mockPosts.map((post) => (
                <div key={post.id} className="masonry-item">
                  <PostCard post={post} />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="posts" className="mt-6">
            <div className="masonry-grid">
              {mockPosts.map((post) => (
                <div key={post.id} className="masonry-item">
                  <PostCard post={post} />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <p className="text-center text-muted-foreground py-12">用户搜索功能开发中...</p>
          </TabsContent>

          <TabsContent value="tags" className="mt-6">
            <p className="text-center text-muted-foreground py-12">标签搜索功能开发中...</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
