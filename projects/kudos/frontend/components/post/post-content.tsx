import Link from "next/link"
import { Share2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Post } from "@/lib/mock-data"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"

interface PostContentProps {
  post: Post
}

export function PostContent({ post }: PostContentProps) {
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
    locale: zhCN,
  })

  return (
    <div className="space-y-4">
      {/* Title */}
      <h1 className="text-2xl font-bold text-balance">{post.title}</h1>

      {/* Meta Info */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {timeAgo}
        </div>
        <div>{post.viewCount} 浏览</div>
      </div>

      {/* Body */}
      <div className="prose prose-sm max-w-none">
        <p className="text-pretty leading-relaxed">{post.body}</p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {post.tags.map((tag) => (
          <Badge key={tag} variant="secondary" asChild>
            <Link href={`/search?q=${encodeURIComponent(tag)}`}>#{tag}</Link>
          </Badge>
        ))}
      </div>

      {/* Share Button */}
      <Button variant="outline" size="sm" className="w-full bg-transparent">
        <Share2 className="mr-2 h-4 w-4" />
        分享
      </Button>
    </div>
  )
}
