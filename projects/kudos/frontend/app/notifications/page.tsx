import { Navbar } from "@/components/layout/navbar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Heart, MessageCircle } from "lucide-react"

const notifications = [
  {
    id: "1",
    type: "acquisition",
    title: "产品购买",
    message: "PromptMaster 购买了你的产品「Advanced Midjourney Prompts Pack」",
    time: "2小时前",
    isRead: false,
  },
  {
    id: "2",
    type: "comment",
    title: "新评论",
    message: "DigitalArtist 评论了你的内容",
    time: "5小时前",
    isRead: false,
  },
  {
    id: "3",
    type: "like",
    title: "点赞",
    message: "你的内容获得了 10 个新点赞",
    time: "1天前",
    isRead: true,
  },
]

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">通知</h1>

        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card key={notification.id} className={notification.isRead ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    {notification.type === "acquisition" && (
                      <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-green-600" />
                      </div>
                    )}
                    {notification.type === "comment" && (
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <MessageCircle className="h-5 w-5 text-blue-600" />
                      </div>
                    )}
                    {notification.type === "like" && (
                      <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                        <Heart className="h-5 w-5 text-red-600" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{notification.title}</p>
                      {!notification.isRead && <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">{notification.time}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
