import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../database.types'

/** Client chạy ở trình duyệt, dùng publishable key; mọi truy cập đều đi qua RLS. */
export const createClient = () =>
  createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)
