export interface CommentCore {
  id: number
  p_id: number | null
  user_id: number
  content: string
  create_at: string
}

export interface Comment extends CommentCore {
  c_comments?: CommentCore[]
}
