import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { User } from "@/lib/mock-data"

interface PostAuthorCardProps {
  author: User
}

export function PostAuthorCard({ author }: PostAuthorCardProps) {
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={author.avatar || "/placeholder.svg"} />
            <AvatarFallback>{author.username[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <Link href={`/profile/${author.username}`} className="font-semibold hover:underline">
              {author.username}
            </Link>
            {author.bio && <p className="text-sm text-muted-foreground line-clamp-1">{author.bio}</p>}
          </div>
        </div>
        <Button className="w-full" asChild>
          <Link href={`/profile/${author.username}?tab=card`}>查看名片</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
