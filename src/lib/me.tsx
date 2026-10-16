'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createClient } from './supabase/client'

export type Me = {
  userId: string; email: string; fullName: string; role: 'owner' | 'admin' | 'teacher'
  orgId: string; orgName: string; orgType: 'center' | 'solo'; zaloTemplate: string | null
  teacherId: string | null; isAdmin: boolean; isCenter: boolean
}
const Ctx = createContext<Me | null>(null)
export const useMe = () => {
  const m = useContext(Ctx)
  if (!m) throw new Error('useMe ngoài MeProvider')
  return m
}

async function fetchMe(): Promise<Me | null> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const [{ data: p }, { data: t }] = await Promise.all([
    sb.from('profiles').select('role, org_id, full_name, orgs(name, type, zalo_template)').eq('id', user.id).maybeSingle(),
    sb.from('teachers').select('id').eq('profile_id', user.id).maybeSingle(),
  ])
  if (!p) return null
  const role = p.role as Me['role']
  return {
    userId: user.id, email: user.email ?? '', fullName: p.full_name, role,
    orgId: p.org_id, orgName: p.orgs?.name ?? '', orgType: (p.orgs?.type ?? 'center') as Me['orgType'], zaloTemplate: p.orgs?.zalo_template ?? null,
    teacherId: t?.id ?? null, isAdmin: role !== 'teacher', isCenter: p.orgs?.type === 'center',
  }
}

/** Nạp hồ sơ người dùng + tổ chức. Nếu đã đăng nhập mà chưa thuộc tổ chức nào thì cho tạo tổ chức ngay. */
export function MeProvider({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useQuery({ queryKey: ['me'], queryFn: fetchMe, staleTime: 60_000 })
  if (isLoading) return <div className="p-8 text-slate-400">Đang tải…</div>
  if (!me) return <CreateOrgGate />
  return <Ctx.Provider value={me}>{children}</Ctx.Provider>
}

function CreateOrgGate() {
  const qc = useQueryClient()
  const router = useRouter()
  const [type, setType] = useState<'center' | 'solo'>('center')
  const [name, setName] = useState('')
  const [full, setFull] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const tried = useRef(false)

  const create = useCallback(async (n: string, ty: 'center' | 'solo', f: string) => {
    setBusy(true); setErr('')
    const { error } = await createClient().rpc('create_org', { p_name: n.trim(), p_type: ty, p_full_name: f.trim() })
    if (error) { setBusy(false); return setErr(error.message) }
    await qc.invalidateQueries({ queryKey: ['me'] })
    router.refresh()
  }, [qc, router])

  // Đăng ký xong nhưng chưa kịp tạo tổ chức (ví dụ đóng trang sau khi nhập mã): tự tạo từ thông tin đã nhập lúc đăng ký
  useEffect(() => {
    if (tried.current) return
    tried.current = true
    createClient().auth.getUser().then(({ data }) => {
      const m = (data.user?.user_metadata ?? {}) as { org_name?: string; org_type?: 'center' | 'solo'; full_name?: string }
      if (m.org_name && m.org_type && m.full_name) create(m.org_name, m.org_type, m.full_name)
      else { setName(m.org_name ?? ''); setFull(m.full_name ?? ''); if (m.org_type) setType(m.org_type) }
    })
  }, [create])

  const submit = () => {
    if (!name.trim() || !full.trim()) return setErr('Nhập đầy đủ thông tin')
    create(name, type, full)
  }
  const logout = async () => { await createClient().auth.signOut(); router.replace('/login') }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-sm p-6 w-full max-w-sm">
        <h1 className="page-title mb-1">Tạo tổ chức</h1>
        <p className="text-slate-500 mb-4">Tài khoản của bạn chưa thuộc trung tâm hay lớp nào.</p>
        <OrgFields type={type} setType={setType} name={name} setName={setName} full={full} setFull={setFull} />
        {err && <p className="text-rose-600 text-sm mb-2">{err}</p>}
        <button disabled={busy} className="w-full bg-indigo-600 text-white rounded py-2 disabled:opacity-50" onClick={submit}>{busy ? 'Đang tạo…' : 'Tạo'}</button>
        <button className="w-full text-xs text-slate-500 underline mt-3" onClick={logout}>Đăng xuất</button>
      </div>
    </div>
  )
}

export function OrgFields(p: {
  type: 'center' | 'solo'; setType: (t: 'center' | 'solo') => void
  name: string; setName: (v: string) => void; full: string; setFull: (v: string) => void
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {([['center', 'Trung tâm', 'Nhiều giáo viên'], ['solo', 'Giáo viên cá nhân', 'Dạy một mình']] as const).map(([id, t, s]) => (
          <button key={id} type="button" onClick={() => p.setType(id)}
            className={`text-left border rounded-lg p-2 ${p.type === id ? 'border-indigo-600 ring-2 ring-indigo-200' : ''}`}>
            <div className="font-semibold text-sm">{t}</div><div className="text-xs text-slate-500">{s}</div>
          </button>
        ))}
      </div>
      <label className="block mb-2"><span className="text-xs text-slate-500">{p.type === 'center' ? 'Tên trung tâm' : 'Tên lớp / thương hiệu'}</span>
        <input className="w-full border rounded px-2 py-1.5" value={p.name} onChange={(e) => p.setName(e.target.value)} /></label>
      <label className="block mb-3"><span className="text-xs text-slate-500">Họ tên của bạn</span>
        <input className="w-full border rounded px-2 py-1.5" value={p.full} onChange={(e) => p.setFull(e.target.value)} /></label>
    </>
  )
}
