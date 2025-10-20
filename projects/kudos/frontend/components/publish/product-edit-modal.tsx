"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload } from "lucide-react"
import type { Product } from "@/lib/mock-data"
import Image from "next/image"
import { toast } from "sonner"

interface ProductEditModalProps {
  open: boolean
  onClose: () => void
  product: Product | null
  onSave: (product: Product) => void
}

export function ProductEditModal({ open, onClose, product, onSave }: ProductEditModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [content, setContent] = useState("")
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("")
  const [image, setImage] = useState("")

  useEffect(() => {
    if (product) {
      setTitle(product.title)
      setDescription(product.description)
      setContent("")
      setPrice(product.price.toString())
      setStock(product.stockRemaining.toString())
    } else {
      setTitle("")
      setDescription("")
      setContent("")
      setPrice("")
      setStock("")
      setImage("")
    }
  }, [product])

  const handleSave = () => {
    // Validation
    if (!title.trim()) {
      toast.error("请输入商品标题")
      return
    }
    if (!content.trim()) {
      toast.error("请输入加锁内容")
      return
    }
    if (!price || Number.parseFloat(price) < 0) {
      toast.error("请输入有效的价格")
      return
    }
    if (!stock || Number.parseInt(stock) <= 0) {
      toast.error("请输入有效的库存")
      return
    }

    const savedProduct: Product = product
      ? {
          ...product,
          title,
          description,
          price: Number.parseFloat(price),
          stockRemaining: Number.parseInt(stock),
        }
      : {
          id: `p${Date.now()}`,
          userId: "1",
          title,
          description,
          price: Number.parseFloat(price),
          isFree: Number.parseFloat(price) === 0,
          stockLimit: Number.parseInt(stock),
          stockRemaining: Number.parseInt(stock),
          contentType: "text",
          contentData: { content },
        }

    onSave(savedProduct)
    toast.success(product ? "商品修改成功" : "商品创建成功")
  }

  const handleClose = () => {
    if (title || description || content || price || stock) {
      if (!confirm("确定要关闭吗？未保存的修改将会丢失。")) {
        return
      }
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[600px] max-h-[700px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "修改商品" : "创建新商品"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Image */}
          <div className="space-y-2">
            <Label>商品头图</Label>
            <div className="flex items-center gap-4">
              <div className="w-[120px] h-[120px] rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                {image ? (
                  <Image
                    src={image || "/placeholder.svg"}
                    alt="Product"
                    width={120}
                    height={120}
                    className="object-cover"
                  />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <Button variant="outline" size="sm">
                  更换图片
                </Button>
                <p className="text-xs text-muted-foreground mt-2">支持格式：JPG, PNG (≤2MB)</p>
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              商品标题 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="请输入商品标题"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 30))}
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground text-right">{title.length} / 30</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">商品描述</Label>
            <Textarea
              id="description"
              placeholder="简单描述商品内容和价值（可选）"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 200))}
              maxLength={200}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length} / 200</p>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">
              加锁内容 <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="content"
              placeholder="输入完整的Prompt内容..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
            />
            <p className="text-xs text-muted-foreground">购买后用户可查看的完整内容</p>
          </div>

          {/* Price and Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">
                价格 <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                <Input
                  id="price"
                  type="number"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="pl-7"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">
                库存 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="stock"
                type="number"
                placeholder="请输入库存数量"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button onClick={handleSave}>保存{product ? "修改" : ""}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
