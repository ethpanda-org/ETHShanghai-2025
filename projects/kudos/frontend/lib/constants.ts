// Constants for the 炒词 platform

export const APP_NAME = "炒词"
export const APP_DESCRIPTION = "AI Creator Community - Share, Trade, and Monetize AI Content"

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  POST_DETAIL: (id: string) => `/post/${id}`,
  PUBLISH: "/publish",
  PROFILE: (username: string) => `/profile/${username}`,
  NOTIFICATIONS: "/notifications",
  SEARCH: "/search",
} as const

export const MAX_IMAGES_PER_POST = 10
export const MAX_TAGS_PER_POST = 5
export const MAX_TITLE_LENGTH = 50
export const MAX_COMMENT_LENGTH = 500

export const SOCIAL_PLATFORMS = ["Twitter", "Instagram", "GitHub", "LinkedIn", "Website", "YouTube", "TikTok"] as const
