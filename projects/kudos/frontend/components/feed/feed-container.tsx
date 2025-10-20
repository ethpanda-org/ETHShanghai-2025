"use client"

import { useState } from "react"
import { PostCard } from "@/components/post/post-card"
import { Button } from "@/components/ui/button"
import { mockPosts } from "@/lib/mock-data"
import { usePosts } from "@/lib/posts-context"
import { Loader2 } from "lucide-react"

export function FeedContainer() {
  const [isLoading, setIsLoading] = useState(false)
  const { newPosts } = usePosts()

  const handleLoadMore = () => {
    setIsLoading(true)
    // Simulate loading
    setTimeout(() => setIsLoading(false), 1000)
  }

  const allPosts = [...newPosts, ...mockPosts]

  console.log("[v0] Rendering feed with posts:", allPosts.length, "new posts:", newPosts.length)

  return (
    <div className="space-y-6">
      {/* Masonry Grid */}
      <div className="masonry-grid">
        {allPosts.map((post) => (
          <div key={post.id} className="masonry-item">
            <PostCard post={post} />
          </div>
        ))}
      </div>

      {/* Load More */}
      <div className="flex justify-center pt-4">
        <Button variant="outline" onClick={handleLoadMore} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              加载中...
            </>
          ) : (
            "加载更多"
          )}
        </Button>
      </div>
    </div>
  )
}
