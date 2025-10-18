import { createClient } from '@supabase/supabase-js'
import type { Database } from './types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 创建带类型的 Supabase 客户端
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// 导出类型别名以便在其他地方使用
export type SupabaseClient = typeof supabase
export type { Database } from './types/supabase'

