"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Edit, Lock, Twitter, Github, Globe } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { mockBusinessCards, mockUsers } from "@/lib/mock-data"

interface BusinessCardDisplayProps {
  userId: string
  isOwner: boolean
}

export function BusinessCardDisplay({ userId, isOwner }: BusinessCardDisplayProps) {
  const user = mockUsers.find((u) => u.id === userId)
  const businessCard = mockBusinessCards.find((bc) => bc.userId === userId)
  const [isAcquired, setIsAcquired] = useState(isOwner)

  if (!user) return null

  const handleAcquire = () => {
    setIsAcquired(true)
  }

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        {/* Locked Overlay */}
        {!isAcquired && businessCard && !businessCard.isFree && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="font-semibold">查看完整名片</p>
                <p className="text-sm text-muted-foreground">解锁后可查看联系方式和作品集</p>
              </div>
              <Button onClick={handleAcquire}>¥{businessCard.price} 获取名片</Button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.avatar || "/placeholder.svg"} />
                <AvatarFallback>{user.username[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{user.username}</h2>
                {user.bio && <p className="text-muted-foreground">{user.bio}</p>}
              </div>
            </div>
            {isOwner && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/profile/edit-card">
                  <Edit className="mr-2 h-4 w-4" />
                  编辑名片
                </Link>
              </Button>
            )}
          </div>

          {/* Bio */}
          {businessCard && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed">{businessCard.bio}</p>

              {/* Social Links */}
              {isAcquired && businessCard.socialLinks.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {businessCard.socialLinks.map((link) => (
                    <Button key={link.platform} variant="outline" size="sm" asChild>
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        {link.platform === "Twitter" && <Twitter className="mr-2 h-4 w-4" />}
                        {link.platform === "GitHub" && <Github className="mr-2 h-4 w-4" />}
                        {link.platform === "Website" && <Globe className="mr-2 h-4 w-4" />}
                        {link.platform}
                      </a>
                    </Button>
                  ))}
                </div>
              )}

              {/* Highlights */}
              {isAcquired && businessCard.highlights.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">精选作品</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {businessCard.highlights.map((image, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                        <Image
                          src={image || "/placeholder.svg"}
                          alt={`Highlight ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
