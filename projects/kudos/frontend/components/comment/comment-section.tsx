import { CommentList } from "@/components/comment/comment-list"
import { CommentInput } from "@/components/comment/comment-input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCommentsByPostId } from "@/lib/mock-data"

interface CommentSectionProps {
  postId: string
}

export function CommentSection({ postId }: CommentSectionProps) {
  const comments = getCommentsByPostId(postId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>评论 ({comments.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <CommentInput postId={postId} />
        <CommentList comments={comments} />
      </CardContent>
    </Card>
  )
}
