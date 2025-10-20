import { notFound } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { PostImageCarousel } from "@/components/post/post-image-carousel"
import { PostContent } from "@/components/post/post-content"
import { PostAuthorCard } from "@/components/post/post-author-card"
import { PostInteractionBar } from "@/components/post/post-interaction-bar"
import { PaidContentSection } from "@/components/post/paid-content-section"
import { CommentSection } from "@/components/comment/comment-section"
import { getPostById } from "@/lib/mock-data"

export default function PostDetailPage({ params }: { params: { id: string } }) {
  const post = getPostById(params.id)

  if (!post) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 max-w-7xl mx-auto">
          {/* Left Column - Images */}
          <div className="space-y-4">
            <PostImageCarousel images={post.images} />
          </div>

          {/* Right Column - Content */}
          <div className="space-y-6">
            <PostContent post={post} />
            <PostAuthorCard author={post.author} />
            <PostInteractionBar post={post} />
            {post.hasPaidContent && post.products && <PaidContentSection products={post.products} />}
          </div>
        </div>

        {/* Comments Section - Full Width */}
        <div className="max-w-7xl mx-auto mt-8">
          <CommentSection postId={post.id} />
        </div>
      </div>
    </div>
  )
}
