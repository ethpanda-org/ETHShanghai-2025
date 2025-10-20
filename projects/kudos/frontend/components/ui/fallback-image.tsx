"use client"

import { useState } from "react"
import Image from "next/image"
import { ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface FallbackImageProps {
  src: string
  alt: string
  fill?: boolean
  width?: number
  height?: number
  className?: string
  fallbackClassName?: string
  priority?: boolean
  sizes?: string
}

export function FallbackImage({
  src,
  alt,
  fill = false,
  width,
  height,
  className,
  fallbackClassName,
  priority = false,
  sizes,
}: FallbackImageProps) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  if (error) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm",
          fill && "absolute inset-0",
          fallbackClassName,
        )}
      >
        <div className="flex flex-col items-center gap-3 text-muted-foreground/60">
          <div className="rounded-full bg-background/80 p-4 shadow-apple">
            <ImageIcon className="h-8 w-8" strokeWidth={1.5} />
          </div>
          <p className="text-xs font-medium">图片加载失败</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {loading && (
        <div
          className={cn(
            "animate-pulse bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30 bg-[length:200%_100%]",
            fill && "absolute inset-0",
          )}
          style={{
            animation: "shimmer 2s infinite",
          }}
        />
      )}

      <Image
        src={src || "/placeholder.svg"}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        className={cn(className, loading && "opacity-0")}
        onError={() => {
          console.log("[v0] Image failed to load:", src)
          setError(true)
          setLoading(false)
        }}
        onLoad={() => {
          console.log("[v0] Image loaded successfully:", src)
          setLoading(false)
        }}
        priority={priority}
        sizes={sizes}
      />

      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </>
  )
}
