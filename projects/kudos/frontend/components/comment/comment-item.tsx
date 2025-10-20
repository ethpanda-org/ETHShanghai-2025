"use client"

import { useState } from "react"
import { Heart, MessageCircle, Trash2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { CommentInput } from "@/components/comment/comment-input"
import type { Comment } from "@/lib/mock-data"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface CommentItemProps {
  comment: Comment
  isReply?: boolean
}

export function CommentItem({ comment, isReply = false }: CommentItemProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(comment.likeCount)
  const [showReplyInput, setShowReplyInput] = useState(false)

  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
    locale: zhCN,
  })

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1)
  }

  return (
    <div className={cn("space-y-3", isReply && "ml-12")}>
      <div className="flex gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={comment.author.avatar || "/placeholder.svg"} />
          <AvatarFallback>{comment.author.username[0]}</AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{comment.author.username}</span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>

          <p className="text-sm text-pretty">{comment.content}</p>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={cn("h-8 px-2", isLiked && "text-red-500")}
            >
              <Heart className={cn("mr-1 h-3.5 w-3.5", isLiked && "fill-current")} />
              {likeCount}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowReplyInput(!showReplyInput)} className="h-8 px-2">
              <MessageCircle className="mr-1 h-3.5 w-3.5" />
              回复
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {showReplyInput && (
            <div className="pt-2">
              <CommentInput
                postId={comment.postId}
                parentCommentId={comment.id}
                onCancel={() => setShowReplyInput(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} isReply />
          ))}
        </div>
      )}
    </div>
  )
}
