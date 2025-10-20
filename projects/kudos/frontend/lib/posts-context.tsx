"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { Post } from "@/lib/mock-data"
import { mockUsers } from "@/lib/mock-data"

interface PostsContextType {
  newPosts: Post[]
  addPost: (post: Omit<Post, "id" | "createdAt" | "author">) => void
}

const PostsContext = createContext<PostsContextType | undefined>(undefined)

export function PostsProvider({ children }: { children: ReactNode }) {
  const [newPosts, setNewPosts] = useState<Post[]>([])

  useEffect(() => {
    const stored = localStorage.getItem("chaoci-new-posts")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setNewPosts(parsed)
        console.log("[v0] Loaded posts from localStorage:", parsed.length)
      } catch (error) {
        console.error("[v0] Failed to parse stored posts:", error)
      }
    }
  }, [])

  useEffect(() => {
    if (newPosts.length > 0) {
      localStorage.setItem("chaoci-new-posts", JSON.stringify(newPosts))
      console.log("[v0] Saved posts to localStorage:", newPosts.length)
    }
  }, [newPosts])

  const addPost = (postData: Omit<Post, "id" | "createdAt" | "author">) => {
    const newPost: Post = {
      ...postData,
      id: `new-${Date.now()}`,
      createdAt: new Date().toISOString(),
      author: mockUsers[0], // Use first mock user as author
      likeCount: 0,
      commentCount: 0,
      viewCount: 0,
    }

    console.log("[v0] Adding new post:", newPost)
    setNewPosts((prev) => [newPost, ...prev])
  }

  return <PostsContext.Provider value={{ newPosts, addPost }}>{children}</PostsContext.Provider>
}

export function usePosts() {
  const context = useContext(PostsContext)
  if (!context) {
    throw new Error("usePosts must be used within PostsProvider")
  }
  return context
}
