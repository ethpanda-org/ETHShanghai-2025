import { PostCard } from "@/components/post/post-card"
import { Empty } from "@/components/ui/empty"
import { mockPosts } from "@/lib/mock-data"

interface PostsTabProps {
  userId: string
  isOwner: boolean
}

export function PostsTab({ userId, isOwner }: PostsTabProps) {
  const userPosts = mockPosts.filter((post) => post.userId === userId)

  if (userPosts.length === 0) {
    return <Empty title="暂无内容" description={isOwner ? "发布你的第一篇内容吧" : "该用户还没有发布内容"} />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {userPosts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
