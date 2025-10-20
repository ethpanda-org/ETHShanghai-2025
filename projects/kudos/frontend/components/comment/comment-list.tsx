import { CommentItem } from "@/components/comment/comment-item"
import { Empty } from "@/components/ui/empty"
import type { Comment } from "@/lib/mock-data"

interface CommentListProps {
  comments: Comment[]
}

export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return <Empty title="暂无评论" description="成为第一个评论的人吧" />
  }

  return (
    <div className="space-y-6">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  )
}
