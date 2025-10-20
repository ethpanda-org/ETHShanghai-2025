"use client"

import type React from "react"

import { useState } from "react"
import { X, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface TagSelectorProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

export function TagSelector({ tags, onChange }: TagSelectorProps) {
  const [input, setInput] = useState("")

  const handleAdd = () => {
    const tag = input.trim()
    if (tag && !tags.includes(tag) && tags.length < 5) {
      onChange([...tags, tag])
      setInput("")
    }
  }

  const handleRemove = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="输入标签（最多5个）"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={tags.length >= 5}
        />
        <Button type="button" onClick={handleAdd} disabled={!input.trim() || tags.length >= 5}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              #{tag}
              <button type="button" onClick={() => handleRemove(tag)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">已添加 {tags.length} / 5 个标签</p>
    </div>
  )
}
