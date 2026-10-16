'use client'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { OtpField, authMessage, useCooldown } from '@/components/auth'
import { OrgFields } from '@/lib/me'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [step, setStep] = useState<'form' | 'code'>('form')
  const [type, setType] = useState<'center' | 'solo'>('center')
  const [name, setName] = useState('')
  const [full, setFull] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, startCooldown] = useCooldown(60)

  const finish = async () => {
    const { error } = await createClient().rpc('create_org', { p_name: name.trim(), p_type: type, p_full_name: full.trim() })
    if (error) throw error
    qc.clear() // bỏ cache của người dùng trước, tránh hiện nhầm danh tính
    router.replace('/dashboard')
    router.refresh()
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return setErr('Mật khẩu tối thiểu 8 ký tự')
    if (!name.trim() || !full.trim()) return setErr('Nhập đầy đủ thông tin')
    setBusy(true); setErr('')
    // thông tin tổ chức đi kèm tài khoản: nếu người dùng đóng trang trước khi nhập mã, đăng nhập lại vẫn tự tạo được tổ chức
    const { data, error } = await createClient().auth.signUp({
      email: email.trim(), password, options: { data: { org_name: name.trim(), org_type: type, full_name: full.trim() } },
    })
    if (error) { setBusy(false); return setErr(/registered|exists/i.test(error.message) ? 'Email này đã được đăng ký' : authMessage(error)) }
    if (data.user && data.user.identities?.length === 0) { setBusy(false); return setErr('Email này đã được đăng ký. Hãy đăng nhập, hoặc dùng "Quên mật khẩu".') }
    try {
      if (data.session) await finish() // dự phòng khi dự án không bắt xác nhận email
      else { setStep('code'); startCooldown() }
    } catch (e2) { setErr((e2 as Error).message) }
    setBusy(false)
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) return setErr('Nhập đủ 6 số của mã xác nhận')
    setBusy(true); setErr('')
    const { error } = await createClient().auth.verifyOtp({ email: email.trim(), token: code, type: 'signup' })
    if (error) { setBusy(false); return setErr(authMessage(error)) }
    try { await finish() } catch (e2) { setErr((e2 as Error).message); setBusy(false) }
  }

  const resend = async () => {
    setErr('')
    const { error } = await createClient().auth.resend({ type: 'signup', email: email.trim() })
    if (error) return setErr(authMessage(error))
    startCooldown(); setCode('')
  }

  if (step === 'code') {
    return (
      <form onSubmit={verify}>
        <h1 className="page-title mb-1">Nhập mã xác nhận</h1>
        <p className="text-sm text-slate-500 mb-4">Chúng tôi đã gửi mã 6 số tới <b>{email.trim()}</b>. Nếu chưa thấy, hãy kiểm tra thư mục <b>Spam</b>.</p>
        <OtpField value={code} onChange={setCode} />
        {err && <p className="text-rose-600 text-sm mt-2">{err}</p>}
        <button disabled={busy || code.length !== 6} className="w-full bg-indigo-600 text-white rounded py-2 mt-3 disabled:opacity-50">{busy ? 'Đang xác nhận…' : 'Xác nhận và vào ứng dụng'}</button>
        <div className="flex justify-between text-xs mt-3">
          <button type="button" className="text-slate-500 underline" onClick={() => { setStep('form'); setErr(''); setCode('') }}>Đổi email</button>
          <button type="button" disabled={cooldown > 0} className="text-indigo-600 disabled:text-slate-400" onClick={resend}>{cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : 'Gửi lại mã'}</button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={submit}>
      <h1 className="page-title mb-4">Đăng ký</h1>
      <OrgFields type={type} setType={setType} name={name} setName={setName} full={full} setFull={setFull} />
      <label className="block mb-2"><span className="text-xs text-slate-500">Email đăng nhập</span>
        <input type="email" required autoComplete="email" className="w-full border rounded px-2 py-1.5" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="block mb-3"><span className="text-xs text-slate-500">Mật khẩu (tối thiểu 8 ký tự)</span>
        <input type="password" required minLength={8} autoComplete="new-password" className="w-full border rounded px-2 py-1.5" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      {err && <p className="text-rose-600 text-sm mb-2">{err}</p>}
      <button disabled={busy} className="w-full bg-indigo-600 text-white rounded py-2 disabled:opacity-50">{busy ? 'Đang gửi mã…' : 'Tiếp tục'}</button>
      <p className="text-xs text-slate-400 mt-2 text-center">Chúng tôi sẽ gửi mã xác nhận 6 số tới email của bạn.</p>
      <p className="text-xs text-slate-500 mt-3 text-center">Đã có tài khoản? <Link href="/login" className="text-indigo-600 underline">Đăng nhập</Link></p>
    </form>
  )
}
