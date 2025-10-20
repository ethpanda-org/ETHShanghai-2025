import Link from "next/link"
import { Eye, Heart } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { FallbackImage } from "@/components/ui/fallback-image"
import type { Post } from "@/lib/mock-data"

interface PostCardProps {
  post: Post
}

export function PostCard({ post }: PostCardProps) {
  const hasPrice = post.products && post.products.length > 0 && !post.products[0].isFree
  const price = hasPrice ? post.products![0].price : null

  return (
    <Link href={`/post/${post.id}`} className="block group">
      <Card className="border border-border/40 shadow-apple hover:shadow-apple-lg transition-apple hover-lift bg-card">
        <div className="relative aspect-[3/4] overflow-hidden">
          <FallbackImage
            src={post.images[0] || "/placeholder.svg"}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-[1.08] transition-all duration-500 ease-out"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {post.products && post.products.length > 0 && post.products[0].isFree && (
            <Badge className="absolute top-3 left-3 bg-[#4A7C59] text-white border-0 rounded-lg px-2.5 py-1 text-xs font-medium shadow-apple">
              免费
            </Badge>
          )}
          {price && (
            <div className="absolute bottom-3 left-3 bg-gradient-to-r from-[#FFB800] to-[#FFA000] text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-apple">
              ¥{price.toFixed(2)}
            </div>
          )}
        </div>

        <div className="px-4 pb-4 pt-3 space-y-2 bg-card">
          <h3 className="font-semibold text-sm line-clamp-2 text-foreground leading-relaxed tracking-tight">
            {post.title}
          </h3>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-6 w-6 ring-2 ring-background shadow-sm">
                <AvatarImage src={post.author.avatar || "/placeholder.svg"} />
                <AvatarFallback className="text-xs bg-muted">{post.author.username[0]}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground font-medium truncate max-w-[100px]">
                {post.author.username}
              </span>
            </div>

            <div className="flex items-center gap-3.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 transition-colors hover:text-foreground">
                <Eye className="h-3.5 w-3.5" />
                <span className="font-medium">{post.viewCount}</span>
              </div>
              <div className="flex items-center gap-1.5 transition-colors hover:text-destructive">
                <Heart className="h-3.5 w-3.5" />
                <span className="font-medium">{post.likeCount}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
