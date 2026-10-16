import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '../database.types'

/** Client chạy ở server (Server Action / Route Handler), đọc phiên đăng nhập từ cookie. */
export async function createClient() {
  const store = await cookies()
  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)) } catch { /* gọi từ Server Component: bỏ qua */ }
      },
    },
  })
}
