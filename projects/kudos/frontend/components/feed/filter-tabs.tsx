"use client"

import { useState } from "react"


const categories = ["全部", "名片收录", "文本生成", "图片生成", "视频生成", "工作流", "热点话题", "深度观点", "深度观点"]

export function FilterTabs() {
  const [activeCategory, setActiveCategory] = useState("全部")

  return (
    <div className="border-b border-border/20 bg-background/95 backdrop-blur-sm sticky top-16 z-40">
      <div className="container mx-auto px-6">
        <div className="flex items-center gap-8 py-3 overflow-x-auto scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`
                text-sm whitespace-nowrap transition-all duration-200 relative pb-0.5
                ${
                  activeCategory === category
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              {category}
              {activeCategory === category && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
