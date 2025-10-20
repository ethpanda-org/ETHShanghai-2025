"use client"

import { useState } from "react"
import { Heart, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Post } from "@/lib/mock-data"

interface PostInteractionBarProps {
  post: Post
}

export function PostInteractionBar({ post }: PostInteractionBarProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.likeCount)

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1)
  }

  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="sm" onClick={handleLike} className={cn(isLiked && "text-red-500")}>
        <Heart className={cn("mr-2 h-4 w-4", isLiked && "fill-current")} />
        {likeCount}
      </Button>
      <Button variant="ghost" size="sm">
        <MessageCircle className="mr-2 h-4 w-4" />
        {post.commentCount}
      </Button>
    </div>
  )
}
