'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { updateMyProfile } from '@/app/actions/profile'
import { useToast } from '@/components/Providers'
import { Loading } from '@/components/ui'
import { useMe } from '@/lib/me'
import { createClient } from '@/lib/supabase/client'

const ROLE: Record<string, string> = { owner: 'Chủ tổ chức', admin: 'Quản trị viên', teacher: 'Giáo viên' }

export default function ProfilePage() {
  const me = useMe()
  const qc = useQueryClient()
  const toast = useToast()
  const phone = useQuery({
    queryKey: ['my-phone', me.userId],
    queryFn: async () => (await createClient().from('profiles').select('phone').eq('id', me.userId).single()).data?.phone ?? '',
  })
  const [name, setName] = useState<string | null>(null)
  const [tel, setTel] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [cur, setCur] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  if (phone.isLoading) return <Loading />
  const nameV = name ?? me.fullName
  const telV = tel ?? phone.data ?? ''

  const saveInfo = async () => {
    setSaving(true)
    const r = await updateMyProfile({ fullName: nameV, phone: telV })
    setSaving(false)
    if (!r.ok) return toast('Lỗi: ' + r.error)
    await Promise.all([qc.invalidateQueries({ queryKey: ['me'] }), qc.invalidateQueries({ queryKey: ['core'] }), qc.invalidateQueries({ queryKey: ['my-phone'] })])
    setName(null); setTel(null)
    toast('Đã lưu hồ sơ')
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwErr('')
    if (pw.length < 8) return setPwErr('Mật khẩu mới tối thiểu 8 ký tự')
    if (pw !== pw2) return setPwErr('Mật khẩu nhập lại không khớp')
    if (pw === cur) return setPwErr('Mật khẩu mới phải khác mật khẩu hiện tại')
    setPwBusy(true)
    const sb = createClient()
    const check = await sb.auth.signInWithPassword({ email: me.email, password: cur }) // xác nhận đúng chủ tài khoản
    if (check.error) { setPwBusy(false); return setPwErr('Mật khẩu hiện tại không đúng') }
    const up = await sb.auth.updateUser({ password: pw })
    if (up.error) { setPwBusy(false); return setPwErr(up.error.message) }
    await sb.auth.signOut({ scope: 'others' }) // đăng xuất các thiết bị khác
    setPwBusy(false); setCur(''); setPw(''); setPw2('')
    toast('Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.')
  }

  const field = 'w-full border rounded px-2 py-1.5'
  return (
    <section className="max-w-xl">
      <h1 className="page-title mb-3">Hồ sơ cá nhân</h1>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h2 className="font-semibold mb-3">Thông tin</h2>
        <label className="block mb-2"><span className="text-xs text-slate-500">Email đăng nhập</span><input className={`${field} bg-slate-50 text-slate-500`} value={me.email} disabled /></label>
        <label className="block mb-2"><span className="text-xs text-slate-500">Vai trò · Tổ chức</span><input className={`${field} bg-slate-50 text-slate-500`} value={`${ROLE[me.role]} · ${me.orgName}`} disabled /></label>
        <label className="block mb-2"><span className="text-xs text-slate-500">Họ tên</span><input className={field} value={nameV} onChange={(e) => setName(e.target.value)} /></label>
        <label className="block mb-3"><span className="text-xs text-slate-500">Số điện thoại</span><input type="tel" className={field} value={telV} onChange={(e) => setTel(e.target.value)} /></label>
        <button disabled={saving} onClick={saveInfo} className="bg-indigo-600 text-white rounded px-4 py-1.5 disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu thông tin'}</button>
      </div>

      <form id="password" onSubmit={changePassword} className="bg-white rounded-lg shadow-sm p-4 scroll-mt-16">
        <h2 className="font-semibold mb-3">Đổi mật khẩu</h2>
        <label className="block mb-2"><span className="text-xs text-slate-500">Mật khẩu hiện tại</span><input type="password" autoComplete="current-password" required className={field} value={cur} onChange={(e) => setCur(e.target.value)} /></label>
        <label className="block mb-2"><span className="text-xs text-slate-500">Mật khẩu mới (tối thiểu 8 ký tự)</span><input type="password" autoComplete="new-password" required className={field} value={pw} onChange={(e) => setPw(e.target.value)} /></label>
        <label className="block mb-3"><span className="text-xs text-slate-500">Nhập lại mật khẩu mới</span><input type="password" autoComplete="new-password" required className={field} value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
        {pwErr && <p className="text-rose-600 text-sm mb-2">{pwErr}</p>}
        <button disabled={pwBusy} className="bg-indigo-600 text-white rounded px-4 py-1.5 disabled:opacity-50">{pwBusy ? 'Đang đổi…' : 'Đổi mật khẩu'}</button>
        <p className="text-xs text-slate-400 mt-2">Sau khi đổi, các thiết bị khác sẽ phải đăng nhập lại.</p>
      </form>
    </section>
  )
}
