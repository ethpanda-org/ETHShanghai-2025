"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ImageUploader } from "@/components/publish/image-uploader"
import { TagSelector } from "@/components/publish/tag-selector"
import { ProductManager } from "@/components/publish/product-manager"
import { PreviewModal } from "@/components/publish/preview-modal"
import { Eye, Send } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import type { Product } from "@/lib/mock-data"
import { usePosts } from "@/lib/posts-context"

export function PublishEditor() {
  const router = useRouter()
  const { addPost } = usePosts()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [hasPaidContent, setHasPaidContent] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [isPublishing, setIsPublishing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const handlePublish = async () => {
    if (!title.trim()) {
      toast.error("请输入标题")
      return
    }
    if (!body.trim()) {
      toast.error("请输入正文")
      return
    }
    if (images.length === 0) {
      toast.error("请至少上传一张图片")
      return
    }

    setIsPublishing(true)

    console.log("[v0] Publishing post:", { title, body, images, tags, hasPaidContent, selectedProducts })

    setTimeout(() => {
      addPost({
        userId: "1",
        title,
        body,
        images,
        hasPaidContent,
        products: selectedProducts.length > 0 ? selectedProducts : undefined,
        tags,
      })

      toast.success("发布成功！")
      console.log("[v0] Post published successfully")

      router.push("/")
    }, 1000)
  }

  const handleBackClick = (e: React.MouseEvent) => {
    if (title || body || images.length > 0 || tags.length > 0) {
      if (!confirm("确定要离开吗？未保存的内容将会丢失。")) {
        e.preventDefault()
      }
    }
  }

  const canPublish = title.trim() && body.trim() && images.length > 0

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-apple">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link
              href="/"
              onClick={handleBackClick}
              className="flex items-center gap-2 text-lg font-bold hover:text-primary transition-apple"
            >
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                炒
              </div>
              <span>炒词</span>
            </Link>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPreview(true)}
                className="rounded-xl shadow-apple hover:shadow-apple-lg transition-apple"
              >
                <Eye className="mr-2 h-4 w-4" />
                预览
              </Button>
              <Button
                onClick={handlePublish}
                disabled={!canPublish || isPublishing}
                className="rounded-xl bg-primary hover:bg-primary/90 shadow-apple hover:shadow-apple-lg transition-apple active-press"
              >
                <Send className="mr-2 h-4 w-4" />
                {isPublishing ? "发布中..." : "发布"}
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="space-y-6">
            {/* Image Upload */}
            <div className="bg-card rounded-2xl border border-border/40 p-6 shadow-apple">
              <ImageUploader images={images} onChange={setImages} />
            </div>

            {/* Title */}
            <div className="bg-card rounded-2xl border border-border/40 p-6 shadow-apple">
              <Input
                placeholder="给你的作品起个标题吧"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 50))}
                maxLength={50}
                className="text-lg font-medium border-0 px-0 focus-visible:ring-0 placeholder:text-muted-foreground/60"
              />
              <p className="text-xs text-muted-foreground text-right mt-2">{title.length} / 50</p>
            </div>

            {/* Body */}
            <div className="bg-card rounded-2xl border border-border/40 p-6 shadow-apple">
              <Textarea
                placeholder="分享你的创作灵感、使用技巧..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                maxLength={5000}
                className="min-h-[200px] border-0 px-0 focus-visible:ring-0 resize-none placeholder:text-muted-foreground/60"
              />
              <p className="text-xs text-muted-foreground text-right mt-2">{body.length} / 5000</p>
            </div>

            {/* Tags */}
            <div className="bg-card rounded-2xl border border-border/40 p-6 shadow-apple">
              <h3 className="text-sm font-medium mb-4">话题标签</h3>
              <TagSelector tags={tags} onChange={setTags} />
            </div>

            {/* Paid Content */}
            <div className="bg-card rounded-2xl border border-border/40 p-6 shadow-apple">
              <div className="flex items-center gap-3 mb-4">
                <Checkbox
                  id="paid-content"
                  checked={hasPaidContent}
                  onCheckedChange={(checked) => setHasPaidContent(checked as boolean)}
                />
                <label htmlFor="paid-content" className="text-sm font-medium cursor-pointer select-none">
                  设置付费内容
                </label>
              </div>

              {hasPaidContent && <ProductManager selectedProducts={selectedProducts} onChange={setSelectedProducts} />}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <PreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title={title}
        body={body}
        images={images}
        tags={tags}
        products={selectedProducts}
      />
    </>
  )
}
