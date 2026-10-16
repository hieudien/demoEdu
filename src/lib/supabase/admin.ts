import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../database.types'

/** CHỈ dùng ở server. Service role bỏ qua RLS: luôn tự kiểm tra quyền người gọi trước khi dùng. */
export const createAdminClient = () =>
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
