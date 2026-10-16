'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { createTeacher, deleteTeacher, setTeacherPassword, updateTeacher } from '@/app/actions/teachers'
import { useConfirm, useToast } from '@/components/Providers'
import { Empty, Forbidden, Loading, Modal } from '@/components/ui'
import { useCoreQ } from '@/lib/data/core'
import type { Teacher } from '@/lib/data/types'
import { useMe } from '@/lib/me'

type Dialog = { kind: 'form'; item?: Teacher } | { kind: 'password'; item: Teacher } | null

export default function TeachersPage() {
  const me = useMe()
  const { ready, error, core } = useCoreQ()
  const qc = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const [dlg, setDlg] = useState<Dialog>(null)
  if (!me.isCenter || !me.isAdmin) return <Forbidden />
  if (!ready) return <Loading error={error} />

  const done = async (msg: string) => { await qc.invalidateQueries({ queryKey: ['core'] }); toast(msg); setDlg(null) }
  const del = async (t: Teacher) => {
    if (!(await confirm(`Xóa giáo viên ${t.name}? Tài khoản đăng nhập (nếu có) cũng bị xóa; các lớp của thầy/cô sẽ để trống giáo viên.`))) return
    const r = await deleteTeacher(t.id)
    if (r.ok) done('Đã xóa giáo viên'); else toast('Lỗi: ' + r.error)
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h1 className="page-title mr-auto">Giáo viên</h1>
        <button className="bg-indigo-600 text-white rounded px-3 py-1" onClick={() => setDlg({ kind: 'form' })}>+ Thêm giáo viên</button>
      </div>
      {!core.teachers.length ? <Empty icon="👩‍🏫">Chưa có giáo viên.</Empty> : (
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500"><tr><th>Họ tên</th><th>SĐT</th><th>Tài khoản đăng nhập</th><th>Số lớp</th><th /></tr></thead>
            <tbody>
              {core.teachers.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="font-medium">{t.name}</td>
                  <td>{t.phone}</td>
                  <td>{t.profile_id
                    ? <span className="text-emerald-700 text-xs bg-emerald-100 rounded-full px-2 py-0.5">{t.email || 'Đã có tài khoản'}</span>
                    : <span className="text-slate-400 text-xs">Chưa có</span>}</td>
                  <td>{core.classes.filter((c) => c.teacher_id === t.id).length}</td>
                  <td className="text-right whitespace-nowrap">
                    <button className="text-emerald-600 mr-2" onClick={() => setDlg({ kind: 'password', item: t })}>{t.profile_id ? 'Đặt lại mật khẩu' : 'Cấp tài khoản'}</button>
                    <button className="text-indigo-600 mr-2" onClick={() => setDlg({ kind: 'form', item: t })}>Sửa</button>
                    {t.profile_id !== me.userId && <button className="text-rose-600" onClick={() => del(t)}>Xóa</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dlg?.kind === 'form' && <TeacherForm item={dlg.item} onClose={() => setDlg(null)} onDone={done} />}
      {dlg?.kind === 'password' && <PasswordForm item={dlg.item} onClose={() => setDlg(null)} onDone={done} />}
    </section>
  )
}

function TeacherForm({ item, onClose, onDone }: { item?: Teacher; onClose: () => void; onDone: (m: string) => void }) {
  const [name, setName] = useState(item?.name ?? '')
  const [phone, setPhone] = useState(item?.phone ?? '')
  const [email, setEmail] = useState(item?.email ?? '')
  const [account, setAccount] = useState(false)
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true); setErr('')
    const r = item
      ? await updateTeacher(item.id, { name, phone, email })
      : await createTeacher({ name, phone, email, password: account ? password : undefined })
    setBusy(false)
    if (r.ok) onDone('Đã lưu'); else setErr(r.error)
  }

  return (
    <Modal open onClose={onClose}>
      <h2 className="font-bold text-base mb-3">{item ? 'Sửa giáo viên' : 'Thêm giáo viên'}</h2>
      <label className="block mb-2"><span className="text-xs text-slate-500">Họ tên</span><input className="w-full border rounded px-2 py-1.5" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="block mb-2"><span className="text-xs text-slate-500">SĐT</span><input type="tel" className="w-full border rounded px-2 py-1.5" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
      <label className="block mb-2"><span className="text-xs text-slate-500">Email {account ? '(dùng để đăng nhập)' : ''}</span>
        <input type="email" className="w-full border rounded px-2 py-1.5" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!item?.profile_id} /></label>
      {!item && (
        <div className="border rounded p-2 mb-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={account} onChange={(e) => setAccount(e.target.checked)} /> Tạo tài khoản đăng nhập cho giáo viên</label>
          {account && (
            <label className="block mt-2"><span className="text-xs text-slate-500">Mật khẩu (tối thiểu 8 ký tự, bạn gửi lại cho giáo viên)</span>
              <input className="w-full border rounded px-2 py-1.5" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          )}
        </div>
      )}
      {err && <p className="text-rose-600 text-sm mb-2">{err}</p>}
      <div className="flex justify-end gap-2 mt-3">
        <button className="px-3 py-1.5 rounded border" onClick={onClose}>Hủy</button>
        <button disabled={busy} className="px-4 py-1.5 rounded bg-indigo-600 text-white disabled:opacity-50" onClick={submit}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
      </div>
    </Modal>
  )
}

function PasswordForm({ item, onClose, onDone }: { item: Teacher; onClose: () => void; onDone: (m: string) => void }) {
  const [email, setEmail] = useState(item.email)
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true); setErr('')
    const r = await setTeacherPassword(item.id, password, item.profile_id ? undefined : email)
    setBusy(false)
    if (r.ok) onDone(item.profile_id ? 'Đã đặt lại mật khẩu' : 'Đã cấp tài khoản'); else setErr(r.error)
  }
  return (
    <Modal open onClose={onClose}>
      <h2 className="font-bold text-base mb-3">{item.profile_id ? 'Đặt lại mật khẩu' : 'Cấp tài khoản'} · {item.name}</h2>
      {!item.profile_id && (
        <label className="block mb-2"><span className="text-xs text-slate-500">Email đăng nhập</span>
          <input type="email" className="w-full border rounded px-2 py-1.5" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      )}
      <label className="block mb-2"><span className="text-xs text-slate-500">Mật khẩu mới (tối thiểu 8 ký tự)</span>
        <input className="w-full border rounded px-2 py-1.5" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <p className="text-xs text-slate-400">Hệ thống không gửi email. Hãy gửi email và mật khẩu này cho giáo viên.</p>
      {err && <p className="text-rose-600 text-sm mt-2">{err}</p>}
      <div className="flex justify-end gap-2 mt-3">
        <button className="px-3 py-1.5 rounded border" onClick={onClose}>Hủy</button>
        <button disabled={busy} className="px-4 py-1.5 rounded bg-indigo-600 text-white disabled:opacity-50" onClick={submit}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
      </div>
    </Modal>
  )
}
