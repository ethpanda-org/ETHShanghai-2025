"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Search } from "lucide-react"
import { mockProducts, type Product } from "@/lib/mock-data"
import Image from "next/image"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"

interface ProductSelectionModalProps {
  open: boolean
  onClose: () => void
  onSelect: (products: Product[]) => void
  excludeIds?: string[]
}

export function ProductSelectionModal({ open, onClose, onSelect, excludeIds = [] }: ProductSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Filter available products
  const availableProducts = useMemo(() => {
    return mockProducts.filter((p) => !excludeIds.includes(p.id))
  }, [excludeIds])

  // Filter by search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return availableProducts
    return availableProducts.filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [availableProducts, searchQuery])

  const handleToggle = (productId: string) => {
    setSelectedIds((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]))
  }

  const handleToggleAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredProducts.map((p) => p.id))
    }
  }

  const handleConfirm = () => {
    if (selectedIds.length === 0) {
      toast.error("请至少选择一个商品")
      return
    }
    const selected = mockProducts.filter((p) => selectedIds.includes(p.id))
    onSelect(selected)
    setSelectedIds([])
    setSearchQuery("")
  }

  const handleClose = () => {
    setSelectedIds([])
    setSearchQuery("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[800px] max-h-[600px] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border/40">
          <DialogTitle>选择商品</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="px-6 py-4 border-b border-border/40">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索商品标题..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 border-b border-border/40 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
              onCheckedChange={handleToggleAll}
            />
            <span className="text-sm font-medium">全选</span>
          </div>
          <span className="text-sm text-muted-foreground">已选择 {selectedIds.length} 个商品</span>
        </div>

        {/* Product list */}
        <ScrollArea className="h-[300px]">
          <div className="px-6 py-4 space-y-3">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="mb-2">未找到相关商品</p>
                <p className="text-sm">试试其他关键词</p>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-border/40 hover:bg-accent/60 transition-apple cursor-pointer"
                  onClick={() => handleToggle(product.id)}
                >
                  <Checkbox
                    checked={selectedIds.includes(product.id)}
                    onCheckedChange={() => handleToggle(product.id)}
                  />
                  <div className="w-14 h-14 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                    <Image
                      src="/placeholder.svg"
                      alt={product.title}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-1 mb-1">{product.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="text-primary font-semibold">¥{product.price.toFixed(2)}</span>
                      <span>库存：{product.stockRemaining}</span>
                      <span>销量：{100 - product.stockRemaining}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/40 flex items-center justify-between">
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={selectedIds.length === 0}>
            确认添加
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
