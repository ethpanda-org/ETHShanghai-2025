"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface CommentInputProps {
  postId: string
  parentCommentId?: string
  onCancel?: () => void
}

export function CommentInput({ postId, parentCommentId, onCancel }: CommentInputProps) {
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim()) return

    setIsSubmitting(true)
    // Mock submission
    setTimeout(() => {
      setContent("")
      setIsSubmitting(false)
      onCancel?.()
    }, 500)
  }

  return (
    <div className="space-y-3">
      <Textarea
        placeholder={parentCommentId ? "写下你的回复..." : "写下你的评论..."}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        maxLength={500}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{content.length} / 500</span>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              取消
            </Button>
          )}
          <Button size="sm" onClick={handleSubmit} disabled={!content.trim() || isSubmitting}>
            {isSubmitting ? "发送中..." : "发送"}
          </Button>
        </div>
      </div>
    </div>
  )
}
