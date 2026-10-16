'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type Result = { ok: true } | { ok: false; error: string }
type TeacherInput = { name: string; phone?: string; email?: string }

/** Xác thực người gọi là owner/admin và trả về org của họ. Mọi thao tác dùng service key đều phải qua hàm này. */
async function requireAdmin() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Chưa đăng nhập')
  const { data: p } = await sb.from('profiles').select('org_id, role').eq('id', user.id).maybeSingle()
  if (!p || p.role === 'teacher') throw new Error('Chỉ quản trị viên mới được thực hiện thao tác này')
  return { orgId: p.org_id, userId: user.id }
}

const wrap = async (fn: () => Promise<Result>): Promise<Result> => {
  try { return await fn() } catch (e) { return { ok: false, error: (e as Error).message } }
}
const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

/** Tạo tài khoản đăng nhập (không gửi email) và gắn vào hồ sơ giáo viên. */
async function makeAccount(orgId: string, teacherId: string, name: string, phone: string, email: string, password: string) {
  if (!validEmail(email)) throw new Error('Email không hợp lệ')
  if (password.length < 8) throw new Error('Mật khẩu tối thiểu 8 ký tự')
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } })
  if (error) throw new Error(/registered|exists/i.test(error.message) ? 'Email này đã có tài khoản' : error.message)
  const uid = data.user.id
  const p = await admin.from('profiles').insert({ id: uid, org_id: orgId, role: 'teacher', full_name: name, phone })
  if (p.error) { await admin.auth.admin.deleteUser(uid); throw new Error(p.error.message) }
  const t = await admin.from('teachers').update({ profile_id: uid, email }).eq('id', teacherId).eq('org_id', orgId)
  if (t.error) { await admin.auth.admin.deleteUser(uid); throw new Error(t.error.message) }
}

export async function createTeacher(input: TeacherInput & { password?: string }): Promise<Result> {
  return wrap(async () => {
    const { orgId } = await requireAdmin()
    const name = input.name.trim(); const email = (input.email ?? '').trim().toLowerCase(); const phone = (input.phone ?? '').trim()
    if (!name) throw new Error('Nhập tên giáo viên')
    if (input.password && !email) throw new Error('Cần email để tạo tài khoản đăng nhập')
    const admin = createAdminClient()
    const { data, error } = await admin.from('teachers').insert({ org_id: orgId, name, phone, email }).select('id').single()
    if (error) throw new Error(error.message)
    if (input.password) {
      try { await makeAccount(orgId, data.id, name, phone, email, input.password) }
      catch (e) { await admin.from('teachers').delete().eq('id', data.id); throw e }
    }
    return { ok: true }
  })
}

export async function updateTeacher(id: string, input: TeacherInput): Promise<Result> {
  return wrap(async () => {
    const { orgId } = await requireAdmin()
    const name = input.name.trim()
    if (!name) throw new Error('Nhập tên giáo viên')
    const admin = createAdminClient()
    const { data: t, error } = await admin.from('teachers').update({ name, phone: input.phone ?? '', email: input.email ?? '' }).eq('id', id).eq('org_id', orgId).select('profile_id').single()
    if (error) throw new Error(error.message)
    if (t.profile_id) await admin.from('profiles').update({ full_name: name, phone: input.phone ?? null }).eq('id', t.profile_id).eq('org_id', orgId)
    return { ok: true }
  })
}

/** Cấp tài khoản cho giáo viên chưa có, hoặc đặt lại mật khẩu cho giáo viên đã có. */
export async function setTeacherPassword(teacherId: string, password: string, email?: string): Promise<Result> {
  return wrap(async () => {
    const { orgId } = await requireAdmin()
    if (password.length < 8) throw new Error('Mật khẩu tối thiểu 8 ký tự')
    const admin = createAdminClient()
    const { data: t, error } = await admin.from('teachers').select('name, phone, email, profile_id').eq('id', teacherId).eq('org_id', orgId).single()
    if (error) throw new Error('Không tìm thấy giáo viên')
    if (t.profile_id) {
      const { data: p } = await admin.from('profiles').select('role').eq('id', t.profile_id).single()
      if (p?.role === 'owner') throw new Error('Không đổi mật khẩu chủ tổ chức ở đây')
      const r = await admin.auth.admin.updateUserById(t.profile_id, { password })
      if (r.error) throw new Error(r.error.message)
    } else {
      await makeAccount(orgId, teacherId, t.name, t.phone, (email ?? t.email).trim().toLowerCase(), password)
    }
    return { ok: true }
  })
}

export async function deleteTeacher(teacherId: string): Promise<Result> {
  return wrap(async () => {
    const { orgId, userId } = await requireAdmin()
    const admin = createAdminClient()
    const { data: t, error } = await admin.from('teachers').select('profile_id').eq('id', teacherId).eq('org_id', orgId).single()
    if (error) throw new Error('Không tìm thấy giáo viên')
    if (t.profile_id === userId) throw new Error('Không thể tự xóa chính mình')
    if (t.profile_id) {
      const { data: p } = await admin.from('profiles').select('role').eq('id', t.profile_id).single()
      if (p?.role === 'owner') throw new Error('Không xóa được chủ tổ chức')
    }
    const del = await admin.from('teachers').delete().eq('id', teacherId).eq('org_id', orgId)
    if (del.error) throw new Error(del.error.message)
    if (t.profile_id) await admin.auth.admin.deleteUser(t.profile_id)
    return { ok: true }
  })
}
