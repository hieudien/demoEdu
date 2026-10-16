'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type Result = { ok: true } | { ok: false; error: string }

/** Người dùng tự sửa họ tên / SĐT. Đồng bộ sang hồ sơ giáo viên (giáo viên không có quyền ghi bảng teachers nên dùng service key,
 *  nhưng chỉ đụng đúng dòng teachers gắn với tài khoản đang đăng nhập). */
export async function updateMyProfile(input: { fullName: string; phone: string }): Promise<Result> {
  const fullName = input.fullName.trim()
  const phone = input.phone.trim()
  if (!fullName) return { ok: false, error: 'Nhập họ tên' }
  if (phone && !/^[0-9+\s.-]{8,15}$/.test(phone)) return { ok: false, error: 'Số điện thoại không hợp lệ' }

  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { ok: false, error: 'Chưa đăng nhập' }

  const p = await sb.from('profiles').update({ full_name: fullName, phone: phone || null }).eq('id', user.id)
  if (p.error) return { ok: false, error: p.error.message }
  const t = await createAdminClient().from('teachers').update({ name: fullName, phone }).eq('profile_id', user.id)
  if (t.error) return { ok: false, error: t.error.message }
  return { ok: true }
}
