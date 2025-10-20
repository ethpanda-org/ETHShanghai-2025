"use client"

import { useState } from "react"
import { Plus, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProductSelectionModal } from "@/components/publish/product-selection-modal"
import { ProductEditModal } from "@/components/publish/product-edit-modal"
import type { Product } from "@/lib/mock-data"
import Image from "next/image"
import { toast } from "sonner"

interface ProductManagerProps {
  selectedProducts: Product[]
  onChange: (products: Product[]) => void
}

export function ProductManager({ selectedProducts, onChange }: ProductManagerProps) {
  const [showSelectionModal, setShowSelectionModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const handleRemoveProduct = (productId: string) => {
    if (confirm("确定要移除这个商品吗？")) {
      onChange(selectedProducts.filter((p) => p.id !== productId))
      toast.success("商品已移除")
    }
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setShowEditModal(true)
  }

  const handleProductsSelected = (products: Product[]) => {
    onChange([...selectedProducts, ...products])
    setShowSelectionModal(false)
  }

  const handleProductUpdated = (updatedProduct: Product) => {
    onChange(selectedProducts.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)))
    setShowEditModal(false)
    setEditingProduct(null)
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-xl border-dashed hover:bg-accent/60 transition-apple bg-transparent"
            onClick={() => setShowSelectionModal(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            挂载已有商品
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-xl border-dashed hover:bg-accent/60 transition-apple bg-transparent"
            onClick={() => {
              setEditingProduct(null)
              setShowEditModal(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            创建新商品
          </Button>
        </div>

        {selectedProducts.length > 0 && (
          <div className="space-y-3">
            {selectedProducts.map((product) => (
              <div
                key={product.id}
                className="flex gap-4 p-4 rounded-xl border border-border/40 bg-background shadow-apple hover:shadow-apple-lg transition-apple"
              >
                {/* Product image placeholder */}
                <div className="w-[88px] h-[88px] rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                  <Image
                    src="/placeholder.svg"
                    alt={product.title}
                    width={88}
                    height={88}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm line-clamp-2 mb-2">{product.title}</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-1">
                    <span className="text-primary font-semibold">¥{product.price.toFixed(2)}</span>
                    <span>库存：{product.stockRemaining}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">销量：{100 - product.stockRemaining}</div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg bg-transparent"
                    onClick={() => handleEditProduct(product)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    修改
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10 bg-transparent"
                    onClick={() => handleRemoveProduct(product.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    移除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ProductSelectionModal
        open={showSelectionModal}
        onClose={() => setShowSelectionModal(false)}
        onSelect={handleProductsSelected}
        excludeIds={selectedProducts.map((p) => p.id)}
      />

      <ProductEditModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingProduct(null)
        }}
        product={editingProduct}
        onSave={handleProductUpdated}
      />
    </>
  )
}
