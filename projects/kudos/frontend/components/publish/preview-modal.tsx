"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import type { Product } from "@/lib/mock-data"

interface PreviewModalProps {
  open: boolean
  onClose: () => void
  title: string
  body: string
  images: string[]
  tags: string[]
  products: Product[]
}

export function PreviewModal({ open, onClose, title, body, images, tags, products }: PreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-background border-b border-border/40 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">预览</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Images */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                  <Image src={img || "/placeholder.svg"} alt={`Preview ${idx + 1}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Title */}
          {title && <h1 className="text-2xl font-bold">{title}</h1>}

          {/* Body */}
          {body && <p className="text-muted-foreground whitespace-pre-wrap">{body}</p>}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Products */}
          {products.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">付费内容</h3>
              {products.map((product) => (
                <div key={product.id} className="p-4 rounded-xl border border-border/40 bg-muted/30">
                  <h4 className="font-medium mb-2">{product.title}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-primary font-semibold">¥{product.price.toFixed(2)}</span>
                    <span className="text-muted-foreground">库存：{product.stockRemaining}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
