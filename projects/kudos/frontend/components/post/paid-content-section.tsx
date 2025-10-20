"use client"
import { Lock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProductCardInPost } from "@/components/product/product-card-in-post"
import type { Product } from "@/lib/mock-data"

interface PaidContentSectionProps {
  products: Product[]
}

export function PaidContentSection({ products }: PaidContentSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Lock className="h-4 w-4" />
          付费内容
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {products.map((product) => (
          <ProductCardInPost key={product.id} product={product} />
        ))}
      </CardContent>
    </Card>
  )
}
