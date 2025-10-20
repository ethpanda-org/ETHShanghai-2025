"use client"

import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PostsTab } from "@/components/profile/posts-tab"
import { ProductsTab } from "@/components/profile/products-tab"
import { WalletTab } from "@/components/profile/wallet-tab"

interface ProfileTabsProps {
  userId: string
  isOwner: boolean
  activeTab: string
}

export function ProfileTabs({ userId, isOwner, activeTab }: ProfileTabsProps) {
  return (
    <Tabs value={activeTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="posts" asChild>
          <Link href="?tab=posts">内容</Link>
        </TabsTrigger>
        <TabsTrigger value="products" asChild>
          <Link href="?tab=products">产品</Link>
        </TabsTrigger>
        <TabsTrigger value="cards" asChild>
          <Link href="?tab=cards">名片</Link>
        </TabsTrigger>
        {isOwner && (
          <TabsTrigger value="wallet" asChild>
            <Link href="?tab=wallet">钱包</Link>
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="posts">
        <PostsTab userId={userId} isOwner={isOwner} />
      </TabsContent>

      <TabsContent value="products">
        <ProductsTab userId={userId} isOwner={isOwner} />
      </TabsContent>

      <TabsContent value="cards">
        <div className="text-center py-12 text-muted-foreground">名片收藏功能开发中...</div>
      </TabsContent>

      {isOwner && (
        <TabsContent value="wallet">
          <WalletTab userId={userId} />
        </TabsContent>
      )}
    </Tabs>
  )
}
